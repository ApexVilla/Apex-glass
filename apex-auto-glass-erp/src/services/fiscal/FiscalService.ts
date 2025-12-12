import { NotaFiscal, ResultadoRecalculo, ResultadoValidacao, ItemNotaFiscal, TotaisNotaFiscal } from '@/types/fiscal';
import { ICMSCalculator } from './calculators/ICMSCalculator';
import { PISCOFINSCalculator } from './calculators/PISCOFINSCalculator';
import { IPICalculator } from './calculators/IPICalculator';
import { ISSCalculator } from './calculators/ISSCalculator';
import { FiscalValidator } from './validators/FiscalValidator';

export class FiscalService {
    private icmsCalculator = new ICMSCalculator();
    private pisCofinsCalculator = new PISCOFINSCalculator();
    private ipiCalculator = new IPICalculator();
    private issCalculator = new ISSCalculator();
    private validator = new FiscalValidator();

    public calculateTaxes(nota: NotaFiscal): NotaFiscal {
        const newNota = { ...nota, itens: [...nota.itens] };

        // 1. Calcular impostos item a item
        newNota.itens = newNota.itens.map(item => {
            const newItem = { ...item };

            if (item.tipo === 'produto') {
                const icms = this.icmsCalculator.calculate(item, nota.emitente, nota.destinatario, nota.regime_tributario);
                const pisCofins = this.pisCofinsCalculator.calculate(item, nota.regime_tributario);
                const ipi = this.ipiCalculator.calculate(item);

                newItem.impostos = {
                    icms,
                    pis: pisCofins.pis,
                    cofins: pisCofins.cofins,
                    ipi
                };
            } else {
                const iss = this.issCalculator.calculate(item, nota.emitente, nota.destinatario);
                const pisCofins = this.pisCofinsCalculator.calculate(item, nota.regime_tributario); // PIS/COFINS também incide sobre serviços dependendo do regime

                newItem.impostos = {
                    iss,
                    pis: pisCofins.pis,
                    cofins: pisCofins.cofins
                };
            }

            return newItem;
        });

        // 2. Recalcular Totais
        newNota.totais = this.calculateTotals(newNota.itens);

        return newNota;
    }

    public async parseXML(xmlContent: string): Promise<NotaFiscal> {
        // TODO: Implement actual XML parsing logic using a library like fast-xml-parser
        // For now, returning a mock structure or throwing error if library not found
        console.log('Parsing XML...', xmlContent.substring(0, 50));

        // Mock implementation for structure
        throw new Error('XML Parser not implemented yet. Install fast-xml-parser.');
    }

    public generateJSON(nota: NotaFiscal): any {
        // Generate the final JSON structure expected by the API/Supabase
        // This should match the 'fiscal_invoices' and 'fiscal_invoice_items' table structure
        // plus any specific format for the NFe/NFS-e signing API.

        return {
            header: {
                tipo: nota.tipo,
                modelo: nota.modelo,
                serie: nota.serie,
                numero: nota.numero,
                data_emissao: nota.data_emissao,
                emitente: nota.emitente,
                destinatario: nota.destinatario,
                natureza_operacao: nota.natureza_operacao,
                totais: nota.totais
            },
            items: nota.itens.map(item => ({
                sequencia: item.sequencia,
                codigo: item.codigo,
                descricao: item.descricao,
                ncm: item.ncm,
                cfop: item.cfop,
                unidade: item.unidade,
                quantidade: item.quantidade,
                valor_unitario: item.valor_unitario,
                valor_total: item.valor_total,
                impostos: item.impostos
            }))
        };
    }

    private calculateTotals(itens: ItemNotaFiscal[]): TotaisNotaFiscal {
        const totais: TotaisNotaFiscal = {
            valor_produtos: 0,
            valor_servicos: 0,
            valor_descontos: 0,
            valor_frete: 0,
            valor_seguro: 0,
            valor_outras_despesas: 0,
            valor_icms: 0,
            valor_icms_st: 0,
            valor_ipi: 0,
            valor_pis: 0,
            valor_cofins: 0,
            valor_iss: 0,
            valor_iss_retido: 0,
            valor_total: 0,
            valor_total_tributos: 0
        };

        itens.forEach(item => {
            if (item.tipo === 'produto') {
                totais.valor_produtos += item.valor_total;
                const impostos = item.impostos as any; // Cast for simplicity here
                if (impostos) {
                    totais.valor_icms += impostos.icms?.valor || 0;
                    totais.valor_icms_st += impostos.icms?.valor_st || 0;
                    totais.valor_ipi += impostos.ipi?.valor || 0;
                    totais.valor_pis += impostos.pis?.valor || 0;
                    totais.valor_cofins += impostos.cofins?.valor || 0;
                }
            } else {
                totais.valor_servicos += item.valor_total;
                const impostos = item.impostos as any;
                if (impostos) {
                    totais.valor_iss += impostos.iss?.valor || 0;
                    if (impostos.iss?.retido) totais.valor_iss_retido += impostos.iss?.valor || 0;
                    totais.valor_pis += impostos.pis?.valor || 0;
                    totais.valor_cofins += impostos.cofins?.valor || 0;
                }
            }

            totais.valor_descontos += item.desconto || 0;
            totais.valor_frete += item.valor_frete || 0;
            totais.valor_seguro += item.valor_seguro || 0;
            totais.valor_outras_despesas += item.valor_outras_despesas || 0;
        });

        totais.valor_total =
            totais.valor_produtos +
            totais.valor_servicos +
            totais.valor_frete +
            totais.valor_seguro +
            totais.valor_outras_despesas +
            totais.valor_ipi +
            totais.valor_icms_st -
            totais.valor_descontos; // Nota: ISS retido geralmente deduz do total a pagar, mas compõe o valor do serviço.

        return totais;
    }
}

export const fiscalService = new FiscalService();
