import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileCode, Search, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { sefazService } from '@/services/sefazService';
import { toast } from '@/hooks/use-toast';

interface SefazImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImportXML: (xml: string, chave: string) => void;
    companyId: string;
    userId?: string;
}

export function SefazImportModal({ open, onOpenChange, onImportXML, companyId, userId }: SefazImportModalProps) {
    const [activeTab, setActiveTab] = useState<'chave' | 'xml' | 'dfe'>('chave');
    const [chave, setChave] = useState('');
    const [xmlContent, setXmlContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [consultando, setConsultando] = useState(false);
    const [xmlFile, setXmlFile] = useState<File | null>(null);

    const handleConsultarSefaz = async () => {
        if (!chave || chave.length !== 44) {
            toast({
                title: 'Erro',
                description: 'Chave de acesso deve ter 44 dígitos',
                variant: 'destructive',
            });
            return;
        }

        setConsultando(true);
        try {
            // Consultar situação na SEFAZ
            const consulta = await sefazService.consultarSituacao(chave, companyId, userId);
            
            if (!consulta.success) {
                throw new Error(consulta.erro || 'Erro ao consultar SEFAZ');
            }

            if (consulta.status !== 'autorizado') {
                toast({
                    title: 'Atenção',
                    description: `Nota fiscal com status: ${consulta.status}`,
                    variant: 'destructive',
                });
                return;
            }

            // Baixar XML
            const xml = await sefazService.baixarXML(chave, companyId, userId);
            
            // Salvar XML no banco
            await sefazService.salvarXML(chave, xml, 'entrada', companyId);
            
            toast({
                title: 'Sucesso',
                description: 'XML baixado com sucesso!',
            });

            onImportXML(xml, chave);
            onOpenChange(false);
            setChave('');
        } catch (error: any) {
            toast({
                title: 'Erro',
                description: error.message || 'Erro ao consultar SEFAZ',
                variant: 'destructive',
            });
        } finally {
            setConsultando(false);
        }
    };

    const handleUploadXML = async () => {
        if (!xmlFile && !xmlContent.trim()) {
            toast({
                title: 'Erro',
                description: 'Selecione um arquivo XML ou cole o conteúdo',
                variant: 'destructive',
            });
            return;
        }

        setLoading(true);
        try {
            let xml = xmlContent;
            
            if (xmlFile) {
                xml = await xmlFile.text();
            }

            // Validar XML básico
            if (!xml.includes('<NFe') && !xml.includes('<nfe')) {
                throw new Error('Arquivo XML inválido');
            }

            // Extrair chave do XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, 'text/xml');
            const infNFe = xmlDoc.getElementsByTagName('infNFe')[0] || xmlDoc.querySelector('*[local-name()="infNFe"]');
            
            if (!infNFe) {
                throw new Error('XML inválido: tag infNFe não encontrada');
            }

            const chaveFromXML = infNFe.getAttribute('Id')?.replace('NFe', '') || '';
            
            if (!chaveFromXML || chaveFromXML.length !== 44) {
                throw new Error('Chave de acesso inválida no XML');
            }

            // Salvar XML no banco
            await sefazService.salvarXML(chaveFromXML, xml, 'entrada', companyId);

            toast({
                title: 'Sucesso',
                description: 'XML importado com sucesso!',
            });

            onImportXML(xml, chaveFromXML);
            onOpenChange(false);
            setXmlContent('');
            setXmlFile(null);
        } catch (error: any) {
            toast({
                title: 'Erro',
                description: error.message || 'Erro ao importar XML',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.name.endsWith('.xml')) {
                toast({
                    title: 'Erro',
                    description: 'Selecione um arquivo XML',
                    variant: 'destructive',
                });
                return;
            }
            setXmlFile(file);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Importar XML / Consultar SEFAZ</DialogTitle>
                    <DialogDescription>
                        Importe um XML de nota fiscal ou consulte diretamente na SEFAZ
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="chave">Por Chave (SEFAZ)</TabsTrigger>
                        <TabsTrigger value="xml">Upload XML</TabsTrigger>
                        <TabsTrigger value="dfe">Distribuição DF-e</TabsTrigger>
                    </TabsList>

                    <TabsContent value="chave" className="space-y-4 mt-4">
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Digite a chave de acesso da nota fiscal (44 dígitos) para consultar na SEFAZ e baixar o XML automaticamente.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label>Chave de Acesso (44 dígitos)</Label>
                            <Input
                                placeholder="00000000000000000000000000000000000000000000"
                                value={chave}
                                onChange={(e) => setChave(e.target.value.replace(/\D/g, ''))}
                                maxLength={44}
                                className="font-mono"
                            />
                        </div>

                        <Button
                            onClick={handleConsultarSefaz}
                            disabled={chave.length !== 44 || consultando}
                            className="w-full"
                        >
                            {consultando ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Consultando SEFAZ...
                                </>
                            ) : (
                                <>
                                    <Search className="w-4 h-4 mr-2" />
                                    Consultar e Baixar XML
                                </>
                            )}
                        </Button>
                    </TabsContent>

                    <TabsContent value="xml" className="space-y-4 mt-4">
                        <Alert>
                            <FileCode className="h-4 w-4" />
                            <AlertDescription>
                                Selecione um arquivo XML ou cole o conteúdo do XML da nota fiscal.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label>Arquivo XML</Label>
                            <Input
                                type="file"
                                accept=".xml"
                                onChange={handleFileSelect}
                            />
                            {xmlFile && (
                                <p className="text-sm text-muted-foreground">
                                    Arquivo selecionado: {xmlFile.name}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Ou cole o conteúdo do XML</Label>
                            <textarea
                                className="w-full min-h-[200px] p-2 border rounded-md font-mono text-xs"
                                placeholder="Cole o conteúdo do XML aqui..."
                                value={xmlContent}
                                onChange={(e) => setXmlContent(e.target.value)}
                            />
                        </div>

                        <Button
                            onClick={handleUploadXML}
                            disabled={(!xmlFile && !xmlContent.trim()) || loading}
                            className="w-full"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Importando...
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4 mr-2" />
                                    Importar XML
                                </>
                            )}
                        </Button>
                    </TabsContent>

                    <TabsContent value="dfe" className="space-y-4 mt-4">
                        <DistribuicaoDfeTab
                            companyId={companyId}
                            userId={userId}
                            onSelectNote={(xml, chave) => {
                                onImportXML(xml, chave);
                                onOpenChange(false);
                            }}
                        />
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DistribuicaoDfeTab({ companyId, userId, onSelectNote }: {
    companyId: string;
    userId?: string;
    onSelectNote: (xml: string, chave: string) => void;
}) {
    const [loading, setLoading] = useState(false);
    const [notas, setNotas] = useState<any[]>([]);
    const [cnpj, setCnpj] = useState('');

    const handleBuscarNotas = async () => {
        if (!cnpj || cnpj.length < 14) {
            toast({
                title: 'Erro',
                description: 'CNPJ inválido',
                variant: 'destructive',
            });
            return;
        }

        setLoading(true);
        try {
            // Buscar configuração fiscal para pegar último NSU
            const config = await sefazService.getFiscalConfig(companyId);
            const ultimoNSU = config?.ultimo_nsu || '0';

            const response = await sefazService.buscarNotasPorCNPJ(cnpj, ultimoNSU, companyId, userId);
            
            if (!response.success) {
                throw new Error(response.erro || 'Erro ao buscar notas');
            }

            setNotas(response.notas);
            
            if (response.notas.length === 0) {
                toast({
                    title: 'Informação',
                    description: 'Nenhuma nota nova encontrada',
                });
            }
        } catch (error: any) {
            toast({
                title: 'Erro',
                description: error.message || 'Erro ao buscar notas',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleImportarNota = async (chave: string) => {
        try {
            const xmlData = await sefazService.buscarXML(chave, companyId);
            if (xmlData) {
                onSelectNote(xmlData.xml, chave);
            } else {
                // Se não estiver salvo, baixar da SEFAZ
                const xml = await sefazService.baixarXML(chave, companyId, userId);
                onSelectNote(xml, chave);
            }
        } catch (error: any) {
            toast({
                title: 'Erro',
                description: error.message || 'Erro ao importar nota',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="space-y-4">
            <Alert>
                <Search className="h-4 w-4" />
                <AlertDescription>
                    Busque todas as notas fiscais emitidas para o seu CNPJ na SEFAZ.
                </AlertDescription>
            </Alert>

            <div className="space-y-2">
                <Label>CNPJ da Empresa</Label>
                <Input
                    placeholder="00000000000000"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value.replace(/\D/g, ''))}
                    maxLength={14}
                />
            </div>

            <Button
                onClick={handleBuscarNotas}
                disabled={cnpj.length < 14 || loading}
                className="w-full"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Buscando...
                    </>
                ) : (
                    <>
                        <Search className="w-4 h-4 mr-2" />
                        Buscar Notas
                    </>
                )}
            </Button>

            {notas.length > 0 && (
                <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                    <div className="p-2 bg-muted font-semibold text-sm">
                        {notas.length} nota(s) encontrada(s)
                    </div>
                    <div className="divide-y">
                        {notas.map((nota, index) => (
                            <div key={index} className="p-4 hover:bg-muted/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold">
                                            {nota.numero} / {nota.serie}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {nota.emitente_razao}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(nota.data_emissao).toLocaleDateString('pt-BR')} - {nota.chave.substring(0, 20)}...
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => handleImportarNota(nota.chave)}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Importar
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

