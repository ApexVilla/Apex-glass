# 🔐 Configuração de Certificado Digital A1 para SEFAZ

## 📋 Informações do Servidor

**IP do Servidor:** `192.168.100.9`  
**Porta:** `8081`  
**URL de Acesso:** `http://192.168.100.9:8081`

## 🚀 Servidor Iniciado

O servidor está rodando e acessível através da rede local.

---

## 📝 Como Configurar o Certificado Digital

### 1. Acesse a Página de Configurações

1. Faça login no sistema através de: `http://192.168.100.9:8081`
2. Navegue até **Configurações** (menu lateral)
3. Vá para a aba **"Configurações Fiscais"**

### 2. Preparar o Certificado

O certificado digital A1 deve estar no formato:
- **.pfx** ou **.p12** (ambos são suportados)
- Certificado A1 (arquivo + senha)
- Válido e não expirado

### 3. Preencher os Dados

No formulário de Configurações Fiscais, preencha:

- **CNPJ**: CNPJ da empresa (apenas números)
- **UF**: Estado da empresa (sigla: AC, AL, AP, AM, BA, CE, DF, ES, GO, MA, MT, MS, MG, PA, PB, PR, PE, PI, RJ, RN, RS, RO, RR, SC, SP, SE, TO)
- **Ambiente**: 
  - `Homologação` - para testes
  - `Produção` - para ambiente real
- **Senha do Certificado**: Senha do arquivo .pfx/.p12
- **Arquivo do Certificado**: Selecione o arquivo .pfx ou .p12

### 4. Salvar a Configuração

Clique em **"Salvar Configurações Fiscais"**

---

## ⚠️ Importante - Leia Antes

### Status Atual da Implementação

O sistema possui a estrutura para certificados digitais, mas algumas funcionalidades precisam ser implementadas no backend:

1. **Upload de Certificado**: 
   - O frontend está preparado para receber o arquivo
   - A interface de upload está disponível
   - O certificado pode ser salvo no Supabase Storage

2. **Assinatura Digital**:
   - A assinatura de XMLs deve ser feita no **backend**
   - Por segurança, certificados e senhas NÃO devem ser processados no frontend
   - Use uma Edge Function ou API backend para assinar XMLs

3. **Comunicação com SEFAZ**:
   - As chamadas para SEFAZ devem ser feitas via **backend**
   - O frontend apenas prepara os dados
   - Use webservices SOAP/XML conforme padrão SEFAZ

### 🔒 Segurança

**NUNCA**:
- ❌ Exponha certificados no código frontend
- ❌ Envie senhas de certificado sem criptografia
- ❌ Processe assinatura digital no navegador

**SEMPRE**:
- ✅ Armazene certificados criptografados
- ✅ Use backend/Edge Functions para assinatura
- ✅ Valide certificados antes de usar em produção

---

## 🛠️ Próximos Passos para Implementação Completa

Para ter uma integração completa com SEFAZ, você precisa:

1. **Backend/Edge Function para Assinatura**:
   ```typescript
   // Exemplo de estrutura necessária
   - Receber XML a ser assinado
   - Buscar certificado do banco (criptografado)
   - Assinar XML usando biblioteca (ex: node-forge, openssl)
   - Retornar XML assinado
   ```

2. **Backend para Comunicação SEFAZ**:
   ```typescript
   // Exemplo de estrutura necessária
   - Construir XML conforme padrão SEFAZ
   - Assinar XML usando certificado
   - Enviar via SOAP para webservice SEFAZ
   - Processar resposta e retornar ao frontend
   ```

3. **Bibliotecas Recomendadas**:
   - `node-forge` - Para leitura e assinatura de certificados
   - `xml-crypto` - Para assinatura XML
   - `soap` - Para comunicação SOAP com SEFAZ
   - `axios` - Para requisições HTTP

---

## 📍 Localização dos Arquivos

- **Serviço de Certificado**: `src/services/fiscal/certificateService.ts`
- **Serviço SEFAZ**: `src/services/sefazService.ts`
- **Configurações Fiscais**: `src/pages/Settings.tsx` (aba Configurações Fiscais)
- **Assinatura XML**: `src/services/fiscal/xmlSignatureService.ts`

---

## ✅ Checklist de Configuração

- [ ] Servidor iniciado e acessível
- [ ] Certificado A1 em formato .pfx/.p12 disponível
- [ ] CNPJ da empresa cadastrado
- [ ] UF selecionada
- [ ] Ambiente escolhido (Homologação/Produção)
- [ ] Senha do certificado conhecida
- [ ] Certificado carregado no sistema
- [ ] Configurações salvas com sucesso

---

## 🆘 Em Caso de Problemas

1. **Certificado não carrega**:
   - Verifique se o formato é .pfx ou .p12
   - Confirme se a senha está correta
   - Tente um certificado diferente

2. **Erro ao salvar**:
   - Verifique conexão com Supabase
   - Confira logs do console do navegador (F12)
   - Verifique se todos os campos obrigatórios estão preenchidos

3. **Erro ao assinar XML**:
   - Certifique-se de que a assinatura está sendo feita no backend
   - Verifique se o certificado está válido e não expirado
   - Confirme se o certificado corresponde ao CNPJ cadastrado

---

**Última atualização:** Janeiro 2025

