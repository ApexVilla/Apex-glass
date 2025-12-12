<?php

namespace App\Services;

use App\Config\Database;
use PDO;

class InventoryService
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function generateReport($companyId, $filters)
    {
        $startDate = $filters['startDate'] . ' 00:00:00';
        $endDate = $filters['endDate'] . ' 23:59:59';

        // 1. Calculate Initial Balance (Saldo Anterior) for each product before the period
        $initialBalances = $this->calculateInitialBalances($companyId, $startDate, $filters);

        // 2. Fetch Movements within the period
        $movements = $this->fetchMovements($companyId, $startDate, $endDate, $filters);

        // 3. Process Movements to add running balances and enrich data
        $processedMovements = $this->processMovements($movements, $initialBalances);

        // 4. Calculate Summary
        $summary = $this->calculateSummary($processedMovements);

        return [
            'summary' => $summary,
            'movements' => $processedMovements
        ];
    }

    private function calculateInitialBalances($companyId, $startDate, $filters)
    {
        // Types that add to stock
        $inTypes = ['entrada_compra', 'entrada', 'in', 'entrada_manual', 'entrada_ajuste', 'entrada_devolucao_cliente', 'entrada_devolucao_fornecedor'];
        
        // Types that subtract from stock
        $outTypes = ['saida_venda', 'saida', 'out', 'saida_manual', 'saida_ajuste', 'saida_separacao', 'saida_devolucao_cliente'];

        $sql = "SELECT product_id, 
                SUM(CASE 
                    WHEN type = ANY(:in_types) THEN quantity 
                    WHEN type = ANY(:out_types) THEN -quantity 
                    WHEN type = 'ajuste' THEN -quantity -- Default behavior for generic adjustment if needed, or handle specifically
                    ELSE 0 
                END) as balance
                FROM inventory_movements 
                WHERE company_id = :company_id 
                AND created_at < :start_date";

        // Apply product filters to initial balance query as well to optimize
        if (!empty($filters['productId'])) {
            $sql .= " AND product_id = :product_id";
        }

        $sql .= " GROUP BY product_id";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':company_id', $companyId);
        $stmt->bindValue(':start_date', $startDate);
        $stmt->bindValue(':in_types', "{" . implode(',', $inTypes) . "}");
        $stmt->bindValue(':out_types', "{" . implode(',', $outTypes) . "}");
        
        if (!empty($filters['productId'])) {
            $stmt->bindValue(':product_id', $filters['productId']);
        }

        $stmt->execute();
        
        $balances = [];
        while ($row = $stmt->fetch()) {
            $balances[$row['product_id']] = (float)$row['balance'];
        }

        return $balances;
    }

    private function fetchMovements($companyId, $startDate, $endDate, $filters)
    {
        $sql = "SELECT m.*, 
                p.internal_code, p.name as product_name, p.manufacturer_code, p.sale_price, p.purchase_price,
                c.name as category_name,
                u.full_name as user_name, u.email as user_email,
                s.sale_number, cust.name as customer_name,
                nf.numero as invoice_number
                FROM inventory_movements m
                LEFT JOIN products p ON m.product_id = p.id
                LEFT JOIN product_categories c ON p.category_id = c.id
                LEFT JOIN profiles u ON m.user_id = u.id
                LEFT JOIN sales s ON m.reference_id = s.id AND (m.type LIKE '%venda%' OR m.reference_type = 'sale')
                LEFT JOIN customers cust ON s.customer_id = cust.id
                LEFT JOIN nf_entrada nf ON m.reference_id = nf.id AND (m.type LIKE '%entrada%' OR m.reference_type = 'nf_entrada')
                WHERE m.company_id = :company_id 
                AND m.created_at >= :start_date 
                AND m.created_at <= :end_date";

        $params = [
            ':company_id' => $companyId,
            ':start_date' => $startDate,
            ':end_date' => $endDate
        ];

        if (!empty($filters['productId'])) {
            $sql .= " AND m.product_id = :product_id";
            $params[':product_id'] = $filters['productId'];
        }

        if (!empty($filters['movementType']) && $filters['movementType'] !== 'all') {
            // Map simple filter to actual types (simplified for this example)
            $sql .= " AND m.type = :type";
            $params[':type'] = $filters['movementType'];
        }

        $sql .= " ORDER BY m.created_at ASC"; // Ascending for balance calculation

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll();
    }

    private function processMovements($movements, $initialBalances)
    {
        $processed = [];
        $currentBalances = $initialBalances;

        $inTypes = ['entrada_compra', 'entrada', 'in', 'entrada_manual', 'entrada_ajuste', 'entrada_devolucao_cliente', 'entrada_devolucao_fornecedor'];
        $outTypes = ['saida_venda', 'saida', 'out', 'saida_manual', 'saida_ajuste', 'saida_separacao', 'saida_devolucao_cliente'];

        foreach ($movements as $m) {
            $productId = $m['product_id'];
            $qty = (float)$m['quantity'];
            
            // Initialize balance if not present
            if (!isset($currentBalances[$productId])) {
                // If we didn't calculate it (e.g. new product in period), check if the movement has a snapshot
                $currentBalances[$productId] = isset($m['estoque_anterior']) ? (float)$m['estoque_anterior'] : 0;
            }

            $saldoAnterior = $currentBalances[$productId];
            $saldoAtual = $saldoAnterior;

            if (in_array($m['type'], $inTypes)) {
                $saldoAtual += $qty;
            } elseif (in_array($m['type'], $outTypes)) {
                $saldoAtual -= $qty;
            } elseif ($m['type'] === 'ajuste') {
                $saldoAtual -= $qty; // Default logic
            }

            // Update current balance for next iteration
            $currentBalances[$productId] = $saldoAtual;

            // Format for response
            $processed[] = [
                'id' => $m['id'],
                'created_at' => $m['created_at'],
                'type' => $m['type'],
                'quantity' => $qty,
                'saldo_anterior' => $saldoAnterior,
                'saldo_atual' => $saldoAtual,
                'custo_unitario' => (float)$m['purchase_price'],
                'custo_total' => (float)$m['purchase_price'] * $qty,
                'deposito' => $m['deposito_origem'] ?? $m['deposito_destino'] ?? 'principal',
                'product' => [
                    'id' => $m['product_id'],
                    'name' => $m['product_name'],
                    'internal_code' => $m['internal_code'],
                    'category' => ['name' => $m['category_name']]
                ],
                'user' => [
                    'full_name' => $m['user_name']
                ],
                'sale' => $m['sale_number'] ? ['sale_number' => $m['sale_number'], 'customer' => ['name' => $m['customer_name']]] : null,
                'invoice' => $m['invoice_number'] ? ['invoice_number' => $m['invoice_number']] : null
            ];
        }

        // Sort descending for display
        usort($processed, function($a, $b) {
            return strtotime($b['created_at']) - strtotime($a['created_at']);
        });

        return $processed;
    }

    private function calculateSummary($movements)
    {
        $summary = [
            'totalEntradas' => 0,
            'totalSaidas' => 0,
            'totalAjustes' => 0,
            'totalMovimentadoValor' => 0,
            'saldoFinal' => 0 // This is tricky for a report of multiple products, usually means total quantity of items? Or value?
                              // Frontend implementation sums the last balance of the filtered list, which might be mixed products.
                              // We will replicate the summing of quantities for now.
        ];

        foreach ($movements as $m) {
            if (strpos($m['type'], 'entrada') !== false || $m['type'] == 'in') {
                $summary['totalEntradas'] += $m['quantity'];
            } elseif (strpos($m['type'], 'saida') !== false || $m['type'] == 'out') {
                $summary['totalSaidas'] += $m['quantity'];
            } elseif (strpos($m['type'], 'ajuste') !== false) {
                $summary['totalAjustes'] += abs($m['quantity']);
            }
            $summary['totalMovimentadoValor'] += $m['custo_total'];
        }

        return $summary;
    }
}
