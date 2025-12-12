import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { ResultadoValidacao } from '@/types/fiscal';

interface FiscalValidationPanelProps {
    validationResult: ResultadoValidacao;
    onAutoFix?: () => void;
}

export function FiscalValidationPanel({ validationResult, onAutoFix }: FiscalValidationPanelProps) {
    const { valida, erros, avisos } = validationResult;

    if (valida && avisos.length === 0) {
        return (
            <Card className="border-green-500 bg-green-50">
                <CardContent className="pt-6 flex items-center gap-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                    <div>
                        <h3 className="font-semibold text-green-900">Nota Fiscal Válida</h3>
                        <p className="text-green-700">Nenhum erro encontrado. Pronta para emissão.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    Validação Fiscal
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {erros.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="font-medium text-red-700 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" /> Erros Bloqueantes
                        </h4>
                        <ul className="list-disc pl-5 space-y-1">
                            {erros.map((erro, idx) => (
                                <li key={idx} className="text-sm text-red-600">
                                    <span className="font-semibold">{erro.campo}:</span> {erro.mensagem}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {avisos.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="font-medium text-yellow-700 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" /> Avisos e Sugestões
                        </h4>
                        <ul className="list-disc pl-5 space-y-1">
                            {avisos.map((aviso, idx) => (
                                <li key={idx} className="text-sm text-yellow-600">
                                    <span className="font-semibold">{aviso.campo}:</span> {aviso.mensagem}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {onAutoFix && (erros.length > 0 || avisos.length > 0) && (
                    <div className="pt-4">
                        <Button onClick={onAutoFix} variant="outline" className="w-full border-blue-200 text-blue-700 hover:bg-blue-50">
                            Tentar Correção Automática
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
