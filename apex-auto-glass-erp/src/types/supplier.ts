
import { z } from "zod";

export const supplierSchema = z.object({
    // Basic Info
    tipo_pessoa: z.enum(["PF", "PJ"]),
    nome_razao: z.string().min(1, "Nome/Razão Social é obrigatório"),
    nome_fantasia: z.string().optional(),
    cpf_cnpj: z.string().optional().or(z.literal("")),
    ie: z.string().optional(),
    im: z.string().optional(),
    cnae: z.string().optional(),
    regime_tributario: z.enum(["Simples Nacional", "Lucro Presumido", "Lucro Real", "Isento"]).optional(),

    // Address
    cep: z.string().optional().or(z.literal("")),
    logradouro: z.string().optional().or(z.literal("")),
    numero: z.string().optional().or(z.literal("")),
    complemento: z.string().optional().or(z.literal("")),
    bairro: z.string().optional().or(z.literal("")),
    cidade: z.string().optional().or(z.literal("")),
    uf: z.string().optional().or(z.literal("")),
    pais: z.string().default("Brasil").optional(),

    // Contacts
    telefone1: z.string().optional(),
    telefone2: z.string().optional(),
    whatsapp: z.string().optional(),
    email_principal: z.string().refine((val) => !val || z.string().email().safeParse(val).success, {
        message: "E-mail inválido"
    }).optional().or(z.literal("")),
    email_financeiro: z.string().refine((val) => !val || z.string().email().safeParse(val).success, {
        message: "E-mail inválido"
    }).optional().or(z.literal("")),
    site: z.string().refine((val) => !val || z.string().url().safeParse(val).success, {
        message: "URL inválida"
    }).optional().or(z.literal("")),
    contato_principal: z.string().optional(),
    vendedor_fornecedor: z.string().optional(),
    observacoes: z.string().optional(),

    // Commercial
    prazo_entrega: z.string().optional(), // Prazo médio de entrega
    linha_produtos: z.string().optional(), // Linha de produtos fornecidos

    // Financial
    banco: z.string().optional(),
    agencia: z.string().optional(),
    conta: z.string().optional(),
    tipo_conta: z.enum(["Corrente", "Poupança", "PJ"]).optional(),
    pix: z.string().optional(),
    limite_credito: z.coerce.number().optional(),
    condicao_pagamento: z.string().optional(),
    metodo_pagamento: z.string().optional(),
    retencao_impostos: z.boolean().default(false),
    impostos_retidos: z.object({
        irrf: z.coerce.number().optional(),
        pis: z.coerce.number().optional(),
        cofins: z.coerce.number().optional(),
        csll: z.coerce.number().optional(),
        iss_retido: z.coerce.number().optional(),
    }).optional(),

    // Fiscal
    regime_icms: z.string().optional(),
    indicador_contribuinte: z.enum(["Contribuinte", "Não Contribuinte", "Isento"]).optional(),
    cod_municipio: z.string().optional(),
    aliquota_iss: z.coerce.number().optional(),
    lista_servicos: z.string().optional(),
    retem_iss: z.boolean().default(false),

    // Config
    ativo: z.boolean().default(true),
    categoria: z.string().optional(),
    prioridade: z.enum(["Alto", "Médio", "Baixo"]).optional(),
    is_transportadora: z.boolean().default(false),
    emite_nfe: z.boolean().default(false),
    emite_nfse: z.boolean().default(false),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;

export interface Supplier extends SupplierFormValues {
    id: string;
    created_at?: string;
    updated_at?: string;
    company_id?: string;
}
