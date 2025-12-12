/**
 * Gerador de XMLs de eventos da SEFAZ
 * Gera XMLs de manifestação do destinatário (eventos 210100, 210200, 210240, 210250)
 */

/**
 * Tipos de manifestação
 */
export type TipoManifestacao = '210100' | '210200' | '210240' | '210250';

/**
 * Interface para dados da manifestação
 */
export interface ManifestacaoData {
    chaveAcesso: string;
    tipo: TipoManifestacao;
    cnpj: string;
    uf: string;
    ambiente: '1' | '2'; // 1=Produção, 2=Homologação
    justificativa?: string; // Obrigatória para 210240 e 210250
    sequencia?: number; // Número sequencial do evento (padrão: 1)
}

/**
 * Gerador de XMLs de eventos de manifestação
 */
export const eventXMLGenerator = {
    /**
     * Gera XML de evento de manifestação do destinatário
     */
    generateManifestacaoXML(data: ManifestacaoData): string {
        const {
            chaveAcesso,
            tipo,
            cnpj,
            uf,
            ambiente,
            justificativa,
            sequencia = 1,
        } = data;

        // Validar justificativa para tipos que exigem
        if ((tipo === '210240' || tipo === '210250') && !justificativa) {
            throw new Error(`Justificativa é obrigatória para manifestação tipo ${tipo}`);
        }

        // Data/hora atual no formato ISO 8601 (UTC)
        const dhEvento = new Date().toISOString().replace(/\.\d{3}Z$/, '-00:00');

        // Descrição do evento
        const descEvento = this.getDescricaoEvento(tipo);

        // Montar XML do evento
        const xmlEvento = `<?xml version="1.0" encoding="UTF-8"?>
<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
  <idLote>${Date.now()}</idLote>
  <evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
    <infEvento Id="ID${tipo}${chaveAcesso}">
      <cOrgao>${this.getCodigoOrgao(uf)}</cOrgao>
      <tpAmb>${ambiente}</tpAmb>
      <CNPJ>${cnpj.replace(/\D/g, '')}</CNPJ>
      <chNFe>${chaveAcesso}</chNFe>
      <dhEvento>${dhEvento}</dhEvento>
      <tpEvento>${tipo}</tpEvento>
      <nSeqEvento>${sequencia}</nSeqEvento>
      <verEvento>1.00</verEvento>
      <detEvento versao="1.00">
        <descEvento>${descEvento}</descEvento>
        ${justificativa ? `<xJust>${this.escapeXml(justificativa)}</xJust>` : ''}
      </detEvento>
    </infEvento>
  </evento>
</envEvento>`;

        return xmlEvento;
    },

    /**
     * Retorna código do órgão pela UF
     */
    getCodigoOrgao(uf: string): string {
        const codigos: Record<string, string> = {
            'AC': '12', 'AL': '27', 'AP': '16', 'AM': '13', 'BA': '29',
            'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21',
            'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15', 'PB': '25',
            'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24',
            'RS': '43', 'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35',
            'SE': '28', 'TO': '17',
        };
        return codigos[uf.toUpperCase()] || '35'; // SP como padrão
    },

    /**
     * Retorna descrição do evento
     */
    getDescricaoEvento(tipo: TipoManifestacao): string {
        const descricoes: Record<TipoManifestacao, string> = {
            '210100': 'Ciência da Operação',
            '210200': 'Confirmação da Operação',
            '210240': 'Desconhecimento da Operação',
            '210250': 'Operação Não Realizada',
        };
        return descricoes[tipo];
    },

    /**
     * Escapa caracteres especiais XML
     */
    escapeXml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    },

    /**
     * Extrai dados do XML de retorno da SEFAZ
     */
    parseRetornoXML(xmlRetorno: string): {
        success: boolean;
        protocolo?: string;
        status?: string;
        motivo?: string;
        erro?: string;
    } {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlRetorno, 'text/xml');

            // Verificar erros de parsing
            const parseError = xmlDoc.querySelector('parsererror');
            if (parseError) {
                return {
                    success: false,
                    erro: 'XML de retorno inválido',
                };
            }

            // Buscar retorno do evento
            const retEvento = xmlDoc.getElementsByTagName('retEvento')[0] ||
                             xmlDoc.querySelector('*[local-name()="retEvento"]');

            if (!retEvento) {
                return {
                    success: false,
                    erro: 'Tag retEvento não encontrada no XML de retorno',
                };
            }

            // Extrair infEvento
            const infEvento = retEvento.getElementsByTagName('infEvento')[0] ||
                             retEvento.querySelector('*[local-name()="infEvento"]');

            if (!infEvento) {
                return {
                    success: false,
                    erro: 'Tag infEvento não encontrada',
                };
            }

            const cStat = this.getTextContent(infEvento, 'cStat');
            const xMotivo = this.getTextContent(infEvento, 'xMotivo');
            const nProt = this.getTextContent(infEvento, 'nProt');

            const success = cStat === '135' || cStat === '136'; // 135=Evento registrado, 136=Evento registrado e vinculado

            return {
                success,
                protocolo: nProt,
                status: cStat,
                motivo: xMotivo,
                erro: success ? undefined : xMotivo,
            };
        } catch (error: any) {
            return {
                success: false,
                erro: error.message || 'Erro ao parsear XML de retorno',
            };
        }
    },

    /**
     * Extrai texto de elemento XML
     */
    getTextContent(element: Element | null, tagName: string): string {
        if (!element) return '';
        const tag = element.getElementsByTagName(tagName)[0] ||
                   element.querySelector(`*[local-name()="${tagName}"]`);
        return tag?.textContent || '';
    },
};

