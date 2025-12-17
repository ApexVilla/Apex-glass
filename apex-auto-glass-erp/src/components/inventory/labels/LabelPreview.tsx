import React, { forwardRef } from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { LabelConfig, ProductData } from './types';
import { formatCurrency } from '@/lib/format';

interface LabelPreviewProps {
    config: LabelConfig;
    product: ProductData;
    className?: string;
}

export const LabelPreview = forwardRef<HTMLDivElement, LabelPreviewProps>(({ config, product, className }, ref) => {
    const { model } = config;

    // Helper to render barcode
    const renderBarcode = (value: string, width: number, height: number, fontSize: number = 12) => (
        <Barcode
            value={value}
            width={width}
            height={height}
            fontSize={fontSize}
            displayValue={true}
            margin={0}
            background="transparent"
            lineColor="#000000"
        />
    );

    // 40x30mm - Layout melhorado
    if (model === 'thermal_40x30') {
        return (
            <div ref={ref} className={`bg-white text-black box-border overflow-hidden flex flex-col ${className}`} style={{ width: '40mm', height: '30mm', padding: '2mm', fontFamily: 'monospace' }}>
                {/* Nome do Produto */}
                {config.showName && (
                    <div className="text-[9px] leading-tight text-center font-bold w-full mb-1 line-clamp-2">
                        {product.name.substring(0, 35)}
                    </div>
                )}

                {/* Código de Barras (Central e Prioridade) */}
                {config.showBarcode && (product.barcode || product.internal_code) && (
                    <div className="flex-1 flex items-center justify-center w-full my-0.5 min-h-[18mm]">
                        {renderBarcode(product.barcode || product.internal_code, 1, 20, 9)}
                    </div>
                )}

                {/* SKU e Preço */}
                <div className="flex justify-between items-center w-full mt-0.5 border-t border-gray-200 pt-0.5">
                    {config.showSku && <span className="text-[7px] font-mono">{product.internal_code}</span>}
                    {config.showPrice && <span className="text-[9px] font-bold">{formatCurrency(product.sale_price)}</span>}
                </div>

                {/* Rodapé: Empresa */}
                {(product.company_name || product.company_address) && (
                    <div className="mt-0.5 pt-0.5 border-t border-gray-200">
                        <div className="text-[6px] text-gray-600 text-center leading-tight">
                            {product.company_name && <div>{product.company_name}</div>}
                            {product.company_address && <div className="truncate">{product.company_address.substring(0, 30)}</div>}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 60x40mm - Layout melhorado
    if (model === 'thermal_60x40') {
        return (
            <div ref={ref} className={`bg-white text-black box-border overflow-hidden flex flex-col ${className}`} style={{ width: '60mm', height: '40mm', padding: '3mm', fontFamily: 'monospace' }}>
                {/* Cabeçalho: Nome do Produto */}
                {config.showName && (
                    <div className="mb-1">
                        <div className="text-[11px] font-bold leading-tight mb-0.5 line-clamp-2">
                            {product.name}
                        </div>
                        {config.showSku && (
                            <div className="text-[8px] font-mono text-gray-700">
                                SKU: {product.internal_code}
                            </div>
                        )}
                    </div>
                )}

                {/* Código de Barras (Central e Prioridade) */}
                <div className="flex-1 flex items-center justify-center w-full my-1 min-h-[22mm]">
                    {config.showBarcode && (product.barcode || product.internal_code) && (
                        renderBarcode(product.barcode || product.internal_code, 1.5, 30, 11)
                    )}
                </div>

                {/* Informações Adicionais */}
                <div className="mt-1 border-t border-gray-200 pt-1">
                    <div className="flex justify-between items-start w-full">
                        <div className="flex flex-col gap-0.5">
                            {config.showBatch && product.batch && (
                                <span className="text-[7px]">Lote: {product.batch}</span>
                            )}
                            {config.showExpiry && product.expiry_date && (
                                <span className="text-[7px]">Val: {product.expiry_date}</span>
                            )}
                            {config.showBrand && product.brand && (
                                <span className="text-[7px]">Marca: {product.brand}</span>
                            )}
                        </div>
                        <div className="flex flex-col items-end">
                            {config.showPrice && (
                                <span className="text-[12px] font-bold">{formatCurrency(product.sale_price)}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Rodapé: Empresa */}
                {(product.company_name || product.company_address) && (
                    <div className="mt-1 pt-1 border-t border-gray-200">
                        <div className="text-[6px] text-gray-600 text-center leading-tight">
                            {product.company_name && <div className="font-semibold">{product.company_name}</div>}
                            {product.company_address && <div className="truncate">{product.company_address}</div>}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Custom Model - Layout melhorado
    if (model === 'custom') {
        return (
            <div ref={ref} className={`bg-white text-black box-border overflow-hidden flex flex-col ${className}`} style={{ width: '60mm', height: '40mm', padding: '3mm', fontFamily: 'monospace' }}>
                {/* Cabeçalho: Nome do Produto */}
                {config.showName && (
                    <div className="mb-1">
                        <div className="text-[11px] font-bold leading-tight mb-0.5">
                            {product.name}
                        </div>
                        {config.showSku && (
                            <div className="text-[8px] font-mono text-gray-700">
                                SKU: {product.internal_code}
                            </div>
                        )}
                    </div>
                )}

                {/* Informações Adicionais em Grid */}
                {(config.showCategory || config.showBrand || config.showLocation || config.showWeight) && (
                    <div className="grid grid-cols-2 gap-1 text-[7px] mb-1 border-b border-gray-200 pb-1">
                        {config.showCategory && product.category && (
                            <div>Cat: {product.category}</div>
                        )}
                        {config.showBrand && product.brand && (
                            <div>Marca: {product.brand}</div>
                        )}
                        {config.showLocation && product.location && (
                            <div>Loc: {product.location}</div>
                        )}
                        {config.showWeight && product.weight && (
                            <div>Peso: {product.weight}</div>
                        )}
                    </div>
                )}

                {/* Código de Barras (Central e Prioridade) */}
                <div className="flex-1 flex items-center justify-center w-full my-1 min-h-[20mm]">
                    {config.showBarcode && (product.barcode || product.internal_code) && (
                        renderBarcode(product.barcode || product.internal_code, 1.3, 28, 10)
                    )}
                </div>

                {/* Rodapé: Preço e Empresa */}
                <div className="mt-1 border-t border-gray-200 pt-1">
                    <div className="flex justify-between items-center mb-1">
                        {config.showSku && (
                            <span className="text-[8px] font-mono">{product.internal_code}</span>
                        )}
                        {config.showPrice && (
                            <span className="text-[11px] font-bold">{formatCurrency(product.sale_price)}</span>
                        )}
                    </div>
                    {(product.company_name || product.company_address) && (
                        <div className="text-[6px] text-gray-600 text-center leading-tight border-t border-gray-200 pt-0.5 mt-0.5">
                            {product.company_name && <div className="font-semibold">{product.company_name}</div>}
                            {product.company_address && <div className="truncate">{product.company_address}</div>}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Modelo Standard - Novo formato completo
    if (model === 'standard') {
        // Parsear endereço do produto (location)
        const parseLocation = (location: string | null | undefined) => {
            if (!location) return '';
            try {
                const parsed = JSON.parse(location);
                const parts = [];
                if (parsed.street || parsed.rua) parts.push(`Rua: ${parsed.street || parsed.rua}`);
                if (parsed.building || parsed.predio) parts.push(`Prédio: ${parsed.building || parsed.predio}`);
                if (parsed.apartment || parsed.apartamento || parsed.nivel) parts.push(`Nível: ${parsed.apartment || parsed.apartamento || parsed.nivel}`);
                return parts.length > 0 ? parts.join(' | ') : location;
            } catch {
                return location;
            }
        };

        const productLocation = parseLocation(product.location);
        const barcodeValue = product.barcode || product.internal_code;
        const systemName = 'APEX GLASS ERP';

        return (
            <div ref={ref} className={`bg-white text-black box-border overflow-hidden flex flex-col ${className}`} style={{ width: '100mm', height: '80mm', padding: '4mm', fontFamily: 'monospace' }}>
                {/* 1. Nome do Sistema */}
                <div className="mb-1 border-b border-gray-300 pb-1">
                    <div className="text-[10px] font-bold text-center text-gray-700">
                        {systemName}
                    </div>
                </div>

                {/* 2. Nome da Empresa */}
                {product.company_name && (
                    <div className="mb-1">
                        <div className="text-[11px] font-bold text-center">
                            {product.company_name}
                        </div>
                    </div>
                )}

                {/* 3. SKU */}
                <div className="mb-1 border-t border-gray-200 pt-1">
                    <div className="text-[8px] text-gray-600 mb-0.5">SKU:</div>
                    <div className="text-[12px] font-bold font-mono">
                        {product.internal_code}
                    </div>
                </div>

                {/* 4. Descrição do Produto */}
                <div className="mb-2 border-t border-gray-200 pt-1 flex-1">
                    <div className="text-[8px] text-gray-600 mb-0.5">Descrição:</div>
                    <div className="text-[10px] font-medium leading-tight line-clamp-3">
                        {product.name}
                    </div>
                    {product.description && (
                        <div className="text-[8px] text-gray-600 mt-1 leading-tight line-clamp-2">
                            {product.description}
                        </div>
                    )}
                </div>

                {/* 5. Endereço (conforme está no sistema) */}
                {productLocation && (
                    <div className="mb-2 border-t border-gray-200 pt-1">
                        <div className="text-[8px] text-gray-600 mb-0.5">Endereço:</div>
                        <div className="text-[9px] font-mono leading-tight">
                            {productLocation}
                        </div>
                    </div>
                )}

                {/* 6. QR Code e Código de Barras */}
                <div className="mt-auto border-t-2 border-black pt-2">
                    <div className="flex items-center justify-between gap-2">
                        {/* QR Code */}
                        <div className="flex flex-col items-center">
                            <div className="text-[7px] text-gray-600 mb-0.5">QR Code</div>
                            <QRCodeSVG
                                value={barcodeValue}
                                size={35}
                                level="M"
                                includeMargin={false}
                                fgColor="#000000"
                                bgColor="#FFFFFF"
                            />
                        </div>

                        {/* Código de Barras */}
                        <div className="flex-1 flex flex-col items-center">
                            <div className="text-[7px] text-gray-600 mb-0.5">Código de Barras</div>
                            <div className="w-full flex justify-center">
                                {renderBarcode(barcodeValue, 1.2, 35, 10)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rodapé com endereço da empresa (se disponível) */}
                {product.company_address && (
                    <div className="mt-1 pt-1 border-t border-gray-200">
                        <div className="text-[6px] text-gray-500 text-center leading-tight">
                            {product.company_address}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return null;
});

LabelPreview.displayName = 'LabelPreview';
