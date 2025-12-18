<?php

namespace App\Controllers;

use App\Fiscal\Helpers\CertificateManager;
use App\Fiscal\Services\NfeService;
use App\Fiscal\Services\NfeStatusService;
use App\Fiscal\Services\NfeEventService;
use App\Fiscal\Services\NfeConsultaService;
use App\Repositories\NfeRepository;
use App\Config\Logger;

class NfeController
{
    /**
     * Consulta status do serviço da SEFAZ
     */
    public function consultarStatus()
    {
        header('Content-Type: application/json');

        try {
            $uf = $_GET['uf'] ?? $_POST['uf'] ?? null;
            $cnpj = $_GET['cnpj'] ?? $_POST['cnpj'] ?? null;
            $ambiente = $_GET['ambiente'] ?? $_POST['ambiente'] ?? 'homologacao';

            if (!$uf || !$cnpj) {
                http_response_code(400);
                echo json_encode(['error' => 'UF e CNPJ são obrigatórios']);
                return;
            }

            $statusService = new NfeStatusService($uf, $ambiente);
            $resultado = $statusService->consultarStatus($cnpj);

            echo json_encode($resultado);

        } catch (\Exception $e) {
            Logger::error("Erro no controller de status", [
                'error' => $e->getMessage()
            ]);

            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    /**
     * Gera e autoriza uma NF-e
     */
    public function gerarEAutorizar()
    {
        header('Content-Type: application/json');

        try {
            $input = json_decode(file_get_contents('php://input'), true);

            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'Dados inválidos']);
                return;
            }

            // Validações básicas
            $required = ['company_id', 'numero', 'serie', 'emitente_cnpj', 'emitente_razao_social', 
                        'destinatario_cpf_cnpj', 'destinatario_razao_social', 'valor_total', 'itens', 
                        'cert_path', 'cert_password', 'uf'];
            
            foreach ($required as $field) {
                if (!isset($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['error' => "Campo obrigatório ausente: {$field}"]);
                    return;
                }
            }

            // Carrega certificado
            $certManager = new CertificateManager($input['cert_path'], $input['cert_password']);

            // Valida certificado
            if (!$certManager->isValid()) {
                http_response_code(400);
                echo json_encode(['error' => 'Certificado digital inválido ou expirado']);
                return;
            }

            // Cria serviços
            $nfeRepository = new NfeRepository();
            $ambiente = $input['ambiente'] ?? 'homologacao';
            $nfeService = new NfeService($certManager, $nfeRepository, $input['uf'], $ambiente);

            // Gera e autoriza
            $resultado = $nfeService->gerarEAutorizar($input);

            if ($resultado['success']) {
                echo json_encode($resultado);
            } else {
                http_response_code(400);
                echo json_encode($resultado);
            }

        } catch (\Exception $e) {
            Logger::error("Erro ao gerar NF-e", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    /**
     * Consulta NF-e por chave de acesso
     */
    public function consultarPorChave()
    {
        header('Content-Type: application/json');

        try {
            $chaveAcesso = $_GET['chave'] ?? $_POST['chave'] ?? null;
            $uf = $_GET['uf'] ?? $_POST['uf'] ?? null;
            $ambiente = $_GET['ambiente'] ?? $_POST['ambiente'] ?? 'homologacao';

            if (!$chaveAcesso || !$uf) {
                http_response_code(400);
                echo json_encode(['error' => 'Chave de acesso e UF são obrigatórios']);
                return;
            }

            $consultaService = new NfeConsultaService($uf, $ambiente);
            $resultado = $consultaService->consultarPorChave($chaveAcesso);

            echo json_encode($resultado);

        } catch (\Exception $e) {
            Logger::error("Erro ao consultar NF-e", [
                'error' => $e->getMessage()
            ]);

            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    /**
     * Cancela uma NF-e
     */
    public function cancelar()
    {
        header('Content-Type: application/json');

        try {
            $input = json_decode(file_get_contents('php://input'), true);

            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'Dados inválidos']);
                return;
            }

            $required = ['chave_acesso', 'justificativa', 'company_id', 'cert_path', 'cert_password', 'uf'];
            
            foreach ($required as $field) {
                if (!isset($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['error' => "Campo obrigatório ausente: {$field}"]);
                    return;
                }
            }

            // Carrega certificado
            $certManager = new CertificateManager($input['cert_path'], $input['cert_password']);

            // Cria serviços
            $nfeRepository = new NfeRepository();
            $ambiente = $input['ambiente'] ?? 'homologacao';
            $eventService = new NfeEventService($certManager, $nfeRepository, $input['uf'], $ambiente);

            // Cancela
            $resultado = $eventService->cancelar(
                $input['chave_acesso'],
                $input['justificativa'],
                $input['company_id'],
                $input['user_id'] ?? null
            );

            if ($resultado['success']) {
                echo json_encode($resultado);
            } else {
                http_response_code(400);
                echo json_encode($resultado);
            }

        } catch (\Exception $e) {
            Logger::error("Erro ao cancelar NF-e", [
                'error' => $e->getMessage()
            ]);

            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    /**
     * Emite Carta de Correção Eletrônica
     */
    public function emitirCCe()
    {
        header('Content-Type: application/json');

        try {
            $input = json_decode(file_get_contents('php://input'), true);

            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'Dados inválidos']);
                return;
            }

            $required = ['chave_acesso', 'correcao', 'company_id', 'cert_path', 'cert_password', 'uf'];
            
            foreach ($required as $field) {
                if (!isset($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['error' => "Campo obrigatório ausente: {$field}"]);
                    return;
                }
            }

            // Carrega certificado
            $certManager = new CertificateManager($input['cert_path'], $input['cert_password']);

            // Cria serviços
            $nfeRepository = new NfeRepository();
            $ambiente = $input['ambiente'] ?? 'homologacao';
            $eventService = new NfeEventService($certManager, $nfeRepository, $input['uf'], $ambiente);

            // Emite CC-e
            $resultado = $eventService->emitirCCe(
                $input['chave_acesso'],
                $input['correcao'],
                $input['company_id'],
                $input['user_id'] ?? null
            );

            if ($resultado['success']) {
                echo json_encode($resultado);
            } else {
                http_response_code(400);
                echo json_encode($resultado);
            }

        } catch (\Exception $e) {
            Logger::error("Erro ao emitir CC-e", [
                'error' => $e->getMessage()
            ]);

            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    /**
     * Inutiliza faixa de numeração
     */
    public function inutilizar()
    {
        header('Content-Type: application/json');

        try {
            $input = json_decode(file_get_contents('php://input'), true);

            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'Dados inválidos']);
                return;
            }

            $required = ['serie', 'numero_inicial', 'numero_final', 'justificativa', 'company_id', 'cnpj', 'cert_path', 'cert_password', 'uf'];
            
            foreach ($required as $field) {
                if (!isset($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['error' => "Campo obrigatório ausente: {$field}"]);
                    return;
                }
            }

            // Carrega certificado
            $certManager = new CertificateManager($input['cert_path'], $input['cert_password']);

            // Cria serviços
            $nfeRepository = new NfeRepository();
            $ambiente = $input['ambiente'] ?? 'homologacao';
            $eventService = new NfeEventService($certManager, $nfeRepository, $input['uf'], $ambiente);

            // Inutiliza
            $resultado = $eventService->inutilizar(
                $input['serie'],
                $input['numero_inicial'],
                $input['numero_final'],
                $input['justificativa'],
                $input['company_id'],
                $input['cnpj'],
                $input['user_id'] ?? null
            );

            if ($resultado['success']) {
                echo json_encode($resultado);
            } else {
                http_response_code(400);
                echo json_encode($resultado);
            }

        } catch (\Exception $e) {
            Logger::error("Erro ao inutilizar numeração", [
                'error' => $e->getMessage()
            ]);

            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    /**
     * Busca NF-e por ID ou chave de acesso
     */
    public function buscar()
    {
        header('Content-Type: application/json');

        try {
            $id = $_GET['id'] ?? null;
            $chaveAcesso = $_GET['chave'] ?? null;
            $companyId = $_GET['company_id'] ?? null;

            if (!$companyId) {
                http_response_code(400);
                echo json_encode(['error' => 'company_id é obrigatório']);
                return;
            }

            if (!$id && !$chaveAcesso) {
                http_response_code(400);
                echo json_encode(['error' => 'ID ou chave de acesso é obrigatório']);
                return;
            }

            $nfeRepository = new NfeRepository();

            if ($id) {
                $nfe = $nfeRepository->findById($id, $companyId);
            } else {
                $nfe = $nfeRepository->findByChaveAcesso($chaveAcesso, $companyId);
            }

            if (!$nfe) {
                http_response_code(404);
                echo json_encode(['error' => 'NF-e não encontrada']);
                return;
            }

            echo json_encode($nfe);

        } catch (\Exception $e) {
            Logger::error("Erro ao buscar NF-e", [
                'error' => $e->getMessage()
            ]);

            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
}

