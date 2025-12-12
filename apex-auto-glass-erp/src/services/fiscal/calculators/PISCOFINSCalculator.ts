import { ImpostosItemNFe, CSTPISCOFINS, ItemNotaFiscal } from '@/types/fiscal';

export class PISCOFINSCalculator {
    calculate(
        item: ItemNotaFiscal,
        regimeTributario: 'simples_nacional' | 'lucro_presumido' | 'lucro_real'
    ): { pis: ImpostosItemNFe['pis'], cofins: ImpostosItemNFe['cofins'] } {
        const valorBase = item.valor_total + (item.valor_frete || 0) + (item.valor_seguro || 0) + (item.valor_outras_despesas || 0) - (item.desconto || 0);

        let cst: CSTPISCOFINS = '01';
        let aliqPis = 0;
        let aliqCofins = 0;

        if (regimeTributario === 'simples_nacional') {
            cst = '99'; // Outras operações (Simples não destaca PIS/COFINS em NFe geralmente)
            return {
                pis: { cst, base_calculo: 0, aliquota: 0, valor: 0 },
                cofins: { cst, base_calculo: 0, aliquota: 0, valor: 0 }
            };
        } else if (regimeTributario === 'lucro_presumido') {
            // Cumulativo
            cst = '01';
            aliqPis = 0.65;
            aliqCofins = 3.00;
        } else {
            // Lucro Real (Não Cumulativo)
            cst = '01';
            aliqPis = 1.65;
            aliqCofins = 7.60;
        }

        return {
            pis: {
                cst,
                base_calculo: valorBase,
                aliquota: aliqPis,
                valor: valorBase * (aliqPis / 100)
            },
            cofins: {
                cst,
                base_calculo: valorBase,
                aliquota: aliqCofins,
                valor: valorBase * (aliqCofins / 100)
            }
        };
    }
}
