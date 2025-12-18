# 📋 ANÁLISE E IMPLEMENTAÇÃO COMPLETA - NF-e DE SAÍDA
## Sistema Apex-Glass ERP - Módulo Faturamento Fiscal

---

## 🔍 1. ANÁLISE DO CÓDIGO EXISTENTE

### 1.1 Frontend - Notas de Saída

#### ✅ O que já existe:

**Página Principal (`FiscalNotes.tsx`):**
- ✅ Listagem de notas fiscais com filtros (Todas, Faturados, Autorizadas, Pendentes)
- ✅ Botão "Emitir Nota de Saída" funcional
- ✅ Modal de seleção de orçamentos/vendas
- ✅ Geração automática de nota a partir de venda
- ✅ Status badges (Pendente, Enviado, Autorizado, Rejeitado)
- ✅ Cards de estatísticas (NF-e emitidas, valor faturado, pendentes)
- ✅ Consulta SEFAZ (estrutura preparada, mas não implementada)

**Página de Criação (`FiscalNoteCreate.tsx`):**
- ✅ Formulário completo de nota fiscal
- ✅ Integração com orçamentos/vendas
- ✅ Cálculo de impostos básico (ICMS, PIS, COFINS, IPI)
- ✅ Geração de múltiplas notas
- ⚠️ Envio para SEFAZ é **MOCK** (simulado com setTimeout)

**Serviços Fiscais:**
- ✅ `nfeService.ts` - Estrutura completa de serviços
- ✅ `FiscalService.ts` - Cálculo de impostos
- ✅ `FiscalValidator.ts` - Validação de dados
- ✅ `nfeVerificationService.ts` - Verificação de sistema

#### ❌ O que é apenas UI/Mock:

1. **Envio para SEFAZ** (`FiscalNotes.tsx:725-743`):
   ```typescript
   // TODO: Aqui você implementaria a chamada real para a API da SEFAZ
   // Por enquanto, apenas atualizamos o status para paid
   ```
   - Status atualizado para 'paid' sem comunicação real
   - Não há geração de XML
   - Não há assinatura digital
   - Não há envio SOAP

2. **Assinatura de NF-e** (`nfeService.ts:248-284`):
   ```typescript
   // Por enquanto, retorna erro informativo
   throw new Error('Assinatura de NF-e deve ser feita no backend...');
   ```

3. **Envio SOAP** (`nfeService.ts:290-340`):
   ```typescript
   // TODO: Implementar envio real via SOAP
   return {
       success: false,
       erro: 'Envio de NF-e deve ser feito no backend via SOAP...'
   };
   ```

4. **Consulta SEFAZ** (`sefazService.ts`):
   - Retorna dados mockados
   - Não há comunicação real com webservices

### 1.2 Backend - Estrutura Existente

#### ✅ O que já existe:

**Estrutura PHP (`backend/src/`):**
- ✅ `Controllers/NfeController.php` - Controller base
- ✅ `Repositories/NfeRepository.php` - Acesso ao banco
- ✅ `Fiscal/Services/NfeService.php` - Lógica de negócio
- ✅ `Fiscal/Helpers/CertificateManager.php` - Gerenciamento de certificado
- ✅ `Fiscal/Helpers/SoapClient.php` - Cliente SOAP
- ✅ `Fiscal/Helpers/XmlValidator.php` - Validação XML

**Banco de Dados:**
- ✅ Tabela `nfe_emitidas` completa
- ✅ Tabela `nfe_itens` completa
- ✅ Tabela `nfe_eventos` (cancelamento, CC-e)
- ✅ Tabela `nfe_cancelamentos`
- ✅ Tabela `nfe_cces`
- ✅ Tabela `nfe_inutilizacoes`
- ✅ Tabela `fiscal_config` (configurações fiscais)

#### ⚠️ O que está incompleto:

1. **Endpoints da API não implementados:**
   - POST `/api/nfe/emitir` - Emitir NF-e
   - POST `/api/nfe/assinar` - Assinar XML
   - POST `/api/nfe/enviar` - Enviar para SEFAZ
   - POST `/api/nfe/cancelar` - Cancelar NF-e
   - POST `/api/nfe/cce` - Carta de Correção

2. **Geração de XML:**
   - Não há geração de XML conforme layout 4.00
   - Não há validação de schema XSD

3. **Comunicação SEFAZ:**
   - SOAP client não está funcional
   - Não há tratamento de retornos da SEFAZ

### 1.3 Pontos de Risco Identificados

1. **❌ CRÍTICO:** Não há emissão fiscal real
   - Tudo é simulado no frontend
   - Não há integração com SEFAZ

