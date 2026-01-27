import { useState, useEffect } from 'react';
import { X, FileText, Paperclip, Loader2, CheckCircle2, Eye, Trash2, Plus } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

interface ModalDocumentosProps {
  cliente: any;
  onClose: () => void;
}

export const ModalDocumentos = ({ cliente, onClose }: ModalDocumentosProps) => {
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const tiposObrigatorios = [
    { id: 'RG_CNH', label: 'Documento Pessoal (RG/CNH)' },
    { id: 'RESIDENCIA', label: 'Comprovante de Residência' },
    { id: 'APOLICE', label: 'Contrato de Apólice' },
    { id: 'CONTRATO_SOCIAL', label: 'Contrato Social' },
  ];

  useEffect(() => {
    buscarDocumentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente.id]);

  async function buscarDocumentos() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tab_documentos')
        .select('*')
        .eq('cliente_id', cliente.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setDocumentos(data);
    } catch (error: any) {
      console.error("Erro ao buscar documentos:", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, tipo: string) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(tipo);
      
      // Criamos um nome único para o arquivo para evitar sobrescrita
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${cliente.id}/${fileName}`; // Organizado por ID do cliente

      // 1. Upload para o Storage
      const { error: uploadError } = await supabase.storage
        .from('documentos_clientes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Pegar URL Pública
      const { data: { publicUrl } } = supabase.storage
        .from('documentos_clientes')
        .getPublicUrl(filePath);

      // 3. Salvar referência no Banco (incluindo o storage_path)
      const { error: dbError } = await supabase.from('tab_documentos').insert([{
        cliente_id: cliente.id,
        nome_arquivo: file.name,
        url_arquivo: publicUrl,
        tipo: tipo,
        storage_path: filePath, // Agora com a coluna correta
        corretora_id: cliente.corretora_id,
        corretor_id: cliente.corretor_id
      }]);

      if (dbError) throw dbError;

      await buscarDocumentos();
    } catch (error: any) {
      alert("Erro no upload: " + error.message);
    } finally {
      setUploading(null);
    }
  }

  async function deletarDocumento(idDoc: string, storagePath: string) {
    if (!confirm("Deseja excluir este documento permanentemente?")) return;
    
    try {
      // 1. Deletar o arquivo físico do Storage
      if (storagePath) {
        await supabase.storage
          .from('documentos_clientes')
          .remove([storagePath]);
      }

      // 2. Deletar o registro da tabela
      const { error } = await supabase
        .from('tab_documentos')
        .delete()
        .eq('id', idDoc);

      if (error) throw error;

      // Atualiza o estado local para sumir da tela na hora
      setDocumentos(prev => prev.filter(d => d.id !== idDoc));
    } catch (error: any) {
      alert("Erro ao deletar: " + error.message);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-[32px] w-full max-w-2xl shadow-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden">
        
        {/* Header do Modal */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-zinc-100">Documentos</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase italic">{cliente.nome || cliente.razao_social}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="animate-spin mb-2" size={32} />
              <span className="text-xs font-bold uppercase tracking-widest">Carregando arquivos...</span>
            </div>
          ) : (
            <>
              {/* Grid de Documentos Obrigatórios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tiposObrigatorios.map((tipo) => {
                  const doc = documentos.find(d => d.tipo === tipo.id);
                  return (
                    <div key={tipo.id} className={`p-4 rounded-2xl border-2 transition-all ${doc ? 'border-emerald-100 bg-emerald-50/20 dark:border-emerald-900/30' : 'border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">{tipo.label}</span>
                        {doc && <CheckCircle2 size={16} className="text-emerald-500" />}
                      </div>
                      
                      {doc ? (
                        <div className="flex items-center gap-2">
                          <a href={doc.url_arquivo} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg truncate">
                            <Eye size={14} /> Visualizar
                          </a>
                          <button onClick={() => deletarDocumento(doc.id, doc.storage_path)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-2 p-2 border border-dashed border-slate-300 dark:border-zinc-700 rounded-lg text-[10px] font-bold text-slate-400 hover:border-blue-500 hover:text-blue-500 cursor-pointer transition-all">
                          {uploading === tipo.id ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                          ANEXAR AGORA
                          <input type="file" className="hidden" onChange={(e) => handleUpload(e, tipo.id)} disabled={!!uploading} />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Seção de Outros Documentos */}
              <div className="mt-8">
                <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-[0.2em] flex items-center gap-2">
                  <Paperclip size={14} /> Outros Documentos
                </h3>
                <div className="space-y-2">
                    {documentos.filter(d => d.tipo === 'OUTROS').map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-800">
                            <span className="text-xs font-medium text-slate-600 dark:text-zinc-300 truncate max-w-[200px]">{doc.nome_arquivo}</span>
                            <div className="flex gap-2">
                                <a href={doc.url_arquivo} target="_blank" rel="noreferrer" className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors"><Eye size={16} /></a>
                                <button onClick={() => deletarDocumento(doc.id, doc.storage_path)} className="p-1.5 text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                    <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-blue-100 dark:border-blue-900/30 rounded-xl text-xs font-bold text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-all">
                        <input type="file" className="hidden" onChange={(e) => handleUpload(e, 'OUTROS')} />
                        + Adicionar outro documento
                    </label>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};