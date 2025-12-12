# 🚀 GUIA DE IMPLEMENTAÇÃO - SISTEMA FISCAL COMPLETO

## 📋 STATUS DA IMPLEMENTAÇÃO

### ✅ CONCLUÍDO

1. **Análise Completa do Sistema** (`ANALISE-SISTEMA-FISCAL-COMPLETO.md`)
   - Mapeamento completo do que existe e do que falta
   - Priorização de implementação
   - Checklist por módulo

2. **Tabelas do Banco de Dados**
   - ✅ Migration completa criada (`20250101000000_create_complete_fiscal_tables.sql`)
   - ✅ Todas as tabelas para NF-e, NFC-e, CT-e, MDF-e, NFS-e, SAT, GNRE
   - ✅ RLS (Row Level Security) configurado
   - ✅ Índices para performance
   - ✅ Triggers para updated_at

3. **Serviços Base**
   - ✅ `nfeService.ts` - Serviço completo de NF-e
   - ✅ `nfceService.ts` - Serviço completo de NFC-e
   - ✅ Estrutura de certificado A1 (`certificateService.ts`)
   - ✅ Endpoints SEFAZ mapeados (`sefazEndpoints.ts`)
   - ✅ Gerador de XML base (`xml_generator.ts`)
   - ✅ Motor fiscal (`engine_fiscal.ts`)

### ⚠️ EM ANDAMENTO / PENDENTE

#### Backend (CRÍTICO)
- ❌ API backend para assinatura de XML (certificado A1)
- ❌ API backend para comunicação SOAP com SEFAZ
- ❌ API backend para geração de DANFE/DANFE NFC-e/DACTE/DAMDFE
- ❌ Fila de processamento para envios fiscais
- ❌ Retry automático de envios

#### Módulos Fiscais
- ⚠️ NF-e: Estrutura criada, falta integração real com SEFAZ
- ⚠️ NFC-e: Estrutura criada, falta integração real com SEFAZ
- ❌ CT-e: Não implementado
- ❌ CT-e OS: Não implementado
- ❌ MDF-e: Não implementado
- ⚠️ NFS-e: Estrutura base existe, falta múltiplos padrões
- ❌ SAT/MFE: Não implementado
- ❌ GNRE: Não implementado

#### Funcionalidades
- ❌ Geração de DANFE (PDF)
- ❌ Geração de DANFE NFC-e (PDF)
- ❌ Geração de DACTE (PDF)
- ❌ Geração de DAMDFE (PDF)
- ❌ QRCode NFC-e (visual)
- ❌ Validação de schema XSD
- ❌ Testes automáticos

---

## 🔧 PRÓXIMOS PASSOS CRÍTICOS

### FASE 1: BACKEND (PRIORIDADE MÁXIMA)

#### 1.1 Criar API Backend para Assinatura

**Arquivo**: `backend/api/fiscal/sign.ts` (ou similar)

**Dependências necessárias**:
```bash
npm install node-forge xml-crypto xml-c14n
```

**Funcionalidades**:
- Endpoint POST `/api/fiscal/sign`
- Recebe XML e company_id
- Busca certificado no banco
- Assina XML usando certificado A1
- Retorna XML assinado

**Exemplo de implementação**:
```typescript
import forge from 'node-forge';
import { xmlCrypto } from 'xml-crypto';

export async function assinarXML(xml: string, companyId: string): Promise<string> {
    // 1. Buscar certificado do banco
    const certData = await buscarCertificado(companyId);
    
    // 2. Ler certificado .pfx
    const p12Asn1 = forge.asn1.fromDer(certData.pfxBuffer);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, certData.password);
    
    // 3. Extrair chave privada e certificado
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    
    const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;
    const cert = certBags[forge.pki.oids.certBag][0].cert;
    
    // 4. Assinar XML
    const signedXml = xmlCrypto.sign(xml, {
        canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
        signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
        digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    }, privateKey, cert);
    
    return signedXml;
}
```

#### 1.2 Criar API Backend para Envio SEFAZ

**Arquivo**: `backend/api/fiscal/sefaz/send.ts`

**Dependências necessárias**:
```bash
npm install soap axios
```

**Funcionalidades**:
- Endpoint POST `/api/fiscal/sefaz/send`
- Recebe XML assinado, tipo de documento, UF, ambiente
- Comunica via SOAP com SEFAZ
- Processa retorno
- Retorna protocolo ou erro