2. **⚠️ ALTO:** Dados obrigatórios podem estar faltando
   - Validação de campos obrigatórios incompleta
   - Alguns campos fiscais podem não estar sendo coletados

3. **⚠️ MÉDIO:** Certificado digital
   - Estrutura existe, mas não está sendo usada
   - Não há validação de certificado A1

4. **⚠️ BAIXO:** Performance
   - Cálculos de impostos podem ser otimizados
   - Falta cache de configurações fiscais

---

## 📄 2. DADOS OBRIGATÓRIOS PARA NF-e (Layout 4.00)

### 2.1 Emitente (Empresa)

| Campo | Obrigatório | Status Atual | Observações |
|-------|-------------|--------------|-------------|
| **CNPJ** | ✅ Sim | ✅ Existe | Validar formato (14 dígitos) |
| **Razão Social** | ✅ Sim | ✅ Existe | Máximo 60 caracteres |
| **Nome Fantasia** | ⚠️ Condicional | ✅ Existe | Obrigatório se houver |
| **Inscrição Estadual** | ⚠️ Condicional | ✅ Existe | Obrigatório se contribuinte ICMS |
| **Inscrição Municipal** | ❌ Não | ⚠️ Parcial | Para alguns municípios |
| **Endereço - Logradouro** | ✅ Sim | ✅ Existe | Máximo 60 caracteres |
| **Endereço - Número** | ✅ Sim | ✅ Existe | |
| **Endereço - Bairro** | ✅ Sim | ✅ Existe | Máximo 60 caracteres |
| **Endereço - Município** | ✅ Sim | ✅ Existe | Código IBGE |
| **Endereço - UF** | ✅ Sim | ✅ Existe | 2 caracteres |
| **Endereço - CEP** | ✅ Sim | ✅ Existe | 8 dígitos |
| **Telefone** | ⚠️ Condicional | ✅ Existe | Recomendado |
| **Email** | ⚠️ Condicional | ✅ Existe | Para envio automático |

**Status:** ✅ **COMPLETO** - Todos os campos obrigatórios existem

### 2.2 Destinatário (Cliente)

| Campo | Obrigatório | Status Atual | Observações |
|-------|-------------|--------------|-------------|
| **CPF/CNPJ** | ✅ Sim | ✅ Existe | Validar formato |
| **Razão Social/Nome** | ✅ Sim | ✅ Existe | |
| **Inscrição Estadual** | ⚠️ Condicional | ⚠️ **FALTANDO** | Obrigatório se contribuinte |
| **Inscrição Municipal** | ❌ Não | ⚠️ Parcial | |
| **Endereço - Logradouro** | ✅ Sim | ✅ Existe | |
| **Endereço - Número** | ✅ Sim | ✅ Existe | |
| **Endereço - Bairro** | ✅ Sim | ✅ Existe | |
| **Endereço - Município** | ✅ Sim | ✅ Existe | Código IBGE |
| **Endereço - UF** | ✅ Sim | ✅ Existe | |
| **Endereço - CEP** | ✅ Sim | ✅ Existe | |
| **Telefone** | ⚠️ Condicional | ✅ Existe | |
| **Email** | ⚠️ Condicional | ✅ Existe | |

**Status:** ⚠️ **INCOMPLETO** - Falta Inscrição Estadual do destinatário

### 2.3 Produtos/Itens

| Campo | Obrigatório | Status Atual | Observações |
|-------|-------------|--------------|-------------|
| **Código do Produto** | ✅ Sim | ✅ Existe | Código interno |
| **Descrição** | ✅ Sim | ✅ Existe | Máximo 120 caracteres |
| **NCM** | ✅ Sim | ✅ Existe | 8 dígitos |
| **CFOP** | ✅ Sim | ✅ Existe | 4 dígitos |
| **Unidade** | ✅ Sim | ✅ Existe | UN, KG, etc. |
| **Quantidade** | ✅ Sim | ✅ Existe | > 0 |
| **Valor Unitário** | ✅ Sim | ✅ Existe | > 0 |
| **Valor Total** | ✅ Sim | ✅ Existe | Calculado |
| **CST/CSOSN ICMS** | ✅ Sim | ✅ Existe | Depende do regime |
| **Base Cálculo ICMS** | ✅ Sim | ✅ Existe | |
| **Alíquota ICMS** | ✅ Sim | ✅ Existe | |
| **Valor ICMS** | ✅ Sim | ✅ Existe | |
| **CST IPI** | ⚠️ Condicional | ✅ Existe | Se produto sujeito a IPI |
| **CST PIS** | ✅ Sim | ✅ Existe | |
| **CST COFINS** | ✅ Sim | ✅ Existe | |
| **Base Cálculo PIS** | ✅ Sim | ✅ Existe | |
| **Base Cálculo COFINS** | ✅ Sim | ✅ Existe | |
| **Alíquota PIS** | ✅ Sim | ✅ Existe | |
| **Alíquota COFINS** | ✅ Sim | ✅ Existe | |
| **Valor PIS** | ✅ Sim | ✅ Existe | |
| **Valor COFINS** | ✅ Sim | ✅ Existe | |

