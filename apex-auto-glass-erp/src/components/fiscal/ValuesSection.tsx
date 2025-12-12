import { UseFormReturn } from "react-hook-form";
import { FiscalNote } from "@/types/fiscal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ValuesSectionProps {
    form: UseFormReturn<FiscalNote>;
}

export function ValuesSection({ form }: ValuesSectionProps) {
    const { register } = form;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Destacadas na Nota */}
            <div className="space-y-4">
                <h3 className="font-medium border-b pb-2">Valores Destacados na Nota</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Total da Nota</Label>
                        <Input type="number" {...register("total_nota", { valueAsNumber: true })} className="font-bold" />
                    </div>
                    <div className="space-y-2">
                        <Label>Frete</Label>
                        <Input type="number" {...register("frete", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Seguro</Label>
                        <Input type="number" {...register("seguro", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Outras Despesas</Label>
                        <Input type="number" {...register("outras_despesas", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Acréscimo Financeiro</Label>
                        <Input type="number" {...register("acrescimo_financeiro", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Desconto Corporativo</Label>
                        <Input type="number" {...register("desconto_corporativo", { valueAsNumber: true })} />
                    </div>
                </div>
            </div>

            {/* Não compõem o total */}
            <div className="space-y-4">
                <h3 className="font-medium border-b pb-2">Valores que NÃO compõem o total</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>% Frete</Label>
                        <Input type="number" {...register("percentual_frete", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Valor Frete</Label>
                        <Input type="number" {...register("valor_frete", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                        <Label>% Seguro</Label>
                        <Input type="number" {...register("percentual_seguro", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Valor Seguro</Label>
                        <Input type="number" {...register("valor_seguro", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                        <Label>ICMS Integral</Label>
                        <Input type="number" {...register("icms_integral", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Acréscimo Fin. ST</Label>
                        <Input type="number" {...register("acrescimo_financeiro_st", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Valor Suframa</Label>
                        <Input type="number" {...register("valor_suframa", { valueAsNumber: true })} />
                    </div>
                </div>
            </div>
        </div>
    );
}
