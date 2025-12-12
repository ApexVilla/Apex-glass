# 🚀 MOTOR FISCAL COMPLETO

Motor fiscal completo para emissão de NFe (produtos) e NFSe (serviços) com recálculo automático, validação e geração de XML.

## 📁 Estrutura

```
src/services/fiscal/
├── engine_fiscal.ts      # Motor principal (cálculos e validações)
├── fiscal_rules.ts       # Regras fiscais e validações
├── xml_generator.ts      # Geradores de XML (NFe e NFSe)
└── README.md            # Esta documentação
```

## 🎯 Funcionalidades

### ✅ Recálculo Automático
- Recalcula impostos quando qualquer valor é alterado
- Suporta produtos (NFe) e serviços (NFSe)
- Atualiza totais automaticamente
- Gera log de alterações

### ✅ Validação Completa
- Valida CNPJ/CPF
- Valida NCM (8 dígitos)
- Valida CFOP conforme operação
- Valida CST/CSOSN conforme regime tributário
- Valida totais e impostos

### ✅ Geração de XML
- NFe 4.0 (produtos)
- NFSe ABRASF 2.04 (serviços)
- Separação automática para notas mistas

## 📖 Como Usar

### 1. Importar o Hook

```typescript
import { useFiscalEngine } from '@/hooks/useFiscalEngine';
```

### 2. Usar no Componente

```typescript
function MinhaNotaFiscal() {
    const [nota, setNota] = useState<NotaFiscal>({...});
    
    const {
        recalcularItem,
        recalcularTudo,
        validarNota,
        gerarXML,
        tipoNota,
        isRecalculando,
        isValidando,
        ultimaValidacao,
    } = useFiscalEngine(nota, 'simples_nacional');

    // Recalcular quando item mudar
    const handleItemChange = async (item: ItemNotaFiscal, index: number) => {
        const resultado = await recalcularItem(item, index, nota);
        // Atualizar nota com item recalculado
        const novosItens = [...nota.itens];
        novosItens[index] = resultado.item_atualizado;
        setNota({ ...nota, itens: novosItens, totais: resultado.totais_atualizados });
    };

    // Validar nota
    const handleValidar = async () => {
        const resultado = await validarNota(nota);
        if (resultado.valida) {
            console.log('Nota válida!');
        } else {
            console.error('Erros:', resultado.erros);
        }
    };

    // Gerar XML
    const handleGerarXML = async () => {
        const xml = await gerarXML(nota);
        console.log('XML gerado:', xml);
    };

    return (
        <div>
            {/* Seu formulário aqui */}
        </div>
    );
}
```

## 🔧 Funções Principais

### `recalcularItem(item, nota, regime)`
Recalcula impostos e valores de um item específico.

**Parâmetros:**
- `item`: ItemNotaFiscal
- `nota`: NotaFiscal completa
- `regime`: RegimeTributario ('simples_nacional' | 'lucro_presumido' | 'lucro_real')

**Retorna:** `ResultadoRecalculo` com item atualizado, totais e alterações

### `recalcularTotais(nota)`
Recalcula todos os totais da nota fiscal.

**Parâmetros:**
- `nota`: NotaFiscal

**Retorna:** `TotaisNotaFiscal` atualizado

### `validarNota(nota)`
Valida todos os campos obrigatórios e regras fiscais.

**Parâmetros:**
- `nota`: NotaFiscal

**Retorna:** `ResultadoValidacao` com erros e avisos

### `gerarXMLNFe(nota)`
Gera XML no padrão NFe 4.0.

**Parâmetros:**
- `nota`: NotaFiscal (tipo 'nfe')

**Retorna:** String XML formatada

### `gerarXMLNFSe(nota)`
Gera XML no padrão NFSe ABRASF 2.04.

**Parâmetros:**
- `nota`: NotaFiscal (tipo 'nfse')

**Retorna:** String XML formatada

### `detectarTipoNota(nota)`
Identifica automaticamente se é NFe, NFSe ou mista.

**Parâmetros:**
- `nota`: NotaFiscal

**Retorna:** 'nfe' | 'nfse' | 'mista'

## 📊 Estrutura de Dados

