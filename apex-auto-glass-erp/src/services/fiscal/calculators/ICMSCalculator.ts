import { ImpostosItemNFe, CSTICMS, ItemNotaFiscal, DadosFiscaisPessoa } from '@/types/fiscal';

export class ICMSCalculator {
    calculate(
        item: ItemNotaFiscal,
        emitente: DadosFiscaisPessoa,
        destinatario: DadosFiscaisPessoa,
        regimeTributario: 'simples_nacional' | 'lucro_presumido' | 'lucro_real'
    ): ImpostosItemNFe['icms'] {
        const isInterstadual = emitente.endereco.uf !== destinatario.endereco.uf;
        const valorBase = item.valor_total + (item.valor_frete || 0) + (item.valor_seguro || 0) + (item.valor_outras_despesas || 0) - (item.desconto || 0);

        // Default values
        let cst: CSTICMS = '00';
        let csosn: CSTICMS | undefined;
        let base_calculo = valorBase;
        let aliquota = 0;
        let valor = 0;
        let origem = '0'; // Nacional

        if (regimeTributario === 'simples_nacional') {
            // Lógica simplificada para Simples Nacional
            csosn = '102'; // Tributada pelo Simples sem permissão de crédito (padrão seguro)

            // Se for venda para não contribuinte, geralmente é 102 ou 103.
            // Se for indústria, pode ser 101.
            // TODO: Implementar regras mais complexas baseadas em configuração.

            return {
                origem,
                csosn,
                base_calculo: 0, // Simples não destaca ICMS em campo próprio geralmente (exceto 900 ou excesso)
                aliquota: 0,
                valor: 0
            };
        } else {
            // Regime Normal (Lucro Real / Presumido)
            cst = '00'; // Tributada integralmente

            // Definir alíquota
            if (isInterstadual) {
                // Regra geral interestadual
                // Sul/Sudeste (exceto ES) -> Norte/Nordeste/CO/ES = 7%
                // Resto = 12%
                // Importados = 4%

                const ufs7 = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'PA', 'PB', 'PE', 'PI', 'RN', 'RO', 'RR', 'SE', 'TO'];
                const ufsSulSudeste = ['MG', 'PR', 'RJ', 'RS', 'SC', 'SP'];

                if (ufsSulSudeste.includes(emitente.endereco.uf) && ufs7.includes(destinatario.endereco.uf)) {
                    aliquota = 7;
                } else {
                    aliquota = 12;
                }
            } else {
                // Interna (Exemplo genérico 18%, deve vir de config por UF)
                aliquota = 18;
                if (emitente.endereco.uf === 'SP') aliquota = 18;
                // TODO: Carregar tabela de alíquotas internas por UF
            }

            valor = base_calculo * (aliquota / 100);

            return {
                origem,
                cst,
                base_calculo,
                aliquota,
                valor
            };
        }
    }
}
