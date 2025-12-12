import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supplierSchema, SupplierFormValues } from "@/types/supplier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { fetchAddressByCep } from "@/services/viacep";
import { toast } from "@/hooks/use-toast";

interface SupplierFormProps {
    initialData?: SupplierFormValues;
    onSubmit: (data: SupplierFormValues) => Promise<void>;
    isLoading?: boolean;
    onCancel?: () => void;
}

const getDefaultValues = (): SupplierFormValues => ({
    tipo_pessoa: "PJ",
    nome_razao: "",
    nome_fantasia: "",
    cpf_cnpj: "",
    ie: "",
    im: "",
    cnae: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    pais: "Brasil",
    telefone1: "",
    telefone2: "",
    whatsapp: "",
    email_principal: "",
    email_financeiro: "",
    site: "",
    contato_principal: "",
    vendedor_fornecedor: "",
    observacoes: "",
    prazo_entrega: "",
    linha_produtos: "",
    banco: "",
    agencia: "",
    conta: "",
    tipo_conta: "" as any,
    pix: "",
    condicao_pagamento: "" as any,
    metodo_pagamento: "",
    ativo: true,
    retem_iss: false,
    retencao_impostos: false,
    is_transportadora: false,
    emite_nfe: false,
    emite_nfse: false,
});

export function SupplierForm({ initialData, onSubmit, isLoading, onCancel }: SupplierFormProps) {
    const form = useForm<SupplierFormValues>({
        resolver: zodResolver(supplierSchema),
        defaultValues: initialData ? {
            ...getDefaultValues(),
            ...Object.fromEntries(
                Object.entries(initialData).map(([key, value]) => [
                    key,
                    value === null || value === undefined ? "" : value
                ])
            )
        } : getDefaultValues(),
    });

    const { setValue, watch, reset } = form;
    const cep = watch("cep");

    useEffect(() => {
        if (initialData) {
            const cleanedData = Object.fromEntries(
                Object.entries(initialData).map(([key, value]) => [
                    key,
                    value === null || value === undefined ? "" : value
                ])
            );
            reset({
                ...getDefaultValues(),
                ...cleanedData
            });
        } else {
            reset(getDefaultValues());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData?.id]);

    useEffect(() => {
        if (cep && cep.length === 8 && /^\d+$/.test(cep)) {
            handleCepSearch(cep);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cep]);

    const handleCepSearch = async (cepValue: string) => {
        try {
            const address = await fetchAddressByCep(cepValue);
            if (address) {
                setValue("logradouro", address.logradouro);
                setValue("bairro", address.bairro);
                setValue("cidade", address.localidade);
                setValue("uf", address.uf);
                setValue("complemento", address.complemento);
            }
        } catch (error) {
            console.error("Error fetching CEP:", error);
        }
    };

    const handleSubmit = async (data: SupplierFormValues) => {
        try {
            // Limpar valores undefined/string vazia e converter para null onde necessário
            // Campos opcionais que podem ser null: tipo_conta, condicao_pagamento
            const cleanedData = Object.fromEntries(
                Object.entries(data).map(([key, value]) => {
                    // Campos opcionais que devem ser null se vazios
                    if (key === 'tipo_conta' || key === 'condicao_pagamento') {
                        return [key, value === undefined || value === "" ? null : value];
                    }
                    // Outros campos opcionais
                    return [key, value === undefined || value === "" ? null : value];
                })
            ) as SupplierFormValues;
            
            console.log("Form submitted with data:", cleanedData);
            await onSubmit(cleanedData);
            // Reset form after successful submission if creating new supplier
            if (!initialData) {
                reset(getDefaultValues());
            }
        } catch (error: any) {
            console.error("Form submission error:", error);
            toast({
                title: "Erro ao salvar",
                description: error?.message || "Ocorreu um erro ao salvar o fornecedor. Verifique os dados e tente novamente.",
                variant: "destructive",
            });
            throw error; // Re-throw para que o componente pai possa tratar
        }
    };

    const onSubmitForm = form.handleSubmit(handleSubmit, (errors) => {
        console.error("Form validation errors:", errors);
        toast({
            title: "Erro de validação",
            description: "Por favor, verifique os campos marcados e corrija os erros antes de salvar.",
            variant: "destructive",
        });
    });

    return (
        <Form {...form}>
            <form onSubmit={onSubmitForm} className="space-y-6">
                <Tabs defaultValue="dados" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
                        <TabsTrigger value="contato">Contato</TabsTrigger>
                        <TabsTrigger value="endereco">Endereço</TabsTrigger>
                        <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dados" className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="tipo_pessoa"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo de Pessoa</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || "PJ"}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                                                <SelectItem value="PF">Pessoa Física</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="cpf_cnpj"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>CPF/CNPJ</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value || ""} placeholder="Apenas números" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="nome_razao"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Razão Social / Nome</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="nome_fantasia"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome Fantasia</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="ie"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Inscrição Estadual</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="im"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Inscrição Municipal</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex items-center space-x-2 mt-4">
                            <FormField
                                control={form.control}
                                name="ativo"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Fornecedor Ativo</FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="contato" className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="email_principal"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>E-mail Principal</FormLabel>
                                        <FormControl>
                                            <Input {...field} type="email" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="site"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Site</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="https://" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="telefone1"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Telefone 1</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="whatsapp"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>WhatsApp</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="contato_principal"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome do Representante</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="vendedor_fornecedor"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contato do Representante</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="endereco" className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="cep"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>CEP</FormLabel>
                                        <FormControl>
                                            <Input {...field} maxLength={8} placeholder="00000000" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="logradouro"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Rua</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="numero"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Número</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="complemento"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Complemento</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="bairro"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Bairro</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="cidade"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cidade</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="uf"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>UF</FormLabel>
                                        <FormControl>
                                            <Input {...field} maxLength={2} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="financeiro" className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="banco"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Banco</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="tipo_conta"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo de Conta</FormLabel>
                                        <Select 
                                            onValueChange={(value) => field.onChange(value || undefined)} 
                                            value={field.value || ""}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Corrente">Corrente</SelectItem>
                                                <SelectItem value="Poupança">Poupança</SelectItem>
                                                <SelectItem value="PJ">Conta PJ</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="agencia"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Agência</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="conta"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Conta</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="pix"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Chave PIX</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="condicao_pagamento"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Condição de Pagamento Padrão</FormLabel>
                                        <Select 
                                            onValueChange={(value) => field.onChange(value || undefined)} 
                                            value={field.value || ""}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="7 dias">7 dias</SelectItem>
                                                <SelectItem value="14 dias">14 dias</SelectItem>
                                                <SelectItem value="28 dias">28 dias</SelectItem>
                                                <SelectItem value="30 dias">30 dias</SelectItem>
                                                <SelectItem value="A vista">À vista</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="prazo_entrega"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Prazo Médio de Entrega</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Ex: 5 dias" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="linha_produtos"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Linha de Produtos</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} placeholder="Ex: Vidros, Ferragens, Alumínios..." />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="observacoes"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Observações Gerais</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end space-x-2">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancelar
                        </Button>
                    )}
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Fornecedor
                    </Button>
                </div>
            </form>
        </Form>
    );
}
