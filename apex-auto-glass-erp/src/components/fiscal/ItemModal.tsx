import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FiscalNoteItem } from "@/types/fiscal";
import { ProductSearchCombobox } from "@/components/common/ProductSearchCombobox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface ItemModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (item: FiscalNoteItem) => void;
    initialData?: FiscalNoteItem;
}

export function ItemModal({ open, onOpenChange, onSave, initialData }: ItemModalProps) {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState("general");
    const [products, setProducts] = useState<any[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    
    // Initialize state with initialData or defaults
    const [item, setItem] = useState<Partial<FiscalNoteItem>>(initialData || {
        quantidade: 1,
        preco_unitario: 0,
        valor_total: 0,
        aliquota_icms: 0,
        aliquota_ipi: 0,
        taxes: {
            aliquota_iss: 0,
            base_calculo_iss: 0,
            valor_iss: 0,
            valor_isento_iss: 0,
            valor_outras_iss: 0,
            valor_nao_tributada_iss: 0,
            base_calculo_iss_subst: 0,
            valor_iss_subst: 0,
            base_pis: 0,
            base_cofins: 0,
            aliquota_pis: 0,
            aliquota_cofins: 0,
            valor_pis: 0,
            valor_cofins: 0,
            base_icms_st_retido: 0,
            valor_icms_st_retido: 0,
            valor_icms_retido: 0
        }
    });

    // Load products when modal opens
    useEffect(() => {
        if (open) {
            loadProducts();
        }
    }, [open]);

    const loadProducts = async () => {
        setLoadingProducts(true);
        try {
            let query = supabase
                .from('products')
                .select('id, name, internal_code, brand, ncm, purchase_price, sale_price')
                .eq('is_active', true)
                .order('name');

            if (profile?.company_id) {
                query = query.eq('company_id', profile.company_id);
            }

            const { data, error } = await query;
            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleProductSelect = async (productId: string) => {
        const selectedProduct = products.find(p => p.id === productId);
        if (!selectedProduct) return;

        // Preencher campos automaticamente com dados do produto
        setItem(prev => {
            const updated = {
                ...prev,
                product_id: productId,
                codigo_item: selectedProduct.internal_code || prev.codigo_item,
                nome_item: selectedProduct.name || prev.nome_item,
                ncm: selectedProduct.ncm || prev.ncm,
                preco_unitario: selectedProduct.purchase_price || prev.preco_unitario || 0,
                unidade: prev.unidade || 'UN',
            };

            // Recalcular valor total
            const qty = updated.quantidade || 1;
            const price = updated.preco_unitario || 0;
            const discount = updated.valor_desconto || 0;
            updated.valor_total = (qty * price) - discount;

            return updated;
        });
    };

    const handleChange = (field: keyof FiscalNoteItem, value: any) => {
        setItem(prev => {
            const updated = { ...prev, [field]: value };

            // Auto-calc Item Total
            if (field === 'quantidade' || field === 'preco_unitario' || field === 'valor_desconto') {
                const qty = field === 'quantidade' ? value : (updated.quantidade || 0);
                const price = field === 'preco_unitario' ? value : (updated.preco_unitario || 0);
                const discount = field === 'valor_desconto' ? value : (updated.valor_desconto || 0);
                updated.valor_total = (qty * price) - discount;
            }

            return updated;
        });
    };

    const handleTaxChange = (field: keyof NonNullable<FiscalNoteItem['taxes']>, value: any) => {
        setItem(prev => {
            const currentTaxes = { ...prev.taxes, [field]: value } as any;

            // ICMS (if stored in item root)
            // Note: ICMS rate is in item root, but let's assume we might calc value if we had a field for it. 
            // The requirement asks for "Valor ICMS" in the list, usually calculated from Base * Rate.
            // But in the modal we have specific tax tabs.

            // ISS Calculation
            if (field === 'base_calculo_iss' || field === 'aliquota_iss') {
                const base = field === 'base_calculo_iss' ? value : (currentTaxes.base_calculo_iss || 0);
                const rate = field === 'aliquota_iss' ? value : (currentTaxes.aliquota_iss || 0);
                currentTaxes.valor_iss = base * (rate / 100);
            }

            // PIS Calculation
            if (field === 'base_pis' || field === 'aliquota_pis') {
                const base = field === 'base_pis' ? value : (currentTaxes.base_pis || 0);
                const rate = field === 'aliquota_pis' ? value : (currentTaxes.aliquota_pis || 0);
                currentTaxes.valor_pis = base * (rate / 100);
            }

            // COFINS Calculation
            if (field === 'base_cofins' || field === 'aliquota_cofins') {
                const base = field === 'base_cofins' ? value : (currentTaxes.base_cofins || 0);
                const rate = field === 'aliquota_cofins' ? value : (currentTaxes.aliquota_cofins || 0);
                currentTaxes.valor_cofins = base * (rate / 100);
            }

            return { ...prev, taxes: currentTaxes };
        });
    };

    const handleSave = () => {
        // Validação de campos obrigatórios
        if (!item.codigo_item || !item.nome_item || !item.nome_item.trim()) {
            toast({
                title: "Erro",
                description: "Por favor, preencha o código e nome do item antes de salvar.",
                variant: "destructive"
            });
            return;
        }
        
        if (!item.quantidade || item.quantidade <= 0) {
            toast({
                title: "Erro",
                description: "Por favor, informe uma quantidade válida.",
                variant: "destructive"
            });
            return;
        }
        
        if (!item.preco_unitario || item.preco_unitario <= 0) {
            toast({
                title: "Erro",
                description: "Por favor, informe um preço unitário válido.",
                variant: "destructive"
            });
            return;
        }

        onSave(item as FiscalNoteItem);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Detalhes do Item</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="general">Geral</TabsTrigger>
                        <TabsTrigger value="iss">ISS</TabsTrigger>
                        <TabsTrigger value="piscofins">PIS/COFINS</TabsTrigger>
                        <TabsTrigger value="icmsst">ICMS ST</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="col-span-3 space-y-2">
                                <Label>Vincular Produto</Label>
                                <ProductSearchCombobox
                                    products={products}
                                    value={(item as any).product_id || ''}
                                    onSelect={handleProductSelect}
                                    placeholder="Buscar e vincular produto..."
                                    disabled={loadingProducts}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Código do Item</Label>
                                <Input value={item.codigo_item || ''} onChange={e => handleChange('codigo_item', e.target.value)} />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Nome do Item</Label>
                                <Input value={item.nome_item || ''} onChange={e => handleChange('nome_item', e.target.value)} />
                            </div>

                            <div className="space-y-2">
                                <Label>Unidade</Label>
                                <Input value={item.unidade || ''} onChange={e => handleChange('unidade', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>NCM</Label>
                                <Input value={item.ncm || ''} onChange={e => handleChange('ncm', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>CFOP</Label>
                                <Input value={item.cfop || ''} onChange={e => handleChange('cfop', e.target.value)} />
                            </div>

                            <div className="space-y-2">
                                <Label>Quantidade</Label>
                                <Input type="number" value={item.quantidade} onChange={e => handleChange('quantidade', parseFloat(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Preço Unitário</Label>
                                <Input type="number" value={item.preco_unitario} onChange={e => handleChange('preco_unitario', parseFloat(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Valor Total</Label>
                                <Input type="number" value={item.valor_total} readOnly className="bg-muted" />
                            </div>

                            <div className="space-y-2">
                                <Label>Alíquota ICMS (%)</Label>
                                <Input type="number" value={item.aliquota_icms} onChange={e => handleChange('aliquota_icms', parseFloat(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Alíquota IPI (%)</Label>
                                <Input type="number" value={item.aliquota_ipi} onChange={e => handleChange('aliquota_ipi', parseFloat(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>% Desconto</Label>
                                <Input type="number" value={item.percentual_desconto} onChange={e => handleChange('percentual_desconto', parseFloat(e.target.value))} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="iss" className="space-y-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Alíquota ISS (%)</Label>
                                <Input type="number" value={item.taxes?.aliquota_iss} onChange={e => handleTaxChange('aliquota_iss', parseFloat(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Base Cálculo ISS</Label>
                                <Input type="number" value={item.taxes?.base_calculo_iss} onChange={e => handleTaxChange('base_calculo_iss', parseFloat(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Valor ISS</Label>
                                <Input type="number" value={item.taxes?.valor_iss} onChange={e => handleTaxChange('valor_iss', parseFloat(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Valor Isento</Label>
                                <Input type="number" value={item.taxes?.valor_isento_iss} onChange={e => handleTaxChange('valor_isento_iss', parseFloat(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Item Lista Serviços</Label>
                                <Input value={item.taxes?.item_lista_servicos || ''} onChange={e => handleTaxChange('item_lista_servicos', e.target.value)} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="piscofins" className="space-y-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>CST PIS</Label>
                                <Input value={item.taxes?.cst_pis || ''} onChange={e => handleTaxChange('cst_pis', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Base PIS</Label>
                                <Input type="number" value={item.taxes?.base_pis} onChange={e => handleTaxChange('base_pis', parseFloat(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Alíquota PIS</Label>
                                <Input type="number" value={item.taxes?.aliquota_pis} onChange={e => handleTaxChange('aliquota_pis', parseFloat(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Valor PIS</Label>
                                <Input type="number" value={item.taxes?.valor_pis} onChange={e => handleTaxChange('valor_pis', parseFloat(e.target.value))} />
                            </div>

                            <div className="space-y-2">
                                <Label>CST COFINS</Label>
                                <Input value={item.taxes?.cst_cofins || ''} onChange={e => handleTaxChange('cst_cofins', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Base COFINS</Label>
                                <Input type="number" value={item.taxes?.base_cofins} onChange={e => handleTaxChange('base_cofins', parseFloat(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Alíquota COFINS</Label>
                                <Input type="number" value={item.taxes?.aliquota_cofins} onChange={e => handleTaxChange('aliquota_cofins', parseFloat(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Valor COFINS</Label>
                                <Input type="number" value={item.taxes?.valor_cofins} onChange={e => handleTaxChange('valor_cofins', parseFloat(e.target.value))} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="icmsst" className="space-y-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Base ICMS ST Retido</Label>
                                <Input type="number" value={item.taxes?.base_icms_st_retido} onChange={e => handleTaxChange('base_icms_st_retido', parseFloat(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Valor ICMS ST Retido</Label>
                                <Input type="number" value={item.taxes?.valor_icms_st_retido} onChange={e => handleTaxChange('valor_icms_st_retido', parseFloat(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Valor ICMS Retido</Label>
                                <Input type="number" value={item.taxes?.valor_icms_retido} onChange={e => handleTaxChange('valor_icms_retido', parseFloat(e.target.value))} />
                            </div>
                            <div className="col-span-3 space-y-2">
                                <Label>Documento Origem</Label>
                                <Input value={item.taxes?.numero_documento_origem || ''} onChange={e => handleTaxChange('numero_documento_origem', e.target.value)} />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Confirmar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
