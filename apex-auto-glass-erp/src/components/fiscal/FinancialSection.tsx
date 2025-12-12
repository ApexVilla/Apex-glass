import { UseFormReturn, useFieldArray } from "react-hook-form";
import { FiscalNote } from "@/types/fiscal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";

interface FinancialSectionProps {
    form: UseFormReturn<FiscalNote>;
}

export function FinancialSection({ form }: FinancialSectionProps) {
    const { control, register } = form;
    const { fields, append, remove } = useFieldArray({
        control,
        name: "installments"
    });

    const handleAddInstallment = () => {
        append({
            id: crypto.randomUUID(),
            invoice_id: '',
            numero: fields.length + 1,
            valor: 0,
            vencimento: new Date().toISOString().split('T')[0],
            status: 'pending'
        });
    };

    const totalParcelas = fields.reduce((sum, field: any) => sum + (parseFloat(field.valor) || 0), 0);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Dados Financeiros</h3>
                <Button onClick={handleAddInstallment} size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> Nova Parcela
                </Button>
            </div>

            <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Número</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Portador</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.map((field, index) => (
                            <TableRow key={field.id}>
                                <TableCell>
                                    <Input
                                        type="number"
                                        {...register(`installments.${index}.numero` as const, { valueAsNumber: true })}
                                        className="h-8 w-full"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="date"
                                        {...register(`installments.${index}.vencimento` as const)}
                                        className="h-8 w-full"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        {...register(`installments.${index}.valor` as const, { valueAsNumber: true })}
                                        className="h-8 w-full"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        {...register(`installments.${index}.portador` as const)}
                                        className="h-8 w-full"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {fields.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                    Nenhuma parcela gerada.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Total Parcelas</span>
                    <p className="text-lg font-bold">{totalParcelas.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Total Retenções</span>
                    <Input type="number" {...register("total_retencoes", { valueAsNumber: true })} />
                </div>
                <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Valor Restante</span>
                    <Input type="number" {...register("valor_restante", { valueAsNumber: true })} />
                </div>
            </div>
        </div>
    );
}
