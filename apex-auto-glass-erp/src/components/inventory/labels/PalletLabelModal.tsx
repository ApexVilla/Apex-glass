import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PalletLabelConfig, PalletData } from './types';
import { PalletLabelPreview } from './PalletLabelPreview';
import { Printer, Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PalletLabelModalProps {
    isOpen: boolean;
    onClose: () => void;
    pallet: PalletData | null;
}

export function PalletLabelModal({ isOpen, onClose, pallet }: PalletLabelModalProps) {
    const [config, setConfig] = useState<PalletLabelConfig>({
        model: 'standard',
        quantity: 1,
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);

    if (!pallet) return null;

    const handlePrint = async () => {
        setIsGenerating(true);
        try {
            await printThermal();
        } catch (e) {
            console.error('Erro ao imprimir:', e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadPDF = async () => {
        setIsGenerating(true);
        try {
            await generateThermalPDF();
        } catch (e) {
            console.error('Erro ao gerar PDF:', e);
        } finally {
            setIsGenerating(false);
        }
    };

    const printThermal = async () => {
        if (!previewRef.current) return;

        // Criar nova janela para impressão
        const printWindow = window.open('', '_blank', 'width=400,height=400');
        if (!printWindow) return;

        // Converter preview para imagem
        const canvas = await html2canvas(previewRef.current, { 
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false
        });
        const imgData = canvas.toDataURL('image/png');

        const style = `
            <style>
                @page { margin: 0; size: auto; }
                body { 
                    margin: 0; 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    height: 100vh; 
                    background: white;
                }
                img { 
                    max-width: 100%; 
                    height: auto; 
                    image-rendering: crisp-edges;
                }
            </style>
        `;

        printWindow.document.write(`
            <html>
                <head><title>Imprimir Etiqueta de Palete</title>${style}</head>
                <body>
                    <img src="${imgData}" onload="window.print(); window.close();" />
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const generateThermalPDF = async () => {
        if (!previewRef.current) return;

        const canvas = await html2canvas(previewRef.current, { 
            scale: 4,
            backgroundColor: '#ffffff',
            logging: false
        });
        const imgData = canvas.toDataURL('image/png');

        // Dimensões em mm baseadas no modelo
        let width = 100;
        let height = 50;

        if (config.model === 'standard') {
            width = 100;
            height = 80;
        } else if (config.model === 'thermal_100x80') {
            width = 100;
            height = 80;
        } else if (config.model === 'thermal_150x100') {
            width = 150;
            height = 100;
        }

        const pdf = new jsPDF({
            orientation: width > height ? 'l' : 'p',
            unit: 'mm',
            format: [width, height]
        });

        // Adicionar imagem para cada quantidade de etiquetas
        for (let i = 0; i < config.quantity; i++) {
            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, 0, width, height);
        }

        const locationCode = pallet.location_street || pallet.location_building || pallet.location_apartment 
            ? `${pallet.location_street || ''}-${pallet.location_building || ''}-${pallet.location_apartment || ''}`.replace(/^-|-$/g, '')
            : 'N/A';

        pdf.save(`etiqueta-palete-${pallet.internal_code}-${locationCode}.pdf`);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Imprimir Etiqueta de Palete</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Configuração */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label>Modelo de Etiqueta</Label>
                            <Select
                                value={config.model}
                                onValueChange={(v) => setConfig({ ...config, model: v as PalletLabelConfig['model'] })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="standard">Padrão Completo (100x80mm)</SelectItem>
                                    <SelectItem value="thermal_100x50">Térmica 100x50mm (Padrão WMS)</SelectItem>
                                    <SelectItem value="thermal_100x80">Térmica 100x80mm (Detalhado)</SelectItem>
                                    <SelectItem value="thermal_150x100">Térmica 150x100mm (Completo)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Quantidade</Label>
                            <Input
                                type="number"
                                min={1}
                                max={100}
                                value={config.quantity}
                                onChange={(e) => setConfig({ ...config, quantity: parseInt(e.target.value) || 1 })}
                            />
                        </div>

                        {/* Informações da Palete (somente leitura) */}
                        <div className="space-y-3 border p-4 rounded-md bg-muted/30">
                            <Label className="text-base font-semibold">Informações da Palete</Label>
                            <div className="space-y-2 text-sm">
                                {pallet.company_name && (
                                    <div>
                                        <span className="text-muted-foreground">Empresa:</span>{' '}
                                        <span className="font-medium">{pallet.company_name}</span>
                                    </div>
                                )}
                                <div>
                                    <span className="text-muted-foreground">Produto:</span>{' '}
                                    <span className="font-medium">{pallet.product_name}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">SKU:</span>{' '}
                                    <span className="font-mono">{pallet.internal_code}</span>
                                </div>
                                {pallet.pallet_code && (
                                    <div>
                                        <span className="text-muted-foreground">Código da Palete:</span>{' '}
                                        <span className="font-mono">{pallet.pallet_code}</span>
                                    </div>
                                )}
                                <div>
                                    <span className="text-muted-foreground">Localização:</span>{' '}
                                    <span className="font-mono">
                                        {pallet.location_street || pallet.location_building || pallet.location_apartment
                                            ? `${pallet.location_street || ''} / ${pallet.location_building || ''} / ${pallet.location_apartment || ''}`.replace(/\s*\/\s*\/\s*/g, ' / ').replace(/^\s*\/\s*|\s*\/\s*$/g, '')
                                            : 'Não definido'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="text-xs text-muted-foreground p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md">
                            <strong>Nota:</strong> Todos os dados são carregados automaticamente do sistema. 
                            Nenhum campo é editável na tela de impressão.
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-lg p-6 border">
                        <h3 className="text-sm font-medium text-muted-foreground mb-4">Preview da Etiqueta</h3>
                        <div className="bg-white shadow-lg">
                            <PalletLabelPreview
                                ref={previewRef}
                                config={config}
                                pallet={pallet}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                            Dimensões: {
                                config.model === 'standard' ? '100x80mm' :
                                config.model === 'thermal_100x50' ? '100x50mm' :
                                config.model === 'thermal_100x80' ? '100x80mm' :
                                '150x100mm'
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

