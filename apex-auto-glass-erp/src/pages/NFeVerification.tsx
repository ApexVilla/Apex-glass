import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, RefreshCw, FileText, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { nfeVerificationService, VerificationReport } from '@/services/fiscal/nfeVerificationService';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function NFeVerification() {
  const { company, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [expandedChecks, setExpandedChecks] = useState<Record<string, boolean>>({});

  const executarVerificacao = async () => {
    if (!company?.id) {
      toast({
        title: 'Erro',
        description: 'Empresa não encontrada',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const resultado = await nfeVerificationService.verificarSistema(
        company.id,
        profile?.id
      );
      setReport(resultado);

      // Expandir automaticamente os checks com problemas
      const checksComProblemas: Record<string, boolean> = {};
      Object.entries(resultado.checks).forEach(([key, check]) => {
        if (!check.success || (check.correctiveActions && check.correctiveActions.length > 0)) {
          checksComProblemas[key] = true;
        }
      });
      setExpandedChecks(checksComProblemas);

      toast({
        title: 'Verificação concluída',
        description: `Status geral: ${resultado.overallStatus === 'ok' ? 'OK' : resultado.overallStatus === 'warning' ? 'Avisos' : 'Erros encontrados'}`,
      });
    } catch (error: any) {
      console.error('Erro ao executar verificação:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao executar verificação',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (key: string) => {
    setExpandedChecks(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getStatusIcon = (success: boolean, hasWarnings: boolean) => {
    if (!success) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    if (hasWarnings) {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
    return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  };

  const getStatusBadge = (status: 'ok' | 'warning' | 'error') => {
    const variants = {
      ok: 'default',
      warning: 'secondary',
      error: 'destructive',
    } as const;

    const labels = {
      ok: 'OK',
      warning: 'Avisos',
      error: 'Erros',
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const exportarRelatorio = () => {
    if (!report) return;

    const relatorioTexto = `
RELATÓRIO DE VERIFICAÇÃO DO SISTEMA NF-e
========================================

Data/Hora: ${new Date(report.timestamp).toLocaleString('pt-BR')}
Status Geral: ${report.overallStatus.toUpperCase()}

RESUMO
------
Total de Verificações: ${report.summary.totalChecks}
Verificações Aprovadas: ${report.summary.passedChecks}
Verificações com Falha: ${report.summary.failedChecks}
Avisos: ${report.summary.warnings}

VERIFICAÇÕES DETALHADAS
-----------------------

1. CERTIFICADO A1
   Status: ${report.checks.certificado.success ? 'OK' : 'ERRO'}
   Mensagem: ${report.checks.certificado.message}
   ${report.checks.certificado.correctiveActions && report.checks.certificado.correctiveActions.length > 0
      ? `Ações Corretivas:\n${report.checks.certificado.correctiveActions.map(a => `   - ${a}`).join('\n')}`
      : ''}

2. CONFIGURAÇÃO DE AMBIENTE
   Status: ${report.checks.configuracao.success ? 'OK' : 'ERRO'}
   Mensagem: ${report.checks.configuracao.message}
   ${report.checks.configuracao.correctiveActions && report.checks.configuracao.correctiveActions.length > 0
      ? `Ações Corretivas:\n${report.checks.configuracao.correctiveActions.map(a => `   - ${a}`).join('\n')}`
      : ''}

3. COMUNICAÇÃO COM SEFAZ
   Status: ${report.checks.comunicacao.success ? 'OK' : 'ERRO'}
   Mensagem: ${report.checks.comunicacao.message}
   ${report.checks.comunicacao.correctiveActions && report.checks.comunicacao.correctiveActions.length > 0
      ? `Ações Corretivas:\n${report.checks.comunicacao.correctiveActions.map(a => `   - ${a}`).join('\n')}`
      : ''}

4. EMISSÃO DE NF-e
   Status: ${report.checks.emissao.success ? 'OK' : 'ERRO'}
   Mensagem: ${report.checks.emissao.message}
   ${report.checks.emissao.correctiveActions && report.checks.emissao.correctiveActions.length > 0
      ? `Ações Corretivas:\n${report.checks.emissao.correctiveActions.map(a => `   - ${a}`).join('\n')}`
      : ''}

5. EVENTOS (CANCELAMENTO, CC-e, INUTILIZAÇÃO)
   Status: ${report.checks.eventos.success ? 'OK' : 'ERRO'}
   Mensagem: ${report.checks.eventos.message}
   ${report.checks.eventos.correctiveActions && report.checks.eventos.correctiveActions.length > 0
      ? `Ações Corretivas:\n${report.checks.eventos.correctiveActions.map(a => `   - ${a}`).join('\n')}`
      : ''}

AÇÕES CORRETIVAS GERAIS
-----------------------
${report.correctiveActions.length > 0
    ? report.correctiveActions.map((action, index) => `${index + 1}. ${action}`).join('\n')
    : 'Nenhuma ação corretiva necessária.'}

========================================
Relatório gerado automaticamente pelo sistema
    `.trim();

    const blob = new Blob([relatorioTexto], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-verificacao-nfe-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Relatório exportado',
      description: 'O relatório foi baixado com sucesso',
    });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title="Verificação do Sistema NF-e"
        description="Verifique se o sistema está corretamente configurado para emitir NF-e e se o certificado A1 está funcional"
      />

      {/* Botão de Execução */}
      <Card>
        <CardHeader>
          <CardTitle>Executar Verificação</CardTitle>
          <CardDescription>
            Execute uma verificação completa do sistema de NF-e, certificado A1 e comunicação com SEFAZ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={executarVerificacao}
            disabled={loading || !company?.id}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executando verificação...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Executar Verificação Completa
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Relatório */}
      {report && (
        <>
          {/* Resumo Geral */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Resultado da Verificação</CardTitle>
                  <CardDescription>
                    Verificação executada em {new Date(report.timestamp).toLocaleString('pt-BR')}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(report.overallStatus)}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportarRelatorio}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar Relatório
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{report.summary.totalChecks}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {report.summary.passedChecks}
                  </div>
                  <div className="text-sm text-muted-foreground">Aprovadas</div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {report.summary.failedChecks}
                  </div>
                  <div className="text-sm text-muted-foreground">Falhas</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {report.summary.warnings}
                  </div>
                  <div className="text-sm text-muted-foreground">Avisos</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verificações Detalhadas */}
          <Card>
            <CardHeader>
              <CardTitle>Verificações Detalhadas</CardTitle>
              <CardDescription>
                Clique em cada verificação para ver detalhes e ações corretivas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 1. Certificado A1 */}
              <Collapsible
                open={expandedChecks.certificado}
                onOpenChange={() => toggleCheck('certificado')}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      {expandedChecks.certificado ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {getStatusIcon(
                        report.checks.certificado.success,
                        !!report.checks.certificado.correctiveActions?.length
                      )}
                      <div className="text-left">
                        <div className="font-semibold">1. Certificado A1</div>
                        <div className="text-sm text-muted-foreground">
                          {report.checks.certificado.message}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(
                      report.checks.certificado.success
                        ? (report.checks.certificado.correctiveActions?.length ? 'warning' : 'ok')
                        : 'error'
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                    {report.checks.certificado.details && (
                      <div>
                        <div className="font-semibold mb-2">Detalhes:</div>
                        <pre className="text-xs bg-background p-3 rounded overflow-auto">
                          {JSON.stringify(report.checks.certificado.details, null, 2)}
                        </pre>
                      </div>
                    )}
                    {report.checks.certificado.correctiveActions &&
                      report.checks.certificado.correctiveActions.length > 0 && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Ações Corretivas</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside space-y-1 mt-2">
                              {report.checks.certificado.correctiveActions.map((action, index) => (
                                <li key={index}>{action}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* 2. Configuração de Ambiente */}
              <Collapsible
                open={expandedChecks.configuracao}
                onOpenChange={() => toggleCheck('configuracao')}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      {expandedChecks.configuracao ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {getStatusIcon(
                        report.checks.configuracao.success,
                        !!report.checks.configuracao.correctiveActions?.length
                      )}
                      <div className="text-left">
                        <div className="font-semibold">2. Configuração de Ambiente</div>
                        <div className="text-sm text-muted-foreground">
                          {report.checks.configuracao.message}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(
                      report.checks.configuracao.success
                        ? (report.checks.configuracao.correctiveActions?.length ? 'warning' : 'ok')
                        : 'error'
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                    {report.checks.configuracao.details && (
                      <div>
                        <div className="font-semibold mb-2">Detalhes:</div>
                        <pre className="text-xs bg-background p-3 rounded overflow-auto">
                          {JSON.stringify(report.checks.configuracao.details, null, 2)}
                        </pre>
                      </div>
                    )}
                    {report.checks.configuracao.correctiveActions &&
                      report.checks.configuracao.correctiveActions.length > 0 && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Ações Corretivas</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside space-y-1 mt-2">
                              {report.checks.configuracao.correctiveActions.map((action, index) => (
                                <li key={index}>{action}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* 3. Comunicação SEFAZ */}
              <Collapsible
                open={expandedChecks.comunicacao}
                onOpenChange={() => toggleCheck('comunicacao')}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      {expandedChecks.comunicacao ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {getStatusIcon(
                        report.checks.comunicacao.success,
                        !!report.checks.comunicacao.correctiveActions?.length
                      )}
                      <div className="text-left">
                        <div className="font-semibold">3. Comunicação com SEFAZ</div>
                        <div className="text-sm text-muted-foreground">
                          {report.checks.comunicacao.message}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(
                      report.checks.comunicacao.success
                        ? (report.checks.comunicacao.correctiveActions?.length ? 'warning' : 'ok')
                        : 'error'
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                    {report.checks.comunicacao.details && (
                      <div>
                        <div className="font-semibold mb-2">Detalhes:</div>
                        <pre className="text-xs bg-background p-3 rounded overflow-auto">
                          {JSON.stringify(report.checks.comunicacao.details, null, 2)}
                        </pre>
                      </div>
                    )}
                    {report.checks.comunicacao.correctiveActions &&
                      report.checks.comunicacao.correctiveActions.length > 0 && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Ações Corretivas</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside space-y-1 mt-2">
                              {report.checks.comunicacao.correctiveActions.map((action, index) => (
                                <li key={index}>{action}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* 4. Emissão NF-e */}
              <Collapsible
                open={expandedChecks.emissao}
                onOpenChange={() => toggleCheck('emissao')}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      {expandedChecks.emissao ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {getStatusIcon(
                        report.checks.emissao.success,
                        !!report.checks.emissao.correctiveActions?.length
                      )}
                      <div className="text-left">
                        <div className="font-semibold">4. Emissão de NF-e</div>
                        <div className="text-sm text-muted-foreground">
                          {report.checks.emissao.message}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(
                      report.checks.emissao.success
                        ? (report.checks.emissao.correctiveActions?.length ? 'warning' : 'ok')
                        : 'error'
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                    {report.checks.emissao.details && (
                      <div>
                        <div className="font-semibold mb-2">Detalhes:</div>
                        <pre className="text-xs bg-background p-3 rounded overflow-auto">
                          {JSON.stringify(report.checks.emissao.details, null, 2)}
                        </pre>
                      </div>
                    )}
                    {report.checks.emissao.correctiveActions &&
                      report.checks.emissao.correctiveActions.length > 0 && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Ações Corretivas</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside space-y-1 mt-2">
                              {report.checks.emissao.correctiveActions.map((action, index) => (
                                <li key={index}>{action}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* 5. Eventos */}
              <Collapsible
                open={expandedChecks.eventos}
                onOpenChange={() => toggleCheck('eventos')}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      {expandedChecks.eventos ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {getStatusIcon(
                        report.checks.eventos.success,
                        !!report.checks.eventos.correctiveActions?.length
                      )}
                      <div className="text-left">
                        <div className="font-semibold">5. Eventos (Cancelamento, CC-e, Inutilização)</div>
                        <div className="text-sm text-muted-foreground">
                          {report.checks.eventos.message}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(
                      report.checks.eventos.success
                        ? (report.checks.eventos.correctiveActions?.length ? 'warning' : 'ok')
                        : 'error'
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                    {report.checks.eventos.details && (
                      <div>
                        <div className="font-semibold mb-2">Detalhes:</div>
                        <pre className="text-xs bg-background p-3 rounded overflow-auto">
                          {JSON.stringify(report.checks.eventos.details, null, 2)}
                        </pre>
                      </div>
                    )}
                    {report.checks.eventos.correctiveActions &&
                      report.checks.eventos.correctiveActions.length > 0 && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Ações Corretivas</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside space-y-1 mt-2">
                              {report.checks.eventos.correctiveActions.map((action, index) => (
                                <li key={index}>{action}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Ações Corretivas Gerais */}
          {report.correctiveActions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Ações Corretivas Recomendadas
                </CardTitle>
                <CardDescription>
                  Lista consolidada de todas as ações corretivas necessárias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Resolva os problemas abaixo para garantir o funcionamento completo do sistema</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-2 mt-4">
                      {report.correctiveActions.map((action, index) => (
                        <li key={index} className="text-sm">{action}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Mensagem quando não há relatório */}
      {!report && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Clique em "Executar Verificação Completa" para iniciar a verificação do sistema
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

