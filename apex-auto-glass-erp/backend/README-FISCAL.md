# Backend Fiscal - NF-e Modelo 55

Backend completo para emissão e gestão de Notas Fiscais Eletrônicas (NF-e) modelo 55, padrão 4.00.

## 📋 Requisitos

- PHP 8.2 ou superior
- Extensões PHP obrigatórias:
  - `ext-openssl` - Para assinatura digital
  - `ext-soap` - Para comunicação com SEFAZ
  - `ext-xml` - Para manipulação de XML
  - `ext-dom` - Para validação e parsing XML
  - `ext-libxml` - Para validação XSD

## 🚀 Instalação

1. **Instalar dependências:**
```bash
composer install
```

2. **Configurar certificado digital:**
   - Coloque o arquivo `.pfx` do certificado A1 em local seguro
   - Configure o caminho e senha no arquivo `.env` ou passe via requisição

3. **Configurar ambiente:**
   - Defina `AMBIENTE_NFE=homologacao` ou `AMBIENTE_NFE=producao` no `.env`

## 📡 Endpoints da API

### 1. Consultar Status da SEFAZ
**GET** `/api/nfe/status`

Parâmetros:
- `uf` (obrigatório): Sigla da UF (ex: SP, RJ, MG)
- `cnpj` (obrigatório): CNPJ do emitente
- `ambiente` (opcional): `homologacao` ou `producao` (padrão: `homologacao`)

Exemplo:
```
GET /api/nfe/status?uf=SP&cnpj=12345678000190&ambiente=homologacao
```

### 2. Gerar e Autorizar NF-e
**POST** `/api/nfe/gerar`

Body (JSON):
```json
{
  "company_id": "uuid-da-empresa",
  "numero": "123",
  "serie": "1",
  "data_emissao": "2024-01-15T10:00:00-03:00",
  "data_saida_entrada": "2024-01-15T10:00:00-03:00",
  "emitente_cnpj": "12345678000190",
  "emitente_razao_social": "Empresa Exemplo LTDA",
  "emitente_nome_fantasia": "Exemplo",
  "emitente_ie": "123456789012",
  "emitente_logradouro": "Rua Exemplo",
  "emitente_numero": "123",
  "emitente_bairro": "Centro",
  "emitente_codigo_municipio": "3550308",
  "emitente_municipio": "São Paulo",
  "emitente_uf": "SP",
  "emitente_cep": "01000000",
  "emitente_telefone": "11999999999",
  "emitente_crt": "3",
  "destinatario_cpf_cnpj": "12345678000190",
  "destinatario_razao_social": "Cliente Exemplo LTDA",
  "destinatario_ie": "987654321098",
  "destinatario_logradouro": "Av. Cliente",
  "destinatario_numero": "456",
  "destinatario_bairro": "Jardim",
  "destinatario_codigo_municipio": "3550308",
  "destinatario_municipio": "São Paulo",
  "destinatario_uf": "SP",
  "destinatario_cep": "02000000",
  "destinatario_telefone": "11888888888",
  "destinatario_email": "cliente@exemplo.com",
  "valor_produtos": 1000.00,
  "valor_icms": 180.00,
  "valor_ipi": 0.00,
  "valor_pis": 16.50,
  "valor_cofins": 76.00,
  "valor_total": 1000.00,
  "itens": [
    {
      "produto_id": "uuid-produto",
      "sequencia": 1,
      "codigo": "PROD001",
      "descricao": "Produto Exemplo",
      "ncm": "12345678",
      "cfop": "5102",
      "unidade": "UN",
      "quantidade": 10.0000,
      "valor_unitario": 100.0000,
      "valor_total": 1000.00,
      "desconto": 0.00,
      "icms_cst": "00",
      "icms_base_calculo": 1000.00,
      "icms_aliquota": 18.00,
      "icms_valor": 180.00,
      "ipi_cst": "00",
      "ipi_base_calculo": 0.00,
      "ipi_aliquota": 0.00,
      "ipi_valor": 0.00,
      "pis_cst": "01",
      "pis_base_calculo": 1000.00,
      "pis_aliquota": 1.65,
      "pis_valor": 16.50,
      "cofins_cst": "01",
      "cofins_base_calculo": 1000.00,
      "cofins_aliquota": 7.60,
      "cofins_valor": 76.00
    }
  ],
  "cert_path": "/caminho/para/certificado.pfx",
  "cert_password": "senha-do-certificado",
  "uf": "SP",
  "ambiente": "homologacao"
}
```

### 3. Consultar NF-e por Chave de Acesso
**GET** `/api/nfe/consultar`

Parâmetros:
- `chave` (obrigatório): Chave de acesso da NF-e (44 dígitos)
- `uf` (obrigatório): Sigla da UF
- `ambiente` (opcional): `homologacao` ou `producao`

