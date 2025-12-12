import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { FiscalNote } from "@/types/fiscal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X, ArrowRight, FileText, Paperclip, MoreHorizontal } from "lucide-react";
import { NoteDataSection } from "./NoteDataSection";
import { SupplierDataSection } from "./SupplierDataSection";
import { ItemsSection } from "./ItemsSection";
import { ValuesSection } from "./ValuesSection";
import { FinancialSection } from "./FinancialSection";
import { TotalsSection } from "./TotalsSection";
import { SefazSection } from "./SefazSection";
import { toast } from "@/hooks/use-toast";

interface FiscalNoteFormProps {
    initialData?: Partial<FiscalNote>;
    onSave: (data: FiscalNote) => Promise<void>;
}

export function FiscalNoteForm({ initialData, onSave }: FiscalNoteFormProps) {
    const navigate = useNavigate();
    const form = useForm<FiscalNote>({
        defaultValues: {
            tipo: 'entrada',
            numero_nota: 0,
            data_emissao: new Date().toISOString().split('T')[0],
            items: [],
            installments: [],
            total_nota: 0,
            frete: 0,
            seguro: 0,
            outras_despesas: 0,
            acrescimo_financeiro: 0,
            desconto_corporativo: 0,
            ...initialData
        } as FiscalNote // Cast to FiscalNote because we are providing defaults for required fields mostly, but TS might complain about deep partials
    });

    const { handleSubmit, watch } = form;

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F4') {
                e.preventDefault();
                handleSubmit(onSubmit)();
            } else if (e.key === 'F7') {
                e.preventDefault();
                navigate(-1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSubmit, navigate]);

    const onSubmit = async (data: FiscalNote) => {
        try {
            await onSave(data);
            toast({ title: "Sucesso", description: "Nota fiscal salva com sucesso!" });
            navigate('/fiscal');
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: "Erro ao salvar nota fiscal.", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 py-4 border-b">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Lançamento de Nota Fiscal</h2>
                    <p className="text-muted-foreground">
                        {watch('tipo') === 'entrada' ? 'Entrada de Mercadorias' : 'Saída de Mercadorias'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate(-1)} title="F7">
                        <X className="mr-2 h-4 w-4" /> Cancelar (F7)
                    </Button>
                    <Button onClick={handleSubmit(onSubmit)} className="btn-gradient" title="F4">
                        <Save className="mr-2 h-4 w-4" /> Salvar (F4)
                    </Button>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <Tabs defaultValue="dados" className="w-full">
                    <TabsList className="grid w-full grid-cols-6 lg:w-[960px]">
                        <TabsTrigger value="dados">Dados da Nota</TabsTrigger>
                        <TabsTrigger value="itens">Itens</TabsTrigger>
                        <TabsTrigger value="valores">Valores</TabsTrigger>
                        <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                        <TabsTrigger value="totais">Totais</TabsTrigger>
                        <TabsTrigger value="sefaz">SEFAZ</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dados" className="space-y-4 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Dados Gerais</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <NoteDataSection form={form} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Dados do {watch('tipo') === 'entrada' ? 'Fornecedor' : 'Cliente'}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <SupplierDataSection form={form} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="itens" className="mt-4">
                        <Card>
                            <CardContent className="pt-6">
                                <ItemsSection form={form} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="valores" className="mt-4">
                        <Card>
                            <CardContent className="pt-6">
                                <ValuesSection form={form} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="financeiro" className="mt-4">
                        <Card>
                            <CardContent className="pt-6">
                                <FinancialSection form={form} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="totais" className="mt-4">
                        <Card>
                            <CardContent className="pt-6">
                                <TotalsSection form={form} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="sefaz" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Configuração SEFAZ e Emissão</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <SefazSection form={form} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </form>

            {/* Footer Actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex justify-between items-center px-8">
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <Paperclip className="mr-2 h-4 w-4" /> Anexos
                    </Button>
                    <Button variant="outline" size="sm">
                        <FileText className="mr-2 h-4 w-4" /> Outros Impostos
                    </Button>
                    <Button variant="outline" size="sm">
                        <MoreHorizontal className="mr-2 h-4 w-4" /> Funções
                    </Button>
                </div>
                <Button variant="secondary" onClick={() => { /* Logic for next tab or step */ }}>
                    Próxima Tela (F6) <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
