
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash, Eye } from "lucide-react";
import { toast } from "sonner";

export default function SupplierList() {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("suppliers")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setSuppliers(data || []);
        } catch (error) {
            console.error("Erro ao buscar fornecedores:", error);
            toast.error("Erro ao carregar fornecedores.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este fornecedor?")) return;

        try {
            const { error } = await supabase.from("suppliers").delete().eq("id", id);
            if (error) throw error;
            toast.success("Fornecedor excluído com sucesso!");
            fetchSuppliers();
        } catch (error) {
            console.error("Erro ao excluir:", error);
            toast.error("Erro ao excluir fornecedor.");
        }
    };

    const filteredSuppliers = suppliers.filter((supplier) =>
        supplier.nome_razao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.cpf_cnpj.includes(searchTerm)
    );

    return (
        <div className="container mx-auto py-10">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Fornecedores</CardTitle>
                    <Button onClick={() => navigate("/fornecedores/novo")}>
                        <Plus className="mr-2 h-4 w-4" /> Novo Fornecedor
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center mb-4">
                        <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome ou CNPJ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome / Razão Social</TableHead>
                                    <TableHead>CNPJ / CPF</TableHead>
                                    <TableHead>Cidade/UF</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10">
                                            Carregando...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredSuppliers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10">
                                            Nenhum fornecedor encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredSuppliers.map((supplier) => (
                                        <TableRow key={supplier.id}>
                                            <TableCell className="font-medium">{supplier.nome_razao}</TableCell>
                                            <TableCell>{supplier.cpf_cnpj}</TableCell>
                                            <TableCell>{supplier.cidade}/{supplier.uf}</TableCell>
                                            <TableCell>{supplier.categoria || "-"}</TableCell>
                                            <TableCell>
                                                <Badge variant={supplier.ativo ? "default" : "secondary"}>
                                                    {supplier.ativo ? "Ativo" : "Inativo"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => navigate(`/fornecedores/${supplier.id}`)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => navigate(`/fornecedores/editar/${supplier.id}`)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(supplier.id)}>
                                                        <Trash className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