Exemplo:
```
GET /api/nfe/consultar?chave=35200112345678000190550000000012345678901234&uf=SP&ambiente=homologacao
```

### 4. Buscar NF-e no Banco de Dados
**GET** `/api/nfe/buscar`

Parâmetros:
- `id` ou `chave`: ID ou chave de acesso da NF-e
- `company_id` (obrigatório): ID da empresa

Exemplo:
```
GET /api/nfe/buscar?id=uuid-nfe&company_id=uuid-empresa
```

### 5. Cancelar NF-e
**POST** `/api/nfe/cancelar`

Body (JSON):
```json
{
  "chave_acesso": "35200112345678000190550000000012345678901234",
  "justificativa": "Erro na emissão da nota fiscal",
  "company_id": "uuid-da-empresa",
  "cert_path": "/caminho/para/certificado.pfx",
  "cert_password": "senha-do-certificado",
  "uf": "SP",
  "ambiente": "homologacao",
  "user_id": "uuid-usuario"
}
```

### 6. Emitir Carta de Correção Eletrônica (CC-e)
**POST** `/api/nfe/cce`

Body (JSON):
```json
{
  "chave_acesso": "35200112345678000190550000000012345678901234",
  "correcao": "Correção do endereço do destinatário",
  "company_id": "uuid-da-empresa",
  "cert_path": "/caminho/para/certificado.pfx",
  "cert_password": "senha-do-certificado",
  "uf": "SP",
  "ambiente": "homologacao",
  "user_id": "uuid-usuario"
}
```

### 7. Inutilizar Faixa de Numeração
**POST** `/api/nfe/inutilizar`

Body (JSON):
```json
{
  "serie": "1",
  "numero_inicial": "1",
  "numero_final": "10",
  "justificativa": "Notas não utilizadas devido a erro de configuração",
  "company_id": "uuid-da-empresa",
  "cnpj": "12345678000190",
  "cert_path": "/caminho/para/certificado.pfx",
  "cert_password": "senha-do-certificado",
  "uf": "SP",
  "ambiente": "homologacao",
  "user_id": "uuid-usuario"
}
```

## 🏗️ Estrutura do Código

```
backend/
├── src/
│   ├── Fiscal/
│   │   ├── Helpers/
│   │   │   ├── CertificateManager.php    # Gerenciamento de certificado A1
│   │   │   ├── XmlValidator.php          # Validação XML/XSD
│   │   │   └── SoapClient.php            # Cliente SOAP para SEFAZ
│   │   └── Services/
│   │       ├── NfeService.php            # Serviço principal (geração/autorização)
│   │       ├── NfeStatusService.php      # Consulta status SEFAZ
│   │       ├── NfeEventService.php       # Eventos (cancelamento, CC-e, inutilização)
│   │       └── NfeConsultaService.php    # Consulta NF-e por chave
│   ├── Repositories/
│   │   └── NfeRepository.php             # Persistência no banco
│   └── Controllers/
│       └── NfeController.php             # Controllers da API
```

## 🔒 Segurança

- **Certificado Digital**: Sempre armazene certificados em local seguro
- **Senha do Certificado**: Nunca exponha senhas em logs ou código
- **Ambiente**: Use `homologacao` para testes, `producao` apenas quando estiver pronto
- **Validação**: Todos os XMLs são validados antes do envio

## 📝 Logs

Os logs são gerados automaticamente em:
- `logs/app.log` - Logs gerais da aplicação
- Logs técnicos incluem:
  - Requisições SOAP
  - Respostas da SEFAZ
  - Erros de validação
  - Status de operações

## ⚠️ Observações Importantes

1. **Certificado A1**: O certificado deve estar válido e não expirado
2. **Ambiente Homologação**: Use para testes antes de ir para produção
3. **Validação XSD**: Para validação completa, configure o caminho dos XSDs da SEFAZ
4. **Timeout**: Requisições SOAP têm timeout de 30 segundos
5. **RLS**: O sistema respeita Row Level Security do banco de dados

## 🐛 Troubleshooting

### Erro: "Certificado não encontrado"
- Verifique o caminho do certificado
- Certifique-se de que o arquivo existe e tem permissões de leitura

### Erro: "Erro ao ler certificado"
- Verifique se a senha está correta
- Certifique-se de que o arquivo é um certificado A1 válido (.pfx)

### Erro: "XML inválido"
- Verifique os logs para detalhes dos erros de validação
- Certifique-se de que todos os campos obrigatórios estão preenchidos

### Erro: "Erro ao conectar com SEFAZ"
- Verifique a conexão com a internet
- Confirme se a UF está correta
- Verifique se o ambiente (homologação/produção) está correto

## 📚 Documentação Adicional

- [Manual de Integração NF-e](http://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=/fqkSnK8qJ4o=)
- [XSDs da SEFAZ](http://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=/fqkSnK8qJ4o=)

