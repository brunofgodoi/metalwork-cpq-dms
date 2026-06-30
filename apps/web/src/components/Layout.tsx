import { Outlet, useNavigate } from 'react-router-dom';
import { AppSidebar } from './Sidebar';
import { Header } from './Header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useCallback } from 'react';
import { toast } from 'sonner';

export function Layout() {
  const navigate = useNavigate();

  const handleEscape = useCallback(() => {
    const modal = document.querySelector('[role="dialog"]');
    if (modal) {
      const closeBtn = modal.querySelector('button[aria-label="Close"], [data-slot="sheet-close"]');
      (closeBtn as HTMLButtonElement)?.click?.();
    }
  }, []);

  useKeyboardShortcuts({
    'Ctrl+N': useCallback(() => navigate('/quotes/new'), [navigate]),
    Escape: handleEscape,
    'Ctrl+S': useCallback(() => {
      toast.info('Use o botão Salvar no formulário.');
    }, []),
  });

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="flex flex-col flex-1 min-w-0 bg-background h-full overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
