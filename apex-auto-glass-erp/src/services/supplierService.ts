import { supabase } from "@/integrations/supabase/client";
import { Supplier, SupplierFormValues } from "@/types/supplier";

export const supplierService = {
    async getSuppliers(
        companyId: string,
        filters?: { search?: string; city?: string; state?: string; type?: string },
        pagination?: { page: number; pageSize: number }
    ) {
        let query = supabase
            .from("suppliers")
            .select("*", { count: 'exact' })
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });

        if (filters?.search) {
            const searchTerm = `%${filters.search}%`;
            query = query.or(`nome_razao.ilike.${searchTerm},nome_fantasia.ilike.${searchTerm},cpf_cnpj.ilike.${searchTerm},email_principal.ilike.${searchTerm}`);
        }

        if (filters?.city) {
            // PostgREST usa * para wildcards, mas o cliente JS aceita % e converte
            query = query.ilike("cidade", `%${filters.city}%`);
        }

        if (filters?.state) {
            query = query.eq("uf", filters.state);
        }

        if (filters?.type) {
            query = query.eq("tipo_pessoa", filters.type as any);
        }

        if (pagination) {
            const from = (pagination.page - 1) * pagination.pageSize;
            const to = from + pagination.pageSize - 1;
            query = query.range(from, to);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error("Error fetching suppliers:", error);

            // Mensagem mais clara se a tabela não existir
            if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
                const friendlyError = new Error(
                    'A tabela de fornecedores não foi encontrada. ' +
                    'Execute o script SQL no Supabase: EXECUTAR-NO-SUPABASE-FINAL.sql'
                );
                (friendlyError as any).code = error.code;
                throw friendlyError;
            }

            throw error;
        }

        return { data: data as Supplier[], count: count || 0 };
    },

    async getSupplierById(id: string, companyId: string) {
        const { data, error } = await supabase
            .from("suppliers")
            .select("*")
            .eq("id", id)
            .eq("company_id", companyId)
            .single();

        if (error) {
            console.error(`Error fetching supplier ${id}:`, error);
            throw error;
        }

        return data as Supplier;
    },

    async createSupplier(supplier: SupplierFormValues, companyId: string) {
        // Converter strings vazias em null para campos opcionais
        const cleanData = Object.entries(supplier).reduce((acc, [key, value]) => {
            acc[key] = value === "" ? null : value;
            return acc;
        }, {} as any);

        const supplierData = {
            ...cleanData,
            company_id: companyId,
        };

        console.log("Creating supplier with data:", supplierData);

        const { data, error } = await supabase
            .from("suppliers")
            .insert([supplierData])
            .select()
            .single();

        if (error) {
            console.error("Error creating supplier:", error);

            // Mensagem mais clara se a tabela não existir
            if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
                const friendlyError = new Error(
                    'A tabela de fornecedores não foi encontrada no banco de dados. ' +
                    'Por favor, execute o script SQL no Supabase para criar a tabela. ' +
                    'Arquivo: EXECUTAR-NO-SUPABASE-FINAL.sql'
                );
                (friendlyError as any).code = error.code;
                throw friendlyError;
            }

            throw error;
        }

        return data as Supplier;
    },

    async updateSupplier(id: string, supplier: Partial<SupplierFormValues>, companyId: string) {
        // Converter strings vazias em null para campos opcionais
        const cleanData = Object.entries(supplier).reduce((acc, [key, value]) => {
            acc[key] = value === "" ? null : value;
            return acc;
        }, {} as any);

        console.log("Updating supplier with data:", cleanData);

        const { data, error } = await supabase
            .from("suppliers")
            .update(cleanData)
            .eq("id", id)
            .eq("company_id", companyId)
            .select()
            .single();

        if (error) {
            console.error(`Error updating supplier ${id}:`, error);
            throw error;
        }

        return data as Supplier;
    },

    async deleteSupplier(id: string, companyId: string) {
        const { error } = await supabase
            .from("suppliers")
            .delete()
            .eq("id", id)
            .eq("company_id", companyId);

        if (error) {
            console.error(`Error deleting supplier ${id}:`, error);
            throw error;
        }

        return true;
    }
};
