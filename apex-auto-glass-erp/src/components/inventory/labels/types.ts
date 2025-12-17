
export type LabelModel = 'thermal_40x30' | 'thermal_60x40' | 'a4_48' | 'custom' | 'standard';

export interface LabelConfig {
    model: LabelModel;
    quantity: number;
    showName: boolean;
    showBarcode: boolean;
    showSku: boolean;
    showPrice: boolean;
    showBatch: boolean; // Lote
    showExpiry: boolean; // Validade
    // Custom fields
    showCategory?: boolean;
    showLocation?: boolean;
    showBrand?: boolean;
    showWeight?: boolean;
    showQtyBox?: boolean;
}

export interface ProductData {
    id: string;
    name: string;
    internal_code: string; // SKU
    manufacturer_code?: string;
    barcode?: string; // EAN
    sale_price: number;
    batch?: string;
    expiry_date?: string;
    category?: string;
    location?: string;
    brand?: string;
    weight?: string;
    quantity_per_box?: number;
    company_name?: string; // Nome da empresa
    company_address?: string; // Endereço da empresa
    description?: string; // Descrição do produto
}

export type PalletLabelModel = 'thermal_100x50' | 'thermal_100x80' | 'thermal_150x100' | 'standard';

export interface PalletLabelConfig {
    model: PalletLabelModel;
    quantity: number;
}

export interface PalletData {
    id?: string;
    pallet_code?: string; // Código da palete (opcional)
    product_id: string;
    product_name: string;
    internal_code: string; // SKU
    barcode?: string;
    location_street?: string; // Rua
    location_building?: string; // Prédio
    location_apartment?: string; // Nível
    location?: string; // JSON string com location completa
    company_name?: string; // Nome da empresa
}