**Exemplo de implementação**:
```typescript
import soap from 'soap';
import { getSefazEndpoints } from '@/services/fiscal/sefazEndpoints';

export async function enviarParaSEFAZ(
    xml: string,
    tipo: 'nfe' | 'nfce' | 'cte' | 'mdfe',
    uf: string,
    ambiente: 'homologacao' | 'producao'
): Promise<{ protocolo?: string; xml_retorno?: string; erro?: string }> {
    const endpoints = getSefazEndpoints(uf, ambiente);
    
    // Determinar endpoint baseado no tipo
    let endpoint: string;
    let method: string;
    
    if (tipo === 'nfe' || tipo === 'nfce') {
        endpoint = tipo === 'nfe' 
            ? endpoints.manifestacao 
            : endpoints.consulta; // NFC-e usa endpoint diferente
        method = 'NFeRecepcaoEvento';
    } else if (tipo === 'cte') {
        endpoint = endpoints.manifestacao;
        method = 'CTeRecepcaoEvento';
    } else if (tipo === 'mdfe') {
        endpoint = endpoints.manifestacao;
        method = 'MDFeRecepcaoEvento';
    }
    
    // Criar cliente SOAP
    const client = await soap.createClientAsync(endpoint);
    
    // Enviar XML
    const [result] = await client[method].Async({ xml });
    
    // Processar retorno
    return processarRetornoSEFAZ(result);
}
```

#### 1.3 Criar API Backend para Geração de PDFs

**Arquivo**: `backend/api/fiscal/pdf/generate.ts`

**Dependências necessárias**:
```bash
npm install pdfkit @react-pdf/renderer puppeteer
```

**Funcionalidades**:
- Endpoint POST `/api/fiscal/pdf/danfe`
- Endpoint POST `/api/fiscal/pdf/danfe-nfce`
- Endpoint POST `/api/fiscal/pdf/dacte`
- Endpoint POST `/api/fiscal/pdf/damdfe`
- Recebe dados da nota/documento
- Gera PDF conforme layout oficial
- Retorna PDF em base64 ou URL

---

### FASE 2: COMPLETAR MÓDULOS FISCAIS

#### 2.1 Completar NF-e

**Arquivos a criar/atualizar**:
- `src/services/fiscal/nfeService.ts` ✅ (já criado, falta integração)
- `src/services/fiscal/nfeXMLGenerator.ts` (gerador XML completo)
- `src/services/fiscal/nfeEventGenerator.ts` (gerador de eventos)

**Tarefas**:
1. ✅ Criar estrutura de banco
2. ✅ Criar serviço base
3. ⚠️ Integrar com backend de assinatura
4. ⚠️ Integrar com backend de envio SEFAZ
5. ❌ Implementar geração de DANFE
6. ❌ Implementar validação XSD
7. ❌ Implementar baixa automática no estoque

#### 2.2 Completar NFC-e

**Arquivos a criar/atualizar**:
- `src/services/fiscal/nfceService.ts` ✅ (já criado, falta integração)
- `src/services/fiscal/nfceXMLGenerator.ts` (gerador XML completo)
- `src/components/fiscal/QRCodeNFCe.tsx` (componente QRCode)

**Tarefas**:
1. ✅ Criar estrutura de banco
2. ✅ Criar serviço base
3. ⚠️ Integrar com backend de assinatura
4. ⚠️ Integrar com backend de envio SEFAZ
5. ❌ Implementar geração de DANFE NFC-e
6. ❌ Implementar componente QRCode visual
7. ❌ Implementar modo contingência completo

#### 2.3 Implementar CT-e

**Arquivos a criar**:
- `src/services/fiscal/cteService.ts`
- `src/services/fiscal/cteXMLGenerator.ts`
- `src/services/fiscal/cteEventGenerator.ts`

**Tarefas**:
1. ✅ Tabelas do banco criadas
2. ❌ Criar serviço completo
3. ❌ Criar gerador de XML CT-e
4. ❌ Implementar eventos (cancelamento, CC-e, inutilização)
5. ❌ Implementar geração de DACTE

#### 2.4 Implementar MDF-e

**Arquivos a criar**:
- `src/services/fiscal/mdfeService.ts`
- `src/services/fiscal/mdfeXMLGenerator.ts`
- `src/services/fiscal/mdfeEventGenerator.ts`

**Tarefas**:
1. ✅ Tabelas do banco criadas
2. ❌ Criar serviço completo
3. ❌ Criar gerador de XML MDF-e
4. ❌ Implementar vinculação de documentos
5. ❌ Implementar encerramento
6. ❌ Implementar geração de DAMDFE

