/**
 * Modal para resetar senha do usuário
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export function ResetPasswordModal({
  open,
  onOpenChange,
  userId,
  userName,
}: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleReset = async () => {
    // Validações
    if (!newPassword.trim()) {
      toast({
        title: 'Erro',
        description: 'A nova senha é obrigatória',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter no mínimo 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      // Nota: Reset de senha via Admin API do Supabase
      // Por enquanto, vamos usar uma abordagem alternativa
      // O ideal seria ter uma Edge Function ou usar Admin API

      // Tentar atualizar via RPC se disponível
      const { error } = await supabase.rpc('reset_user_password', {
        p_user_id: userId,
        p_new_password: newPassword,
      });

      if (error) {
        // Se a função não existir, informar que precisa ser feito via admin
        if (error.message.includes('function') || error.message.includes('does not exist')) {
          toast({
            title: 'Atenção',
            description:
              'Reset de senha deve ser feito via Admin API do Supabase. Entre em contato com o administrador do sistema.',
            variant: 'default',
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: 'Sucesso',
          description: 'Senha resetada com sucesso',
        });
        onOpenChange(false);
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao resetar senha',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Resetar Senha
          </DialogTitle>
          <DialogDescription>
            Defina uma nova senha para o usuário <strong>{userName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha *</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              A senha deve ter no mínimo 6 caracteres
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Digite a senha novamente"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">
              <strong>Importante:</strong> O usuário precisará usar esta nova senha no próximo
              login.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleReset} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Resetar Senha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

