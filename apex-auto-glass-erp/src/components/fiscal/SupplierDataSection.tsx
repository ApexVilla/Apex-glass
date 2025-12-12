import { UseFormReturn } from "react-hook-form";
import { FiscalNote } from "@/types/fiscal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw } from "lucide-react";

interface SupplierDataSectionProps {
    form: UseFormReturn<FiscalNote>;
}

export function SupplierDataSection({ form }: SupplierDataSectionProps) {
    const { register, setValue, watch } = form;

    // Mock data - in real app, fetch from Supabase based on selected supplier_id
    const supplierDetails = {
        name: "Fornecedor Exemplo Ltda",
        cnpj: "12.345.678/0001-90",
        ie: "123.456.789.000",
        address: "Rua das Flores, 123 - Centro, São Paulo/SP",
        seller1: "João Silva",
        seller2: "Maria Santos"
    };

    return (
        <div className="space-y-4">
            <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                    <Label>Fornecedor</Label>
                    <Select onValueChange={(v) => setValue("supplier_id", v)} defaultValue={watch("supplier_id")}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione o fornecedor..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">Fornecedor Exemplo Ltda</SelectItem>
                            <SelectItem value="2">Outro Fornecedor</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button variant="outline" size="icon" title="Atualizar cadastro">
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg border">
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Nome Completo</Label>
                    <p className="font-medium">{supplierDetails.name}</p>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">CNPJ / CPF</Label>
                    <p className="font-medium">{supplierDetails.cnpj}</p>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Inscrição Estadual</Label>
                    <p className="font-medium">{supplierDetails.ie}</p>
                </div>
                <div className="col-span-3 space-y-1">
                    <Label className="text-xs text-muted-foreground">Endereço</Label>
                    <p className="font-medium">{supplierDetails.address}</p>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Vendedor 1</Label>
                    <p className="font-medium">{supplierDetails.seller1}</p>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Vendedor 2</Label>
                    <p className="font-medium">{supplierDetails.seller2}</p>
                </div>
            </div>
        </div>
    );
}