### NotaFiscal
```typescript
{
    id?: string;
    company_id: string;
    tipo: 'nfe' | 'nfse' | 'mista';
    tipo_operacao: 'entrada' | 'saida';
    numero: string;
    serie: string;
    modelo: string;
    chave_acesso?: string;
    data_emissao: string;
    emitente: DadosFiscaisPessoa;
    destinatario: DadosFiscaisPessoa;
    itens: ItemNotaFiscal[];
    totais: TotaisNotaFiscal;
    regime_tributario: RegimeTributario;
    status: StatusNota;
    // ...
}
```

### ItemNotaFiscal
```typescript
{
    sequencia: number;
    tipo: 'produto' | 'servico';
    produto_id?: string;
    codigo: string;
    descricao: string;
    ncm?: string; // Para produtos
    codigo_servico?: string; // Para serviços
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    impostos?: ImpostosItemNFe | ImpostosItemNFSe;
    // ...
}
```

## 🗄️ Tabelas do Banco

### `notas_fiscais`
Armazena as notas fiscais completas.

### `nota_fiscal_itens`
Armazena os itens de cada nota.

### `fiscal_logs`
Armazena logs de todas as alterações (recálculos, validações, etc).

## 🔄 Fluxo de Uso

1. **Criar Nota**: Criar objeto `NotaFiscal` com dados básicos
2. **Adicionar Itens**: Adicionar itens (produtos ou serviços)
3. **Recalcular**: Chamar `recalcularTudo()` para calcular impostos
4. **Validar**: Chamar `validarNota()` para verificar erros
5. **Gerar XML**: Chamar `gerarXML()` quando estiver pronto
6. **Salvar**: Salvar no banco de dados

## ⚠️ Regras Importantes

### Produtos (NFe)
- NCM obrigatório (8 dígitos)
- CFOP obrigatório e válido
- CST/CSOSN conforme regime tributário
- ICMS calculado automaticamente

### Serviços (NFSe)
- Código de serviço obrigatório
- Alíquota ISS obrigatória
- Dados do prestador e tomador completos

### Notas Mistas
- Sistema gera automaticamente duas notas separadas
- Uma NFe para produtos
- Uma NFSe para serviços

## 📝 Exemplo Completo

```typescript
import { useFiscalEngine } from '@/hooks/useFiscalEngine';
import { NotaFiscal } from '@/types/fiscal';

function ExemploNotaFiscal() {
    const [nota, setNota] = useState<NotaFiscal>({
        company_id: '...',
        tipo: 'nfe',
        tipo_operacao: 'saida',
        numero: '000001',
        serie: '1',
        modelo: '55',
        data_emissao: new Date().toISOString().split('T')[0],
        emitente: { /* ... */ },
        destinatario: { /* ... */ },
        itens: [],
        totais: { /* ... */ },
        regime_tributario: 'simples_nacional',
        status: 'rascunho',
        precisa_validacao_fiscal: true,
    });

    const { recalcularTudo, validarNota, gerarXML } = useFiscalEngine(nota);

    // Adicionar item e recalcular
    const adicionarItem = async () => {
        const novoItem: ItemNotaFiscal = {
            sequencia: nota.itens.length + 1,
            tipo: 'produto',
            codigo: 'PROD001',
            descricao: 'Produto Teste',
            ncm: '12345678',
            cfop: '5101',
            unidade: 'UN',
            quantidade: 1,
            valor_unitario: 100,
            valor_total: 100,
            desconto: 0,
        };

        const notaComItem = {
            ...nota,
            itens: [...nota.itens, novoItem],
        };

        const notaRecalculada = await recalcularTudo(notaComItem);
        setNota(notaRecalculada);
    };

    // Validar antes de gerar XML
    const processarNota = async () => {
        const validacao = await validarNota(nota);
        
        if (validacao.valida) {
            const xml = await gerarXML(nota);
            console.log('XML gerado:', xml);
        } else {
            console.error('Erros:', validacao.erros);
        }
    };

    return (
        <div>
            <button onClick={adicionarItem}>Adicionar Item</button>
            <button onClick={processarNota}>Processar Nota</button>
        </div>
    );
}
```

## 🎓 Regras Fiscais

O motor fiscal aplica automaticamente:

- **CFOPs válidos** por operação (entrada/saída)
- **CST/CSOSN** conforme regime tributário
- **Alíquotas padrão** por estado (ICMS)
- **Cálculo de impostos** (ICMS, IPI, PIS, COFINS, ISS)
- **Validação de totais** e consistência

## 📚 Referências

- NFe 4.0: http://www.nfe.fazenda.gov.br
- NFSe ABRASF 2.04: http://www.abrasf.org.br