**Status:** ✅ **COMPLETO** - Todos os campos obrigatórios existem

### 2.4 Impostos - Totais da Nota

| Campo | Obrigatório | Status Atual | Observações |
|-------|-------------|--------------|-------------|
| **Valor Total dos Produtos** | ✅ Sim | ✅ Existe | |
| **Valor Total dos Serviços** | ✅ Sim | ✅ Existe | |
| **Valor Total do Desconto** | ✅ Sim | ✅ Existe | |
| **Valor Total do Frete** | ⚠️ Condicional | ✅ Existe | Se houver |
| **Valor Total do Seguro** | ⚠️ Condicional | ✅ Existe | Se houver |
| **Valor Total ICMS** | ✅ Sim | ✅ Existe | |
| **Valor Total IPI** | ⚠️ Condicional | ✅ Existe | Se houver |
| **Valor Total PIS** | ✅ Sim | ✅ Existe | |
| **Valor Total COFINS** | ✅ Sim | ✅ Existe | |
| **Valor Total da Nota** | ✅ Sim | ✅ Existe | |

**Status:** ✅ **COMPLETO** - Todos os campos obrigatórios existem

### 2.5 Dados Adicionais Obrigatórios

| Campo | Obrigatório | Status Atual | Observações |
|-------|-------------|--------------|-------------|
| **Natureza da Operação** | ✅ Sim | ✅ Existe | Máximo 60 caracteres |
| **Modelo** | ✅ Sim | ✅ Existe | 55 para NF-e |
| **Série** | ✅ Sim | ✅ Existe | 3 dígitos |
| **Número** | ✅ Sim | ✅ Existe | 9 dígitos |
| **Data de Emissão** | ✅ Sim | ✅ Existe | |
| **Data de Saída** | ⚠️ Condicional | ✅ Existe | Se diferente da emissão |
| **Tipo de Emissão** | ✅ Sim | ⚠️ **FALTANDO** | Normal=1, Contingência=2-9 |
| **Finalidade** | ✅ Sim | ✅ Existe | Normal, Ajuste, etc. |
| **Forma de Pagamento** | ⚠️ Condicional | ✅ Existe | Se houver pagamento |
| **Chave de Acesso** | ✅ Sim | ✅ Existe | Gerada automaticamente |

**Status:** ⚠️ **QUASE COMPLETO** - Falta Tipo de Emissão

### 2.6 Resumo de Campos Faltantes

**❌ Campos Ausentes:**
1. Inscrição Estadual do Destinatário (obrigatório se contribuinte)
2. Tipo de Emissão (obrigatório, padrão: 1=Normal)

**⚠️ Campos Incompletos:**
1. Validação de formato de CPF/CNPJ
2. Validação de código IBGE do município
3. Validação de CEP

---

## ⚙️ 3. FLUXO TÉCNICO DA NF-e (Layout 4.00)

### 3.1 Fluxo Completo de Emissão

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DE EMISSÃO NF-e                      │
└─────────────────────────────────────────────────────────────┘

1. VALIDAÇÃO DE DADOS (Backend)
   ├─ Validar campos obrigatórios
   ├─ Validar formato de dados (CPF/CNPJ, CEP, etc.)
   ├─ Validar regras fiscais (CFOP, CST, etc.)
   └─ Retornar erros se houver

2. GERAÇÃO DO XML (Backend)
   ├─ Montar estrutura XML conforme layout 4.00
   ├─ Preencher dados do emitente
   ├─ Preencher dados do destinatário
   ├─ Preencher itens com impostos
   ├─ Calcular totais
   └─ Validar XML contra schema XSD

3. ASSINATURA DIGITAL (Backend)
   ├─ Carregar certificado A1 (.pfx)
   ├─ Extrair chave privada
   ├─ Assinar XML com algoritmo RSA-SHA256
   ├─ Inserir assinatura no XML
   └─ Validar assinatura

4. ENVIO SOAP PARA SEFAZ (Backend)
   ├─ Obter endpoint SEFAZ (homologação/produção)
   ├─ Montar envelope SOAP
   ├─ Enviar XML assinado via SOAP
   ├─ Aguardar retorno
   └─ Processar retorno

5. CONSULTA DE AUTORIZAÇÃO (Backend)
   ├─ Se retorno = "Lote Recebido"
   ├─ Consultar recibo de processamento
   ├─ Aguardar processamento (polling)
   └─ Obter protocolo de autorização