#### 2.5 Implementar SAT/MFE

**Arquivos a criar**:
- `src/services/fiscal/satService.ts`
- `src/services/fiscal/satXMLGenerator.ts`
- `src/components/fiscal/SATMonitor.tsx`

**Tarefas**:
1. ✅ Tabelas do banco criadas
2. ❌ Criar serviço completo
3. ❌ Implementar comunicação com equipamento SAT
4. ❌ Implementar monitor SAT ativo
5. ❌ Implementar integração MFE Ceará

#### 2.6 Completar NFS-e

**Arquivos a criar/atualizar**:
- `src/services/fiscal/nfseService.ts` (expandir existente)
- `src/services/fiscal/nfseABRASF.ts`
- `src/services/fiscal/nfseGINFES.ts`
- `src/services/fiscal/nfseBHISS.ts`
- `src/services/fiscal/nfseNacional.ts`

**Tarefas**:
1. ✅ Estrutura base existe
2. ❌ Implementar padrão GINFES
3. ❌ Implementar padrão BHISS
4. ❌ Implementar padrão Nacional
5. ❌ Implementar APIs municipais específicas

#### 2.7 Implementar GNRE

**Arquivos a criar**:
- `src/services/fiscal/gnreService.ts`
- `src/services/fiscal/gnreXMLGenerator.ts`

**Tarefas**:
1. ✅ Tabelas do banco criadas
2. ❌ Criar serviço completo
3. ❌ Implementar geração de guia
4. ❌ Implementar consulta de pagamento

---

### FASE 3: FUNCIONALIDADES COMPLEMENTARES

#### 3.1 Validação de Schema XSD

**Arquivo**: `src/services/fiscal/xsdValidator.ts`

**Dependências**:
```bash
npm install xmldom @xmldom/xmldom xsd-schema-validator
```

**Funcionalidades**:
- Validar XML contra schema XSD antes do envio
- Retornar erros detalhados
- Validar para todos os modelos (55, 65, 57, 67, 58, 59, SE)

#### 3.2 Geração de Documentos PDF

**Arquivos**:
- `src/services/fiscal/pdf/danfeGenerator.ts`
- `src/services/fiscal/pdf/danfeNFCeGenerator.ts`
- `src/services/fiscal/pdf/dacteGenerator.ts`
- `src/services/fiscal/pdf/damdfeGenerator.ts`

**Dependências**:
```bash
npm install pdfkit @react-pdf/renderer
```

#### 3.3 Testes Automáticos

**Arquivos**:
- `tests/fiscal/nfe.test.ts`
- `tests/fiscal/nfce.test.ts`
- `tests/fiscal/cte.test.ts`
- `tests/fiscal/mdfe.test.ts`
- `tests/fiscal/nfse.test.ts`
- `tests/fiscal/sat.test.ts`

**Dependências**:
```bash
npm install --save-dev jest @types/jest ts-jest
```

---

## 📦 DEPENDÊNCIAS NECESSÁRIAS

### Frontend (já instaladas)
- ✅ `@supabase/supabase-js`
- ✅ React/TypeScript

### Backend (a instalar)
```bash
# Assinatura XML
npm install node-forge xml-crypto xml-c14n

# Comunicação SEFAZ
npm install soap axios

# Geração PDF
npm install pdfkit @react-pdf/renderer puppeteer

# Validação XSD
npm install xmldom @xmldom/xmldom xsd-schema-validator

# Testes
npm install --save-dev jest @types/jest ts-jest
```

---

## 🔐 SEGURANÇA

### ⚠️ IMPORTANTE: Certificado A1 NUNCA no Frontend

1. **Certificado deve estar apenas no backend**
   - Frontend envia XML para backend
   - Backend assina com certificado
   - Backend retorna XML assinado

2. **Senha do certificado criptografada**
   - Usar criptografia AES-256
   - Chave de criptografia em variável de ambiente
   - Nunca logar senha

3. **Comunicação HTTPS obrigatória**
   - Todas as APIs devem usar HTTPS
   - Validar certificado SSL

4. **Logs de auditoria**
   - Registrar todas as operações fiscais
   - Incluir IP, usuário, timestamp
   - Armazenar em tabela `logs_fiscais`

---

## 🧪 TESTES

### Estrutura de Testes

```
tests/
├── fiscal/
│   ├── nfe.test.ts
│   ├── nfce.test.ts
│   ├── cte.test.ts
│   ├── mdfe.test.ts
│   ├── nfse.test.ts
│   ├── sat.test.ts
│   ├── xml.test.ts
│   └── assinatura.test.ts
```

