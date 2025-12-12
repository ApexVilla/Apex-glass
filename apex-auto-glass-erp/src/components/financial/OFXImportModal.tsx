import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { ofxService } from '@/services/ofxService';
import { OFXImportReport, OFXTransaction } from '@/types/ofx';
import { FinancialAccount } from '@/types/financial';
import { formatCurrency, formatDate } from '@/lib/format';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface OFXImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accounts: FinancialAccount[];
    onSuccess: () => void;
}

export function OFXImportModal({ open, onOpenChange, accounts, onSuccess }: OFXImportModalProps) {
    const { profile } = useAuth();
    const [step, setStep] = useState<'upload' | 'review'>('upload');
    const [selectedAccount, setSelectedAccount] = useState<string>('');
    const [report, setReport] = useState<OFXImportReport | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!selectedAccount) {
            toast({ title: 'Erro', description: 'Selecione uma conta bancária primeiro.', variant: 'destructive' });
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setLoading(true);
        try {
            const content = await file.text();
            const result = await ofxService.parseAndProcess(content);

            if (!result.isValid) {
                toast({ title: 'Erro', description: 'Arquivo OFX inválido ou sem transações.', variant: 'destructive' });
                return;
            }

            setReport(result);
            setStep('review');
        } catch (error) {
            console.error(error);
            toast({ title: 'Erro', description: 'Erro ao processar arquivo.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmImport = async () => {
        if (!report || !selectedAccount || !profile?.company_id || !profile?.id) return;

        setLoading(true);
        try {
            const result = await ofxService.saveTransactions(
                report.transactions,
                selectedAccount,
                profile.company_id,
                profile.id
            );

            if (result.success) {
                toast({
                    title: 'Sucesso',
                    description: `${result.count} transações importadas com sucesso!`
                });
                onSuccess();
                onOpenChange(false);
                resetModal();
            } else {
                toast({ title: 'Erro', description: result.error || 'Erro ao salvar transações.', variant: 'destructive' });
            }
        } catch (error) {
            console.error(error);
            toast({ title: 'Erro', description: 'Erro ao importar.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const resetModal = () => {
        setStep('upload');
        setReport(null);
        setSelectedAccount('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) resetModal();
            onOpenChange(val);
        }}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Importar Extrato Bancário (OFX)</DialogTitle>
                    <DialogDescription>
                        Importe arquivos OFX para conciliação bancária automática.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden p-1">
                    {step === 'upload' ? (
                        <div className="space-y-6 py-4">
                            <div className="space-y-2">
                                <Label>Conta Bancária</Label>
                                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione a conta destino" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts.filter(a => a.type === 'banco').map(account => (
                                            <SelectItem key={account.id} value={account.id}>
                                                {account.name} ({account.bank_name})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}>
                                <Upload className="w-10 h-10 text-muted-foreground mb-4" />
                                <h3 className="font-medium text-lg mb-1">Clique para selecionar o arquivo</h3>
                                <p className="text-sm text-muted-foreground">Suporta apenas arquivos .OFX</p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".ofx"
                                    onChange={handleFileChange}
                                />
                            </div>

                            <Alert>
                                <FileText className="h-4 w-4" />
                                <AlertTitle>Instruções</AlertTitle>
                                <AlertDescription>
                                    O sistema irá ler o arquivo, identificar duplicidades e categorizar automaticamente as transações.
                                </AlertDescription>
                            </Alert>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full space-y-4">
                            {/* Resumo */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-muted/40 p-3 rounded-lg">
                                    <p className="text-xs text-muted-foreground">Total Entradas</p>
                                    <p className="text-lg font-bold text-green-600">{formatCurrency(report?.totalEntries || 0)}</p>
                                </div>
                                <div className="bg-muted/40 p-3 rounded-lg">
                                    <p className="text-xs text-muted-foreground">Total Saídas</p>
                                    <p className="text-lg font-bold text-red-600">{formatCurrency(report?.totalExits || 0)}</p>
                                </div>
                                <div className="bg-muted/40 p-3 rounded-lg">
                                    <p className="text-xs text-muted-foreground">Novos Lançamentos</p>
                                    <p className="text-lg font-bold text-blue-600">{report?.newCount}</p>
                                </div>
                                <div className="bg-muted/40 p-3 rounded-lg">
                                    <p className="text-xs text-muted-foreground">Duplicados</p>
                                    <p className="text-lg font-bold text-orange-600">{report?.duplicatesCount}</p>
                                </div>
                            </div>

                            {/* Lista */}
                            <div className="border rounded-md flex-1 overflow-hidden">
                                <ScrollArea className="h-[400px]">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Data</TableHead>
                                                <TableHead>Descrição</TableHead>
                                                <TableHead>Categoria Sugerida</TableHead>
                                                <TableHead className="text-right">Valor</TableHead>
                                                <TableHead className="text-center">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {report?.transactions.map((t, idx) => (
                                                <TableRow key={idx} className={t.status !== 'novo' ? 'opacity-50 bg-muted/30' : ''}>
                                                    <TableCell>{formatDate(t.date)}</TableCell>
                                                    <TableCell className="font-medium">{t.description}</TableCell>
                                                    <TableCell>{t.category}</TableCell>
                                                    <TableCell className={`text-right font-bold ${t.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {t.type === 'DEBIT' ? '-' : ''}{formatCurrency(t.amount)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {t.status === 'novo' && <Badge className="bg-blue-500">Novo</Badge>}
                                                        {t.status === 'duplicado' && <Badge variant="outline" className="text-orange-500 border-orange-500">Duplicado</Badge>}
                                                        {t.status === 'conciliado' && <Badge variant="secondary">Conciliado</Badge>}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {step === 'review' && (
                        <Button variant="outline" onClick={() => setStep('upload')} disabled={loading}>
                            Voltar
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    {step === 'review' && (
                        <Button onClick={handleConfirmImport} disabled={loading || (report?.newCount === 0)}>
                            {loading ? 'Importando...' : `Confirmar Importação (${report?.newCount})`}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
