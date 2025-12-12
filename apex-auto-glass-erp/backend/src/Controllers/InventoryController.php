<?php

namespace App\Controllers;

use App\Services\InventoryService;
use App\Config\Logger;

class InventoryController
{
    private $inventoryService;

    public function __construct()
    {
        $this->inventoryService = new InventoryService();
    }

    public function getReport()
    {
        // Get query parameters
        $companyId = $_GET['companyId'] ?? null;
        $startDate = $_GET['startDate'] ?? date('Y-m-01');
        $endDate = $_GET['endDate'] ?? date('Y-m-d');
        
        if (!$companyId) {
            http_response_code(400);
            echo json_encode(['error' => 'companyId is required']);
            return;
        }

        $filters = [
            'startDate' => $startDate,
            'endDate' => $endDate,
            'movementType' => $_GET['movementType'] ?? 'all',
            'productId' => $_GET['productId'] ?? null,
            // Add other filters as needed
        ];

        try {
            Logger::info("Generating report for company: $companyId", $filters);
            $report = $this->inventoryService->generateReport($companyId, $filters);
            echo json_encode($report);
        } catch (\Exception $e) {
            Logger::error("Error generating report: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
}
