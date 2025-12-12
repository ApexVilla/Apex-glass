import { UseFormReturn } from "react-hook-form";
import { FiscalNote } from "@/types/fiscal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface NoteDataSectionProps {
    form: UseFormReturn<FiscalNote>;
}

export function NoteDataSection({ form }: NoteDataSectionProps) {
    const { register, setValue, watch } = form;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                    <Label>Estabelecimento</Label>
                    {/* TODO: Fetch establishments */}
                    <Select onValueChange={(v) => setValue("establishment_id", v)} defaultValue={watch("establishment_id")}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="default">Loja Principal</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Série</Label>
                    <Input {...register("serie")} />
                </div>

                <div className="space-y-2">
                    <Label>Subsérie</Label>
                    <Input {...register("subserie")} />
                </div>

                <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Input {...register("modelo_documento")} defaultValue="55" />
                </div>

                <div className="space-y-2">
                    <Label>Número da Nota *</Label>
                    <Input type="number" {...register("numero_nota", { valueAsNumber: true })} />
                </div>

                <div className="space-y-2">
                    <Label>Data Emissão *</Label>
                    <Input type="date" {...register("data_emissao")} />
                </div>

                <div className="space-y-2">
                    <Label>Data Saída</Label>
                    <Input type="date" {...register("data_saida")} />
                </div>

                <div className="space-y-2">
                    <Label>Hora Saída</Label>
                    <Input type="time" {...register("hora_saida")} />
                </div>

                <div className="space-y-2">
                    <Label>Data Entrada</Label>
                    <Input type="date" {...register("data_entrada")} />
                </div>

                <div className="space-y-2">
                    <Label>Tipo *</Label>
                    <Select onValueChange={(v: any) => setValue("tipo", v)} defaultValue={watch("tipo")}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="entrada">Entrada</SelectItem>
                            <SelectItem value="saida">Saída</SelectItem>
                            <SelectItem value="devolucao">Devolução</SelectItem>
                            <SelectItem value="servico">Serviço</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Finalidade</Label>
                    <Select onValueChange={(v: any) => setValue("finalidade", v)} defaultValue={watch("finalidade")}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="complementar">Complementar</SelectItem>
                            <SelectItem value="ajuste">Ajuste</SelectItem>
                            <SelectItem value="devolucao">Devolução</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="col-span-2 space-y-2">
                    <Label>Transportador</Label>
                    {/* TODO: Fetch transporters */}
                    <Select onValueChange={(v) => setValue("transportador_id", v)} defaultValue={watch("transportador_id")}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Sem frete</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Mensagens e Observações</Label>
                <Textarea {...register("mensagens_observacoes")} rows={3} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-lg border">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="incide_ipi"
                        checked={watch("incide_despesas_base_ipi")}
                        onCheckedChange={(c) => setValue("incide_despesas_base_ipi", !!c)}
                    />
                    <Label htmlFor="incide_ipi">Incide desp. base IPI?</Label>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="incide_icms"
                        checked={watch("incide_despesas_base_icms")}
                        onCheckedChange={(c) => setValue("incide_despesas_base_icms", !!c)}
                    />
                    <Label htmlFor="incide_icms">Incide desp. base ICMS?</Label>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="upd_cost_buy"
                        checked={watch("atualiza_custo_compra")}
                        onCheckedChange={(c) => setValue("atualiza_custo_compra", !!c)}
                    />
                    <Label htmlFor="upd_cost_buy">Atualiza custo compra?</Label>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="upd_cost_repo"
                        checked={watch("atualiza_custo_reposicao")}
                        onCheckedChange={(c) => setValue("atualiza_custo_reposicao", !!c)}
                    />
                    <Label htmlFor="upd_cost_repo">Atualiza custo reposição?</Label>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="confirmed"
                        checked={watch("confirmado")}
                        onCheckedChange={(c) => setValue("confirmado", !!c)}
                    />
                    <Label htmlFor="confirmed">Confirmado?</Label>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="ipi_icms"
                        checked={watch("ipi_compoe_base_icms")}
                        onCheckedChange={(c) => setValue("ipi_compoe_base_icms", !!c)}
                    />
                    <Label htmlFor="ipi_icms">IPI compõe base ICMS?</Label>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="public_org"
                        checked={watch("compra_orgao_publico")}
                        onCheckedChange={(c) => setValue("compra_orgao_publico", !!c)}
                    />
                    <Label htmlFor="public_org">Compra órgão público?</Label>
                </div>
            </div>
        </div>
    );
}