### Exemplo de Teste

```typescript
import { nfeService } from '@/services/fiscal/nfeService';

describe('NF-e Service', () => {
    test('deve gerar chave de acesso válida', () => {
        const nota = { /* ... */ };
        const chave = nfeService.gerarChaveAcesso(nota);
        
        expect(chave).toHaveLength(44);
        expect(chave).toMatch(/^\d+$/);
    });
    
    test('deve validar XML contra schema XSD', async () => {
        const xml = '<?xml ...';
        const valido = await validarXSD(xml, 'nfe');
        
        expect(valido).toBe(true);
    });
});
```

---

## 📚 DOCUMENTAÇÃO

### Documentos Criados

1. ✅ `ANALISE-SISTEMA-FISCAL-COMPLETO.md` - Análise detalhada
2. ✅ `IMPLEMENTACAO-SISTEMA-FISCAL.md` - Este documento
3. ⚠️ `GUIA-USO-SISTEMA-FISCAL.md` - A criar (guia do usuário)
4. ⚠️ `API-BACKEND-FISCAL.md` - A criar (documentação da API)

### Documentação Técnica Necessária

- [ ] Especificação de cada endpoint da API backend
- [ ] Exemplos de uso de cada serviço
- [ ] Fluxogramas de emissão por modelo
- [ ] Tratamento de erros comum
- [ ] Guia de configuração inicial

---

## 🚨 RISCOS E ATENÇÕES

### Riscos Identificados

1. **Certificado A1 no Frontend**
   - ⚠️ RISCO ALTO: Certificado exposto
   - ✅ SOLUÇÃO: Mover para backend

2. **Comunicação SOAP com SEFAZ**
   - ⚠️ RISCO MÉDIO: Complexidade de implementação
   - ✅ SOLUÇÃO: Usar biblioteca SOAP testada

3. **Validação de Schema XSD**
   - ⚠️ RISCO MÉDIO: XMLs rejeitados sem validação
   - ✅ SOLUÇÃO: Validar antes do envio

4. **Contingência Offline**
   - ⚠️ RISCO MÉDIO: NFC-e em contingência
   - ✅ SOLUÇÃO: Implementar modo offline completo

5. **Multi-tenant**
   - ⚠️ RISCO BAIXO: Isolamento de dados
   - ✅ SOLUÇÃO: RLS já configurado

---

## ✅ CHECKLIST FINAL

### Backend
- [ ] API de assinatura XML
- [ ] API de envio SEFAZ
- [ ] API de geração PDF
- [ ] Fila de processamento
- [ ] Retry automático

### NF-e
- [x] Tabelas do banco
- [x] Serviço base
- [ ] Integração backend
- [ ] Geração DANFE
- [ ] Validação XSD
- [ ] Baixa estoque

### NFC-e
- [x] Tabelas do banco
- [x] Serviço base
- [ ] Integração backend
- [ ] QRCode visual
- [ ] Contingência offline
- [ ] Geração DANFE NFC-e

### CT-e
- [x] Tabelas do banco
- [ ] Serviço completo
- [ ] Geração XML
- [ ] Eventos
- [ ] Geração DACTE

### MDF-e
- [x] Tabelas do banco
- [ ] Serviço completo
- [ ] Geração XML
- [ ] Vinculação documentos
- [ ] Geração DAMDFE

### NFS-e
- [x] Estrutura base
- [ ] Padrão GINFES
- [ ] Padrão BHISS
- [ ] Padrão Nacional
- [ ] APIs municipais

### SAT/MFE
- [x] Tabelas do banco
- [ ] Serviço completo
- [ ] Comunicação SAT
- [ ] Monitor ativo

### GNRE
- [x] Tabelas do banco
- [ ] Serviço completo
- [ ] Geração guia

### Testes
- [ ] Testes NF-e
- [ ] Testes NFC-e
- [ ] Testes CT-e
- [ ] Testes MDF-e
- [ ] Testes NFS-e
- [ ] Testes SAT
- [ ] Testes validação XSD

---

## 📞 SUPORTE

Para dúvidas sobre implementação:
1. Consultar `ANALISE-SISTEMA-FISCAL-COMPLETO.md`
2. Consultar documentação oficial SEFAZ
3. Consultar este guia

---

**Última atualização**: 2024-12-31
**Versão**: 1.0
**Status**: ⚠️ EM IMPLEMENTAÇÃO

