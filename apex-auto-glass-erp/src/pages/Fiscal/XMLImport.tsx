import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    Upload, 
    FileText, 
    CheckCircle2, 
    XCircle, 
    AlertTriangle, 
    Loader2,
    Download,
    Save,
    Eye,
    FileCode
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/common/PageHeader';

interface ValidationError {
    type: 'error' | 'warning' | 'info';
    field: string;
    message: string;
    originalValue?: any;
    correctedValue?: any;
}

interface ValidationReport {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
    info: ValidationError[];
    corrections: ValidationError[];
    summary: {
        totalErrors: number;
        totalWarnings: number;
        totalCorrections: number;
    };
}

interface ParsedInvoice {
    type: 'nfe' | 'nfse';
    direction: 'entrada' | 'saida';
    invoiceType: 'compra' | 'venda' | 'devolucao' | 'complementar';
    chaveAcesso?: string;
    numeroNota: string;
    serie: string;
    dataEmissao: string;
    dataEntrada?: string;
    modeloDocumento: string;
    naturezaOperacao: string;
    cUF?: string;
    cNF?: string;
    emitente: {
        cnpj: string;
        razaoSocial: string;
        nomeFantasia?: string;
        inscricaoEstadual?: string;
        endereco?: {
            logradouro?: string;
            numero?: string;
            bairro?: string;
            municipio?: string;
            uf?: string;
            cep?: string;
        };
    };
    destinatario: {
        cpfCnpj: string;
        razaoSocial: string;
        nomeFantasia?: string;
        inscricaoEstadual?: string;
        endereco?: {
            logradouro?: string;
            numero?: string;
            bairro?: string;
            municipio?: string;
            uf?: string;
            cep?: string;
        };
    };
    items: Array<{
        codigo: string;
        descricao: string;
        ncm: string;
        cfop: string;
        cst?: string;
        csosn?: string;
        unidade: string;
        quantidade: number;
        valorUnitario: number;
        valorTotal: number;
        valorDesconto?: number;
        icms?: {
            baseCalculo: number;
            aliquota: number;
            valor: number;
        };
        pis?: {
            baseCalculo: number;
            aliquota: number;
            valor: number;
        };
        cofins?: {
            baseCalculo: number;
            aliquota: number;
            valor: number;
        };
        iss?: {
            baseCalculo: number;
            aliquota: number;
            valor: number;
        };
    }>;
    totais: {
        valorProdutos: number;
        valorServicos: number;
        valorDesconto: number;
        valorFrete: number;
        valorSeguro: number;
        valorOutrasDespesas: number;
        valorICMS: number;
        valorPIS: number;
        valorCOFINS: number;
        valorISS: number;
        valorTotal: number;
    };
    duplicatas?: Array<{
        numero: string;
        vencimento: string;
        valor: number;
    }>;
    rawXml: string;
}

