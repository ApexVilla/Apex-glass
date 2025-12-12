import { ImpostosItemNFSe, ItemNotaFiscal, DadosFiscaisPessoa } from '@/types/fiscal';

export class ISSCalculator {
    calculate(
        item: ItemNotaFiscal,
        emitente: DadosFiscaisPessoa,
        tomador: DadosFiscaisPessoa
    ): ImpostosItemNFSe['iss'] {
        const valorBase = item.valor_total - (item.desconto || 0);

        // TODO: Buscar alíquota do cadastro de serviço ou configuração municipal
        const aliquota = 5; // Exemplo padrão 5%

        // Regra de retenção: Se o serviço for prestado em outro município e a lei exigir retenção
        // Simplificação: Se municípios diferentes, retém (regra genérica, precisa refinar por código de serviço LC 116)
        const retido = emitente.endereco.codigo_municipio !== tomador.endereco.codigo_municipio;

        return {
            base_calculo: valorBase,
            aliquota,
            valor: valorBase * (aliquota / 100),
            retido,
            codigo_servico: item.codigo_servico || '00.00',
            codigo_municipio: emitente.endereco.codigo_municipio
        };
    }
}