6. TRATAMENTO DE RETORNO (Backend)
   ├─ Se AUTORIZADA:
   │  ├─ Salvar XML autorizado
   │  ├─ Salvar protocolo
   │  ├─ Atualizar status = 'autorizada'
   │  └─ Gerar DANFE (PDF)
   │
   ├─ Se REJEITADA:
   │  ├─ Salvar motivo de rejeição
   │  ├─ Atualizar status = 'rejeitada'
   │  └─ Retornar erro para frontend
   │
   └─ Se DENEGADA:
      ├─ Salvar motivo
      ├─ Atualizar status = 'denegada'
      └─ Retornar erro para frontend

7. PERSISTÊNCIA (Backend)
   ├─ Salvar XML assinado
   ├─ Salvar XML autorizado (se autorizada)
   ├─ Salvar protocolo
   ├─ Atualizar status no banco
   └─ Registrar log de operação
```

### 3.2 Estrutura de Serviços Recomendada

#### Backend (PHP)

```php
// backend/src/Fiscal/Services/NfeEmissionService.php

class NfeEmissionService {
    /**
     * 1. Validar dados da NF-e
     */
    public function validateNfeData(array $nfeData): ValidationResult {
        // Validar campos obrigatórios
        // Validar formatos (CPF/CNPJ, CEP, etc.)
        // Validar regras fiscais
        // Retornar erros se houver
    }
    
    /**
     * 2. Gerar XML da NF-e
     */
    public function generateXml(array $nfeData): string {
        // Montar XML conforme layout 4.00
        // Usar biblioteca XML (SimpleXML, DOMDocument)
        // Validar contra schema XSD
    }
    
    /**
     * 3. Assinar XML
     */
    public function signXml(string $xml, string $certificatePath, string $password): string {
        // Carregar certificado A1
        // Assinar XML
        // Inserir assinatura no XML
    }
    
    /**
     * 4. Enviar para SEFAZ
     */
    public function sendToSefaz(string $signedXml, string $uf, string $ambiente): SefazResponse {
        // Obter endpoint SEFAZ
        // Montar envelope SOAP
        // Enviar via SOAP
        // Processar retorno
    }
    
    /**
     * 5. Consultar autorização
     */
    public function consultAuthorization(string $recibo, string $uf, string $ambiente): AuthorizationResult {
        // Consultar recibo
        // Aguardar processamento (polling)
        // Retornar protocolo ou erro
    }
    
    /**
     * 6. Processar retorno
     */
    public function processResponse(SefazResponse $response, string $nfeId): void {
        // Se autorizada: salvar XML autorizado
        // Se rejeitada: salvar motivo
        // Atualizar status no banco
    }
}
```

#### Frontend (TypeScript)

```typescript
// src/services/fiscal/nfeEmissionService.ts

export const nfeEmissionService = {
    /**
     * Emitir NF-e completa
     */
    async emitirNFe(nota: NotaFiscal): Promise<EmissionResult> {
        // 1. Validar dados no frontend (validação rápida)
        const validation = fiscalValidator.validate(nota);
        if (!validation.valida) {
            throw new Error('Dados inválidos: ' + validation.erros.join(', '));
        }
        
        // 2. Chamar API backend
        const response = await fetch('/api/nfe/emitir', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nota)
        });
        
        // 3. Processar retorno
        const result = await response.json();
        
        if (result.success) {
            // Atualizar UI
            // Mostrar sucesso
            return result;
        } else {
            // Mostrar erros
            throw new Error(result.erro);
        }
    }
};
```

### 3.3 Pseudocódigo - Emissão Completa

```typescript
// Pseudocódigo do fluxo completo