export default function XMLImport() {
    const { profile, company } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [xmlContent, setXmlContent] = useState<string>('');
    const [parsedInvoice, setParsedInvoice] = useState<ParsedInvoice | null>(null);
    const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [activeTab, setActiveTab] = useState<'upload' | 'validation' | 'preview' | 'import'>('upload');

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.xml')) {
            toast({
                title: 'Erro',
                description: 'Por favor, selecione um arquivo XML.',
                variant: 'destructive'
            });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            setXmlContent(content);
            processXML(content);
        };
        reader.readAsText(file);
    };

    const handlePasteXML = () => {
        if (!xmlContent.trim()) {
            toast({
                title: 'Atenção',
                description: 'Cole o conteúdo XML no campo de texto.',
                variant: 'destructive'
            });
            return;
        }
        processXML(xmlContent);
    };

    const processXML = async (xml: string) => {
        setIsProcessing(true);
        setActiveTab('validation');

        try {
            // Detectar tipo de XML - priorizar NFSe
            const isNFSe = xml.includes('EnviarLoteRpsEnvio') || 
                          xml.includes('ConsultarLoteRpsResposta') || 
                          xml.includes('LoteRps') || 
                          xml.includes('InfRps') ||
                          xml.includes('Rps');
            const isNFe = !isNFSe && (xml.includes('<NFe') || xml.includes('infNFe') || xml.includes('NFe xmlns'));

            let parsed: ParsedInvoice | null = null;

            if (isNFSe) {
                parsed = parseNFSeXML(xml);
            } else if (isNFe) {
                parsed = parseNFeXML(xml);
            } else {
                throw new Error('Tipo de XML não reconhecido. Deve ser NFe ou NFSe.');
            }

            if (!parsed) {
                throw new Error('Erro ao processar XML.');
            }

            // Validar e corrigir
            const report = validateAndCorrect(parsed);
            setValidationReport(report);
            setParsedInvoice(parsed);
            setActiveTab('validation');

            if (report.isValid) {
                setActiveTab('preview');
                toast({
                    title: 'Sucesso',
                    description: 'XML processado com sucesso!',
                });
            } else {
                toast({
                    title: 'Atenção',
                    description: `XML processado com ${report.summary.totalErrors} erro(s) e ${report.summary.totalWarnings} aviso(s).`,
                    variant: 'destructive'
                });
            }
        } catch (error: any) {
            console.error('Erro ao processar XML:', error);
            toast({
                title: 'Erro',
                description: error.message || 'Erro ao processar XML.',
                variant: 'destructive'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const parseNFSeXML = (xml: string): ParsedInvoice => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');

        // Verificar erros de parsing
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            throw new Error('XML inválido ou malformado.');
        }

        // Buscar RPS - pode estar em diferentes estruturas
        // Estrutura 1: EnviarLoteRpsEnvio > LoteRps > ListaRps > Rps > InfRps
        // Estrutura 2: Rps > InfRps (direto)
        // Estrutura 3: InfRps (direto)
        
        let rps: Element | null = null;
        let infRps: Element | null = null;
        
        // Tentar estrutura completa primeiro
        const loteRps = doc.querySelector('LoteRps');
        if (loteRps) {
            const listaRps = loteRps.querySelector('ListaRps');
            if (listaRps) {
                rps = listaRps.querySelector('Rps');
                if (rps) {
                    infRps = rps.querySelector('InfRps');
                }
            }
        }
        
        // Se não encontrou, tentar buscar Rps diretamente
        if (!rps) {
            rps = doc.querySelector('Rps');
            if (rps) {
                infRps = rps.querySelector('InfRps');
            }
        }
        
        // Se ainda não encontrou, buscar diretamente InfRps
        if (!infRps) {
            infRps = doc.querySelector('InfRps');
        }

        if (!infRps) {
            throw new Error('InfRps não encontrado no XML. Verifique se o XML é válido. Estrutura esperada: EnviarLoteRpsEnvio > LoteRps > ListaRps > Rps > InfRps');
        }

        const servico = infRps.querySelector('Servico');
        const valores = servico?.querySelector('Valores');
        const prestador = infRps.querySelector('Prestador');
        const tomador = infRps.querySelector('Tomador');
        const identificacaoTomador = tomador?.querySelector('IdentificacaoTomador');
        const cpfCnpj = identificacaoTomador?.querySelector('CpfCnpj');
        const enderecoTomador = tomador?.querySelector('Endereco');

        // Extrair número e série
        const identificacaoRps = infRps.querySelector('IdentificacaoRps');
        const numero = identificacaoRps?.querySelector('Numero')?.textContent || '0';
        const serie = identificacaoRps?.querySelector('Serie')?.textContent || 'A';

        // Extrair datas
        const dataEmissao = infRps.querySelector('DataEmissao')?.textContent || new Date().toISOString();

        // Extrair valores
        const valorServicos = parseFloat(valores?.querySelector('ValorServicos')?.textContent || '0');
        const valorIss = parseFloat(valores?.querySelector('ValorIss')?.textContent || '0');
        const valorPis = parseFloat(valores?.querySelector('ValorPis')?.textContent || '0');
        const valorCofins = parseFloat(valores?.querySelector('ValorCofins')?.textContent || '0');
        const baseCalculo = parseFloat(valores?.querySelector('BaseCalculo')?.textContent || valorServicos.toString());
        const aliquota = parseFloat(valores?.querySelector('Aliquota')?.textContent || '0');

        // Extrair discriminação
        const discriminacao = servico?.querySelector('Discriminacao')?.textContent || 'Serviço prestado';
        const itemListaServico = servico?.querySelector('ItemListaServico')?.textContent || '';
        const codigoCnae = servico?.querySelector('CodigoCnae')?.textContent || '';
        const codigoMunicipio = servico?.querySelector('CodigoMunicipio')?.textContent || '';

        // Extrair dados do prestador
        let cnpjPrestador = prestador?.querySelector('Cnpj')?.textContent || '';
        let inscricaoMunicipalPrestador = prestador?.querySelector('InscricaoMunicipal')?.textContent || '';
        
        // Se não encontrou no prestador, buscar no LoteRps (estrutura EnviarLoteRpsEnvio)
        if (!cnpjPrestador) {
            const loteRps = doc.querySelector('LoteRps');
            if (loteRps) {
                cnpjPrestador = loteRps.querySelector('Cnpj')?.textContent || '';
                inscricaoMunicipalPrestador = loteRps.querySelector('InscricaoMunicipal')?.textContent || inscricaoMunicipalPrestador;
            }
        }
        
        // Validar se encontrou CNPJ
        if (!cnpjPrestador) {
            throw new Error('CNPJ do prestador não encontrado no XML.');
        }

        // Extrair dados do tomador
        const cpfTomador = cpfCnpj?.querySelector('Cpf')?.textContent || '';
        const cnpjTomador = cpfCnpj?.querySelector('Cnpj')?.textContent || '';
        const cpfCnpjTomador = cpfTomador || cnpjTomador;
        const razaoSocialTomador = tomador?.querySelector('RazaoSocial')?.textContent || '';

        // Determinar direção (entrada ou saída)
        // Se o CNPJ do prestador é da empresa, é saída, senão é entrada
        // Por padrão, NFSe importada é entrada (serviço recebido)
        const isEntrada = true;

        return {
            type: 'nfse',
            direction: isEntrada ? 'entrada' : 'saida',
            invoiceType: 'compra',
            numeroNota: numero,
            serie: serie,
            dataEmissao: dataEmissao.split('T')[0],
            modeloDocumento: 'SE',
            naturezaOperacao: servico?.querySelector('Discriminacao')?.textContent || 'Serviço prestado',
            emitente: {
                cnpj: cnpjPrestador.replace(/\D/g, ''),
                razaoSocial: `Fornecedor ${cnpjPrestador.replace(/\D/g, '').slice(0, 8)}`, // Nome padrão baseado no CNPJ
                inscricaoEstadual: inscricaoMunicipalPrestador,
            },
            destinatario: {
                cpfCnpj: cpfCnpjTomador.replace(/\D/g, ''),
                razaoSocial: razaoSocialTomador,
                endereco: {
                    logradouro: enderecoTomador?.querySelector('Endereco')?.textContent,
                    numero: enderecoTomador?.querySelector('Numero')?.textContent,
                    bairro: enderecoTomador?.querySelector('Bairro')?.textContent,
                    municipio: enderecoTomador?.querySelector('CodigoMunicipio')?.textContent,
                    uf: enderecoTomador?.querySelector('Uf')?.textContent,
                    cep: enderecoTomador?.querySelector('Cep')?.textContent?.replace(/\D/g, ''),
                },
            },
            items: [{
                codigo: itemListaServico || '1401',
                descricao: discriminacao,
                ncm: codigoCnae || '00000000',
                cfop: '', // NFSe não usa CFOP
                unidade: 'UN',
                quantidade: 1,
                valorUnitario: valorServicos,
                valorTotal: valorServicos,
                iss: {
                    baseCalculo: baseCalculo,
                    aliquota: aliquota * 100, // Converter para percentual
                    valor: valorIss,
                },
                pis: {
                    baseCalculo: valorServicos,
                    aliquota: 0,
                    valor: valorPis,
                },
                cofins: {
                    baseCalculo: valorServicos,
                    aliquota: 0,
                    valor: valorCofins,
                },
            }],
            totais: {
                valorProdutos: 0,
                valorServicos: valorServicos,
                valorDesconto: 0,
                valorFrete: 0,
                valorSeguro: 0,
                valorOutrasDespesas: 0,
                valorICMS: 0,
                valorPIS: valorPis,
                valorCOFINS: valorCofins,
                valorISS: valorIss,
                valorTotal: valorServicos,
            },
            rawXml: xml,
        };
    };

    const parseNFeXML = (xml: string): ParsedInvoice => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');

        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            throw new Error('XML inválido ou malformado.');
        }

        // Implementar parsing de NFe
        // Por enquanto, retornar erro
        throw new Error('Parsing de NFe ainda não implementado. Use NFSe por enquanto.');
    };

    const validateAndCorrect = (invoice: ParsedInvoice): ValidationReport => {
        const errors: ValidationError[] = [];
        const warnings: ValidationError[] = [];
        const info: ValidationError[] = [];
        const corrections: ValidationError[] = [];

        // Validar CNPJ/CPF
        if (invoice.emitente.cnpj && !isValidCNPJ(invoice.emitente.cnpj)) {
            errors.push({
                type: 'error',
                field: 'emitente.cnpj',
                message: 'CNPJ do emitente inválido',
                originalValue: invoice.emitente.cnpj,
            });
        }

        if (invoice.destinatario.cpfCnpj && !isValidCPFOrCNPJ(invoice.destinatario.cpfCnpj)) {
            warnings.push({
                type: 'warning',
                field: 'destinatario.cpfCnpj',
                message: 'CPF/CNPJ do destinatário pode estar inválido',
                originalValue: invoice.destinatario.cpfCnpj,
            });
        }

        // Validar e corrigir NCM
        invoice.items.forEach((item, index) => {
            if (item.ncm && !isValidNCM(item.ncm)) {
                corrections.push({
                    type: 'info',
                    field: `items[${index}].ncm`,
                    message: 'NCM inválido, será corrigido',
                    originalValue: item.ncm,
                    correctedValue: '00000000',
                });
                item.ncm = '00000000';
            }

            // Validar CFOP para NFe
            if (invoice.type === 'nfe' && item.cfop && !isValidCFOP(item.cfop)) {
                warnings.push({
                    type: 'warning',
                    field: `items[${index}].cfop`,
                    message: 'CFOP pode estar incorreto',
                    originalValue: item.cfop,
                });
            }
        });

        // Validar totais
        const calculatedTotal = invoice.items.reduce((sum, item) => sum + item.valorTotal, 0);
        if (Math.abs(calculatedTotal - invoice.totais.valorTotal) > 0.01) {
            corrections.push({
                type: 'info',
                field: 'totais.valorTotal',
                message: 'Total recalculado',
                originalValue: invoice.totais.valorTotal,
                correctedValue: calculatedTotal,
            });
            invoice.totais.valorTotal = calculatedTotal;
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            info,
            corrections,
            summary: {
                totalErrors: errors.length,
                totalWarnings: warnings.length,
                totalCorrections: corrections.length,
            },
        };
    };

    const isValidCNPJ = (cnpj: string): boolean => {
        const clean = cnpj.replace(/\D/g, '');
        return clean.length === 14;
    };

    const isValidCPFOrCNPJ = (doc: string): boolean => {
        const clean = doc.replace(/\D/g, '');
        return clean.length === 11 || clean.length === 14;
    };

    const isValidNCM = (ncm: string): boolean => {
        const clean = ncm.replace(/\D/g, '');
        return clean.length === 8;
    };

    const isValidCFOP = (cfop: string): boolean => {
        const clean = cfop.replace(/\D/g, '');
        return clean.length >= 4 && clean.length <= 6;
    };

    const handleImport = async () => {
        if (!parsedInvoice || !validationReport) return;

        if (!validationReport.isValid) {
            toast({
                title: 'Erro',
                description: 'Corrija os erros antes de importar.',
                variant: 'destructive'
            });
            return;
        }

        setIsImporting(true);

        try {
            // Buscar ou criar fornecedor
            let supplierId = await findOrCreateSupplier(parsedInvoice.emitente);

            // Criar nota fiscal de entrada
            if (!company?.id) {
                console.error('❌ [XMLImport] company.id não disponível');
                toast({
                    title: 'Erro',
                    description: 'Empresa não selecionada. Selecione uma empresa antes de importar.',
                    variant: 'destructive'
                });
                setIsImporting(false);
                return;
            }

            const { data: invoiceHeader, error: headerError } = await supabase
                .from('invoice_headers')
                .insert([{
                    company_id: company.id,
                    supplier_id: supplierId,
                    tipo: parsedInvoice.direction === 'entrada' ? 'entrada' : 'saida',
                    data_emissao: parsedInvoice.dataEmissao,
                    data_entrada: parsedInvoice.dataEntrada || parsedInvoice.dataEmissao,
                    serie: parsedInvoice.serie,
                    numero_nota: parseInt(parsedInvoice.numeroNota),
                    modelo_documento: parsedInvoice.modeloDocumento,
                    mensagens_observacoes: parsedInvoice.naturezaOperacao || null,
                    total_nota: parsedInvoice.totais.valorTotal,
                    frete: parsedInvoice.totais.valorFrete,
                    seguro: parsedInvoice.totais.valorSeguro,
                    outras_despesas: parsedInvoice.totais.valorOutrasDespesas,
                    status: 'confirmada',
                    confirmado: true,
                }])
                .select()
                .single();

            if (headerError) throw headerError;

            // Inserir itens
            const itemsToInsert = parsedInvoice.items.map((item, index) => ({
                invoice_id: invoiceHeader.id,
                sequence: index + 1,
                codigo_item: item.codigo || `ITEM${index + 1}`,
                nome_item: item.descricao,
                ncm: item.ncm || null,
                cfop: item.cfop || null,
                quantidade: item.quantidade,
                preco_unitario: item.valorUnitario,
                valor_total: item.valorTotal,
                unidade: item.unidade || 'UN',
            }));

            const { error: itemsError } = await supabase
                .from('invoice_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            toast({
                title: 'Sucesso',
                description: 'Nota fiscal importada com sucesso!',
            });

            navigate('/fiscal?tab=todas');
        } catch (error: any) {
            console.error('Erro ao importar:', error);
            toast({
                title: 'Erro',
                description: error.message || 'Erro ao importar nota fiscal.',
                variant: 'destructive'
            });
        } finally {
            setIsImporting(false);
        }
    };

    const findOrCreateSupplier = async (emitente: ParsedInvoice['emitente']): Promise<string> => {
        if (!emitente.cnpj || emitente.cnpj.length < 11) {
            throw new Error('CNPJ do emitente inválido. Não é possível criar fornecedor.');
        }

        // Buscar fornecedor existente (sem single() para evitar erro se não existir)
        const { data: existingSuppliers } = await supabase
            .from('suppliers')
            .select('id')
            .eq('cpf_cnpj', emitente.cnpj)
            .eq('company_id', profile?.company_id)
            .limit(1);

        if (existingSuppliers && existingSuppliers.length > 0) {
            return existingSuppliers[0].id;
        }

        // Criar novo fornecedor - usar campos corretos da tabela suppliers
        const { data: newSupplier, error } = await supabase
            .from('suppliers')
            .insert([{
                company_id: profile?.company_id,
                tipo_pessoa: emitente.cnpj.length === 14 ? 'PJ' : 'PF',
                nome_razao: emitente.razaoSocial || `Fornecedor ${emitente.cnpj}`,
                cpf_cnpj: emitente.cnpj,
                ie: emitente.inscricaoEstadual || null,
                logradouro: emitente.endereco?.logradouro || null,
                numero: emitente.endereco?.numero || null,
                bairro: emitente.endereco?.bairro || null,
                cidade: emitente.endereco?.municipio || null,
                uf: emitente.endereco?.uf || null,
                cep: emitente.endereco?.cep || null,
                ativo: true,
            }])
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar fornecedor:', error);
            throw new Error(`Erro ao criar fornecedor: ${error.message}`);
        }
        
        if (!newSupplier) {
            throw new Error('Fornecedor não foi criado corretamente.');
        }
        
        return newSupplier.id;
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Importar XML" 
                description="Importe notas fiscais de NFe ou NFSe via XML"
            />
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="upload">Upload XML</TabsTrigger>
                    <TabsTrigger value="validation" disabled={!validationReport}>
                        Validação {validationReport && (
                            <Badge variant={validationReport.isValid ? "default" : "destructive"} className="ml-2">
                                {validationReport.summary.totalErrors}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="preview" disabled={!parsedInvoice}>Preview</TabsTrigger>
                    <TabsTrigger value="import" disabled={!parsedInvoice || !validationReport?.isValid}>
                        Importar
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Enviar Arquivo XML</CardTitle>
                            <CardDescription>
                                Selecione um arquivo XML de NFe ou NFSe para importar
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-4">
                                <Input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xml"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <Button onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Selecionar Arquivo
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Ou cole o XML aqui:</label>
                                <Textarea
                                    placeholder="Cole o conteúdo do XML aqui..."
                                    value={xmlContent}
                                    onChange={(e) => setXmlContent(e.target.value)}
                                    className="font-mono text-xs min-h-[300px]"
                                />
                                <Button onClick={handlePasteXML} disabled={!xmlContent.trim() || isProcessing}>
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Processando...
                                        </>
                                    ) : (
                                        <>
                                            <FileCode className="w-4 h-4 mr-2" />
                                            Processar XML
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="validation" className="space-y-4">
                    {validationReport && (
                        <div className="space-y-4">
                            {/* Resumo */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Resumo da Validação</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center p-4 border rounded-lg">
                                            <div className="text-2xl font-bold text-destructive">
                                                {validationReport.summary.totalErrors}
                                            </div>
                                            <div className="text-sm text-muted-foreground">Erros</div>
                                        </div>
                                        <div className="text-center p-4 border rounded-lg">
                                            <div className="text-2xl font-bold text-warning">
                                                {validationReport.summary.totalWarnings}
                                            </div>
                                            <div className="text-sm text-muted-foreground">Avisos</div>
                                        </div>
                                        <div className="text-center p-4 border rounded-lg">
                                            <div className="text-2xl font-bold text-primary">
                                                {validationReport.summary.totalCorrections}
                                            </div>
                                            <div className="text-sm text-muted-foreground">Correções</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Erros */}
                            {validationReport.errors.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <XCircle className="w-5 h-5 text-destructive" />
                                            Erros Encontrados
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {validationReport.errors.map((error, index) => (
                                                <Alert key={index} variant="destructive">
                                                    <AlertTitle>{error.field}</AlertTitle>
                                                    <AlertDescription>
                                                        {error.message}
                                                        {error.originalValue && (
                                                            <div className="mt-1 text-xs">
                                                                Valor original: {String(error.originalValue)}
                                                            </div>
                                                        )}
                                                    </AlertDescription>
                                                </Alert>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Avisos */}
                            {validationReport.warnings.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <AlertTriangle className="w-5 h-5 text-warning" />
                                            Avisos
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {validationReport.warnings.map((warning, index) => (
                                                <Alert key={index}>
                                                    <AlertTitle>{warning.field}</AlertTitle>
                                                    <AlertDescription>
                                                        {warning.message}
                                                    </AlertDescription>
                                                </Alert>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Correções */}
                            {validationReport.corrections.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-primary" />
                                            Correções Automáticas
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Campo</TableHead>
                                                    <TableHead>Valor Original</TableHead>
                                                    <TableHead>Valor Corrigido</TableHead>
                                                    <TableHead>Motivo</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {validationReport.corrections.map((correction, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className="font-medium">{correction.field}</TableCell>
                                                        <TableCell>{String(correction.originalValue || '-')}</TableCell>
                                                        <TableCell className="text-primary font-semibold">
                                                            {String(correction.correctedValue || '-')}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {correction.message}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}

                            {validationReport.isValid && (
                                <Alert>
                                    <CheckCircle2 className="h-4 w-4" />
                                    <AlertTitle>Validação Concluída</AlertTitle>
                                    <AlertDescription>
                                        O XML foi validado e está pronto para importação.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="preview" className="space-y-4">
                    {parsedInvoice && (
                        <div className="space-y-4">
                            {/* Dados da Nota */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Dados da Nota Fiscal</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                                            <div className="text-lg font-semibold">
                                                {parsedInvoice.type === 'nfse' ? 'NFSe' : 'NFe'}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Direção</label>
                                            <div className="text-lg font-semibold capitalize">
                                                {parsedInvoice.direction}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Número</label>
                                            <div className="text-lg font-semibold">{parsedInvoice.numeroNota}</div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Série</label>
                                            <div className="text-lg font-semibold">{parsedInvoice.serie}</div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Data Emissão</label>
                                            <div className="text-lg font-semibold">{formatDate(parsedInvoice.dataEmissao)}</div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Valor Total</label>
                                            <div className="text-lg font-semibold text-primary">
                                                {formatCurrency(parsedInvoice.totais.valorTotal)}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Emitente */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Emitente / Fornecedor</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Razão Social</label>
                                            <div className="font-semibold">{parsedInvoice.emitente.razaoSocial}</div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">CNPJ</label>
                                            <div className="font-mono">{parsedInvoice.emitente.cnpj}</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Itens */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Itens da Nota ({parsedInvoice.items.length})</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Código</TableHead>
                                                <TableHead>Descrição</TableHead>
                                                <TableHead>NCM</TableHead>
                                                <TableHead>Qtd</TableHead>
                                                <TableHead>Unitário</TableHead>
                                                <TableHead className="text-right">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {parsedInvoice.items.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-mono">{item.codigo}</TableCell>
                                                    <TableCell>{item.descricao}</TableCell>
                                                    <TableCell className="font-mono">{item.ncm}</TableCell>
                                                    <TableCell>{item.quantidade}</TableCell>
                                                    <TableCell>{formatCurrency(item.valorUnitario)}</TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {formatCurrency(item.valorTotal)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* Totais */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Totais</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Valor dos Serviços:</span>
                                            <span className="font-semibold">{formatCurrency(parsedInvoice.totais.valorServicos)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">ISS:</span>
                                            <span>{formatCurrency(parsedInvoice.totais.valorISS)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">PIS:</span>
                                            <span>{formatCurrency(parsedInvoice.totais.valorPIS)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">COFINS:</span>
                                            <span>{formatCurrency(parsedInvoice.totais.valorCOFINS)}</span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t">
                                            <span className="font-semibold">Total:</span>
                                            <span className="text-lg font-bold text-primary">
                                                {formatCurrency(parsedInvoice.totais.valorTotal)}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="import" className="space-y-4">
                    {parsedInvoice && validationReport?.isValid && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Confirmar Importação</CardTitle>
                                <CardDescription>
                                    A nota fiscal será importada e registrada no sistema.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Alert>
                                    <AlertTitle>Pronto para Importar</AlertTitle>
                                    <AlertDescription>
                                        A nota fiscal foi validada e está pronta para entrada no sistema.
                                    </AlertDescription>
                                </Alert>

                                <div className="flex gap-4">
                                    <Button
                                        onClick={handleImport}
                                        disabled={isImporting}
                                        className="flex-1"
                                    >
                                        {isImporting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Importando...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" />
                                                Confirmar e Importar
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setXmlContent('');
                                            setParsedInvoice(null);
                                            setValidationReport(null);
                                            setActiveTab('upload');
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

