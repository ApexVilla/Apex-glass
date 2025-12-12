/**
 * Mapeamento de endpoints SEFAZ por UF
 * Endpoints para serviços de NFe (manifestação, consulta, etc)
 */

export type UF = 
    | 'AC' | 'AL' | 'AP' | 'AM' | 'BA' | 'CE' | 'DF' | 'ES' | 'GO' | 'MA'
    | 'MT' | 'MS' | 'MG' | 'PA' | 'PB' | 'PR' | 'PE' | 'PI' | 'RJ' | 'RN'
    | 'RS' | 'RO' | 'RR' | 'SC' | 'SP' | 'SE' | 'TO';

export type Ambiente = 'homologacao' | 'producao';

export interface SefazEndpoint {
    manifestacao: string; // Endpoint para manifestação do destinatário
    consulta: string; // Endpoint para consulta de situação
    distribuicao: string; // Endpoint para distribuição DF-e
    status: string; // Endpoint para status do serviço
}

/**
 * Mapeamento de endpoints SEFAZ
 * Fonte: Manual de Integração do Contribuinte v5.00
 */
const endpoints: Record<UF, Record<Ambiente, SefazEndpoint>> = {
    'AC': {
        homologacao: {
            manifestacao: 'https://hnfe.sefaznet.ac.gov.br/nfe/RecepcaoEvento',
            consulta: 'https://hnfe.sefaznet.ac.gov.br/nfe/ConsultaProtocolo',
            distribuicao: 'https://hnfe.sefaznet.ac.gov.br/nfe/DistribuicaoDFe',
            status: 'https://hnfe.sefaznet.ac.gov.br/nfe/StatusServico',
        },
        producao: {
            manifestacao: 'https://nfe.sefaznet.ac.gov.br/nfe/RecepcaoEvento',
            consulta: 'https://nfe.sefaznet.ac.gov.br/nfe/ConsultaProtocolo',
            distribuicao: 'https://nfe.sefaznet.ac.gov.br/nfe/DistribuicaoDFe',
            status: 'https://nfe.sefaznet.ac.gov.br/nfe/StatusServico',
        },
    },
    'AL': {
        homologacao: {
            manifestacao: 'https://homologacao.nfe.sefaz.al.gov.br/ws/RecepcaoEvento',
            consulta: 'https://homologacao.nfe.sefaz.al.gov.br/ws/ConsultaProtocolo',
            distribuicao: 'https://homologacao.nfe.sefaz.al.gov.br/ws/DistribuicaoDFe',
            status: 'https://homologacao.nfe.sefaz.al.gov.br/ws/StatusServico',
        },
        producao: {
            manifestacao: 'https://nfe.sefaz.al.gov.br/ws/RecepcaoEvento',
            consulta: 'https://nfe.sefaz.al.gov.br/ws/ConsultaProtocolo',
            distribuicao: 'https://nfe.sefaz.al.gov.br/ws/DistribuicaoDFe',
            status: 'https://nfe.sefaz.al.gov.br/ws/StatusServico',
        },
    },
    'AP': {
        homologacao: {
            manifestacao: 'https://homologacao.nfe.sefaz.ap.gov.br/ws/RecepcaoEvento',
            consulta: 'https://homologacao.nfe.sefaz.ap.gov.br/ws/ConsultaProtocolo',
            distribuicao: 'https://homologacao.nfe.sefaz.ap.gov.br/ws/DistribuicaoDFe',
            status: 'https://homologacao.nfe.sefaz.ap.gov.br/ws/StatusServico',
        },
        producao: {
            manifestacao: 'https://nfe.sefaz.ap.gov.br/ws/RecepcaoEvento',
            consulta: 'https://nfe.sefaz.ap.gov.br/ws/ConsultaProtocolo',
            distribuicao: 'https://nfe.sefaz.ap.gov.br/ws/DistribuicaoDFe',
            status: 'https://nfe.sefaz.ap.gov.br/ws/StatusServico',
        },
    },
    'AM': {
        homologacao: {
            manifestacao: 'https://homologacao.sefaz.am.gov.br/nfe-services/services/RecepcaoEvento',
            consulta: 'https://homologacao.sefaz.am.gov.br/nfe-services/services/ConsultaProtocolo',
            distribuicao: 'https://homologacao.sefaz.am.gov.br/nfe-services/services/DistribuicaoDFe',
            status: 'https://homologacao.sefaz.am.gov.br/nfe-services/services/StatusServico',
        },
        producao: {
            manifestacao: 'https://nfe.sefaz.am.gov.br/nfe-services/services/RecepcaoEvento',
            consulta: 'https://nfe.sefaz.am.gov.br/nfe-services/services/ConsultaProtocolo',
            distribuicao: 'https://nfe.sefaz.am.gov.br/nfe-services/services/DistribuicaoDFe',
            status: 'https://nfe.sefaz.am.gov.br/nfe-services/services/StatusServico',
        },
    },
    'BA': {
        homologacao: {
            manifestacao: 'https://hnfe.sefaz.ba.gov.br/webservices/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
            consulta: 'https://hnfe.sefaz.ba.gov.br/webservices/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx',
            distribuicao: 'https://hnfe.sefaz.ba.gov.br/webservices/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
            status: 'https://hnfe.sefaz.ba.gov.br/webservices/NFeStatusServico4/NFeStatusServico4.asmx',
        },
        producao: {
            manifestacao: 'https://nfe.sefaz.ba.gov.br/webservices/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
            consulta: 'https://nfe.sefaz.ba.gov.br/webservices/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx',
            distribuicao: 'https://nfe.sefaz.ba.gov.br/webservices/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
            status: 'https://nfe.sefaz.ba.gov.br/webservices/NFeStatusServico4/NFeStatusServico4.asmx',
        },
    },
    'CE': {
        homologacao: {
            manifestacao: 'https://nfeh.sefaz.ce.gov.br/nfe4/services/RecepcaoEvento',
            consulta: 'https://nfeh.sefaz.ce.gov.br/nfe4/services/ConsultaProtocolo',
            distribuicao: 'https://nfeh.sefaz.ce.gov.br/nfe4/services/DistribuicaoDFe',
            status: 'https://nfeh.sefaz.ce.gov.br/nfe4/services/StatusServico',
        },
        producao: {
            manifestacao: 'https://nfe.sefaz.ce.gov.br/nfe4/services/RecepcaoEvento',
            consulta: 'https://nfe.sefaz.ce.gov.br/nfe4/services/ConsultaProtocolo',
            distribuicao: 'https://nfe.sefaz.ce.gov.br/nfe4/services/DistribuicaoDFe',
            status: 'https://nfe.sefaz.ce.gov.br/nfe4/services/StatusServico',
        },
    },
    'DF': {
        homologacao: {
            manifestacao: 'https://homolog.nfe.fazenda.gov.br/NFeRecepcaoEvento4.asmx',
            consulta: 'https://homolog.nfe.fazenda.gov.br/NFeConsultaProtocolo4.asmx',
            distribuicao: 'https://homolog.nfe.fazenda.gov.br/NFeDistribuicaoDFe.asmx',
            status: 'https://homolog.nfe.fazenda.gov.br/NFeStatusServico4.asmx',
        },
        producao: {
            manifestacao: 'https://www.nfe.fazenda.gov.br/NFeRecepcaoEvento4.asmx',
            consulta: 'https://www.nfe.fazenda.gov.br/NFeConsultaProtocolo4.asmx',
            distribuicao: 'https://www.nfe.fazenda.gov.br/NFeDistribuicaoDFe.asmx',
            status: 'https://www.nfe.fazenda.gov.br/NFeStatusServico4.asmx',
        },
    },
    'ES': {
        homologacao: {
            manifestacao: 'https://homologacao.nfe.fazenda.es.gov.br/ws/RecepcaoEvento',
            consulta: 'https://homologacao.nfe.fazenda.es.gov.br/ws/ConsultaProtocolo',
            distribuicao: 'https://homologacao.nfe.fazenda.es.gov.br/ws/DistribuicaoDFe',
            status: 'https://homologacao.nfe.fazenda.es.gov.br/ws/StatusServico',
        },
        producao: {
            manifestacao: 'https://nfe.fazenda.es.gov.br/ws/RecepcaoEvento',
            consulta: 'https://nfe.fazenda.es.gov.br/ws/ConsultaProtocolo',
            distribuicao: 'https://nfe.fazenda.es.gov.br/ws/DistribuicaoDFe',
            status: 'https://nfe.fazenda.es.gov.br/ws/StatusServico',
        },
    },
    'GO': {
        homologacao: {
            manifestacao: 'https://homolog.nfe.fazenda.go.gov.br/nfe/services/NFeRecepcaoEvento4',
            consulta: 'https://homolog.nfe.fazenda.go.gov.br/nfe/services/NFeConsultaProtocolo4',
            distribuicao: 'https://homolog.nfe.fazenda.go.gov.br/nfe/services/NFeDistribuicaoDFe',
            status: 'https://homolog.nfe.fazenda.go.gov.br/nfe/services/NFeStatusServico4',
        },
        producao: {
            manifestacao: 'https://nfe.fazenda.go.gov.br/nfe/services/NFeRecepcaoEvento4',
            consulta: 'https://nfe.fazenda.go.gov.br/nfe/services/NFeConsultaProtocolo4',
            distribuicao: 'https://nfe.fazenda.go.gov.br/nfe/services/NFeDistribuicaoDFe',
            status: 'https://nfe.fazenda.go.gov.br/nfe/services/NFeStatusServico4',
        },
    },
    'MA': {
        homologacao: {
            manifestacao: 'https://homologacao.nfe.sefaz.ma.gov.br/webservices/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
            consulta: 'https://homologacao.nfe.sefaz.ma.gov.br/webservices/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx',
            distribuicao: 'https://homologacao.nfe.sefaz.ma.gov.br/webservices/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
            status: 'https://homologacao.nfe.sefaz.ma.gov.br/webservices/NFeStatusServico4/NFeStatusServico4.asmx',
        },
        producao: {
            manifestacao: 'https://nfe.sefaz.ma.gov.br/webservices/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
            consulta: 'https://nfe.sefaz.ma.gov.br/webservices/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx',
            distribuicao: 'https://nfe.sefaz.ma.gov.br/webservices/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
            status: 'https://nfe.sefaz.ma.gov.br/webservices/NFeStatusServico4/NFeStatusServico4.asmx',
        },
    },
    'MT': {
        homologacao: {
            manifestacao: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeRecepcaoEvento',
            consulta: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeConsulta2',
            distribuicao: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeDistribuicaoDFe',
            status: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeStatusServico2',
        },
        producao: {
            manifestacao: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeRecepcaoEvento',
            consulta: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeConsulta2',
            distribuicao: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeDistribuicaoDFe',
            status: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeStatusServico2',
        },
    },
    'MS': {
        homologacao: {
            manifestacao: 'https://homologacao.nfe.ms.gov.br/homologacao/services2/NfeRecepcaoEvento',
            consulta: 'https://homologacao.nfe.ms.gov.br/homologacao/services2/NfeConsulta2',
            distribuicao: 'https://homologacao.nfe.ms.gov.br/homologacao/services2/NfeDistribuicaoDFe',
            status: 'https://homologacao.nfe.ms.gov.br/homologacao/services2/NfeStatusServico2',
        },
        producao: {
            manifestacao: 'https://nfe.sefaz.ms.gov.br/producao/services2/NfeRecepcaoEvento',
            consulta: 'https://nfe.sefaz.ms.gov.br/producao/services2/NfeConsulta2',
            distribuicao: 'https://nfe.sefaz.ms.gov.br/producao/services2/NfeDistribuicaoDFe',
            status: 'https://nfe.sefaz.ms.gov.br/producao/services2/NfeStatusServico2',
        },
    },
    'MG': {
        homologacao: {
            manifestacao: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento',
            consulta: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo',
            distribuicao: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeDistribuicaoDFe',
            status: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico',
        },
        producao: {
            manifestacao: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento',
            consulta: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo',
            distribuicao: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeDistribuicaoDFe',
            status: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico',
        },
    },
    'PA': {
        homologacao: {
            manifestacao: 'https://homolog.sefaz.pa.gov.br/nfe/RecepcaoEvento',
            consulta: 'https://homolog.sefaz.pa.gov.br/nfe/ConsultaProtocolo',
            distribuicao: 'https://homolog.sefaz.pa.gov.br/nfe/DistribuicaoDFe',
            status: 'https://homolog.sefaz.pa.gov.br/nfe/StatusServico',
        },
        producao: {
            manifestacao: 'https://nfe.sefaz.pa.gov.br/nfe/RecepcaoEvento',
            consulta: 'https://nfe.sefaz.pa.gov.br/nfe/ConsultaProtocolo',
            distribuicao: 'https://nfe.sefaz.pa.gov.br/nfe/DistribuicaoDFe',
            status: 'https://nfe.sefaz.pa.gov.br/nfe/StatusServico',
        },
    },
    'PB': {
        homologacao: {
            manifestacao: 'https://homologacao.sefaz.pb.gov.br/nfe/services/NFeRecepcaoEvento',
            consulta: 'https://homologacao.sefaz.pb.gov.br/nfe/services/NFeConsultaProtocolo',
            distribuicao: 'https://homologacao.sefaz.pb.gov.br/nfe/services/NFeDistribuicaoDFe',
            status: 'https://homologacao.sefaz.pb.gov.br/nfe/services/NFeStatusServico',
        },
        producao: {
            manifestacao: 'https://nfe.sefaz.pb.gov.br/nfe/services/NFeRecepcaoEvento',
            consulta: 'https://nfe.sefaz.pb.gov.br/nfe/services/NFeConsultaProtocolo',
            distribuicao: 'https://nfe.sefaz.pb.gov.br/nfe/services/NFeDistribuicaoDFe',
            status: 'https://nfe.sefaz.pb.gov.br/nfe/services/NFeStatusServico',
        },
    },
    'PR': {
        homologacao: {
            manifestacao: 'https://homologacao.nfe.fazenda.pr.gov.br/nfe/NFeRecepcaoEvento',
            consulta: 'https://homologacao.nfe.fazenda.pr.gov.br/nfe/NFeConsultaProtocolo',
            distribuicao: 'https://homologacao.nfe.fazenda.pr.gov.br/nfe/NFeDistribuicaoDFe',
            status: 'https://homologacao.nfe.fazenda.pr.gov.br/nfe/NFeStatusServico',
        },
        producao: {
            manifestacao: 'https://nfe.fazenda.pr.gov.br/nfe/NFeRecepcaoEvento',
            consulta: 'https://nfe.fazenda.pr.gov.br/nfe/NFeConsultaProtocolo',
            distribuicao: 'https://nfe.fazenda.pr.gov.br/nfe/NFeDistribuicaoDFe',
            status: 'https://nfe.fazenda.pr.gov.br/nfe/NFeStatusServico',
        },
    },
    'PE': {
        homologacao: {
            manifestacao: 'https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeRecepcaoEvento',
            consulta: 'https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeConsultaProtocolo',
            distribuicao: 'https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeDistribuicaoDFe',
            status: 'https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeStatusServico',
        },
        producao: {
            manifestacao: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeRecepcaoEvento',
            consulta: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeConsultaProtocolo',
            distribuicao: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeDistribuicaoDFe',
            status: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeStatusServico',
        },
    },
    'PI': {
        homologacao: {
            manifestacao: 'https://homologacao.sefaz.pi.gov.br/nfe/services/NFeRecepcaoEvento',
            consulta: 'https://homologacao.sefaz.pi.gov.br/nfe/services/NFeConsultaProtocolo',
            distribuicao: 'https://homologacao.sefaz.pi.gov.br/nfe/services/NFeDistribuicaoDFe',
            status: 'https://homologacao.sefaz.pi.gov.br/nfe/services/NFeStatusServico',
        },
        producao: {
            manifestacao: 'https://nfe.sefaz.pi.gov.br/nfe/services/NFeRecepcaoEvento',
            consulta: 'https://nfe.sefaz.pi.gov.br/nfe/services/NFeConsultaProtocolo',
            distribuicao: 'https://nfe.sefaz.pi.gov.br/nfe/services/NFeDistribuicaoDFe',
            status: 'https://nfe.sefaz.pi.gov.br/nfe/services/NFeStatusServico',
        },
    },
    'RJ': {
        homologacao: {
            manifestacao: 'https://nfehomolog.sefaz.rj.gov.br/nfe/services/NFeRecepcaoEvento',
            consulta: 'https://nfehomolog.sefaz.rj.gov.br/nfe/services/NFeConsultaProtocolo',
            distribuicao: 'https://nfehomolog.sefaz.rj.gov.br/nfe/services/NFeDistribuicaoDFe',
            status: 'https://nfehomolog.sefaz.rj.gov.br/nfe/services/NFeStatusServico',
        },
        producao: {
            manifestacao: 'https://nfe.sefaz.rj.gov.br/nfe/services/NFeRecepcaoEvento',
            consulta: 'https://nfe.sefaz.rj.gov.br/nfe/services/NFeConsultaProtocolo',
            distribuicao: 'https://nfe.sefaz.rj.gov.br/nfe/services/NFeDistribuicaoDFe',
            status: 'https://nfe.sefaz.rj.gov.br/nfe/services/NFeStatusServico',
        },
    },
    'RN': {
        homologacao: {
            manifestacao: 'https://homologacao.nfe.set.rn.gov.br/nfe/services/NFeRecepcaoEvento',
            consulta: 'https://homologacao.nfe.set.rn.gov.br/nfe/services/NFeConsultaProtocolo',
            distribuicao: 'https://homologacao.nfe.set.rn.gov.br/nfe/services/NFeDistribuicaoDFe',
            status: 'https://homologacao.nfe.set.rn.gov.br/nfe/services/NFeStatusServico',
        },
        producao: {
            manifestacao: 'https://nfe.set.rn.gov.br/nfe/services/NFeRecepcaoEvento',
            consulta: 'https://nfe.set.rn.gov.br/nfe/services/NFeConsultaProtocolo',
            distribuicao: 'https://nfe.set.rn.gov.br/nfe/services/NFeDistribuicaoDFe',
            status: 'https://nfe.set.rn.gov.br/nfe/services/NFeStatusServico',
        },
    },
    'RS': {
        homologacao: {
            manifestacao: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
            consulta: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/consultaprotocolo/consultaprotocolo4.asmx',
            distribuicao: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/distribuicaodfe/distribuicaodfe.asmx',
            status: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/statusservico/statusservico4.asmx',
        },
        producao: {
            manifestacao: 'https://nfe.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
            consulta: 'https://nfe.sefazrs.rs.gov.br/ws/consultaprotocolo/consultaprotocolo4.asmx',
            distribuicao: 'https://nfe.sefazrs.rs.gov.br/ws/distribuicaodfe/distribuicaodfe.asmx',
            status: 'https://nfe.sefazrs.rs.gov.br/ws/statusservico/statusservico4.asmx',
        },
    },
    'RO': {
        homologacao: {
            manifestacao: 'https://nfehomologacao.sefaz.ro.gov.br/nfe/services/NFeRecepcaoEvento',
            consulta: 'https://nfehomologacao.sefaz.ro.gov.br/nfe/services/NFeConsultaProtocolo',
            distribuicao: 'https://nfehomologacao.sefaz.ro.gov.br/nfe/services/NFeDistribuicaoDFe',
            status: 'https://nfehomologacao.sefaz.ro.gov.br/nfe/services/NFeStatusServico',
        },
        producao: {
            manifestacao: 'https://nfe.sefaz.ro.gov.br/nfe/services/NFeRecepcaoEvento',
            consulta: 'https://nfe.sefaz.ro.gov.br/nfe/services/NFeConsultaProtocolo',
            distribuicao: 'https://nfe.sefaz.ro.gov.br/nfe/services/NFeDistribuicaoDFe',
            status: 'https://nfe.sefaz.ro.gov.br/nfe/services/NFeStatusServico',
        },
    },
    'RR': {
        homologacao: {
            manifestacao: 'https://nfe-homologacao.sefaz.rr.gov.br/nfe/RecepcaoEvento',
            consulta: 'https://nfe-homologacao.sefaz.rr.gov.br/nfe/ConsultaProtocolo',
            distribuicao: 'https://nfe-homologacao.sefaz.rr.gov.br/nfe/DistribuicaoDFe',
            status: 'https://nfe-homologacao.sefaz.rr.gov.br/nfe/StatusServico',
        },
        producao: {
            manifestacao: 'https://nfe.sefaz.rr.gov.br/nfe/RecepcaoEvento',
            consulta: 'https://nfe.sefaz.rr.gov.br/nfe/ConsultaProtocolo',
            distribuicao: 'https://nfe.sefaz.rr.gov.br/nfe/DistribuicaoDFe',
            status: 'https://nfe.sefaz.rr.gov.br/nfe/StatusServico',
        },
    },
    'SC': {
        homologacao: {
            manifestacao: 'https://homologacao.nfe.sefaz.sc.gov.br/nfe/services/NFeRecepcaoEvento',
            consulta: 'https://homologacao.nfe.sefaz.sc.gov.br/nfe/services/NFeConsultaProtocolo',
            distribuicao: 'https://homologacao.nfe.sefaz.sc.gov.br/nfe/services/NFeDistribuicaoDFe',
            status: 'https://homologacao.nfe.sefaz.sc.gov.br/nfe/services/NFeStatusServico',
        },
        producao: {
            manifestacao: 'https://nfe.sefaz.sc.gov.br/nfe/services/NFeRecepcaoEvento',
            consulta: 'https://nfe.sefaz.sc.gov.br/nfe/services/NFeConsultaProtocolo',
            distribuicao: 'https://nfe.sefaz.sc.gov.br/nfe/services/NFeDistribuicaoDFe',
            status: 'https://nfe.sefaz.sc.gov.br/nfe/services/NFeStatusServico',
        },
    },
    'SP': {
        homologacao: {
            manifestacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeRecepcaoEvento4.asmx',
            consulta: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeConsultaProtocolo4.asmx',
            distribuicao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeDistribuicaoDFe.asmx',
            status: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeStatusServico4.asmx',
        },
        producao: {
            manifestacao: 'https://nfe.fazenda.sp.gov.br/ws/nfeRecepcaoEvento4.asmx',
            consulta: 'https://nfe.fazenda.sp.gov.br/ws/nfeConsultaProtocolo4.asmx',
            distribuicao: 'https://nfe.fazenda.sp.gov.br/ws/nfeDistribuicaoDFe.asmx',
            status: 'https://nfe.fazenda.sp.gov.br/ws/nfeStatusServico4.asmx',
        },
    },
    'SE': {
        homologacao: {
            manifestacao: 'https://homologacao.nfe.sefaz.se.gov.br/nfe/services/NFeRecepcaoEvento',
            consulta: 'https://homologacao.nfe.sefaz.se.gov.br/nfe/services/NFeConsultaProtocolo',
            distribuicao: 'https://homologacao.nfe.sefaz.se.gov.br/nfe/services/NFeDistribuicaoDFe',
            status: 'https://homologacao.nfe.sefaz.se.gov.br/nfe/services/NFeStatusServico',
        },
        producao: {
            manifestacao: 'https://nfe.sefaz.se.gov.br/nfe/services/NFeRecepcaoEvento',
            consulta: 'https://nfe.sefaz.se.gov.br/nfe/services/NFeConsultaProtocolo',
            distribuicao: 'https://nfe.sefaz.se.gov.br/nfe/services/NFeDistribuicaoDFe',
            status: 'https://nfe.sefaz.se.gov.br/nfe/services/NFeStatusServico',
        },
    },
    'TO': {
        homologacao: {
            manifestacao: 'https://homologacao.sefaz.to.gov.br/nfe/services/NFeRecepcaoEvento',
            consulta: 'https://homologacao.sefaz.to.gov.br/nfe/services/NFeConsultaProtocolo',
            distribuicao: 'https://homologacao.sefaz.to.gov.br/nfe/services/NFeDistribuicaoDFe',
            status: 'https://homologacao.sefaz.to.gov.br/nfe/services/NFeStatusServico',
        },
        producao: {
            manifestacao: 'https://nfe.sefaz.to.gov.br/nfe/services/NFeRecepcaoEvento',
            consulta: 'https://nfe.sefaz.to.gov.br/nfe/services/NFeConsultaProtocolo',
            distribuicao: 'https://nfe.sefaz.to.gov.br/nfe/services/NFeDistribuicaoDFe',
            status: 'https://nfe.sefaz.to.gov.br/nfe/services/NFeStatusServico',
        },
    },
};

/**
 * Obtém endpoints SEFAZ para uma UF e ambiente
 */
export function getSefazEndpoints(uf: UF, ambiente: Ambiente): SefazEndpoint {
    const ufUpper = uf.toUpperCase() as UF;
    const endpoint = endpoints[ufUpper]?.[ambiente];
    
    if (!endpoint) {
        // Fallback para SP (padrão nacional)
        console.warn(`Endpoints não encontrados para UF ${uf}, usando SP como padrão`);
        return endpoints['SP'][ambiente];
    }
    
    return endpoint;
}

/**
 * Obtém código numérico da UF
 */
export function getUFCodigo(uf: UF): string {
    const codigos: Record<UF, string> = {
        'AC': '12', 'AL': '27', 'AP': '16', 'AM': '13', 'BA': '29',
        'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21',
        'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15', 'PB': '25',
        'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24',
        'RS': '43', 'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35',
        'SE': '28', 'TO': '17',
    };
    return codigos[uf.toUpperCase() as UF] || '35';
}