async function emitirNFe(nota: NotaFiscal) {
    try {
        // 1. VALIDAÇÃO
        const validacao = await validarDados(nota);
        if (!validacao.valida) {
            throw new Error('Dados inválidos');
        }
        
        // 2. GERAR XML
        const xml = await gerarXML(nota);
        
        // 3. ASSINAR XML
        const certificado = await carregarCertificado(companyId);
        const xmlAssinado = await assinarXML(xml, certificado);
        
        // 4. ENVIAR PARA SEFAZ
        const config = await buscarConfigFiscal(companyId);
        const respostaEnvio = await enviarSEFAZ(xmlAssinado, config.uf, config.ambiente);
        
        if (respostaEnvio.codigo === '103') {
            // Lote recebido com sucesso
            const recibo = respostaEnvio.recibo;
            
            // 5. CONSULTAR AUTORIZAÇÃO
            let tentativas = 0;
            let autorizada = false;
            
            while (tentativas < 10 && !autorizada) {
                await aguardar(2000); // 2 segundos
                
                const consulta = await consultarAutorizacao(recibo, config.uf, config.ambiente);
                
                if (consulta.status === 'autorizada') {
                    autorizada = true;
                    
                    // 6. SALVAR XML AUTORIZADO
                    await salvarXMLAutorizado(nfeId, consulta.xmlAutorizado);
                    await salvarProtocolo(nfeId, consulta.protocolo);
                    await atualizarStatus(nfeId, 'autorizada');
                    
                    // 7. GERAR DANFE
                    await gerarDANFE(nfeId);
                    
                    return { success: true, protocolo: consulta.protocolo };
                } else if (consulta.status === 'rejeitada') {
                    await salvarMotivoRejeicao(nfeId, consulta.motivo);
                    await atualizarStatus(nfeId, 'rejeitada');
                    throw new Error('NF-e rejeitada: ' + consulta.motivo);
                }
                
                tentativas++;
            }
            
            throw new Error('Timeout ao consultar autorização');
        } else {
            // Erro no envio
            throw new Error('Erro ao enviar: ' + respostaEnvio.motivo);
        }
    } catch (error) {
        // Tratar erro
        await registrarErro(nfeId, error);
        throw error;
    }
}
```

### 3.4 Bibliotecas Recomendadas

**Backend (PHP):**
- `nfe-php` ou `sped-nfe` - Geração de XML
- `phpseclib` - Assinatura digital
- `soap` (extensão PHP) - Comunicação SOAP
- `dom` (extensão PHP) - Manipulação XML

**Frontend (TypeScript):**
- `fast-xml-parser` - Parsing XML (se necessário)
- `jspdf` - Geração de DANFE (já existe)

---

## 📌 4. STATUS FISCAIS NO SISTEMA

### 4.1 Definição de Status

| Status | Quando Aplicar | Descrição | Ação Necessária |
|--------|----------------|-----------|-----------------|
| **PENDING** | Nota criada, não enviada | Rascunho ou aguardando envio | Enviar para SEFAZ |
| **AUTHORIZED** | SEFAZ autorizou a nota | Nota autorizada e válida | Gerar DANFE, disponibilizar |
| **REJECTED** | SEFAZ rejeitou a nota | Nota rejeitada por erro | Corrigir e reenviar |
| **CANCELED** | Nota foi cancelada | Nota cancelada (dentro do prazo) | Não pode mais ser usada |
| **DENIED** | SEFAZ denegou a nota | Nota denegada (problema cadastral) | Verificar cadastro na SEFAZ |
| **PROCESSING** | Aguardando processamento | Enviada, aguardando retorno | Consultar status |
| **SIGNED** | XML assinado, não enviado | Assinada mas não enviada | Enviar para SEFAZ |

### 4.2 Fluxo de Atualização de Status

```
PENDING → SIGNED → PROCESSING → AUTHORIZED
                              ↓
                         REJECTED
                              ↓
                         DENIED

AUTHORIZED → CANCELED (se dentro do prazo)
```

### 4.3 Implementação de Atualização Automática

#### Backend - Webhook/Job

```php
// backend/src/Fiscal/Services/NfeStatusUpdater.php

class NfeStatusUpdater {
    /**
     * Atualizar status após retorno da SEFAZ
     */
    public function updateStatusFromSefazResponse(
        string $nfeId,
        SefazResponse $response
    ): void {
        switch ($response->status) {
            case 'autorizada':
                $this->updateToAuthorized($nfeId, $response);
                break;
                
            case 'rejeitada':
                $this->updateToRejected($nfeId, $response);
                break;
                
            case 'denegada':
                $this->updateToDenied($nfeId, $response);
                break;
        }
    }
    
    private function updateToAuthorized(string $nfeId, SefazResponse $response): void {
        // Salvar XML autorizado
        // Salvar protocolo
        // Atualizar status
        // Gerar DANFE
        // Notificar frontend (WebSocket ou polling)
    }
}
```

#### Frontend - Polling/WebSocket

```typescript
// src/services/fiscal/nfeStatusService.ts

export const nfeStatusService = {
    /**
     * Consultar status de NF-e pendente
     */
    async consultarStatus(nfeId: string): Promise<StatusNFe> {
        const response = await fetch(`/api/nfe/${nfeId}/status`);
        return await response.json();
    },
    
    /**
     * Iniciar polling de status
     */
    iniciarPolling(nfeId: string, callback: (status: StatusNFe) => void): void {
        const interval = setInterval(async () => {
            const status = await this.consultarStatus(nfeId);
            callback(status);
            
            // Parar polling se status final
            if (['autorizada', 'rejeitada', 'denegada', 'cancelada'].includes(status.status)) {
                clearInterval(interval);
            }
        }, 5000); // A cada 5 segundos
    }
};
```

---

## 🧩 5. BACKEND RECOMENDADO

### 5.1 Arquitetura Ideal

```
┌─────────────────────────────────────────────────────────────┐
│                      ARQUITETURA BACKEND                     │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Frontend   │ (React/TypeScript)
│   (Supabase) │
└──────┬───────┘
       │ HTTP/REST
       │
