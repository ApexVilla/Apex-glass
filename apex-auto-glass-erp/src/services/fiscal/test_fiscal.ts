import { fiscalService } from './FiscalService';
import { NotaFiscal } from '@/types/fiscal';

// Mock Data
const mockNota: NotaFiscal = {
    company_id: '123',
    tipo: 'nfe',
    tipo_operacao: 'saida',
    numero: '100',
    serie: '1',
    modelo: '55',
    data_emissao: new Date().toISOString(),
    emitente: {
        cpf_cnpj: '11111111000111',
        razao_social: 'Empresa Teste Ltda',
        endereco: { logradouro: 'Rua A', numero: '1', bairro: 'Centro', municipio: 'São Paulo', codigo_municipio: '3550308', uf: 'SP', cep: '01000000' }
    },
    destinatario: {
        cpf_cnpj: '22222222000122',
        razao_social: 'Cliente Teste SA',
        endereco: { logradouro: 'Rua B', numero: '2', bairro: 'Centro', municipio: 'Rio de Janeiro', codigo_municipio: '3304557', uf: 'RJ', cep: '20000000' }
    },
    natureza_operacao: 'Venda Interestadual',
    finalidade: 'normal',
    regime_tributario: 'lucro_presumido',
    itens: [
        {
            sequencia: 1,
            tipo: 'produto',
            codigo: 'PROD001',
            descricao: 'Produto Teste',
            ncm: '12345678',
            cfop: '6102',
            unidade: 'UN',
            quantidade: 10,
            valor_unitario: 100,
            valor_total: 1000,
            desconto: 0
        }
    ],
    totais: {
        valor_produtos: 0, valor_servicos: 0, valor_descontos: 0, valor_frete: 0, valor_seguro: 0, valor_outras_despesas: 0,
        valor_icms: 0, valor_icms_st: 0, valor_ipi: 0, valor_pis: 0, valor_cofins: 0, valor_iss: 0, valor_iss_retido: 0,
        valor_total: 0, valor_total_tributos: 0
    },
    status: 'rascunho',
    precisa_validacao_fiscal: true
};

async function runTests() {
    console.log('--- Iniciando Testes do Motor Fiscal ---');

    // Teste 1: Cálculo de Impostos (Interestadual SP -> RJ)
    console.log('\nTeste 1: Cálculo Interestadual (SP -> RJ)');
    const notaCalculada = fiscalService.calculateTaxes(mockNota);

    const item = notaCalculada.itens[0];
    const icms = (item.impostos as any).icms;
    const pis = (item.impostos as any).pis;
    const cofins = (item.impostos as any).cofins;

    console.log(`Valor Base: ${icms.base_calculo}`);
    console.log(`Alíquota ICMS: ${icms.aliquota}% (Esperado: 12%)`);
    console.log(`Valor ICMS: ${icms.valor}`);
    console.log(`Valor PIS: ${pis.valor} (0.65%)`);
    console.log(`Valor COFINS: ${cofins.valor} (3.00%)`);

    if (icms.aliquota === 12 && icms.valor === 120) {
        console.log('✅ Cálculo ICMS Interestadual: SUCESSO');
    } else {
        console.error('❌ Cálculo ICMS Interestadual: FALHA');
    }

    // Teste 2: Validação
    console.log('\nTeste 2: Validação de Campos Obrigatórios');
    const validacao = fiscalService.validate(mockNota);
    if (validacao.valida) {
        console.log('✅ Validação Básica: SUCESSO');
    } else {
        console.error('❌ Validação Básica: FALHA', validacao.erros);
    }

    // Teste 3: Erro de Validação
    console.log('\nTeste 3: Detecção de Erro (NCM Inválido)');
    const notaInvalida = { ...mockNota, itens: [{ ...mockNota.itens[0], ncm: '123' }] };
    const validacaoErro = fiscalService.validate(notaInvalida);

    if (!validacaoErro.valida && validacaoErro.erros.some(e => e.campo.includes('ncm'))) {
        console.log('✅ Detecção de Erro NCM: SUCESSO');
    } else {
        console.error('❌ Detecção de Erro NCM: FALHA');
    }
}

// Para rodar este arquivo, seria necessário ts-node. 
// Como não podemos executar diretamente aqui, este código serve como documentação de teste unitário.
// runTests();
