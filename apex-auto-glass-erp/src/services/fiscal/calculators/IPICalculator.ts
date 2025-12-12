import { ImpostosItemNFe, ItemNotaFiscal } from '@/types/fiscal';

export class IPICalculator {
    calculate(item: ItemNotaFiscal): ImpostosItemNFe['ipi'] {
        const valorBase = item.valor_total + (item.valor_frete || 0) + (item.valor_seguro || 0) + (item.valor_outras_despesas || 0);

        // TODO: Buscar alíquota do NCM
        const aliquota = 0; // Padrão 0%
        const cst = '99'; // Outras saídas

        return {
            cst,
            base_calculo: valorBase,
            aliquota,
            valor: valorBase * (aliquota / 100)
        };
    }
}
