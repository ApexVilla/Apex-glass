import { UseFormReturn } from "react-hook-form";
import { FiscalNote } from "@/types/fiscal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TotalsSectionProps {
    form: UseFormReturn<FiscalNote>;
}

export function TotalsSection({ form }: TotalsSectionProps) {
    const { register } = form;

    return (
        <div className="space-y-6">
            {/* Resumo dos Totais */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-1">
                    <Label className="text-xs">Desconto Itens</Label>
                    <Input type="number" {...register("desconto_itens")} readOnly className="bg-background" />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Desconto Corp.</Label>
                    <Input type="number" {...register("desconto_corpo")} readOnly className="bg-background" />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Total Descontos</Label>
                    <Input type="number" {...register("total_descontos")} readOnly className="bg-background font-medium" />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Total Itens</Label>
                    <Input type="number" {...register("total_itens")} readOnly className="bg-background" />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Total Líquido</Label>
                    <Input type="number" {...register("total_liquido")} readOnly className="bg-background font-bold text-primary" />
                </div>
            </div>

            {/* Tributos da Nota (Resumo) */}
            <div>
                <h3 className="text-sm font-medium mb-2">Resumo de Tributos</h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
                    <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Base ICMS</Label>
                        <Input type="number" {...register("base_calculo_icms")} readOnly className="h-8" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Valor ICMS</Label>
                        <Input type="number" {...register("valor_icms")} readOnly className="h-8" />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Base ICMS ST</Label>
                        <Input type="number" {...register("base_icms_subst")} readOnly className="h-8" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Valor ICMS ST</Label>
                        <Input type="number" {...register("valor_icms_subst")} readOnly className="h-8" />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Base IPI</Label>
                        <Input type="number" {...register("base_calculo_ipi")} readOnly className="h-8" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Valor IPI</Label>
                        <Input type="number" {...register("valor_ipi")} readOnly className="h-8" />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Base ISS</Label>
                        <Input type="number" {...register("base_iss")} readOnly className="h-8" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Valor ISS</Label>
                        <Input type="number" {...register("valor_iss")} readOnly className="h-8" />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Base ISS ST</Label>
                        <Input type="number" {...register("base_iss_st")} readOnly className="h-8" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Valor ISS ST</Label>
                        <Input type="number" {...register("valor_iss_st")} readOnly className="h-8" />
                    </div>

                    <div className="space-y-1 col-span-2">
                        <Label className="text-[10px] text-muted-foreground">Outras Tributações</Label>
                        <Input type="number" {...register("outras_tributacoes")} readOnly className="h-8" />
                    </div>
                </div>
            </div>
        </div>
    );
}
