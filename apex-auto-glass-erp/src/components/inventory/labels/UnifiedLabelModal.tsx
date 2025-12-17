import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductLabelModal } from './ProductLabelModal';
import { PalletLabelModal } from './PalletLabelModal';
import { ProductData, PalletData } from './types';
import { useAuth } from '@/contexts/AuthContext';

interface UnifiedLabelModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: any | null;
    companyName?: string;
}

export function UnifiedLabelModal({ isOpen, onClose, product, companyName }: UnifiedLabelModalProps) {
    const { company } = useAuth();
    const [labelType, setLabelType] = useState<'product' | 'pallet'>('pallet');
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isPalletModalOpen, setIsPalletModalOpen] = useState(false);

    if (!product) return null;

    // Preparar dados do produto para etiqueta de produto
    const productData: ProductData = {
        id: product.id,
        name: product.name,
        internal_code: product.internal_code,
        manufacturer_code: product.manufacturer_code,
        barcode: product.barcode || product.internal_code,
        sale_price: product.sale_price || 0,
        batch: product.batch,
        expiry_date: product.expiry_date,
        category: product.category?.name,
        location: product.location,
        brand: product.brand,
        weight: product.weight,
        company_name: companyName || company?.name,
        company_address: company?.address || undefined,
        description: product.description || undefined,
    };

    // Preparar dados da palete
    const parseLocation = (location: string | null) => {
        if (!location) return { street: '', building: '', apartment: '' };
        try {
            const parsed = JSON.parse(location);
            return {
                street: parsed.street || parsed.rua || '',
                building: parsed.building || parsed.predio || '',
                apartment: parsed.apartment || parsed.apartamento || ''
            };
        } catch {
            return { street: location, building: '', apartment: '' };
        }
    };

    const locationData = parseLocation(product.location);
    const palletData: PalletData = {
        id: product.id,
        product_id: product.id,
        product_name: product.name,
        internal_code: product.internal_code,
        barcode: product.barcode || product.internal_code,
        location_street: locationData.street,
        location_building: locationData.building,
        location_apartment: locationData.apartment,
        location: product.location,
        company_name: companyName
    };

    const handleOpenProductLabel = () => {
        setIsProductModalOpen(true);
    };

    const handleOpenPalletLabel = () => {
        setIsPalletModalOpen(true);
    };

    const handleCloseProductModal = () => {
        setIsProductModalOpen(false);
    };

    const handleClosePalletModal = () => {
        setIsPalletModalOpen(false);
    };

    return (
        <>
            <Dialog open={isOpen && !isProductModalOpen && !isPalletModalOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Imprimir Etiqueta - {product.name}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <Tabs value={labelType} onValueChange={(v) => setLabelType(v as 'product' | 'pallet')}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="pallet">Etiqueta de Palete (WMS)</TabsTrigger>
                                <TabsTrigger value="product">Etiqueta de Produto</TabsTrigger>
                            </TabsList>

                            <TabsContent value="pallet" className="space-y-4 mt-4">
                                <div className="p-4 border rounded-lg bg-muted/30">
                                    <h3 className="font-semibold mb-2">Etiqueta de Palete</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Etiqueta otimizada para WMS com endereço logístico, código de barras e mapa visual da localização.
                                    </p>
                                    <ul className="text-sm space-y-1 text-muted-foreground mb-4">
                                        <li>• Nome do produto e SKU</li>
                                        <li>• Código de barras centralizado</li>
                                        <li>• Endereço logístico (Rua/Prédio/Nível)</li>
                                        <li>• Mapa visual da localização</li>
                                        <li>• Nome da empresa</li>
                                    </ul>
                                    <Button onClick={handleOpenPalletLabel} className="w-full">
                                        Abrir Etiqueta de Palete
                                    </Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="product" className="space-y-4 mt-4">
                                <div className="p-4 border rounded-lg bg-muted/30">
                                    <h3 className="font-semibold mb-2">Etiqueta de Produto</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Etiqueta padrão para produtos com informações comerciais e código de barras.
                                    </p>
                                    <ul className="text-sm space-y-1 text-muted-foreground mb-4">
                                        <li>• Nome do produto</li>
                                        <li>• Código de barras</li>
                                        <li>• SKU/Código interno</li>
                                        <li>• Preço (opcional)</li>
                                        <li>• Campos personalizáveis</li>
                                    </ul>
                                    <Button onClick={handleOpenProductLabel} className="w-full">
                                        Abrir Etiqueta de Produto
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modais individuais */}
            <ProductLabelModal
                isOpen={isProductModalOpen}
                onClose={handleCloseProductModal}
                product={productData}
            />

            <PalletLabelModal
                isOpen={isPalletModalOpen}
                onClose={handleClosePalletModal}
                pallet={palletData}
            />
        </>
    );
}

