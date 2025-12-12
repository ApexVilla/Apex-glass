# ✅ IMPLEMENTAÇÕES PARA CERTIFICADO DIGITAL A1

## 🎯 Resumo das Implementações

Este documento detalha todas as implementações realizadas para preparar o sistema para funcionar 100% com certificado digital A1.

---

## ✅ 1. CÁLCULO DE CUSTO MÉDIO

**Status:** ✅ **IMPLEMENTADO**

**Arquivo:** `src/services/entryNoteService.ts` - função `launch()`

**O que foi implementado:**
- ✅ Cálculo de custo médio ponderado na entrada de estoque
- ✅ Distribuição proporcional de frete e despesas entre itens
- ✅ Atualização automática do `purchase_price` do produto
- ✅ Registro do custo no histórico de movimentação

**Fórmula implementada:**
```
Custo Médio = (Quantidade Atual × Preço Atual + Quantidade Entrada × Preço Entrada) / (Quantidade Atual + Quantidade Entrada)
```

**Exemplo:**
- Produto tem 10 unidades a R$ 5,00 (total: R$ 50,00)
- Entra 5 unidades a R$ 6,00 cada
- Novo custo médio = (10×5 + 5×6) / 15 = R$ 5,33

**Observações:**
- Considera `quantidade_interna` quando disponível
- Distribui frete e outras despesas proporcionalmente ao valor dos itens
- Atualiza `purchase_price` automaticamente

---

## ✅ 2. TABELA DE MANIFESTAÇÕES

**Status:** ✅ **IMPLEMENTADO**

**Arquivo:** `supabase/migrations/20250121000000_create_manifestacao_nfe_table.sql`

**Estrutura criada:**
- ✅ Tabela `manifestacao_nfe` completa
- ✅ Campos: tipo, protocolo, XML evento, XML retorno, status, sequência
- ✅ Relacionamento com `nf_entrada`
- ✅ RLS configurado
- ✅ Índices para performance

**Campos principais:**
- `tipo`: '210100', '210200', '210240', '210250'
- `protocolo`: Protocolo de retorno da SEFAZ
- `xml_evento`: XML do evento gerado
- `xml_retorno`: XML de retorno da SEFAZ
- `sequencia`: Número sequencial do evento
- `status`: 'pendente', 'enviado', 'processado', 'erro'

---

## ✅ 3. SERVIÇO DE CERTIFICADO DIGITAL

**Status:** ✅ **IMPLEMENTADO**

**Arquivo:** `src/services/fiscal/certificateService.ts`

**Funcionalidades:**
- ✅ `getCertificateInfo()` - Obtém informações do certificado (sem expor dados)
- ✅ `getCertificateData()` - Obtém certificado completo (para backend)
- ✅ `saveCertificate()` - Salva/atualiza certificado .pfx
- ✅ `removeCertificate()` - Remove certificado
- ✅ `validateCertificate()` - Valida certificado

**Segurança:**
- ⚠️ **IMPORTANTE:** `getCertificateData()` deve ser usado apenas no backend
- Certificado é armazenado como BYTEA no banco
- Senha é armazenada separadamente (criptografar em produção)

---

## ✅ 4. SERVIÇO DE ASSINATURA DIGITAL

**Status:** ✅ **ESTRUTURA PRONTA** (requer implementação backend)

**Arquivo:** `src/services/fiscal/xmlSignatureService.ts`

**Estrutura criada:**
- ✅ Interface `SignatureResult`
- ✅ Interface `SignatureOptions`
- ✅ Função `signXML()` - Estrutura preparada
- ✅ Função `validateSignature()` - Estrutura preparada
- ✅ Função `extractCertificateInfo()` - Estrutura preparada

**O que falta (deve ser feito no backend):**
- ❌ Implementação real usando bibliotecas:
  - `node-forge` - Leitura de certificado .pfx
  - `xml-crypto` - Assinatura XML
  - `xml-c14n` - Canonicalização

**Bibliotecas necessárias (backend):**
```bash
npm install node-forge xml-crypto xml-c14n
```

**NOTA:** A assinatura deve ser feita no **backend** por segurança. O frontend apenas prepara o XML.

---

## ✅ 5. GERADOR DE XML DE EVENTOS

**Status:** ✅ **IMPLEMENTADO**

**Arquivo:** `src/services/fiscal/eventXMLGenerator.ts`

**Funcionalidades:**
- ✅ `generateManifestacaoXML()` - Gera XML de manifestação completo
- ✅ Suporta todos os tipos: 210100, 210200, 210240, 210250
- ✅ Valida justificativa para tipos que exigem
- ✅ `parseRetornoXML()` - Parse XML de retorno da SEFAZ
- ✅ `getCodigoOrgao()` - Código do órgão por UF
- ✅ `escapeXml()` - Escapa caracteres especiais

**Exemplo de XML gerado:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
  <idLote>1234567890</idLote>
  <evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
    <infEvento Id="ID210200...">
      <cOrgao>35</cOrgao>
      <tpAmb>2</tpAmb>
      <CNPJ>12345678000123</CNPJ>
      <chNFe>...</chNFe>
      <dhEvento>2025-01-21T10:00:00-00:00</dhEvento>
      <tpEvento>210200</tpEvento>
      <nSeqEvento>1</nSeqEvento>
      <verEvento>1.00</verEvento>
      <detEvento versao="1.00">
        <descEvento>Confirmação da Operação</descEvento>
      </detEvento>
    </infEvento>
  </evento>
