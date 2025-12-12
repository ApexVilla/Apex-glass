import { useState } from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { FiscalNote, FiscalNoteItem } from "@/types/fiscal";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Calculator } from "lucide-react";
import { ItemModal } from "./ItemModal";

interface ItemsSectionProps {
    form: UseFormReturn<FiscalNote>;
}

export function ItemsSection({ form }: ItemsSectionProps) {
    const { control } = form;
    const { fields, append, remove, update } = useFieldArray({
        control,
        name: "items" as any // Type assertion needed because 'items' isn't strictly in FiscalNote interface yet, need to add it
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const handleAddItem = () => {
        setEditingIndex(null);
        setIsModalOpen(true);
    };

    const handleEditItem = (index: number) => {
        setEditingIndex(index);
        setIsModalOpen(true);
    };

    const handleSaveItem = (item: FiscalNoteItem) => {
        if (editingIndex !== null) {
            update(editingIndex, item);
        } else {
            append(item);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Itens da Nota</h3>
                <Button onClick={handleAddItem} size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> Adicionar Item
                </Button>
            </div>

            <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">Seq</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Qtd</TableHead>
                            <TableHead className="text-right">Unitário</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">ICMS</TableHead>
                            <TableHead className="text-right">IPI</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.map((field: any, index) => (
                            <TableRow key={field.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{field.codigo_item}</TableCell>
                                <TableCell>{field.nome_item}</TableCell>
                                <TableCell className="text-right">{field.quantidade}</TableCell>
                                <TableCell className="text-right">{field.preco_unitario?.toFixed(2)}</TableCell>
                                <TableCell className="text-right">{field.valor_total?.toFixed(2)}</TableCell>
                                <TableCell className="text-right">{field.aliquota_icms}%</TableCell>
                                <TableCell className="text-right">{field.aliquota_ipi}%</TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditItem(index)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {fields.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                    Nenhum item adicionado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {isModalOpen && (
                <ItemModal
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    onSave={handleSaveItem}
                    initialData={editingIndex !== null ? fields[editingIndex] as any : undefined}
                />
            )}
        </div>
    );
}
