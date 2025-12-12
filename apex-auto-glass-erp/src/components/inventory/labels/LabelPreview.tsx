import React, { forwardRef } from 'react';
import Barcode from 'react-barcode';
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
        />
    );

    // 40x30mm
    if (model === 'thermal_40x30') {
        return (
            <div ref={ref} className={`bg-white text-black p-1 box-border overflow-hidden flex flex-col items-center justify-center ${className}`} style={{ width: '40mm', height: '30mm', border: '1px solid #ddd' }}>
                {config.showName && (
                    <div className="text-[10px] leading-tight text-center font-bold w-full overflow-hidden max-h-[22px] mb-0.5">
                        {product.name.substring(0, 40)}
                    </div>
                )}

                {config.showBarcode && (product.barcode || product.internal_code) && (
                    <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
                        {renderBarcode(product.barcode || product.internal_code, 1, 25, 10)}
                    </div>
                )}

                <div className="flex justify-between w-full px-1 items-end mt-0.5">
                    {config.showSku && <span className="text-[8px] font-mono">{product.internal_code}</span>}
                    {config.showPrice && <span className="text-[10px] font-bold">{formatCurrency(product.sale_price)}</span>}
                </div>
            </div>
        );
    }

    // 60x40mm
    if (model === 'thermal_60x40') {
        return (
            <div ref={ref} className={`bg-white text-black p-2 box-border overflow-hidden flex flex-col ${className}`} style={{ width: '60mm', height: '40mm', border: '1px solid #ddd' }}>
                {config.showName && (
                    <div className="text-xs font-bold leading-tight mb-1 h-[2.4em] overflow-hidden">
                        {product.name}
                    </div>
                )}

                <div className="flex-1 flex flex-col items-center justify-center w-full my-1">
                    {config.showBarcode && (product.barcode || product.internal_code) && (
                        renderBarcode(product.barcode || product.internal_code, 1.5, 35, 12)
                    )}
                </div>

                <div className="flex justify-between items-end w-full mt-1">
                    <div className="flex flex-col">
                        {config.showSku && <span className="text-[9px] font-mono">SKU: {product.internal_code}</span>}
                        {config.showBatch && product.batch && <span className="text-[8px]">Lote: {product.batch}</span>}
                    </div>
                    <div className="flex flex-col items-end">
                        {config.showPrice && <span className="text-sm font-bold">{formatCurrency(product.sale_price)}</span>}
                        {config.showExpiry && product.expiry_date && <span className="text-[8px]">Val: {product.expiry_date}</span>}
                    </div>
                </div>
            </div>
        );
    }

    // Custom Model (Generic fallback for now, similar to 60x40 but with more fields)
    if (model === 'custom') {
        return (
            <div ref={ref} className={`bg-white text-black p-2 box-border overflow-hidden flex flex-col ${className}`} style={{ width: '60mm', height: '40mm', border: '1px solid #ddd' }}>
                {config.showName && <div className="text-xs font-bold leading-tight mb-1">{product.name}</div>}

                <div className="grid grid-cols-2 gap-1 text-[8px]">
                    {config.showCategory && product.category && <div>Cat: {product.category}</div>}
                    {config.showBrand && product.brand && <div>Marca: {product.brand}</div>}
                    {config.showLocation && product.location && <div>Loc: {product.location}</div>}
                    {config.showWeight && product.weight && <div>Peso: {product.weight}</div>}
                </div>

                <div className="flex-1 flex items-center justify-center w-full my-1">
                    {config.showBarcode && (product.barcode || product.internal_code) && (
                        renderBarcode(product.barcode || product.internal_code, 1.2, 30, 10)
                    )}
                </div>

                <div className="flex justify-between items-end w-full">
                    {config.showSku && <span className="text-[9px] font-mono">{product.internal_code}</span>}
                    {config.showPrice && <span className="text-sm font-bold">{formatCurrency(product.sale_price)}</span>}
                </div>
            </div>
        );
    }

    return null;
});

LabelPreview.displayName = 'LabelPreview';