┌──────▼──────────────────────────────────────────────────────┐
│              API Gateway / Edge Functions                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  POST /api/nfe/emitir                                │   │
│  │  POST /api/nfe/assinar                               │   │
│  │  POST /api/nfe/enviar                                │   │
│  │  POST /api/nfe/cancelar                             │   │
│  │  GET  /api/nfe/:id/status                           │   │
│  └──────────────────────────────────────────────────────┘   │
└──────┬──────────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────┐
│              Backend PHP / Node.js                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  NfeEmissionService                                  │   │
│  │  ├─ Validar dados                                    │   │
│  │  ├─ Gerar XML                                        │   │
│  │  ├─ Assinar XML                                      │   │
│  │  └─ Enviar SEFAZ                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  SefazClient                                          │   │
│  │  ├─ SOAP Client                                       │   │
│  │  ├─ Consulta Status                                  │   │
│  │  └─ Processa Retorno                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└──────┬──────────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────┐
│              Banco de Dados (Supabase/PostgreSQL)            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  nfe_emitidas                                        │   │
│  │  nfe_itens                                           │   │
│  │  nfe_eventos                                         │   │
│  │  fiscal_config                                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Endpoints da API

#### POST `/api/nfe/emitir`
**Descrição:** Criar e emitir NF-e completa

**Request:**
```json
{
  "company_id": "uuid",
  "numero": "1",
  "serie": "1",
  "data_emissao": "2024-01-20",
  "emitente": { ... },
  "destinatario": { ... },
  "itens": [ ... ],
  "totais": { ... }
}
```

**Response (Sucesso):**
```json
{
  "success": true,
  "nfe_id": "uuid",
  "chave_acesso": "35200112345678000123550010000000011234567890",
  "status": "autorizada",
  "protocolo": "123456789012345",
  "xml_autorizado": "..."
}
```

**Response (Erro):**
```json
{
  "success": false,
  "erro": "Dados inválidos",
  "detalhes": [
    { "campo": "destinatario.cpf_cnpj", "mensagem": "CPF/CNPJ inválido" }
  ]
}
```

#### POST `/api/nfe/assinar`
**Descrição:** Assinar XML de NF-e

**Request:**
```json
{
  "nfe_id": "uuid",
  "certificate_password": "senha"
}
```

**Response:**
```json
{
  "success": true,
  "xml_assinado": "...",
  "status": "assinada"
}
```

#### POST `/api/nfe/enviar`
**Descrição:** Enviar NF-e assinada para SEFAZ

**Request:**
```json
{
  "nfe_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "status": "processando",
  "recibo": "123456789012345"
}
```

#### POST `/api/nfe/cancelar`
**Descrição:** Cancelar NF-e autorizada

**Request:**
```json
{
  "nfe_id": "uuid",
  "justificativa": "Erro na emissão"
}
```

**Response:**
```json
{
  "success": true,
  "protocolo_cancelamento": "123456789012345",
  "status": "cancelada"
}
```

#### GET `/api/nfe/:id/status`
**Descrição:** Consultar status de NF-e

**Response:**
```json
{
  "nfe_id": "uuid",
  "status": "autorizada",
  "protocolo": "123456789012345",
  "data_autorizacao": "2024-01-20T10:30:00Z"
}
```

### 5.3 Uso de Filas (Queue)

**Recomendação:** Usar fila para processamento assíncrono

**Benefícios:**
- Não bloquear requisição HTTP
- Retry automático em caso de falha
- Processamento em background
- Melhor experiência do usuário

**Implementação:**

```php
// Usar Redis Queue ou RabbitMQ

// 1. Adicionar à fila
Queue::push('EmitirNFe', [
    'nfe_id' => $nfeId,
    'company_id' => $companyId
]);

// 2. Worker processa
class EmitirNFeJob {
    public function handle($data) {
        $service = new NfeEmissionService();
        $service->emitir($data['nfe_id']);
    }
}
```

**Alternativa Simples (Sem Queue):**
- Processar síncrono na primeira tentativa
- Se falhar, salvar como "pendente" e processar depois
- Usar cron job para reprocessar pendentes

### 5.4 Estratégia para Certificado Digital

#### Opção 1: Armazenar no Banco (Recomendado para MVP)

