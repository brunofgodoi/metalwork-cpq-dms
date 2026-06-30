import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/axios';
import {
  Search as SearchIcon,
  SlidersHorizontal,
  Building2,
  User,
  FileText,
  ChevronsRight,
  Sparkles,
  Percent,
  X,
  Image,
  Star,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SearchResultItem {
  id: string;
  type: 'CLIENT' | 'CONTACT' | 'QUOTE' | 'DRAWING';
  score: number;
  title: string;
  subtitle: string;
  description?: string;
  payload: unknown;
}

export function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const [searchType, setSearchType] = useState<'ALL' | 'CLIENT' | 'CONTACT' | 'QUOTE' | 'DRAWING'>(
    'ALL',
  );
  const [threshold, setThreshold] = useState(10); // represent in percentage (e.g. 10% = 0.10)
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, isError, error } = useQuery<SearchResultItem[]>({
    queryKey: ['global-search', searchQuery, searchType, threshold],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const res = await api.get('/search', {
        params: {
          query: searchQuery,
          type: searchType,
          threshold: threshold / 100,
        },
      });
      return res.data;
    },
    enabled: searchQuery.trim().length >= 2,
  });

  const handleResultClick = (item: SearchResultItem) => {
    if (item.type === 'CLIENT') {
      navigate(`/clients?search=${encodeURIComponent(item.title)}`);
    } else if (item.type === 'CONTACT') {
      navigate(`/clients?search=${encodeURIComponent(item.title)}`);
    } else if (item.type === 'QUOTE') {
      navigate(`/quotes?edit=${item.id}`);
    } else if (item.type === 'DRAWING') {
      navigate(`/catalog?search=${encodeURIComponent(item.title)}`);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if (score >= 0.4) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
  };

  const getScoreBadgeText = (score: number) => {
    return `${Math.round(score * 100)}% Relevância`;
  };

  const getTypeBadge = (type: 'CLIENT' | 'CONTACT' | 'QUOTE' | 'DRAWING') => {
    switch (type) {
      case 'CLIENT':
        return (
          <Badge className="bg-blue-500/15 text-blue-500 border border-blue-500/25 shadow-none hover:bg-blue-500/15">
            <Building2 className="mr-1 h-3.5 w-3.5" /> Cliente
          </Badge>
        );
      case 'CONTACT':
        return (
          <Badge className="bg-purple-500/15 text-purple-500 border border-purple-500/25 shadow-none hover:bg-purple-500/15">
            <User className="mr-1 h-3.5 w-3.5" /> Contato
          </Badge>
        );
      case 'QUOTE':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 shadow-none hover:bg-emerald-500/15">
            <FileText className="mr-1 h-3.5 w-3.5" /> Orçamento
          </Badge>
        );
      case 'DRAWING':
        return (
          <Badge className="bg-orange-500/15 text-orange-500 border border-orange-500/25 shadow-none hover:bg-orange-500/15">
            <Image className="mr-1 h-3.5 w-3.5" /> Catálogo
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 py-8">
      {/* Title block */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Busca Global</h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Pesquise por clientes, contatos e propostas comerciais cadastradas no sistema.
        </p>
      </div>

      {/* Main search card */}
      <Card className="border shadow-md bg-card/60 backdrop-blur-md">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="O que você está procurando?"
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchParams(
                    (prev) => {
                      if (val) {
                        prev.set('q', val);
                      } else {
                        prev.delete('q');
                      }
                      return prev;
                    },
                    { replace: true },
                  );
                }}
                className="pl-11 pr-10 py-6 text-base rounded-lg bg-background"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchParams(
                      (prev) => {
                        prev.delete('q');
                        return prev;
                      },
                      { replace: true },
                    );
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Select
              value={searchType}
              onValueChange={(val: 'ALL' | 'CLIENT' | 'CONTACT' | 'QUOTE' | 'DRAWING') =>
                setSearchType(val)
              }
            >
              <SelectTrigger className="w-full sm:w-[220px] py-6 text-base">
                <SelectValue placeholder="Filtro de Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Registros</SelectItem>
                <SelectItem value="CLIENT">Clientes</SelectItem>
                <SelectItem value="CONTACT">Contatos</SelectItem>
                <SelectItem value="QUOTE">Orçamentos</SelectItem>
                <SelectItem value="DRAWING">Catálogo</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`py-6 px-4 flex gap-2 ${showFilters ? 'bg-secondary' : ''}`}
            >
              <SlidersHorizontal className="h-5 w-5" />
              <span className="hidden sm:inline">Ajustes</span>
            </Button>
          </div>

          {/* Advanced filters dropdown */}
          {showFilters && (
            <div className="p-4 border rounded-lg bg-secondary/20 space-y-4 animate-in fade-in slide-in-from-top-2 duration-250">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Percent className="h-4 w-4" /> Sensibilidade de Correspondência (Threshold)
                  </span>
                  <span className="text-primary font-bold">{threshold}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-xs text-muted-foreground">
                  Valores menores mostram correspondências mais amplas. Valores maiores exigem
                  termos mais próximos aos cadastros originais.
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      <div className="space-y-4">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <Card key={n} className="overflow-hidden">
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-16 border border-dashed rounded-lg bg-muted/10 space-y-3">
            <X className="h-10 w-10 text-destructive/60 mx-auto" />
            <h3 className="font-medium text-lg">Erro na busca</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {(error as { normalizedError?: { message?: string } })?.normalizedError?.message ||
                'Ocorreu um erro ao realizar a busca.'}
            </p>
          </div>
        )}

        {!isLoading && !isError && searchQuery.trim().length < 2 && (
          <div className="text-center py-16 border border-dashed rounded-lg bg-muted/10 space-y-3">
            <SearchIcon className="h-10 w-10 text-muted-foreground/60 mx-auto" />
            <h3 className="font-medium text-lg">Pronto para Buscar</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Digite pelo menos 2 caracteres na caixa acima para pesquisar. Os resultados mais
              relevantes serão listados no topo.
            </p>
          </div>
        )}

        {!isLoading && !isError && searchQuery.trim().length >= 2 && data && data.length === 0 && (
          <div className="text-center py-16 border border-dashed rounded-lg bg-muted/10 space-y-3">
            <X className="h-10 w-10 text-destructive/60 mx-auto" />
            <h3 className="font-medium text-lg">Nenhum resultado encontrado</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Tente buscar termos mais genéricos ou ajuste a sensibilidade nos filtros de ajustes.
            </p>
          </div>
        )}

        {!isLoading && data && data.length > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1 text-sm text-muted-foreground">
              <span>
                Encontrado(s) <strong>{data.length}</strong> registro(s) correspondente(s)
              </span>
            </div>

            <div className="space-y-3">
              {data.map((item) => (
                <Card
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleResultClick(item)}
                  className="hover:border-primary/50 hover:bg-secondary/10 cursor-pointer transition-all hover:shadow-sm duration-200 group"
                >
                  <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {getTypeBadge(item.type)}
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getScoreColor(item.score)}`}
                        >
                          {getScoreBadgeText(item.score)}
                        </span>
                      </div>

                      <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-sm font-medium text-muted-foreground">{item.subtitle}</p>
                      {item.type === 'QUOTE' && (item.payload as any)?.matchingItems?.length > 0 ? (
                        <div className="space-y-1 mt-2">
                          {(item.payload as any).matchingItems.slice(0, 3).map((m: any) => (
                            <div
                              key={m.id}
                              className="flex items-center gap-2 text-xs bg-muted/20 p-1.5 rounded border border-border/50"
                            >
                              <Star className="h-3 w-3 text-amber-500 shrink-0" />
                              <span className="truncate flex-1">{m.project || m.description}</span>
                              <span className="text-[10px] font-medium text-primary shrink-0">
                                {Math.round((m.similarityScore || 0) * 100)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : item.description ? (
                        <p className="text-sm text-muted-foreground/80 line-clamp-2 italic bg-muted/20 p-2 rounded border border-border/50">
                          {item.description}
                        </p>
                      ) : null}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary group-hover:translate-x-1 transition-transform self-end md:self-auto"
                    >
                      Acessar <ChevronsRight className="ml-1 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
