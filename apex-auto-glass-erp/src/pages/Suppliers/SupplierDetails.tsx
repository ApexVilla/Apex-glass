import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supplierService } from "@/services/supplierService";
import { Supplier } from "@/types/supplier";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Building2, Phone, Mail, MapPin, DollarSign, FileText, Package } from "lucide-react";
import { formatCPFCNPJ, formatPhone, formatCurrency } from "@/lib/format";
import { toast } from "@/hooks/use-toast";

export default function SupplierDetails() {
    const { company } = useAuth();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id && company?.id) {
            loadSupplier(id);
        }
    }, [id, company?.id]);

    const loadSupplier = async (supplierId: string) => {
        if (!company?.id) {
            toast({
                title: "Erro",
                description: "Empresa não identificada.",
                variant: "destructive",
            });
            navigate("/suppliers");
            return;
        }

        try {
            setLoading(true);
            const data = await supplierService.getSupplierById(supplierId, company.id);
            setSupplier(data);
        } catch (error: any) {
            console.error("Error loading supplier:", error);
            toast({
                title: "Erro",
                description: error.message || "Erro ao carregar detalhes do fornecedor.",
                variant: "destructive",
            });
            navigate("/suppliers");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!supplier) {
        return null;
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={supplier.nome_razao}
                description={`Detalhes do fornecedor ${supplier.nome_fantasia ? `(${supplier.nome_fantasia})` : ""}`}
                action={{
                    label: "Voltar",
                    icon: ArrowLeft,
                    onClick: () => navigate("/suppliers"),
                    variant: "outline",
                }}
            />

            <Tabs defaultValue="info" className="w-full">
                <TabsList>
                    <TabsTrigger value="info">Informações Gerais</TabsTrigger>
                    <TabsTrigger value="products">Produtos Fornecidos</TabsTrigger>
                    <TabsTrigger value="invoices">Notas Fiscais</TabsTrigger>
                    <TabsTrigger value="purchases">Histórico de Compras</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5" /> Identificação
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Razão Social</p>
                                        <p className="font-medium">{supplier.nome_razao}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Nome Fantasia</p>
                                        <p className="font-medium">{supplier.nome_fantasia || "-"}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">CNPJ / CPF</p>
                                        <p className="font-medium">{formatCPFCNPJ(supplier.cpf_cnpj)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Tipo</p>
                                        <p className="font-medium">{supplier.tipo_pessoa}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Inscrição Estadual</p>
                                        <p className="font-medium">{supplier.ie || "-"}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Status</p>
                                        <p className={`font-medium ${supplier.ativo ? "text-green-600" : "text-red-600"}`}>
                                            {supplier.ativo ? "Ativo" : "Inativo"}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Phone className="h-5 w-5" /> Contato
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Telefone</p>
                                        <p className="font-medium">{supplier.telefone1 ? formatPhone(supplier.telefone1) : "-"}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">WhatsApp</p>
                                        <p className="font-medium">{supplier.whatsapp ? formatPhone(supplier.whatsapp) : "-"}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-sm text-muted-foreground">E-mail</p>
                                        <p className="font-medium">{supplier.email_principal || "-"}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-sm text-muted-foreground">Site</p>
                                        <p className="font-medium text-blue-600 hover:underline">
                                            {supplier.site ? <a href={supplier.site} target="_blank" rel="noreferrer">{supplier.site}</a> : "-"}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5" /> Endereço
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="font-medium">
                                    {supplier.logradouro}, {supplier.numero} {supplier.complemento && `- ${supplier.complemento}`}
                                </p>
                                <p className="text-muted-foreground">
                                    {supplier.bairro} - {supplier.cidade} / {supplier.uf}
                                </p>
                                <p className="text-muted-foreground">CEP: {supplier.cep}</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" /> Financeiro
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Banco</p>
                                        <p className="font-medium">{supplier.banco || "-"}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Agência / Conta</p>
                                        <p className="font-medium">
                                            {supplier.agencia || "-"} / {supplier.conta || "-"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Chave PIX</p>
                                        <p className="font-medium">{supplier.pix || "-"}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Condição Pagamento</p>
                                        <p className="font-medium">{supplier.condicao_pagamento || "-"}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="products" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5" /> Produtos Fornecidos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-center py-8">
                                Funcionalidade em desenvolvimento. Aqui serão listados os produtos vinculados a este fornecedor.
                            </p>
                            {supplier.linha_produtos && (
                                <div className="mt-4">
                                    <p className="font-medium mb-2">Linha de Produtos:</p>
                                    <p className="text-sm text-muted-foreground">{supplier.linha_produtos}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="invoices" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" /> Notas Fiscais
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-center py-8">
                                Nenhuma nota fiscal encontrada para este fornecedor.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="purchases" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5" /> Histórico de Compras
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-center py-8">
                                Nenhuma compra registrada para este fornecedor.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
