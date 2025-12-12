import { OFXTransaction, OFXImportReport } from '../types/ofx';
import { supabase } from '@/integrations/supabase/client';

export const ofxService = {
    /**
     * Parses an OFX file content string into a structured report.
     */
    async parseAndProcess(fileContent: string): Promise<OFXImportReport> {
        const transactions: OFXTransaction[] = [];
        const alerts: string[] = [];

        try {
            // 1. Basic Parsing (Regex-based for simplicity and robustness against bad SGML)
            // Extract BankTranList
            const bankTranListMatch = fileContent.match(/<BANKTRANLIST>([\s\S]*?)<\/BANKTRANLIST>/i);
            if (!bankTranListMatch) {
                throw new Error('Lista de transações não encontrada (BANKTRANLIST).');
            }

            const transactionBlock = bankTranListMatch[1];
            // Split by STMTTRN
            const rawTransactions = transactionBlock.split(/<STMTTRN>/i).slice(1); // First element is empty or garbage before first tag

            rawTransactions.forEach((raw, index) => {
                const typeMatch = raw.match(/<TRNTYPE>(.*?)(\r|\n|<)/i);
                const dateMatch = raw.match(/<DTPOSTED>(.*?)(\r|\n|<)/i);
                const amountMatch = raw.match(/<TRNAMT>(.*?)(\r|\n|<)/i);
                const idMatch = raw.match(/<FITID>(.*?)(\r|\n|<)/i);
                const memoMatch = raw.match(/<MEMO>(.*?)(\r|\n|<)/i);
                // NAME is often used for description in OFX
                const nameMatch = raw.match(/<NAME>(.*?)(\r|\n|<)/i);

                if (idMatch && dateMatch && amountMatch) {
                    const amount = parseFloat(amountMatch[1].replace(',', '.'));
                    const dateStr = dateMatch[1].substring(0, 8); // YYYYMMDD
                    const year = parseInt(dateStr.substring(0, 4));
                    const month = parseInt(dateStr.substring(4, 6)) - 1;
                    const day = parseInt(dateStr.substring(6, 8));
                    const date = new Date(year, month, day);

                    const typeStr = typeMatch ? typeMatch[1].trim().toUpperCase() : 'OTHER';
                    const type = amount > 0 ? 'CREDIT' : 'DEBIT'; // Trust amount sign more than type for basic classification

                    const description = (nameMatch ? nameMatch[1].trim() : '') + (memoMatch ? ' - ' + memoMatch[1].trim() : '');

                    transactions.push({
                        id: idMatch[1].trim(),
                        type,
                        date,
                        amount,
                        description: description.replace(/&amp;/g, '&').trim(),
                        status: 'novo', // Default
                        originalIndex: index
                    });
                }
            });

            // 2. Classification
            const classifiedTransactions = this.classifyTransactions(transactions);

            // 3. Duplication Detection
            const uniqueTransactions = await this.detectDuplicates(classifiedTransactions);

            // 4. Match Finding
            const finalTransactions = await this.findMatches(uniqueTransactions);

            // 5. Generate Report
            return this.generateReport(finalTransactions, fileContent);

        } catch (error: any) {
            console.error('OFX Parse Error:', error);
            return {
                totalEntries: 0,
                totalExits: 0,
                finalBalance: 0,
                processedCount: 0,
                duplicatesCount: 0,
                newCount: 0,
                transactions: [],
                isValid: false,
                alerts: ['Erro ao ler arquivo: ' + error.message]
            };
        }
    },

    async reconcileTransaction(transaction: OFXTransaction, accountId: string, userId: string) {
        // 1. If matched, update the related payable/receivable
        if (transaction.matchType === 'payable' && transaction.matchId) {
            const { error } = await supabase
                .from('accounts_payable' as any)
                .update({
                    status: 'pago_total',
                    paid_value: Math.abs(transaction.amount),
                    paid_at: new Date().toISOString()
                })
                .eq('id', transaction.matchId);
            if (error) throw error;
        } else if (transaction.matchType === 'receivable' && transaction.matchId) {
            const { error } = await supabase
                .from('accounts_receivable' as any)
                .update({
                    status: 'pago_total',
                    paid_value: transaction.amount,
                    paid_at: new Date().toISOString()
                })
                .eq('id', transaction.matchId);
            if (error) throw error;
        }

        // 2. Create Financial Movement
        const { error: moveError } = await supabase
            .from('financial_movements')
            .insert({
                company_id: (await supabase.auth.getUser()).data.user?.user_metadata?.company_id, // This might be tricky if not in context, better pass companyId
                account_id: accountId,
                movement_date: transaction.date.toISOString(),
                movement_type: transaction.type === 'CREDIT' ? 'entrada' : 'saida',
                description: transaction.description,
                value: Math.abs(transaction.amount),
                nature_id: null, // TODO: Map category to nature
                created_by: userId,
                // Link to payable/receivable if matched
                payable_id: transaction.matchType === 'payable' ? transaction.matchId : null,
                receivable_id: transaction.matchType === 'receivable' ? transaction.matchId : null
            });

        if (moveError) throw moveError;

        // 3. Update Reconciliation Item Status (if it exists in DB)
        // This assumes we are reconciling an item that is already saved.
        // If we are reconciling directly from import (before save), this logic might need adjustment.
        // But the requirement says "Lista das transações importadas", so they are likely saved first.

        // We need to find the item by fitid and update it.
        const { error: itemError } = await supabase
            .from('reconciliation_items' as any)
            .update({ is_matched: true, matched_at: new Date().toISOString(), matched_by: userId })
            .eq('fitid', transaction.id);

        if (itemError) throw itemError;

        return true;
    },

    classifyTransactions(transactions: OFXTransaction[]): OFXTransaction[] {
        return transactions.map(t => {
            let category = 'Outros';
            const desc = t.description.toUpperCase();

            if (t.type === 'CREDIT') {
                if (desc.includes('PIX') || desc.includes('TRANSF')) category = 'Recebimento Cliente';
                else if (desc.includes('DEPOSITO') || desc.includes('DEP')) category = 'Entrada';
                else if (desc.includes('RECEBIMENTO')) category = 'Contas a receber';
                else category = 'Receita Diversa';
            } else {
                if (desc.includes('PIX')) category = 'Pagamento';
                else if (desc.includes('TAR') || desc.includes('TAXA') || desc.includes('CESTA')) category = 'Taxas';
                else if (desc.includes('IOF')) category = 'Impostos';
                else if (desc.includes('SAQUE')) category = 'Saque';
                else if (desc.includes('CARTAO')) category = 'Pagamento cartão';
                else if (desc.includes('TED') || desc.includes('DOC')) category = 'Transferência';
                else if (desc.includes('PAGAMENTO')) category = 'Contas a pagar';
                else category = 'Despesa Diversa';
            }

            return { ...t, category, suggestedCategory: category };
        });
    },

    async findMatches(transactions: OFXTransaction[]): Promise<OFXTransaction[]> {
        // Fetch open payables and receivables
        const { data: payables } = await supabase
            .from('accounts_payable' as any)
            .select('id, final_value, description, supplier:suppliers(nome_razao)')
            .eq('status', 'em_aberto');

        const { data: receivables } = await supabase
            .from('accounts_receivable' as any)
            .select('id, net_value, description, customer:customers(name)')
            .eq('status', 'em_aberto');

        return transactions.map(t => {
            if (t.status !== 'novo') return t;

            let matchType: 'payable' | 'receivable' | 'none' = 'none';
            let matchId: string | undefined;
            let matchDescription: string | undefined;

            if (t.type === 'DEBIT') {
                // Look for payable with same value (absolute)
                const match = payables?.find(p => Math.abs(Number(p.final_value) - Math.abs(t.amount)) < 0.01);
                if (match) {
                    matchType = 'payable';
                    matchId = match.id;
                    matchDescription = `Pagamento: ${match.description} (${match.supplier?.nome_razao})`;
                }
            } else if (t.type === 'CREDIT') {
                // Look for receivable with same value
                const match = receivables?.find(r => Math.abs(Number(r.net_value) - t.amount) < 0.01);
                if (match) {
                    matchType = 'receivable';
                    matchId = match.id;
                    matchDescription = `Recebimento: ${match.description} (${match.customer?.name})`;
                }
            }

            return { ...t, matchType, matchId, matchDescription };
        });
    },

    generateFinalJSON(transactions: OFXTransaction[], accountId: string, periodStart?: Date, periodEnd?: Date) {
        return {
            conta_id: accountId,
            periodo: {
                inicio: periodStart?.toISOString() || '',
                fim: periodEnd?.toISOString() || ''
            },
            transacoes: transactions.map(t => ({
                data: t.date.toISOString(),
                descricao: t.description,
                tipo: t.type === 'CREDIT' ? 'credito' : 'debito',
                valor: t.amount,
                categoria_sugerida: t.suggestedCategory,
                identificador_ofx: t.id,
                status: t.status,
                vinculo: {
                    tipo: t.matchType === 'none' ? 'nenhum' : (t.matchType === 'payable' ? 'pagar' : 'receber'),
                    id_referencia: t.matchId || ''
                }
            }))
        };
    },

    async detectDuplicates(transactions: OFXTransaction[]): Promise<OFXTransaction[]> {
        if (transactions.length === 0) return [];

        const fitids = transactions.map(t => t.id);

        // Check database for existing fitids
        const { data: existingItems, error } = await supabase
            .from('reconciliation_items' as any)
            .select('fitid')
            .in('fitid', fitids);

        if (error) {
            console.error('Error checking duplicates:', error);
            return transactions; // Fail safe: assume new if check fails, or maybe flag error?
        }

        const existingSet = new Set(existingItems?.map((i: any) => i.fitid) || []);

        // Also check for duplicates within the file itself
        const seenInFile = new Set<string>();

        return transactions.map(t => {
            if (existingSet.has(t.id)) {
                return { ...t, status: 'conciliado' }; // Already imported/reconciled
            }
            if (seenInFile.has(t.id)) {
                return { ...t, status: 'duplicado' }; // Duplicate in file
            }
            seenInFile.add(t.id);
            return t;
        });
    },

    generateReport(transactions: OFXTransaction[], rawContent: string): OFXImportReport {
        const totalEntries = transactions
            .filter(t => t.type === 'CREDIT')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExits = transactions
            .filter(t => t.type === 'DEBIT')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const duplicatesCount = transactions.filter(t => t.status !== 'novo').length;
        const newCount = transactions.filter(t => t.status === 'novo').length;

        // Try to extract bank info
        const bankIdMatch = rawContent.match(/<BANKID>(.*?)(\r|\n|<)/i);
        const acctIdMatch = rawContent.match(/<ACCTID>(.*?)(\r|\n|<)/i);

        // Try to find dates
        const dates = transactions.map(t => t.date.getTime());
        const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : undefined;
        const maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : undefined;

        return {
            totalEntries,
            totalExits,
            finalBalance: totalEntries - totalExits, // This is just net change, not absolute balance
            processedCount: transactions.length,
            duplicatesCount,
            newCount,
            transactions,
            periodStart: minDate,
            periodEnd: maxDate,
            bankId: bankIdMatch ? bankIdMatch[1].trim() : undefined,
            accountId: acctIdMatch ? acctIdMatch[1].trim() : undefined,
            isValid: transactions.length > 0,
            alerts: []
        };
    },

    async saveTransactions(transactions: OFXTransaction[], accountId: string, companyId: string, userId: string): Promise<{ success: boolean; count: number; error?: string }> {
        try {
            const newTransactions = transactions.filter(t => t.status === 'novo');

            if (newTransactions.length === 0) {
                return { success: true, count: 0 };
            }

            // First, we need to create a reconciliation record if one doesn't exist for this batch/date?
            // Or just insert items linked to a reconciliation?
            // The requirement implies importing for reconciliation. Usually, you create a "BankReconciliation" record first.
            // Let's assume we create a new reconciliation record for this import or add to an existing open one.
            // For simplicity, let's create a new reconciliation record for this import batch.

            const dates = newTransactions.map(t => t.date.getTime());
            const minDate = new Date(Math.min(...dates));

            // Create a reconciliation header
            const { data: reconciliation, error: recError } = await supabase
                .from('bank_reconciliations' as any)
                .insert({
                    company_id: companyId,
                    account_id: accountId,
                    reconciliation_date: minDate.toISOString(), // Use start date of transactions
                    statement_balance: 0, // We don't have this from simple OFX usually unless specific tag
                    system_balance: 0, // To be calculated
                    difference: 0,
                    status: 'pendente',
                    notes: `Importação OFX em ${new Date().toLocaleString()}`,
                    created_by: userId
                })
                .select()
                .single();

            if (recError) throw recError;

            const recId = (reconciliation as any).id;

            // Prepare items
            const itemsToInsert = newTransactions.map(t => ({
                reconciliation_id: recId,
                statement_date: t.date.toISOString(),
                statement_value: t.amount,
                statement_description: t.description,
                fitid: t.id,
                is_matched: false,
                notes: t.category // Store guessed category in notes for now
            }));

            const { error: itemsError } = await supabase
                .from('reconciliation_items' as any)
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            return { success: true, count: newTransactions.length };
        } catch (error: any) {
            console.error('Error saving transactions:', error);
            return { success: false, count: 0, error: error.message };
        }
    }
};
