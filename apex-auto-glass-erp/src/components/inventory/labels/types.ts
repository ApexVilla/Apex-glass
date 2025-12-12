
export type LabelModel = 'thermal_40x30' | 'thermal_60x40' | 'a4_48' | 'custom';

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
}