</envEvento>
```

---

## ✅ 6. MAPEAMENTO DE ENDPOINTS SEFAZ

**Status:** ✅ **IMPLEMENTADO**

**Arquivo:** `src/services/fiscal/sefazEndpoints.ts`

**Funcionalidades:**
- ✅ Mapeamento completo de todas as 27 UFs
- ✅ Endpoints para homologação e produção
- ✅ Suporte a: manifestação, consulta, distribuição, status
- ✅ Função `getSefazEndpoints(uf, ambiente)`
- ✅ Função `getUFCodigo(uf)`

**UFs mapeadas:**
- AC, AL, AP, AM, BA, CE, DF, ES, GO, MA
- MT, MS, MG, PA, PB, PR, PE, PI, RJ, RN
- RS, RO, RR, SC, SP, SE, TO

**Exemplo de uso:**
```typescript
const endpoints = getSefazEndpoints('SP', 'producao');
// Retorna: { manifestacao: 'https://...', consulta: 'https://...', ... }
```

---

## ✅ 7. ATUALIZAÇÃO DO SEFAZ SERVICE

**Status:** ✅ **ATUALIZADO COM ESTRUTURA REAL**

**Arquivo:** `src/services/sefazService.ts`

**Melhorias:**
- ✅ `manifestarDestinatario()` - Integrado com gerador de XML e endpoints
- ✅ `consultarSituacao()` - Integrado com endpoints
- ✅ Salva manifestações na tabela `manifestacao_nfe`
- ✅ Verifica certificado antes de manifestar
- ✅ Gera XML do evento automaticamente

**Fluxo de manifestação:**
1. Verifica configuração fiscal (CNPJ, UF)
2. Verifica se tem certificado
3. Busca sequência da manifestação
4. Gera XML do evento
5. Salva na tabela `manifestacao_nfe` (status: pendente)
6. ⚠️ **Falta:** Transmitir para SEFAZ (deve ser feito no backend)

---

## ⚠️ O QUE FALTA IMPLEMENTAR (BACKEND)

### 1. Assinatura Digital Real
**Prioridade:** 🔴 CRÍTICA

**Onde:** Backend (API Node.js/Express)

**Bibliotecas necessárias:**
```bash
npm install node-forge xml-crypto xml-c14n
```

**Exemplo de implementação:**
```javascript
const forge = require('node-forge');
const xmlCrypto = require('xml-crypto');

async function assinarXML(xmlString, pfxBuffer, password) {
  // 1. Ler certificado
  const p12Asn1 = forge.asn1.fromDer(pfxBuffer);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
  
  // 2. Extrair chave e certificado
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  
  const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;
  const cert = certBags[forge.pki.oids.certBag][0].cert;
  
  // 3. Assinar
  const signatureOptions = {
    canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
  };
  
  const signedXml = xmlCrypto.sign(xmlString, signatureOptions, privateKey, cert);
  
  return signedXml;
}
```

---

### 2. Comunicação SOAP com SEFAZ
**Prioridade:** 🔴 CRÍTICA

**Onde:** Backend (API Node.js/Express)

**Bibliotecas necessárias:**
```bash
npm install soap axios
```

**Exemplo de implementação:**
```javascript
const soap = require('soap');
const axios = require('axios');

async function transmitirManifestacao(xmlAssinado, endpoint) {
  // Envolver XML em envelope SOAP
  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">
      ${xmlAssinado}
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;

  // Enviar para SEFAZ
  const response = await axios.post(endpoint, soapEnvelope, {
    headers: {
      'Content-Type': 'application/soap+xml; charset=utf-8',
      'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento',
    },
  });

  return response.data;
}
```

---

### 3. API Backend para Assinatura
**Prioridade:** 🔴 CRÍTICA

**Criar endpoint:**
```typescript
// POST /api/fiscal/assinar-xml
POST /api/fiscal/transmitir-manifestacao
POST /api/fiscal/consultar-situacao
```

**Segurança:**
- Validar autenticação
- Validar permissões
- Não expor certificado no frontend
- Logar todas as operações

---

## 📋 CHECKLIST FINAL

### ✅ Frontend (100% Pronto)
- [x] Cálculo de custo médio
- [x] Tabela de manifestações
- [x] Serviço de certificado (leitura)
- [x] Gerador de XML de eventos
- [x] Mapeamento de endpoints
- [x] Integração no sefazService

### ⚠️ Backend (Falta Implementar)
- [ ] API para assinar XML
- [ ] API para transmitir manifestação
- [ ] API para consultar situação
- [ ] Implementação SOAP
- [ ] Validação de certificado

### 🔧 Infraestrutura
- [x] Banco de dados preparado
- [x] Estrutura de serviços pronta
- [ ] Backend API criado
- [ ] Bibliotecas instaladas no backend

---

## 🚀 PRÓXIMOS PASSOS

1. **Criar API Backend** (Node.js/Express ou similar)
2. **Instalar bibliotecas** no backend:
   ```bash
   npm install node-forge xml-crypto xml-c14n soap axios
   ```
3. **Implementar endpoints:**
   - `/api/fiscal/assinar-xml`
   - `/api/fiscal/transmitir-manifestacao`
   - `/api/fiscal/consultar-situacao`
4. **Atualizar frontend** para chamar APIs do backend
5. **Testar em homologação** antes de produção

---

## 📝 NOTAS IMPORTANTES

1. **Segurança:**
   - ⚠️ Certificado NUNCA deve ser exposto no frontend
   - ⚠️ Senha do certificado deve ser criptografada
   - ⚠️ Use HTTPS sempre
   - ⚠️ Valide autenticação em todas as APIs

2. **Produção:**
   - Teste em homologação primeiro
   - Valide certificado antes de usar
   - Monitore logs de transmissão
   - Tenha plano de rollback

3. **Manutenção:**
   - Verifique validade do certificado
   - Atualize endpoints se mudarem
   - Monitore retornos da SEFAZ

---

**Data:** Janeiro 2025
**Versão:** 1.2
**Status:** Frontend 100% | Backend Pendente

