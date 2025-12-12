import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supplierService } from "@/services/supplierService";
import { Supplier, SupplierFormValues } from "@/types/supplier";
import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SupplierForm } from "./SupplierForm";
import { Plus, Pencil, Trash2, Building2, User, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCPFCNPJ, formatPhone } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SuppliersList() {
    const { profile, company } = useAuth();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>(undefined);
    const { toast } = useToast();

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    const [totalCount, setTotalCount] = useState(0);

    const loadSuppliers = async () => {
        if (!company?.id) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, count } = await supplierService.getSuppliers(
                company.id,
                { search },
                { page: currentPage, pageSize }
            );
            setSuppliers(data);
            setTotalCount(count);
        } catch (error: any) {
            console.error("Error loading suppliers:", error);
            toast({
                title: "Erro ao carregar fornecedores",
                description: error.message || "Não foi possível carregar a lista de fornecedores.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadSuppliers();
        }, 500);
        return () => clearTimeout(timer);
    }, [search, currentPage, pageSize]);

    const handleCreate = async (data: SupplierFormValues) => {
        if (!company?.id) {
            toast({
                title: "Erro",
                description: "Empresa não identificada. Faça login novamente.",
                variant: "destructive",
            });
            throw new Error("Empresa não identificada");
        }

        setIsSaving(true);
        try {
            console.log("Creating supplier with data:", data);
            await supplierService.createSupplier(data, company.id);
            toast({ title: "Sucesso", description: "Fornecedor criado com sucesso." });
            setIsDialogOpen(false);
            setSelectedSupplier(undefined);
            loadSuppliers();
        } catch (error: any) {
            console.error("Error creating supplier:", error);

            // Mensagem especial se a tabela não existir
            if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('tabela')) {
                toast({
                    title: "⚠️ Tabela não encontrada no Supabase",
                    description: "A tabela 'suppliers' não existe. Acesse supabase.com/dashboard → SQL Editor → Execute o arquivo EXECUTAR-AGORA.sql",
                    variant: "destructive",
                    duration: 15000,
                });
            } else {
                toast({
                    title: "Erro ao criar",
                    description: error.message || "Não foi possível criar o fornecedor.",
                    variant: "destructive",
                });
            }
            throw error; // Re-throw para que o formulário possa tratar
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdate = async (data: SupplierFormValues) => {
        if (!selectedSupplier || !company?.id) {
            toast({
                title: "Erro",
                description: "Fornecedor ou empresa não identificada.",
                variant: "destructive",
            });
            throw new Error("Fornecedor ou empresa não identificada");
        }

        setIsSaving(true);
        try {
            console.log("Updating supplier with data:", data);
            await supplierService.updateSupplier(selectedSupplier.id, data, company.id);
            toast({ title: "Sucesso", description: "Fornecedor atualizado com sucesso." });
            setIsDialogOpen(false);
            setSelectedSupplier(undefined);
            loadSuppliers();
        } catch (error: any) {
            console.error("Error updating supplier:", error);
            toast({
                title: "Erro ao atualizar",
                description: error.message || "Não foi possível atualizar o fornecedor.",
                variant: "destructive",
            });
            throw error; // Re-throw para que o formulário possa tratar
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!company?.id) {
            toast({
                title: "Erro",
                description: "Empresa não identificada.",
                variant: "destructive",
            });
            return;
        }

        if (!confirm("Tem certeza que deseja excluir este fornecedor?")) return;

        try {
            await supplierService.deleteSupplier(id, company.id);
            toast({ title: "Sucesso", description: "Fornecedor excluído com sucesso." });
            loadSuppliers();
        } catch (error: any) {
            console.error("Error deleting supplier:", error);
            toast({
                title: "Erro ao excluir",
                description: error.message || "Não foi possível excluir o fornecedor.",
                variant: "destructive",
            });
        }
    };

    const openCreateDialog = () => {
        setSelectedSupplier(undefined);
        setIsDialogOpen(true);
    };

    const openEditDialog = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setIsDialogOpen(true);
    };

    const columns = [
        {
            key: "nome_razao",
            header: "Nome / Razão Social",
            cell: (item: Supplier) => (
                <div className="flex flex-col">
                    <span className="font-medium">{item.nome_razao}</span>
                    {item.nome_fantasia && <span className="text-xs text-muted-foreground">{item.nome_fantasia}</span>}
                </div>
            ),
        },
        {
            key: "tipo_pessoa",
            header: "Tipo",
            cell: (item: Supplier) => (
                <div className="flex items-center gap-2">
                    {item.tipo_pessoa === "PJ" ? <Building2 className="h-4 w-4 text-muted-foreground" /> : <User className="h-4 w-4 text-muted-foreground" />}
                    <span>{item.tipo_pessoa}</span>
                </div>
            ),
        },
        {
            key: "cpf_cnpj",
            header: "CPF / CNPJ",
            cell: (item: Supplier) => formatCPFCNPJ(item.cpf_cnpj),
        },
        {
            key: "contato",
            header: "Contato",
            cell: (item: Supplier) => (
                <div className="flex flex-col text-sm">
                    {item.email_principal && <span>{item.email_principal}</span>}
                    {item.telefone1 && <span>{formatPhone(item.telefone1)}</span>}
                </div>
            ),
        },
        {
            key: "cidade",
            header: "Cidade/UF",
            cell: (item: Supplier) => (
                <span>
                    {item.cidade}
                    {item.uf && ` - ${item.uf}`}
                </span>
            ),
        },
        {
            key: "actions",
            header: "Ações",
            className: "w-[100px]",
            cell: (item: Supplier) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditDialog(item); }}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Fornecedores"
                description="Gerencie seus fornecedores e parceiros"
                action={{
                    label: "Novo Fornecedor",
                    icon: Plus,
                    onClick: openCreateDialog,
                }}
            />

            <div className="flex items-center gap-4">
                <SearchInput
                    placeholder="Buscar por nome, CNPJ ou email..."
                    value={search}
                    onChange={setSearch}
                    className="max-w-md"
                />
            </div>

            <DataTable
                columns={columns}
                data={suppliers}
                loading={loading}
                emptyMessage="Nenhum fornecedor encontrado."
                onRowClick={openEditDialog}
            />

            {/* Paginação */}
            <div className="flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Itens por página:</span>
                    <Select
                        value={pageSize.toString()}
                        onValueChange={(v) => {
                            setPageSize(Number(v));
                            setCurrentPage(1); // Voltar para primeira página ao mudar tamanho
                        }}
                    >
                        <SelectTrigger className="w-[80px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="5000">5000</SelectItem>
                        </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground ml-2">
                        Total: {totalCount} fornecedores
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || loading}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                    </Button>
                    <span className="text-sm font-medium">
                        Página {currentPage} de {Math.ceil(totalCount / pageSize) || 1}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                        disabled={currentPage >= Math.ceil(totalCount / pageSize) || loading}
                    >
                        Próximo
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
                        <DialogDescription>
                            {selectedSupplier
                                ? "Edite as informações do fornecedor abaixo."
                                : "Preencha os dados para cadastrar um novo fornecedor."}
                        </DialogDescription>
                    </DialogHeader>
                    <div>
                        <SupplierForm
                            initialData={selectedSupplier}
                            onSubmit={selectedSupplier ? handleUpdate : handleCreate}
                            isLoading={isSaving}
                            onCancel={() => setIsDialogOpen(false)}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
