import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FiscalValidationPanel } from '@/components/fiscal/FiscalValidationPanel';
import { fiscalService } from '@/services/fiscal/FiscalService';
import { NotaFiscal, ResultadoValidacao } from '@/types/fiscal';
import { useToast } from '@/hooks/use-toast';
import { Save, FileText, CheckCircle } from 'lucide-react';

export function InvoiceForm() {
    const { toast } = useToast();
    const [nota, setNota] = useState<NotaFiscal>({
        company_id: '',
        tipo: 'nfe',
        tipo_operacao: 'saida',
        numero: '',
        serie: '1',
        modelo: '55',
        data_emissao: new Date().toISOString(),
        emitente: {
            cpf_cnpj: '',
            razao_social: '',
            endereco: { logradouro: '', numero: '', bairro: '', municipio: '', codigo_municipio: '', uf: '', cep: '' }
        },
        destinatario: {
            cpf_cnpj: '',
            razao_social: '',
            endereco: { logradouro: '', numero: '', bairro: '', municipio: '', codigo_municipio: '', uf: '', cep: '' }
        },
        natureza_operacao: 'Venda de Mercadoria',
        finalidade: 'normal',
        regime_tributario: 'simples_nacional',
        itens: [],
        totais: {
            valor_produtos: 0, valor_servicos: 0, valor_descontos: 0, valor_frete: 0, valor_seguro: 0, valor_outras_despesas: 0,
            valor_icms: 0, valor_icms_st: 0, valor_ipi: 0, valor_pis: 0, valor_cofins: 0, valor_iss: 0, valor_iss_retido: 0,
            valor_total: 0, valor_total_tributos: 0
        },
        status: 'rascunho',
        precisa_validacao_fiscal: true
    });

    const [validationResult, setValidationResult] = useState<ResultadoValidacao | null>(null);

    const handleCalculate = () => {
        try {
            const calculatedNota = fiscalService.calculateTaxes(nota);
            setNota(calculatedNota);
            const validation = fiscalService.validate(calculatedNota);
            setValidationResult(validation);
            toast({ title: 'Cálculo Realizado', description: 'Impostos recalculados com sucesso.' });
        } catch (error) {
            console.error(error);
            toast({ title: 'Erro', description: 'Erro ao calcular impostos.', variant: 'destructive' });
        }
    };

    const handleSave = () => {
        // TODO: Save to Supabase
        toast({ title: 'Salvo', description: 'Nota fiscal salva como rascunho.' });
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Emissão de Nota Fiscal</h1>
                <div className="space-x-2">
                    <Button variant="outline" onClick={handleCalculate}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Validar e Calcular
                    </Button>
                    <Button onClick={handleSave}>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Rascunho
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dados Gerais</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Natureza da Operação</Label>
                                <Input
                                    value={nota.natureza_operacao}
                                    onChange={e => setNota({ ...nota, natureza_operacao: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Destinatário (CPF/CNPJ)</Label>
                                <Input
                                    value={nota.destinatario.cpf_cnpj}
                                    onChange={e => setNota({
                                        ...nota,
                                        destinatario: { ...nota.destinatario, cpf_cnpj: e.target.value }
                                    })}
                                />
                            </div>
                            {/* TODO: Add more fields for full editing */}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Itens</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                Lista de itens aqui (Adicionar Produto/Serviço)
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    {validationResult && (
                        <FiscalValidationPanel validationResult={validationResult} />
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Totais</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between">
                                <span>Produtos:</span>
                                <span>R$ {nota.totais.valor_produtos.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Serviços:</span>
                                <span>R$ {nota.totais.valor_servicos.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold pt-2 border-t">
                                <span>Total:</span>
                                <span>R$ {nota.totais.valor_total.toFixed(2)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
