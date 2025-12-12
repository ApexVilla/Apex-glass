import { NotaFiscal, ResultadoValidacao, ItemNotaFiscal } from '@/types/fiscal';

export class FiscalValidator {
    validate(nota: NotaFiscal): ResultadoValidacao {
        const erros: ResultadoValidacao['erros'] = [];
        const avisos: ResultadoValidacao['avisos'] = [];

        // Validação de Cabeçalho
        if (!nota.natureza_operacao) erros.push({ campo: 'natureza_operacao', mensagem: 'Natureza da operação é obrigatória.' });
        if (!nota.destinatario.cpf_cnpj) erros.push({ campo: 'destinatario.cpf_cnpj', mensagem: 'CPF/CNPJ do destinatário é obrigatório.' });
        if (!nota.destinatario.endereco.uf) erros.push({ campo: 'destinatario.endereco.uf', mensagem: 'UF do destinatário é obrigatória.' });

        // Validação de Itens
        nota.itens.forEach((item, index) => {
            const prefixo = `Item ${index + 1} (${item.descricao})`;

            if (item.tipo === 'produto') {
                if (!item.ncm) erros.push({ campo: `itens[${index}].ncm`, mensagem: `${prefixo}: NCM é obrigatório para produtos.` });
                else if (item.ncm.length !== 8) erros.push({ campo: `itens[${index}].ncm`, mensagem: `${prefixo}: NCM deve ter 8 dígitos.` });

                if (!item.cfop) erros.push({ campo: `itens[${index}].cfop`, mensagem: `${prefixo}: CFOP é obrigatório para produtos.` });
            } else {
                if (!item.codigo_servico) erros.push({ campo: `itens[${index}].codigo_servico`, mensagem: `${prefixo}: Código do serviço é obrigatório.` });
            }

            if (item.valor_unitario <= 0) erros.push({ campo: `itens[${index}].valor_unitario`, mensagem: `${prefixo}: Valor unitário deve ser maior que zero.` });
            if (item.quantidade <= 0) erros.push({ campo: `itens[${index}].quantidade`, mensagem: `${prefixo}: Quantidade deve ser maior que zero.` });
        });

        // Validação de Totais
        const totalItens = nota.itens.reduce((acc, item) => acc + item.valor_total, 0);
        if (Math.abs(totalItens - nota.totais.valor_produtos - nota.totais.valor_servicos) > 0.01) {
            avisos.push({ campo: 'totais', mensagem: 'Soma dos itens difere dos totais da nota.' });
        }

        return {
            valida: erros.length === 0,
            erros,
            avisos
        };
    }
}
