import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Download,
  Upload,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  Image,
  MessageSquare,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fmtBRL } from '@/lib/format';
import { downloadBlob } from '@/lib/download';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

interface StandardDrawingVersion {
  id: string;
  version: number;
  filePath: string;
  docFilePath?: string;
  changelog?: string;
  createdAt: string;
  createdBy: string;
}

interface Category {
  id: string;
  name: string;
}

interface StandardDrawing {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: string;
  categoryId?: string;
  category?: Category;
  basePrice?: number;
  thumbnail?: string;
  versions: StandardDrawingVersion[];
}

interface CatalogDetailPanelProps {
  drawingId: string | null;
  onClose: () => void;
  onEdit?: (id: string) => void;
}

export function CatalogDetailPanel({ drawingId, onClose, onEdit }: CatalogDetailPanelProps) {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingCadFile, setPendingCadFile] = useState<File | null>(null);
  const [pendingDocFile, setPendingDocFile] = useState<File | null>(null);
  const [changelog, setChangelog] = useState('');
  const [isThumbnailUploading, setIsThumbnailUploading] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const cadInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const { data: drawing, isLoading } = useQuery<StandardDrawing>({
    queryKey: ['standard-drawings', drawingId],
    queryFn: async () => {
      const { data } = await api.get(`/catalog/standard-drawings/${drawingId}`);
      return data;
    },
    enabled: !!drawingId,
  });

  const thumbnailMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('thumbnail', file);
      await api.post(`/catalog/standard-drawings/${drawingId}/thumbnail`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standard-drawings'] });
      queryClient.invalidateQueries({ queryKey: ['standard-drawings', drawingId] });
      setIsThumbnailUploading(false);
      toast.success('Thumbnail atualizada!');
    },
    onError: () => {
      setIsThumbnailUploading(false);
      toast.error('Erro ao enviar thumbnail.');
    },
  });

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsThumbnailUploading(true);
    thumbnailMutation.mutate(file);
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/catalog/standard-drawings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standard-drawings'] });
      queryClient.invalidateQueries({ queryKey: ['standard-drawings', drawingId] });
      setDeletingId(null);
      onClose();
      toast.success('Desenho removido!');
    },
    onError: () => toast.error('Erro ao remover desenho.'),
  });

  const handleUpload = async () => {
    if (!drawingId || (!pendingCadFile && !pendingDocFile)) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      if (pendingCadFile) formData.append('cadFile', pendingCadFile);
      if (pendingDocFile) formData.append('docFile', pendingDocFile);
      if (changelog) formData.append('changelog', changelog);
      await api.post(`/catalog/standard-drawings/${drawingId}/versions`, formData);
      queryClient.invalidateQueries({ queryKey: ['standard-drawings'] });
      queryClient.invalidateQueries({ queryKey: ['standard-drawings', drawingId] });
      setPendingCadFile(null);
      setPendingDocFile(null);
      setChangelog('');
      toast.success('Nova versão cadastrada!');
    } catch {
      toast.error('Erro ao enviar arquivos.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Sheet
        open={!!drawingId}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <SheetContent className="sm:max-w-xl w-full px-6">
          <SheetHeader className="mb-4 px-1">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle>{isLoading ? 'Carregando...' : drawing?.name}</SheetTitle>
                {drawing && <SheetDescription>{drawing.code}</SheetDescription>}
              </div>
            </div>
          </SheetHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !drawing ? (
            <p className="text-sm text-muted-foreground text-center py-16">
              Desenho não encontrado.
            </p>
          ) : (
            <Tabs
              defaultValue="details"
              className="flex flex-col h-full overflow-hidden gap-0 mb-1"
            >
              <TabsList className="grid grid-cols-2 mx-1">
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                <TabsTrigger value="upload">Upload</TabsTrigger>
              </TabsList>
              <TabsContent
                value="details"
                className="flex-1 overflow-hidden flex flex-col mt-0 px-2 pb-4"
              >
                <div className="space-y-4">
                  <div className="relative">
                    {drawing.thumbnail ? (
                      <img
                        src={`${API_URL}${drawing.thumbnail}`}
                        alt={drawing.name}
                        className="w-full h-40 rounded-lg object-cover mt-2"
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded-lg bg-muted">
                        <Image className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 gap-1 h-7 text-xs bg-background/80 backdrop-blur-sm"
                      disabled={isThumbnailUploading}
                      onClick={() => thumbnailInputRef.current?.click()}
                    >
                      {isThumbnailUploading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      {drawing.thumbnail ? 'Trocar' : 'Adicionar'}
                    </Button>
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      className="hidden"
                      onChange={handleThumbnailUpload}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={drawing.type === 'PRODUCT' ? 'default' : 'secondary'}>
                        {drawing.type === 'PRODUCT' ? 'Produto' : 'Auxiliar (CAD)'}
                      </Badge>
                      {drawing.category && (
                        <span className="text-xs text-muted-foreground">
                          {drawing.category.name}
                        </span>
                      )}
                    </div>
                    {drawing.description && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {drawing.description}
                      </p>
                    )}
                    {drawing.basePrice != null && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Custo Base:</span>
                        <span className="font-medium">{fmtBRL(drawing.basePrice)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4 mt-4 flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">
                      Versões
                      {drawing.versions.length > 0 && (
                        <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                          {drawing.versions.length}
                        </Badge>
                      )}
                    </h4>
                  </div>
                  {drawing.versions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma versão cadastrada.
                    </p>
                  ) : (
                    <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                      {drawing.versions.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <p className="text-sm font-medium">v{v.version}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(v.createdAt).toLocaleString('pt-BR')}
                            </p>
                            {v.changelog && (
                              <p className="text-xs text-muted-foreground truncate">
                                {v.changelog}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {v.filePath && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1"
                                onClick={async () => {
                                  try {
                                    await downloadBlob(
                                      `/catalog/standard-drawings/${drawing.id}/versions/${v.version}/download`,
                                      `CAD_${drawing.code}_v${v.version}`,
                                    );
                                  } catch {
                                    toast.error('Erro ao baixar arquivo');
                                  }
                                }}
                              >
                                <Download className="h-3 w-3" /> CAD
                              </Button>
                            )}
                            {v.docFilePath && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1"
                                onClick={async () => {
                                  try {
                                    await downloadBlob(
                                      `/catalog/standard-drawings/${drawing.id}/versions/${v.version}/download-doc`,
                                      `DOC_${drawing.code}_v${v.version}`,
                                    );
                                  } catch {
                                    toast.error('Erro ao baixar arquivo');
                                  }
                                }}
                              >
                                <FileText className="h-3 w-3" /> Doc
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent
                value="upload"
                className="flex-1 overflow-y-auto mt-0 px-2 pb-4 space-y-3"
              >
                <h4 className="text-sm font-semibold mt-2">Upload Nova Versão</h4>
                <div className="p-4 rounded-lg border border-dashed border-muted-foreground/30">
                  <p className="text-sm font-medium mb-2">Upload CAD</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    .dwg, .dxf, .pdf, .stp, .step
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={isUploading}
                    onClick={() => cadInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {pendingCadFile ? pendingCadFile.name : 'Selecionar CAD'}
                  </Button>
                  <input
                    ref={cadInputRef}
                    type="file"
                    accept=".dwg,.dxf,.pdf,.stp,.step,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setPendingCadFile(file);
                      if (cadInputRef.current) cadInputRef.current.value = '';
                    }}
                  />
                </div>

                <div className="p-4 rounded-lg border border-dashed border-muted-foreground/30">
                  <p className="text-sm font-medium mb-2">Upload Documento</p>
                  <p className="text-xs text-muted-foreground mb-3">.pdf, .doc, .docx</p>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={isUploading}
                    onClick={() => docInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {pendingDocFile ? pendingDocFile.name : 'Selecionar Documento'}
                  </Button>
                  <input
                    ref={docInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setPendingDocFile(file);
                      if (docInputRef.current) docInputRef.current.value = '';
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />O que mudou nesta versão?
                  </label>
                  <textarea
                    className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Ex: Corrigido furo de 10mm, revisão do cliente..."
                    value={changelog}
                    onChange={(e) => setChangelog(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full gap-2"
                  disabled={isUploading || (!pendingCadFile && !pendingDocFile)}
                  onClick={handleUpload}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isUploading ? 'Enviando...' : 'Enviar Versão'}
                </Button>
              </TabsContent>
            </Tabs>
          )}

          {drawing && (
            <div className="flex items-center justify-end gap-2 py-4 border-t">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => onEdit?.(drawing.id)}
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={() => setDeletingId(drawing.id)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Desenho?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
