import React, { forwardRef } from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { PalletLabelConfig, PalletData } from './types';

interface PalletLabelPreviewProps {
    config: PalletLabelConfig;
    pallet: PalletData;
    className?: string;
}

// Função para parsear location
const parseLocation = (location: string | null | undefined) => {
    if (!location) return { street: '', building: '', apartment: '' };
    try {
        const parsed = JSON.parse(location);
        return {
            street: parsed.street || parsed.rua || '',
            building: parsed.building || parsed.predio || '',
            apartment: parsed.apartment || parsed.apartamento || parsed.nivel || ''
        };
    } catch {
        return { street: location, building: '', apartment: '' };
    }
};

// Componente de mapa visual simplificado
const LocationMap = ({ street, building, apartment }: { street?: string; building?: string; apartment?: string }) => {
    const hasLocation = street || building || apartment;
    
    if (!hasLocation) {
        return (
            <div className="flex items-center justify-center h-12 border border-gray-300 rounded">
                <span className="text-[8px] text-gray-400">Sem localização</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-0.5">
            {/* Representação visual simplificada */}
            <div className="flex items-center justify-center gap-1 text-[7px] font-mono">
                {street && (
                    <div className="px-1 py-0.5 border border-black rounded">
                        R:{street.substring(0, 3)}
                    </div>
                )}
                {building && (
                    <div className="px-1 py-0.5 border border-black rounded">
                        P:{building.substring(0, 3)}
                    </div>
                )}
                {apartment && (
                    <div className="px-1 py-0.5 border border-black rounded">
                        N:{apartment.substring(0, 3)}
                    </div>
                )}
            </div>
            {/* Representação esquemática */}
            <div className="flex items-center justify-center gap-0.5">
                {street && (
                    <div className="w-4 h-3 border border-black bg-white flex items-center justify-center">
                        <span className="text-[6px] font-bold">{street.substring(0, 1)}</span>
                    </div>
                )}
                {building && (
                    <div className="w-4 h-3 border border-black bg-white flex items-center justify-center">
                        <span className="text-[6px] font-bold">{building.substring(0, 2)}</span>
                    </div>
                )}
                {apartment && (
                    <div className="w-4 h-3 border border-black bg-white flex items-center justify-center">
                        <span className="text-[6px] font-bold">{apartment.substring(0, 2)}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export const PalletLabelPreview = forwardRef<HTMLDivElement, PalletLabelPreviewProps>(
    ({ config, pallet, className }, ref) => {
        const { model } = config;
        
        // Parsear localização
        const locationData = pallet.location 
            ? parseLocation(pallet.location)
            : {
                street: pallet.location_street || '',
                building: pallet.location_building || '',
                apartment: pallet.location_apartment || ''
            };

        // Formatar endereço logístico
        const formatLocation = () => {
            const parts = [
                locationData.street && `Rua: ${locationData.street}`,
                locationData.building && `Prédio: ${locationData.building}`,
                locationData.apartment && `Nível: ${locationData.apartment}`
            ].filter(Boolean);
            
            if (parts.length === 0) return 'Loc: Não definido';
            return parts.join(' | ');
        };

        const compactLocation = () => {
            const parts = [
                locationData.street,
                locationData.building,
                locationData.apartment
            ].filter(Boolean);
            
            if (parts.length === 0) return 'N/A';
            return parts.join('-');
        };

        // Helper para renderizar código de barras
        const renderBarcode = (value: string, width: number, height: number, fontSize: number = 14) => (
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

        // Modelo 100x50mm (padrão WMS)
        if (model === 'thermal_100x50') {
            return (
                <div 
                    ref={ref} 
                    className={`bg-white text-black box-border overflow-hidden flex flex-col ${className}`} 
                    style={{ 
                        width: '100mm', 
                        height: '50mm',
                        padding: '3mm',
                        fontFamily: 'monospace'
                    }}
                >
                    {/* Cabeçalho: Nome do Produto */}
                    <div className="mb-1">
                        <div className="text-[11px] font-bold leading-tight mb-0.5 line-clamp-2">
                            {pallet.product_name.substring(0, 50)}
                        </div>
                        <div className="text-[9px] font-mono text-gray-700">
                            SKU: {pallet.internal_code}
                        </div>
                    </div>

                    {/* Código de Barras (Central e Prioridade) */}
                    <div className="flex-1 flex items-center justify-center my-1 min-h-[25mm]">
                        {pallet.barcode || pallet.internal_code ? (
                            renderBarcode(
                                pallet.barcode || pallet.internal_code, 
                                1.2, 
                                30, 
                                12
                            )
                        ) : (
                            <div className="text-[8px] text-gray-400">Sem código de barras</div>
                        )}
                    </div>

                    {/* Endereço Logístico e Mapa */}
                    <div className="mt-1 border-t border-gray-300 pt-1">
                        <div className="flex items-start justify-between gap-2">
                            {/* Endereço textual */}
                            <div className="flex-1">
                                <div className="text-[8px] font-bold mb-0.5">LOCALIZAÇÃO</div>
                                <div className="text-[9px] font-mono leading-tight">
                                    {formatLocation()}
                                </div>
                                {pallet.pallet_code && (
                                    <div className="text-[8px] text-gray-600 mt-0.5">
                                        Palete: {pallet.pallet_code}
                                    </div>
                                )}
                            </div>
                            
                            {/* Mapa visual */}
                            <div className="flex-shrink-0">
                                <LocationMap 
                                    street={locationData.street}
                                    building={locationData.building}
                                    apartment={locationData.apartment}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Rodapé: Identificação do Sistema */}
                    <div className="mt-1 pt-1 border-t border-gray-200">
                        <div className="text-[6px] text-gray-500 text-center">
                            {pallet.company_name || 'APEX GLASS ERP'} | {compactLocation()}
                        </div>
                    </div>
                </div>
            );
        }

        // Modelo 100x80mm (maior, mais informações)
        if (model === 'thermal_100x80') {
            return (
                <div 
                    ref={ref} 
                    className={`bg-white text-black box-border overflow-hidden flex flex-col ${className}`} 
                    style={{ 
                        width: '100mm', 
                        height: '80mm',
                        padding: '4mm',
                        fontFamily: 'monospace'
                    }}
                >
                    {/* Cabeçalho: Nome do Produto */}
                    <div className="mb-2">
                        <div className="text-[13px] font-bold leading-tight mb-1">
                            {pallet.product_name.substring(0, 60)}
                        </div>
                        <div className="text-[10px] font-mono text-gray-700">
                            SKU: {pallet.internal_code}
                        </div>
                    </div>

                    {/* Código de Barras (Central e Prioridade) */}
                    <div className="flex-1 flex items-center justify-center my-2 min-h-[35mm]">
                        {pallet.barcode || pallet.internal_code ? (
                            renderBarcode(
                                pallet.barcode || pallet.internal_code, 
                                1.5, 
                                40, 
                                14
                            )
                        ) : (
                            <div className="text-[9px] text-gray-400">Sem código de barras</div>
                        )}
                    </div>

                    {/* Endereço Logístico Detalhado */}
                    <div className="mt-2 border-t-2 border-black pt-2">
                        <div className="text-[10px] font-bold mb-1.5">ENDEREÇO LOGÍSTICO</div>
                        <div className="grid grid-cols-3 gap-1 mb-2">
                            {locationData.street && (
                                <div>
                                    <div className="text-[7px] text-gray-600">RUA</div>
                                    <div className="text-[11px] font-bold font-mono">{locationData.street}</div>
                                </div>
                            )}
                            {locationData.building && (
                                <div>
                                    <div className="text-[7px] text-gray-600">PRÉDIO</div>
                                    <div className="text-[11px] font-bold font-mono">{locationData.building}</div>
                                </div>
                            )}
                            {locationData.apartment && (
                                <div>
                                    <div className="text-[7px] text-gray-600">NÍVEL</div>
                                    <div className="text-[11px] font-bold font-mono">{locationData.apartment}</div>
                                </div>
                            )}
                        </div>
                        
                        {pallet.pallet_code && (
                            <div className="text-[9px] font-mono mb-1">
                                <span className="text-gray-600">Palete:</span> {pallet.pallet_code}
                            </div>
                        )}
                    </div>

                    {/* Mapa Visual */}
                    <div className="mt-2 border-t border-gray-300 pt-2">
                        <div className="text-[8px] font-bold mb-1 text-center">MAPA DE LOCALIZAÇÃO</div>
                        <div className="flex justify-center">
                            <LocationMap 
                                street={locationData.street}
                                building={locationData.building}
                                apartment={locationData.apartment}
                            />
                        </div>
                    </div>

                    {/* Rodapé: Identificação do Sistema */}
                    <div className="mt-2 pt-1 border-t border-gray-200">
                        <div className="text-[7px] text-gray-500 text-center">
                            {pallet.company_name || 'APEX GLASS ERP'} | Localização: {compactLocation()}
                        </div>
                    </div>
                </div>
            );
        }

        // Modelo 150x100mm (máximo, todas as informações)
        if (model === 'thermal_150x100') {
            return (
                <div 
                    ref={ref} 
                    className={`bg-white text-black box-border overflow-hidden flex flex-col ${className}`} 
                    style={{ 
                        width: '150mm', 
                        height: '100mm',
                        padding: '5mm',
                        fontFamily: 'monospace'
                    }}
                >
                    {/* Cabeçalho: Nome do Produto */}
                    <div className="mb-3">
                        <div className="text-[16px] font-bold leading-tight mb-1">
                            {pallet.product_name}
                        </div>
                        <div className="text-[12px] font-mono text-gray-700">
                            SKU: {pallet.internal_code}
                        </div>
                    </div>

                    {/* Código de Barras (Central e Prioridade) */}
                    <div className="flex-1 flex items-center justify-center my-3 min-h-[45mm]">
                        {pallet.barcode || pallet.internal_code ? (
                            renderBarcode(
                                pallet.barcode || pallet.internal_code, 
                                2, 
                                50, 
                                16
                            )
                        ) : (
                            <div className="text-[10px] text-gray-400">Sem código de barras</div>
                        )}
                    </div>

                    {/* Endereço Logístico Detalhado */}
                    <div className="mt-3 border-t-2 border-black pt-3">
                        <div className="text-[12px] font-bold mb-2">ENDEREÇO LOGÍSTICO</div>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                            {locationData.street && (
                                <div className="border border-gray-300 p-2">
                                    <div className="text-[9px] text-gray-600 mb-1">RUA</div>
                                    <div className="text-[14px] font-bold font-mono">{locationData.street}</div>
                                </div>
                            )}
                            {locationData.building && (
                                <div className="border border-gray-300 p-2">
                                    <div className="text-[9px] text-gray-600 mb-1">PRÉDIO</div>
                                    <div className="text-[14px] font-bold font-mono">{locationData.building}</div>
                                </div>
                            )}
                            {locationData.apartment && (
                                <div className="border border-gray-300 p-2">
                                    <div className="text-[9px] text-gray-600 mb-1">NÍVEL</div>
                                    <div className="text-[14px] font-bold font-mono">{locationData.apartment}</div>
                                </div>
                            )}
                        </div>
                        
                        {pallet.pallet_code && (
                            <div className="text-[11px] font-mono mb-2">
                                <span className="text-gray-600">Identificação da Palete:</span> <span className="font-bold">{pallet.pallet_code}</span>
                            </div>
                        )}
                    </div>

                    {/* Mapa Visual Ampliado */}
                    <div className="mt-3 border-t border-gray-300 pt-3">
                        <div className="text-[10px] font-bold mb-2 text-center">MAPA DE LOCALIZAÇÃO</div>
                        <div className="flex justify-center">
                            <LocationMap 
                                street={locationData.street}
                                building={locationData.building}
                                apartment={locationData.apartment}
                            />
                        </div>
                    </div>

                    {/* Rodapé: Identificação do Sistema */}
                    <div className="mt-3 pt-2 border-t border-gray-200">
                        <div className="text-[8px] text-gray-500 text-center">
                            {pallet.company_name || 'APEX GLASS ERP'} - Sistema de Gestão | Localização: {compactLocation()}
                        </div>
                    </div>
                </div>
            );
        }

        // Modelo Standard - Novo formato completo para palete
        if (model === 'standard') {
            const formatLocation = () => {
                const parts = [
                    locationData.street && `Rua: ${locationData.street}`,
                    locationData.building && `Prédio: ${locationData.building}`,
                    locationData.apartment && `Nível: ${locationData.apartment}`
                ].filter(Boolean);
                
                if (parts.length === 0) return 'Não definido';
                return parts.join(' | ');
            };

            const barcodeValue = pallet.barcode || pallet.internal_code;
            const systemName = 'APEX GLASS ERP';

            return (
                <div 
                    ref={ref} 
                    className={`bg-white text-black box-border overflow-hidden flex flex-col ${className}`} 
                    style={{ 
                        width: '100mm', 
                        height: '80mm',
                        padding: '4mm',
                        fontFamily: 'monospace'
                    }}
                >
                    {/* 1. Nome do Sistema */}
                    <div className="mb-1 border-b border-gray-300 pb-1">
                        <div className="text-[10px] font-bold text-center text-gray-700">
                            {systemName}
                        </div>
                    </div>

                    {/* 2. Nome da Empresa */}
                    {pallet.company_name && (
                        <div className="mb-1">
                            <div className="text-[11px] font-bold text-center">
                                {pallet.company_name}
                            </div>
                        </div>
                    )}

                    {/* 3. SKU */}
                    <div className="mb-1 border-t border-gray-200 pt-1">
                        <div className="text-[8px] text-gray-600 mb-0.5">SKU:</div>
                        <div className="text-[12px] font-bold font-mono">
                            {pallet.internal_code}
                        </div>
                    </div>

                    {/* 4. Descrição do Produto */}
                    <div className="mb-2 border-t border-gray-200 pt-1 flex-1">
                        <div className="text-[8px] text-gray-600 mb-0.5">Descrição:</div>
                        <div className="text-[10px] font-medium leading-tight line-clamp-3">
                            {pallet.product_name}
                        </div>
                    </div>

                    {/* 5. Endereço (conforme está no sistema) */}
                    <div className="mb-2 border-t border-gray-200 pt-1">
                        <div className="text-[8px] text-gray-600 mb-0.5">Endereço:</div>
                        <div className="text-[9px] font-mono leading-tight">
                            {formatLocation()}
                        </div>
                        {pallet.pallet_code && (
                            <div className="text-[8px] text-gray-600 mt-0.5">
                                Palete: {pallet.pallet_code}
                            </div>
                        )}
                    </div>

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
                </div>
            );
        }

        return null;
    }
);

PalletLabelPreview.displayName = 'PalletLabelPreview';

