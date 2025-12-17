import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { LabelConfig, LabelModel, ProductData } from './types';
import { LabelPreview } from './LabelPreview';
import { Printer, Download, FileText, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '@/contexts/AuthContext';

interface ProductLabelModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: ProductData | null;
}

export function ProductLabelModal({ isOpen, onClose, product }: ProductLabelModalProps) {
    const { company } = useAuth();
    const [config, setConfig] = useState<LabelConfig>({
        model: 'standard',
        quantity: 1,
        showName: true,
        showBarcode: true,
        showSku: true,
        showPrice: true,
        showBatch: false,
        showExpiry: false,
        showCategory: false,
        showLocation: false,
        showBrand: false,
        showWeight: false,
        showQtyBox: false,
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);

    if (!product) return null;

    // Adicionar informações da empresa ao produto se não estiverem presentes
    const productWithCompany: ProductData = {
        ...product,
        company_name: product.company_name || company?.name,
        company_address: product.company_address || company?.address || undefined,
    };

    const handlePrint = async () => {
        setIsGenerating(true);
        try {
            // For thermal printers, we usually want to open a new window with just the label and print it
            // or generate a PDF with the exact page size.

            if (config.model === 'a4_48') {
                await generateA4PDF(true);
            } else {
                await printThermal();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadPDF = async () => {
        setIsGenerating(true);
        try {
            if (config.model === 'a4_48') {
                await generateA4PDF(false);
            } else {
                await generateThermalPDF();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const printThermal = async () => {
        if (!previewRef.current) return;

        // Create a new window
        const printWindow = window.open('', '_blank', 'width=400,height=400');
        if (!printWindow) return;

        // Clone the preview node
        const canvas = await html2canvas(previewRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');

        const style = `
      <style>
        @page { margin: 0; size: auto; }
        body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
        img { max-width: 100%; height: auto; }
      </style>
    `;

        printWindow.document.write(`
      <html>
        <head><title>Print Label</title>${style}</head>
        <body>
          <img src="${imgData}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
        printWindow.document.close();
    };

    const generateThermalPDF = async () => {
        if (!previewRef.current) return;

        const canvas = await html2canvas(previewRef.current, { scale: 4 }); // High scale for quality
        const imgData = canvas.toDataURL('image/png');

        // Dimensions in mm
        let width = 40;
        let height = 30;

        if (config.model === 'standard') {
            width = 100;
            height = 80;
        } else if (config.model === 'thermal_60x40' || config.model === 'custom') {
            width = 60;
            height = 40;
        }

        const pdf = new jsPDF({
            orientation: width > height ? 'l' : 'p',
            unit: 'mm',
            format: [width, height]
        });

        // Add image for each label quantity
        for (let i = 0; i < config.quantity; i++) {
            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, 0, width, height);
        }

        pdf.save(`label-${product.internal_code}.pdf`);
    };

    const generateA4PDF = async (autoPrint: boolean) => {
        // A4 logic
        // We need to render the label once, then replicate it on the PDF
        if (!previewRef.current) return;
        const canvas = await html2canvas(previewRef.current, { scale: 3 });
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = 210;
        const pageHeight = 297;

        // Assuming 48 labels: 4 cols x 12 rows
        // Margins? Let's assume minimal margins
        const cols = 4;
        const rows = 12;
        const labelWidth = pageWidth / cols; // 52.5
        const labelHeight = pageHeight / rows; // 24.75

        // If user wants 33x70, we can try to fit that.
        // But for now let's use the grid that fits 48.

        let count = 0;
        let pageAdded = false;

        for (let i = 0; i < config.quantity; i++) {
            const col = count % cols;
            const row = Math.floor((count % (cols * rows)) / cols);

            if (count > 0 && count % (cols * rows) === 0) {
                pdf.addPage();
                pageAdded = true;
            }

            const x = col * labelWidth;
            const y = row * labelHeight;

            // Center the label image in the grid cell
            // The label image might be 40x30 or 60x40. We need to fit it or center it.
            // Let's assume we scale it to fit the cell with some padding
            const padding = 2;
            const w = labelWidth - (padding * 2);
            const h = labelHeight - (padding * 2);

            pdf.addImage(imgData, 'PNG', x + padding, y + padding, w, h);

            count++;
        }

        if (autoPrint) {
            pdf.autoPrint();
            window.open(pdf.output('bloburl'), '_blank');
        } else {
            pdf.save(`labels-a4-${product.internal_code}.pdf`);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Imprimir Etiqueta - {product.name}</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Configuration */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label>Modelo de Etiqueta</Label>
                            <Select
                                value={config.model}
                                onValueChange={(v) => setConfig({ ...config, model: v as LabelModel })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="standard">Padrão Completo (100x80mm)</SelectItem>
                                    <SelectItem value="thermal_40x30">Térmica 40x30mm</SelectItem>
                                    <SelectItem value="thermal_60x40">Térmica 60x40mm</SelectItem>
                                    <SelectItem value="a4_48">Folha A4 (48 etiquetas)</SelectItem>
                                    <SelectItem value="custom">Personalizado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Quantidade</Label>
                            <Input
                                type="number"
                                min={1}
                                value={config.quantity}
                                onChange={(e) => setConfig({ ...config, quantity: parseInt(e.target.value) || 1 })}
                            />
                        </div>

                        <div className="space-y-3 border p-4 rounded-md">
                            <Label className="text-base font-semibold">Campos Visíveis</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="showName"
                                        checked={config.showName}
                                        onCheckedChange={(c) => setConfig({ ...config, showName: c as boolean })}
                                    />
                                    <Label htmlFor="showName">Nome do Produto</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="showPrice"
                                        checked={config.showPrice}
                                        onCheckedChange={(c) => setConfig({ ...config, showPrice: c as boolean })}
                                    />
                                    <Label htmlFor="showPrice">Preço</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="showBarcode"
                                        checked={config.showBarcode}
                                        onCheckedChange={(c) => setConfig({ ...config, showBarcode: c as boolean })}
                                    />
                                    <Label htmlFor="showBarcode">Código de Barras</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="showSku"
                                        checked={config.showSku}
                                        onCheckedChange={(c) => setConfig({ ...config, showSku: c as boolean })}
                                    />
                                    <Label htmlFor="showSku">SKU / Código</Label>
                                </div>

                                {(config.model === 'thermal_60x40' || config.model === 'custom') && (
                                    <>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="showBatch"
                                                checked={config.showBatch}
                                                onCheckedChange={(c) => setConfig({ ...config, showBatch: c as boolean })}
                                            />
                                            <Label htmlFor="showBatch">Lote</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="showExpiry"
                                                checked={config.showExpiry}
                                                onCheckedChange={(c) => setConfig({ ...config, showExpiry: c as boolean })}
                                            />
                                            <Label htmlFor="showExpiry">Validade</Label>
                                        </div>
                                    </>
                                )}

                                {config.model === 'custom' && (
                                    <>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="showCategory" checked={config.showCategory} onCheckedChange={(c) => setConfig({ ...config, showCategory: c as boolean })} />
                                            <Label htmlFor="showCategory">Categoria</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="showLocation" checked={config.showLocation} onCheckedChange={(c) => setConfig({ ...config, showLocation: c as boolean })} />
                                            <Label htmlFor="showLocation">Localização</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="showBrand" checked={config.showBrand} onCheckedChange={(c) => setConfig({ ...config, showBrand: c as boolean })} />
                                            <Label htmlFor="showBrand">Marca</Label>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="flex flex-col items-center justify-center bg-gray-100 rounded-lg p-6 border">
                        <h3 className="text-sm font-medium text-muted-foreground mb-4">Preview da Etiqueta</h3>
                        <div className="bg-white shadow-lg">
                            <LabelPreview
                                ref={previewRef}
                                config={config}
                                product={productWithCompany}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                            Dimensões: {
                                config.model === 'standard' ? '100x80mm' :
                                config.model === 'thermal_40x30' ? '40x30mm' :
                                config.model === 'thermal_60x40' ? '60x40mm' :
                                'A4'
                            }
                        </p>
                    </div>
                </div>

                <DialogFooter className="flex gap-2 sm:justify-end">
                    <Button variant="outline" onClick={handleDownloadPDF} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Baixar PDF
                    </Button>
                    <Button onClick={handlePrint} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                        Imprimir
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
