
export interface OFXTransaction {
    id: string; // fitid
    type: 'CREDIT' | 'DEBIT' | 'OTHER';
    date: Date;
    amount: number;
    description: string;
    memo?: string;
    // Fields for internal use
    category?: string;
    status: 'novo' | 'duplicado' | 'conciliado';
    originalIndex?: number; // To maintain order
    // New fields for matching
    suggestedCategory?: string;
    matchType?: 'payable' | 'receivable' | 'none';
    matchId?: string;
    matchDescription?: string;
}

export interface OFXImportReport {
    totalEntries: number;
    totalExits: number;
    finalBalance: number;
    processedCount: number;
    duplicatesCount: number;
    newCount: number;
    transactions: OFXTransaction[];
    periodStart?: Date;
    periodEnd?: Date;
    bankId?: string;
    accountId?: string;
    isValid: boolean;
    alerts: string[];
}
