import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LogOut,
  UserCircle,
  Sun,
  Moon,
  Crown,
  Search as SearchIcon,
  Building2,
  User,
  FileText,
  Loader2,
  X,
} from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Toggle } from '@/components/ui/toggle';
import { Badge } from '@/components/ui/badge';
import { api } from '../lib/axios';

interface SearchResultItem {
  id: string;
  type: 'CLIENT' | 'CONTACT' | 'QUOTE';
  score: number;
  title: string;
  subtitle: string;
  description?: string;
  payload: unknown;
}

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await api.get('/search', {
          params: { query: query.trim(), type: 'ALL', threshold: 0.1 },
        });
        setResults(res.data.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const toggleTheme = (pressed: boolean) => {
    setIsDark(pressed);
    if (pressed) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleResultClick = (item: SearchResultItem) => {
    setQuery('');
    setIsOpen(false);
    searchInputRef.current?.blur();

    if (item.type === 'CLIENT') {
      navigate(`/clients?search=${encodeURIComponent(item.title)}`);
    } else if (item.type === 'CONTACT') {
      navigate(`/clients?search=${encodeURIComponent(item.title)}`);
    } else if (item.type === 'QUOTE') {
      navigate(`/quotes?edit=${item.id}`);
    }
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setQuery('');
      setIsOpen(false);
      searchInputRef.current?.blur();
    } else if (e.key === 'Enter' && query.trim().length >= 2) {
      setIsOpen(false);
      searchInputRef.current?.blur();
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const getIcon = (type: 'CLIENT' | 'CONTACT' | 'QUOTE') => {
    switch (type) {
      case 'CLIENT':
        return <Building2 className="h-4 w-4 text-blue-500" />;
      case 'CONTACT':
        return <User className="h-4 w-4 text-purple-500" />;
      case 'QUOTE':
        return <FileText className="h-4 w-4 text-emerald-500" />;
    }
  };

  const getTypeLabel = (type: 'CLIENT' | 'CONTACT' | 'QUOTE') => {
    switch (type) {
      case 'CLIENT':
        return 'Cliente';
      case 'CONTACT':
        return 'Contato';
      case 'QUOTE':
        return 'Orçamento';
    }
  };

  return (
    <header className="h-16 border-b flex items-center justify-between px-6 shrink-0 bg-background relative z-40">
      <div className="flex items-center gap-4">
        <SidebarTrigger />

        {/* Quick Search Input */}
        <div ref={containerRef} className="relative hidden md:block w-72 lg:w-96">
          <div className="relative flex items-center">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Busca rápida..."
              value={query}
              onChange={(e) => {
                const val = e.target.value;
                setQuery(val);
                setIsOpen(true);
                if (val.trim().length < 2) {
                  setResults([]);
                  setIsLoading(false);
                } else {
                  setIsLoading(true);
                }
              }}
              onFocus={() => {
                setIsOpen(true);
                if (query.trim().length < 2) {
                  setResults([]);
                  setIsLoading(false);
                }
              }}
              onKeyDown={handleKeyDownInput}
              className="w-full text-sm bg-muted hover:bg-muted/80 focus:bg-background border px-9 py-1.5 rounded-md text-left transition-all outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {query ? (
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setIsLoading(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded-full"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[9px] font-medium text-muted-foreground">
                <span>Ctrl</span>K
              </kbd>
            )}
          </div>

          {/* Quick Search Popover */}
          {isOpen && (query.trim().length >= 2 || isLoading) && (
            <div className="absolute top-full left-0 mt-1 w-full bg-popover text-popover-foreground border rounded-lg shadow-lg z-50 p-2 space-y-1 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
              {isLoading ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Buscando...</span>
                </div>
              ) : results.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Nenhum resultado para "{query}"
                </div>
              ) : (
                <>
                  <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
                    Resultados sugeridos
                  </div>
                  {results.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleResultClick(item)}
                      className="w-full flex items-start gap-3 p-2 rounded-md hover:bg-accent text-left transition-colors group"
                    >
                      <div className="mt-0.5 p-1 rounded bg-muted group-hover:bg-background">
                        {getIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm truncate text-foreground group-hover:text-primary">
                            {item.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {getTypeLabel(item.type)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                      </div>
                    </button>
                  ))}
                  <div className="border-t mt-1 pt-1">
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
                      }}
                      className="w-full text-center py-1.5 text-xs text-primary font-medium hover:underline"
                    >
                      Ver todos os resultados no painel de busca
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Toggle
          pressed={isDark}
          onPressedChange={toggleTheme}
          aria-label="Toggle dark mode"
          variant="outline"
          size="sm"
          className="rounded-full"
        >
          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Toggle>

        <Badge variant="outline" size="lg">
          <UserCircle className="text-primary" />
          <span>{user?.name}</span>
          {user?.role.toString() === 'ADMIN' && (
            <Crown data-icon="inline-end" className="text-primary scale-75" />
          )}
        </Badge>

        <button
          onClick={logout}
          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors focus:outline-none"
          title="Sair"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