```sql
-- Tabela fiscal_config
ALTER TABLE fiscal_config ADD COLUMN certificado_pfx BYTEA;
ALTER TABLE fiscal_config ADD COLUMN senha_certificado TEXT; -- Criptografado
```

**Vantagens:**
- Fácil de implementar
- Não precisa de sistema de arquivos
- Backup automático

**Desvantagens:**
- Certificado fica no banco (segurança)
- Precisa criptografar senha

#### Opção 2: Armazenar em Storage Seguro

```php
// Usar Supabase Storage ou S3
$certificado = Storage::get("certificates/{$companyId}.pfx");
```

**Vantagens:**
- Mais seguro
- Não fica no banco

**Desvantagens:**
- Mais complexo
- Precisa gerenciar storage

#### Opção 3: Variável de Ambiente (Apenas Homologação)

```env
CERTIFICADO_HOMOLOGACAO_PATH=/path/to/cert.pfx
CERTIFICADO_HOMOLOGACAO_PASSWORD=senha
```

**Recomendação para MVP:**
- Usar Opção 1 (banco de dados)
- Criptografar senha do certificado
- Implementar rotação de certificado

### 5.5 Separação Homologação/Produção

```php
// backend/src/Fiscal/Config/SefazConfig.php

class SefazConfig {
    public static function getEndpoint(string $uf, string $ambiente): string {
        $endpoints = [
            'homologacao' => [
                'SP' => 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao.asmx',
                'RJ' => 'https://homologacao.nfe.fazenda.rj.gov.br/ws/nfeautorizacao.asmx',
                // ...
            ],
            'producao' => [
                'SP' => 'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao.asmx',
                'RJ' => 'https://nfe.fazenda.rj.gov.br/ws/nfeautorizacao.asmx',
                // ...
            ]
        ];
        
        return $endpoints[$ambiente][$uf] ?? throw new Exception('Endpoint não encontrado');
    }
}
```

**Configuração no Banco:**
```sql
-- fiscal_config
ALTER TABLE fiscal_config ADD COLUMN ambiente TEXT DEFAULT 'homologacao';
```

---

## 🧪 6. MVP FISCAL (ESCOPO MÍNIMO)

### 6.1 O que é OBRIGATÓRIO para Emitir NF-e

#### ✅ Funcionalidades Essenciais:

1. **Validação de Dados**
   - ✅ Validar campos obrigatórios
   - ✅ Validar formatos (CPF/CNPJ, CEP)
   - ✅ Validar regras fiscais básicas

2. **Geração de XML**
   - ✅ Gerar XML conforme layout 4.00
   - ✅ Validar XML contra schema XSD

3. **Assinatura Digital**
   - ✅ Assinar XML com certificado A1
   - ✅ Validar assinatura

4. **Envio SEFAZ**
   - ✅ Enviar XML via SOAP
   - ✅ Processar retorno
   - ✅ Consultar autorização

5. **Persistência**
   - ✅ Salvar XML assinado
   - ✅ Salvar XML autorizado
   - ✅ Salvar protocolo
   - ✅ Atualizar status

6. **DANFE Básico**
   - ✅ Gerar PDF do DANFE
   - ✅ Download do DANFE

### 6.2 O que pode ser ADIADO

#### ⏸️ Funcionalidades Não-Críticas:

1. **Cancelamento**
   - Pode ser implementado depois
   - Nota pode ficar "autorizada" sem cancelamento inicial

2. **Carta de Correção (CC-e)**
   - Não é obrigatório para MVP
   - Pode ser adicionado depois

3. **Inutilização de Numeração**
   - Não é crítico para MVP
   - Pode ser feito manualmente na SEFAZ

4. **Manifestação do Destinatário**
   - Não é obrigatório para emissão
   - Pode ser implementado depois

5. **Consulta de Notas de Terceiros**
   - Não é necessário para emissão
   - Pode ser adicionado depois

6. **Relatórios Avançados**
   - Relatórios básicos são suficientes
   - Relatórios complexos podem vir depois

7. **Envio de Email Automático**
   - Pode ser manual inicialmente
   - Automatizar depois

8. **Integração com Contabilidade**
   - Não é necessário para emissão
   - Pode ser integrado depois

### 6.3 Checklist MVP

#### Fase 1: Validação e Geração (Semana 1)
- [ ] Validar dados obrigatórios
- [ ] Gerar XML básico
- [ ] Validar XML contra XSD
- [ ] Testar estrutura de dados

#### Fase 2: Assinatura (Semana 2)
- [ ] Carregar certificado A1
- [ ] Assinar XML
- [ ] Validar assinatura
- [ ] Testar com certificado real

