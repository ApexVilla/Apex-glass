<?php

namespace App\Repositories;

use App\Config\Database;
use PDO;
use PDOException;

class NfeRepository
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * Salva uma NF-e no banco de dados
     */
    public function save(array $nfeData): string
    {
        try {
            $this->db->beginTransaction();

            $sql = "INSERT INTO public.nfe_emitidas (
                company_id, chave_acesso, numero, serie, modelo,
                data_emissao, data_saida_entrada, data_autorizacao,
                emitente_cnpj, emitente_razao_social,
                destinatario_cpf_cnpj, destinatario_razao_social,
                valor_produtos, valor_servicos, valor_total,
                valor_icms, valor_ipi, valor_pis, valor_cofins,
                status, protocolo_autorizacao, motivo_rejeicao,
                xml_assinado, xml_autorizado, xml_protocolo,
                ambiente, created_by
            ) VALUES (
                :company_id, :chave_acesso, :numero, :serie, :modelo,
                :data_emissao, :data_saida_entrada, :data_autorizacao,
                :emitente_cnpj, :emitente_razao_social,
                :destinatario_cpf_cnpj, :destinatario_razao_social,
                :valor_produtos, :valor_servicos, :valor_total,
                :valor_icms, :valor_ipi, :valor_pis, :valor_cofins,
                :status, :protocolo_autorizacao, :motivo_rejeicao,
                :xml_assinado, :xml_autorizado, :xml_protocolo,
                :ambiente, :created_by
            ) RETURNING id";

            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                ':company_id' => $nfeData['company_id'],
                ':chave_acesso' => $nfeData['chave_acesso'],
                ':numero' => $nfeData['numero'],
                ':serie' => $nfeData['serie'],
                ':modelo' => $nfeData['modelo'] ?? '55',
                ':data_emissao' => $nfeData['data_emissao'],
                ':data_saida_entrada' => $nfeData['data_saida_entrada'] ?? null,
                ':data_autorizacao' => $nfeData['data_autorizacao'] ?? null,
                ':emitente_cnpj' => $nfeData['emitente_cnpj'],
                ':emitente_razao_social' => $nfeData['emitente_razao_social'],
                ':destinatario_cpf_cnpj' => $nfeData['destinatario_cpf_cnpj'],
                ':destinatario_razao_social' => $nfeData['destinatario_razao_social'],
                ':valor_produtos' => $nfeData['valor_produtos'] ?? 0,
                ':valor_servicos' => $nfeData['valor_servicos'] ?? 0,
                ':valor_total' => $nfeData['valor_total'],
                ':valor_icms' => $nfeData['valor_icms'] ?? 0,
                ':valor_ipi' => $nfeData['valor_ipi'] ?? 0,
                ':valor_pis' => $nfeData['valor_pis'] ?? 0,
                ':valor_cofins' => $nfeData['valor_cofins'] ?? 0,
                ':status' => $nfeData['status'] ?? 'rascunho',
                ':protocolo_autorizacao' => $nfeData['protocolo_autorizacao'] ?? null,
                ':motivo_rejeicao' => $nfeData['motivo_rejeicao'] ?? null,
                ':xml_assinado' => $nfeData['xml_assinado'] ?? null,
                ':xml_autorizado' => $nfeData['xml_autorizado'] ?? null,
                ':xml_protocolo' => $nfeData['xml_protocolo'] ?? null,
                ':ambiente' => $nfeData['ambiente'] ?? 'homologacao',
                ':created_by' => $nfeData['created_by'] ?? null
            ]);

            $nfeId = $stmt->fetchColumn();

            // Salvar itens
            if (isset($nfeData['itens']) && is_array($nfeData['itens'])) {
                $this->saveItens($nfeId, $nfeData['company_id'], $nfeData['itens']);
            }

            $this->db->commit();
            return $nfeId;
        } catch (PDOException $e) {
            $this->db->rollBack();
            throw new \Exception("Erro ao salvar NF-e: " . $e->getMessage());
        }
    }

    /**
     * Salva itens da NF-e
     */
    public function saveItens(string $nfeId, string $companyId, array $itens): void
    {
        $sql = "INSERT INTO public.nfe_itens (
            nfe_id, company_id, produto_id, sequencia, codigo, descricao,
            ncm, cfop, unidade, quantidade, valor_unitario, valor_total, desconto,
            icms_cst, icms_csosn, icms_base_calculo, icms_aliquota, icms_valor,
            ipi_cst, ipi_base_calculo, ipi_aliquota, ipi_valor,
            pis_cst, pis_base_calculo, pis_aliquota, pis_valor,
            cofins_cst, cofins_base_calculo, cofins_aliquota, cofins_valor
        ) VALUES (
            :nfe_id, :company_id, :produto_id, :sequencia, :codigo, :descricao,
            :ncm, :cfop, :unidade, :quantidade, :valor_unitario, :valor_total, :desconto,
            :icms_cst, :icms_csosn, :icms_base_calculo, :icms_aliquota, :icms_valor,
            :ipi_cst, :ipi_base_calculo, :ipi_aliquota, :ipi_valor,
            :pis_cst, :pis_base_calculo, :pis_aliquota, :pis_valor,
            :cofins_cst, :cofins_base_calculo, :cofins_aliquota, :cofins_valor
        )";

        $stmt = $this->db->prepare($sql);

        foreach ($itens as $item) {
            $stmt->execute([
                ':nfe_id' => $nfeId,
                ':company_id' => $companyId,
                ':produto_id' => $item['produto_id'] ?? null,
                ':sequencia' => $item['sequencia'],
                ':codigo' => $item['codigo'] ?? null,
                ':descricao' => $item['descricao'],
                ':ncm' => $item['ncm'] ?? null,
                ':cfop' => $item['cfop'] ?? null,
                ':unidade' => $item['unidade'],
                ':quantidade' => $item['quantidade'],
                ':valor_unitario' => $item['valor_unitario'],
                ':valor_total' => $item['valor_total'],
                ':desconto' => $item['desconto'] ?? 0,
                ':icms_cst' => $item['icms_cst'] ?? null,
                ':icms_csosn' => $item['icms_csosn'] ?? null,
                ':icms_base_calculo' => $item['icms_base_calculo'] ?? 0,
                ':icms_aliquota' => $item['icms_aliquota'] ?? 0,
                ':icms_valor' => $item['icms_valor'] ?? 0,
                ':ipi_cst' => $item['ipi_cst'] ?? null,
                ':ipi_base_calculo' => $item['ipi_base_calculo'] ?? 0,
                ':ipi_aliquota' => $item['ipi_aliquota'] ?? 0,
                ':ipi_valor' => $item['ipi_valor'] ?? 0,
                ':pis_cst' => $item['pis_cst'] ?? null,
                ':pis_base_calculo' => $item['pis_base_calculo'] ?? 0,
                ':pis_aliquota' => $item['pis_aliquota'] ?? 0,
                ':pis_valor' => $item['pis_valor'] ?? 0,
                ':cofins_cst' => $item['cofins_cst'] ?? null,
                ':cofins_base_calculo' => $item['cofins_base_calculo'] ?? 0,
                ':cofins_aliquota' => $item['cofins_aliquota'] ?? 0,
                ':cofins_valor' => $item['cofins_valor'] ?? 0
            ]);
        }
    }

    /**
     * Busca NF-e por ID
     */
    public function findById(string $id, string $companyId): ?array
    {
        $sql = "SELECT * FROM public.nfe_emitidas 
                WHERE id = :id AND company_id = :company_id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id, ':company_id' => $companyId]);
        
        $nfe = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($nfe) {
            $nfe['itens'] = $this->findItensByNfeId($id);
        }
        
        return $nfe ?: null;
    }

    /**
     * Busca NF-e por chave de acesso
     */
    public function findByChaveAcesso(string $chaveAcesso, string $companyId): ?array
    {
        $sql = "SELECT * FROM public.nfe_emitidas 
                WHERE chave_acesso = :chave_acesso AND company_id = :company_id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':chave_acesso' => $chaveAcesso,
            ':company_id' => $companyId
        ]);
        
        $nfe = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($nfe) {
            $nfe['itens'] = $this->findItensByNfeId($nfe['id']);
        }
        
        return $nfe ?: null;
    }

    /**
     * Busca itens da NF-e
     */
    public function findItensByNfeId(string $nfeId): array
    {
        $sql = "SELECT * FROM public.nfe_itens 
                WHERE nfe_id = :nfe_id 
                ORDER BY sequencia";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':nfe_id' => $nfeId]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Atualiza status da NF-e
     */
    public function updateStatus(string $id, string $companyId, string $status, ?string $protocolo = null, ?string $xmlAutorizado = null, ?string $xmlProtocolo = null, ?string $motivoRejeicao = null): bool
    {
        $sql = "UPDATE public.nfe_emitidas 
                SET status = :status,
                    protocolo_autorizacao = COALESCE(:protocolo, protocolo_autorizacao),
                    xml_autorizado = COALESCE(:xml_autorizado, xml_autorizado),
                    xml_protocolo = COALESCE(:xml_protocolo, xml_protocolo),
                    motivo_rejeicao = COALESCE(:motivo_rejeicao, motivo_rejeicao),
                    data_autorizacao = CASE WHEN :status = 'autorizada' THEN NOW() ELSE data_autorizacao END,
                    updated_at = NOW()
                WHERE id = :id AND company_id = :company_id";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':id' => $id,
            ':company_id' => $companyId,
            ':status' => $status,
            ':protocolo' => $protocolo,
            ':xml_autorizado' => $xmlAutorizado,
            ':xml_protocolo' => $xmlProtocolo,
            ':motivo_rejeicao' => $motivoRejeicao
        ]);
    }

    /**
     * Salva evento da NF-e
     */
    public function saveEvento(array $eventoData): string
    {
        $sql = "INSERT INTO public.nfe_eventos (
            nfe_id, company_id, tipo_evento, descricao_evento,
            sequencia, protocolo, justificativa,
            xml_evento, xml_retorno, status, motivo_rejeicao,
            data_evento, created_by
        ) VALUES (
            :nfe_id, :company_id, :tipo_evento, :descricao_evento,
            :sequencia, :protocolo, :justificativa,
            :xml_evento, :xml_retorno, :status, :motivo_rejeicao,
            :data_evento, :created_by
        ) RETURNING id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':nfe_id' => $eventoData['nfe_id'],
            ':company_id' => $eventoData['company_id'],
            ':tipo_evento' => $eventoData['tipo_evento'],
            ':descricao_evento' => $eventoData['descricao_evento'],
            ':sequencia' => $eventoData['sequencia'] ?? 1,
            ':protocolo' => $eventoData['protocolo'] ?? null,
            ':justificativa' => $eventoData['justificativa'] ?? null,
            ':xml_evento' => $eventoData['xml_evento'],
            ':xml_retorno' => $eventoData['xml_retorno'] ?? null,
            ':status' => $eventoData['status'] ?? 'pendente',
            ':motivo_rejeicao' => $eventoData['motivo_rejeicao'] ?? null,
            ':data_evento' => $eventoData['data_evento'] ?? date('Y-m-d H:i:s'),
            ':created_by' => $eventoData['created_by'] ?? null
        ]);

        return $stmt->fetchColumn();
    }

    /**
     * Salva cancelamento
     */
    public function saveCancelamento(array $cancelamentoData): string
    {
        $sql = "INSERT INTO public.nfe_cancelamentos (
            nfe_id, company_id, justificativa, protocolo_cancelamento,
            xml_cancelamento, xml_retorno, status, data_cancelamento, created_by
        ) VALUES (
            :nfe_id, :company_id, :justificativa, :protocolo_cancelamento,
            :xml_cancelamento, :xml_retorno, :status, :data_cancelamento, :created_by
        ) RETURNING id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':nfe_id' => $cancelamentoData['nfe_id'],
            ':company_id' => $cancelamentoData['company_id'],
            ':justificativa' => $cancelamentoData['justificativa'],
            ':protocolo_cancelamento' => $cancelamentoData['protocolo_cancelamento'] ?? null,
            ':xml_cancelamento' => $cancelamentoData['xml_cancelamento'],
            ':xml_retorno' => $cancelamentoData['xml_retorno'] ?? null,
            ':status' => $cancelamentoData['status'] ?? 'pendente',
            ':data_cancelamento' => $cancelamentoData['data_cancelamento'] ?? date('Y-m-d H:i:s'),
            ':created_by' => $cancelamentoData['created_by'] ?? null
        ]);

        return $stmt->fetchColumn();
    }

    /**
     * Salva Carta de Correção
     */
    public function saveCCe(array $cceData): string
    {
        $sql = "INSERT INTO public.nfe_cces (
            nfe_id, company_id, sequencia, correcao, protocolo_cc,
            xml_cc, xml_retorno, status, data_cc, created_by
        ) VALUES (
            :nfe_id, :company_id, :sequencia, :correcao, :protocolo_cc,
            :xml_cc, :xml_retorno, :status, :data_cc, :created_by
        ) RETURNING id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':nfe_id' => $cceData['nfe_id'],
            ':company_id' => $cceData['company_id'],
            ':sequencia' => $cceData['sequencia'],
            ':correcao' => $cceData['correcao'],
            ':protocolo_cc' => $cceData['protocolo_cc'] ?? null,
            ':xml_cc' => $cceData['xml_cc'],
            ':xml_retorno' => $cceData['xml_retorno'] ?? null,
            ':status' => $cceData['status'] ?? 'pendente',
            ':data_cc' => $cceData['data_cc'] ?? date('Y-m-d H:i:s'),
            ':created_by' => $cceData['created_by'] ?? null
        ]);

        return $stmt->fetchColumn();
    }

    /**
     * Salva inutilização
     */
    public function saveInutilizacao(array $inutilizacaoData): string
    {
        $sql = "INSERT INTO public.nfe_inutilizacoes (
            company_id, serie, numero_inicial, numero_final, justificativa,
            protocolo_inutilizacao, xml_inutilizacao, xml_retorno,
            status, data_inutilizacao, created_by
        ) VALUES (
            :company_id, :serie, :numero_inicial, :numero_final, :justificativa,
            :protocolo_inutilizacao, :xml_inutilizacao, :xml_retorno,
            :status, :data_inutilizacao, :created_by
        ) RETURNING id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':company_id' => $inutilizacaoData['company_id'],
            ':serie' => $inutilizacaoData['serie'],
            ':numero_inicial' => $inutilizacaoData['numero_inicial'],
            ':numero_final' => $inutilizacaoData['numero_final'],
            ':justificativa' => $inutilizacaoData['justificativa'],
            ':protocolo_inutilizacao' => $inutilizacaoData['protocolo_inutilizacao'] ?? null,
            ':xml_inutilizacao' => $inutilizacaoData['xml_inutilizacao'],
            ':xml_retorno' => $inutilizacaoData['xml_retorno'] ?? null,
            ':status' => $inutilizacaoData['status'] ?? 'pendente',
            ':data_inutilizacao' => $inutilizacaoData['data_inutilizacao'] ?? date('Y-m-d H:i:s'),
            ':created_by' => $inutilizacaoData['created_by'] ?? null
        ]);

        return $stmt->fetchColumn();
    }

    /**
     * Busca próxima sequência de CC-e para uma NF-e
     */
    public function getNextCCeSequencia(string $nfeId): int
    {
        $sql = "SELECT COALESCE(MAX(sequencia), 0) + 1 as next_sequencia
                FROM public.nfe_cces
                WHERE nfe_id = :nfe_id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([':nfe_id' => $nfeId]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int)($result['next_sequencia'] ?? 1);
    }

    /**
     * Busca próxima sequência de evento para uma NF-e
     */
    public function getNextEventoSequencia(string $nfeId): int
    {
        $sql = "SELECT COALESCE(MAX(sequencia), 0) + 1 as next_sequencia
                FROM public.nfe_eventos
                WHERE nfe_id = :nfe_id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([':nfe_id' => $nfeId]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int)($result['next_sequencia'] ?? 1);
    }
}

