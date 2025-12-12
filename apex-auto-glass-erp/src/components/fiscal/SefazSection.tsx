import { UseFormReturn } from "react-hook-form";
import { FiscalNote } from "@/types/fiscal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, FileCode, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SefazSectionProps {
    form: UseFormReturn<FiscalNote>;
}

export function SefazSection({ form }: SefazSectionProps) {
    const { register, setValue, watch } = form;

    const ambiente = watch("ambiente_sefaz") || "homologacao";
    const statusEnvio = watch("status_envio_sefaz") || "nao_enviado";
    const chaveAcesso = watch("chave_acesso_nfe");

    const handleGerarXML = async () => {
        try {
            // TODO: Implementar geração de XML
            toast({
                title: "Em desenvolvimento",
                description: "Funcionalidade de geração de XML será implementada em breve.",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Erro",
                description: "Erro ao gerar XML.",
                variant: "destructive",
            });
        }
    };

    const handleEnviarSEFAZ = async () => {
        try {
            // TODO: Implementar envio para SEFAZ
            toast({
                title: "Em desenvolvimento",
                description: "Funcionalidade de envio para SEFAZ será implementada em breve.",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Erro",
                description: "Erro ao enviar para SEFAZ.",
                variant: "destructive",
            });
        }
    };

    const getStatusBadge = () => {
        switch (statusEnvio) {
            case "enviado":
                return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Enviado</Badge>;
            case "autorizado":
                return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Autorizado</Badge>;
            case "rejeitado":
                return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejeitado</Badge>;
            case "cancelado":
                return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Cancelado</Badge>;
            case "processando":
                return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" /> Processando</Badge>;
            default:
                return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" /> Não Enviado</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Status e Chave de Acesso */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Status de Envio</Label>
                    <div className="flex items-center gap-2">
                        {getStatusBadge()}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Chave de Acesso (NFe)</Label>
                    <Input
                        {...register("chave_acesso_nfe")}
                        placeholder="Chave de acesso será gerada automaticamente"
                        readOnly
                        className="font-mono text-sm"
                    />
                </div>
            </div>

            {/* Configurações de Ambiente */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Ambiente SEFAZ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Ambiente *</Label>
                            <Select
                                onValueChange={(v) => setValue("ambiente_sefaz", v)}
                                defaultValue={ambiente}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="homologacao">Homologação (Teste)</SelectItem>
                                    <SelectItem value="producao">Produção</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Certificado Digital</Label>
                            <Select
                                onValueChange={(v) => setValue("certificado_digital_id", v)}
                                defaultValue={watch("certificado_digital_id")}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o certificado..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">Certificado Padrão</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="p-4 bg-muted/20 rounded-lg border">
                        <p className="text-sm text-muted-foreground">
                            <strong>Ambiente de Homologação:</strong> Use para testes. As notas emitidas não têm validade fiscal.
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            <strong>Ambiente de Produção:</strong> Use apenas quando estiver pronto para emitir notas fiscais válidas.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Informações de Retorno SEFAZ */}
            {(statusEnvio === "enviado" || statusEnvio === "autorizado" || statusEnvio === "rejeitado") && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Retorno SEFAZ</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Protocolo de Autorização</Label>
                                <Input
                                    {...register("protocolo_autorizacao")}
                                    placeholder="Número do protocolo"
                                    readOnly
                                    className="font-mono text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Data/Hora de Autorização</Label>
                                <Input
                                    {...register("data_autorizacao")}
                                    type="datetime-local"
                                    readOnly
                                />
                            </div>
                        </div>

                        {watch("mensagem_retorno_sefaz") && (
                            <div className="space-y-2">
                                <Label>Mensagem de Retorno</Label>
                                <div className="p-3 bg-muted rounded-md text-sm">
                                    {watch("mensagem_retorno_sefaz")}
                                </div>
                            </div>
                        )}

                        {watch("codigo_retorno_sefaz") && (
                            <div className="space-y-2">
                                <Label>Código de Retorno</Label>
                                <Input
                                    {...register("codigo_retorno_sefaz")}
                                    readOnly
                                    className="font-mono text-sm"
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleGerarXML}
                    className="flex-1"
                >
                    <FileCode className="mr-2 h-4 w-4" />
                    Gerar XML
                </Button>

                <Button
                    type="button"
                    onClick={handleEnviarSEFAZ}
                    className="flex-1"
                    disabled={statusEnvio === "autorizado" || statusEnvio === "processando"}
                >
                    <Send className="mr-2 h-4 w-4" />
                    {statusEnvio === "nao_enviado" ? "Enviar para SEFAZ" : "Reenviar para SEFAZ"}
                </Button>
            </div>

            {/* Informações Adicionais */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
                    Informações Importantes
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                    <li>O XML será gerado automaticamente com base nos dados da nota</li>
                    <li>Certifique-se de que todos os dados estão corretos antes de enviar</li>
                    <li>Notas autorizadas não podem ser editadas</li>
                    <li>Em caso de erro, verifique os logs e o retorno da SEFAZ</li>
                </ul>
            </div>
        </div>
    );
}

