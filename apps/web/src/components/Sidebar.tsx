import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Users,
  Tags,
  FileText,
  Settings,
  ShieldAlert,
  ChevronRight,
  Library,
  ShieldCheck,
  BarChart3,
  FileCheck,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import logo from '@/assets/hero.png';

export function AppSidebar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { state } = useSidebar();
  const [isAdminOpen, setIsAdminOpen] = useState(() => pathname.startsWith('/admin'));

  const { data: companyConfig } = useQuery({
    queryKey: ['company-config'],
    queryFn: async () => (await api.get('/config/company')).data,
  });

  const { data: systemConfig } = useQuery({
    queryKey: ['system-name'],
    queryFn: async () => (await api.get('/config/system_name')).data,
  });

  const systemName = systemConfig?.value || companyConfig?.companyName || 'DMS CPQ';

  useEffect(() => {
    if (companyConfig?.logo) localStorage.setItem('@cpq:logo', companyConfig.logo);
    if (companyConfig?.companyName)
      localStorage.setItem('@cpq:company-name', companyConfig.companyName);
  }, [companyConfig]);

  useEffect(() => {
    if (companyConfig?.logo) localStorage.setItem('@cpq:logo', companyConfig.logo);
    if (companyConfig?.companyName)
      localStorage.setItem('@cpq:company-name', companyConfig.companyName);
  }, [companyConfig]);

  useEffect(() => {
    if (systemConfig?.value) {
      localStorage.setItem('@cpq:system-name', systemConfig.value);
      document.title = systemConfig.value;
    }
  }, [systemConfig]);

  const { data: pendingCount } = useQuery<number>({
    queryKey: ['pending-approvals-count'],
    queryFn: async () => {
      const response = await api.get('/approvals', { params: { limit: 1 } });
      return response.data?.meta?.total ?? 0;
    },
    enabled: user?.role === 'ADMIN',
    refetchInterval: 30000,
  });

  const generalNavigation = [
    {
      name: 'Painel Geral',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'ESTIMATOR', 'VIEWER'],
    },
    { name: 'Catálogo', href: '/catalog', icon: Library, roles: ['ADMIN', 'ESTIMATOR'] },
    {
      name: 'Orçamentos',
      href: '/quotes',
      icon: FileText,
      roles: ['ADMIN', 'ESTIMATOR', 'VIEWER'],
    },
    { name: 'Clientes', href: '/clients', icon: Users, roles: ['ADMIN', 'ESTIMATOR'] },
  ];

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="h-16 flex items-center justify-center border-b px-2">
        <div className="flex items-center gap-2">
          <img
            src={companyConfig?.logo || logo}
            alt="Logo"
            className="h-10 w-10 object-contain shrink-0"
          />
          {state === 'expanded' && (
            <h1
              className="text-xl font-bold tracking-tight overflow-hidden whitespace-nowrap text-ellipsis bg-linear-to-r from-primary to-white bg-clip-text text-transparent"
              title={systemName}
            >
              {systemName}
            </h1>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {generalNavigation.map((item) => {
                // Hide menu items if user doesn't have the required role
                if (user && !item.roles.includes(user.role)) return null;

                const isActive = pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                      <Link to={item.href}>
                        <item.icon />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Collapsible Admin Section */}
              {user && user.role === 'ADMIN' && (
                <Collapsible
                  asChild
                  defaultOpen={isAdminOpen}
                  open={isAdminOpen}
                  onOpenChange={setIsAdminOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip="Administração"
                        isActive={pathname.startsWith('/admin')}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Administração</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={pathname === '/admin/analytics'}>
                            <Link to="/admin/analytics" className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" />
                              <span>Indicadores (BI)</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>

                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={pathname === '/admin/approvals'}>
                            <Link
                              to="/admin/approvals"
                              className="flex items-center justify-between w-full"
                            >
                              <div className="flex items-center gap-2">
                                <FileCheck className="h-4 w-4" />
                                <span>Fila de Aprovações</span>
                              </div>
                              {!!pendingCount && (
                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700 border-0 text-[10px] px-1.5 py-0 h-5 shrink-0 flex items-center justify-center font-bold rounded-full">
                                  {pendingCount}
                                </Badge>
                              )}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>

                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={pathname === '/admin/categories'}>
                            <Link to="/admin/categories" className="flex items-center gap-2">
                              <Tags className="h-4 w-4" />
                              <span>Categorias</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>

                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={pathname === '/admin/users'}>
                            <Link to="/admin/users" className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>Usuários</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>

                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={pathname === '/admin/settings'}>
                            <Link to="/admin/settings" className="flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              <span>Configurações</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>

                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={pathname === '/admin/lgpd'}>
                            <Link to="/admin/lgpd" className="flex items-center gap-2">
                              <ShieldAlert className="h-4 w-4" />
                              <span>Privacidade (LGPD)</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t text-xs text-muted-foreground text-center">
        {systemName} Enterprise v1.0
      </SidebarFooter>
    </Sidebar>
  );
}
