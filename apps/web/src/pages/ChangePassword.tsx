import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { ShieldCheck, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function ChangePassword() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A nova senha e a confirmação não coincidem.');
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      // Update auth state with new token & user state
      login(data.token, data.user);
      toast.success('Senha atualizada com sucesso!');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao alterar a senha. Verifique a senha atual.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden p-4">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px] opacity-15 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px] opacity-15 pointer-events-none"></div>

      <Card className="relative z-10 w-full max-w-md bg-slate-900/80 border-slate-800 text-slate-100 shadow-2xl backdrop-blur-md">
        <CardHeader className="space-y-2 flex flex-col items-center text-center pb-6">
          <div className="w-12 h-12 bg-primary/25 border border-primary/40 text-primary flex items-center justify-center rounded-xl shadow-inner mb-2 animate-pulse">
            <ShieldCheck size={28} />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            Alteração de Senha Obrigatória
          </CardTitle>
          <CardDescription className="text-slate-400">
            Olá, <span className="text-white font-medium">{user?.name}</span>. Para garantir a
            segurança dos seus dados, altere sua senha temporária antes de continuar.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/15 border border-destructive/30 text-destructive-foreground rounded-lg text-xs flex items-center gap-2 text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="current-password">Senha Temporária / Atual</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Sua senha temporária"
                  className="pl-9 bg-slate-950/50 border-slate-850 text-white placeholder-slate-500 focus-visible:ring-primary"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha (min. 6 caracteres)"
                  className="pl-9 bg-slate-950/50 border-slate-850 text-white placeholder-slate-500 focus-visible:ring-primary"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="pl-9 bg-slate-950/50 border-slate-850 text-white placeholder-slate-500 focus-visible:ring-primary"
                  required
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 pt-2 pb-6 bg-transparent border-t-0">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
            >
              {isLoading ? 'Salvando...' : 'Salvar Nova Senha'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