#### Fase 3: Envio SEFAZ (Semana 3)
- [ ] Implementar cliente SOAP
- [ ] Enviar para SEFAZ homologação
- [ ] Processar retorno
- [ ] Consultar autorização
- [ ] Testar fluxo completo

#### Fase 4: Persistência e UI (Semana 4)
- [ ] Salvar XMLs no banco
- [ ] Atualizar status
- [ ] Atualizar UI com status real
- [ ] Gerar DANFE básico
- [ ] Testes finais

---

## ✅ 7. CHECKLIST FINAL

### 7.1 Checklist - NF-e em Homologação

#### Configuração
- [ ] Certificado A1 de homologação carregado
- [ ] Senha do certificado configurada
- [ ] Ambiente configurado como "homologação"
- [ ] UF configurada corretamente
- [ ] CNPJ de teste configurado
- [ ] Endpoints SEFAZ de homologação configurados

#### Validação
- [ ] Validação de campos obrigatórios funcionando
- [ ] Validação de formatos (CPF/CNPJ, CEP) funcionando
- [ ] Validação de regras fiscais funcionando
- [ ] Validação de XML contra XSD funcionando

#### Emissão
- [ ] Geração de XML funcionando
- [ ] Assinatura digital funcionando
- [ ] Envio para SEFAZ funcionando
- [ ] Consulta de autorização funcionando
- [ ] Processamento de retorno funcionando
- [ ] Atualização de status funcionando

#### Testes
- [ ] Emitir NF-e de teste bem-sucedida
- [ ] XML gerado está correto
- [ ] Assinatura válida
- [ ] SEFAZ autorizou a nota
- [ ] Protocolo salvo corretamente
- [ ] DANFE gerado corretamente

### 7.2 Checklist - NF-e em Produção

#### Antes de Ir para Produção
- [ ] Certificado A1 de PRODUÇÃO carregado
- [ ] Certificado não está expirado
- [ ] Ambiente configurado como "producao"
- [ ] Endpoints SEFAZ de produção configurados
- [ ] CNPJ real configurado
- [ ] Inscrição Estadual configurada
- [ ] Dados cadastrais completos e corretos

#### Validações Adicionais
- [ ] Testado em homologação por pelo menos 1 semana
- [ ] Pelo menos 10 notas emitidas com sucesso em homologação
- [ ] Nenhum erro crítico nos últimos 3 dias
- [ ] Backup do banco de dados configurado
- [ ] Logs de erro configurados
- [ ] Monitoramento configurado

#### Segurança
- [ ] Certificado criptografado no banco
- [ ] Senha do certificado criptografada
- [ ] API protegida com autenticação
- [ ] Rate limiting configurado
- [ ] Logs de auditoria ativados

#### Documentação
- [ ] Manual de uso criado
- [ ] Procedimentos de emergência documentados
- [ ] Contatos de suporte disponíveis
- [ ] FAQ criado

#### Go-Live
- [ ] Emitir primeira nota de teste em produção
- [ ] Verificar autorização
- [ ] Verificar DANFE
- [ ] Monitorar por 24 horas
- [ ] Emitir notas reais

---

## 📝 INSTRUÇÕES IMPORTANTES

### ⚠️ AVISOS CRÍTICOS

1. **NUNCA emita notas reais em homologação**
   - Use apenas certificados de teste
   - Notas de homologação não têm valor fiscal

2. **SEMPRE valide o XML antes de enviar**
   - Valide contra schema XSD
   - Valide assinatura digital
   - Valide dados obrigatórios

3. **MANTENHA backup dos XMLs**
   - XML autorizado é documento fiscal
   - Deve ser mantido por 5 anos
   - Faça backup regular

4. **MONITORE o status das notas**
   - Implemente alertas para rejeições
   - Verifique pendências regularmente
   - Mantenha logs detalhados

5. **TESTE extensivamente antes de produção**
   - Teste todos os cenários
   - Teste tratamento de erros
   - Teste performance

### 📚 Referências Técnicas

- **Manual de Integração NF-e:** https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=/fNhYwYqkzY=
- **Layout 4.00:** https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=/fNhYwYqkzY=
- **Schemas XSD:** https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=/fNhYwYqkzY=

---

## 🎯 PRÓXIMOS PASSOS

1. **Implementar validação completa de dados**
2. **Implementar geração de XML (layout 4.00)**
3. **Implementar assinatura digital**
4. **Implementar envio SOAP para SEFAZ**
5. **Implementar consulta de autorização**
6. **Implementar tratamento de retornos**
7. **Implementar geração de DANFE**
8. **Testar em homologação**
9. **Documentar procedimentos**
10. **Preparar para produção**

---

**Documento criado em:** 2024-01-20  
**Versão:** 1.0  
**Autor:** Sistema de Análise Automática

