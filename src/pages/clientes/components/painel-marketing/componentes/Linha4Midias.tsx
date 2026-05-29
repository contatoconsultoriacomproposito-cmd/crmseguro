import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../../lib/supabaseClient';
import { useAuth } from '../../../../../auth/AuthContext';
import { toast } from 'sonner';

interface ItemMidia {
  name: string;
  id: string;
  url: string;
  created_at: string;
}

export const Linha4Midias: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [midias, setMidias] = useState<ItemMidia[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const idCorretoraReal = userProfile?.corretora_id || (user as any)?.corretora_id || user?.id;
  
  // CORREÇÃO 1: Nome exato do bucket conforme visto no seu painel do Supabase
  const BUCKET_NAME = 'artes-campanhas';

  // ------------------------------------------------------------------
  // LISTAR ARQUIVOS DO STORAGE
  // ------------------------------------------------------------------
  const listarMidias = async () => {
    setCarregando(true);
    try {
      // CORREÇÃO 2: Removido o filtro de pasta antiga. 
      // Busca direto na raiz do bucket, onde suas imagens realmente estão.
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list('', {
          limit: 100,
          sortBy: { column: 'name', order: 'desc' },
        });

      if (error) throw error;

      if (data) {
        const itensFormatados: ItemMidia[] = data
          .filter((arquivo) => arquivo.name !== '.emptyFolderPlaceholder')
          .map((arquivo) => {
            // CORREÇÃO 3: URL pública gerada a partir da raiz do bucket correto
            const { data: urlData } = supabase.storage
              .from(BUCKET_NAME)
              .getPublicUrl(arquivo.name);

            return {
              id: arquivo.id || `${arquivo.name}-${arquivo.created_at}`,
              name: arquivo.name,
              url: urlData.publicUrl,
              created_at: arquivo.created_at,
            };
          });

        setMidias(itensFormatados);
      }
    } catch (err: any) {
      console.error('Erro ao listar mídias:', err.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    listarMidias();
  }, [idCorretoraReal]);

  // ------------------------------------------------------------------
  // UPLOAD DE NOVA ARTE
  // ------------------------------------------------------------------
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith('image/')) {
      toast.warning('Por favor, selecione apenas arquivos de imagem (PNG, JPG, WEBP).');
      return;
    }

    setEnviando(true);
    try {
      // Sanitiza o nome do arquivo e salva direto na raiz para manter o padrão atual
      const nomeLimpo = `${Date.now()}-${arquivo.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(nomeLimpo, arquivo, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      toast.success('Arte armazenada com sucesso!');
      listarMidias();
    } catch (err: any) {
      toast.error('Falha ao enviar arquivo: ' + err.message);
    } finally {
      setEnviando(false);
    }
  };

  // ------------------------------------------------------------------
  // EXCLUSÃO EM CASCATA
  // ------------------------------------------------------------------
  const handleDeletarMidia = async (item: ItemMidia) => {
    const confirmar = window.confirm('Deseja realmente excluir esta arte? Esta ação removerá o vínculo de todas as campanhas mães associadas.');
    if (!confirmar) return;

    try {
      // Deleta direto do caminho correto (raiz do bucket)
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([item.name]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('tab_campanhas')
        .update({ url_arte_storage: null })
        .eq('url_arte_storage', item.url);

      if (dbError) throw dbError;

      toast.success('Mídia removida e campanhas atualizadas.');
      setMidias((atual) => atual.filter((m) => m.name !== item.name));
    } catch (err: any) {
      toast.error('Erro na exclusão em cascata: ' + err.message);
    }
  };

  return (
    <div className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[280px]">
      
      <div className="flex justify-between items-center border-b pb-2 mb-3">
        <div>
          <h2 className="font-semibold text-sm text-gray-700">🖼️ 4. Central de Mídias e Artes</h2>
          <p className="text-[10px] text-gray-400">Imagens salvas no seu bucket de armazenamento</p>
        </div>

        <label className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border transition-all cursor-pointer ${
          enviando 
            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-gray-200'
        }`}>
          {enviando ? 'Enviando Imagem...' : '📤 Enviar Nova Arte'}
          <input type="file" accept="image/*" disabled={enviando} onChange={handleUpload} className="hidden" />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {carregando ? (
          <div className="flex items-center justify-center h-full py-6">
            <p className="text-xs text-gray-400 animate-pulse">Sincronizando com Supabase Storage...</p>
          </div>
        ) : midias.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full border border-dashed rounded-xl bg-slate-50/50 p-4 text-center">
            <p className="text-xs text-gray-400">Sua galeria corporativa está vazia.</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Suba artes para copiar o link direto para os templates de e-mail.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {midias.map((item) => (
              <div 
                key={item.id} 
                className="group relative bg-slate-50 border border-gray-100 rounded-xl overflow-hidden aspect-square flex flex-col justify-between hover:shadow-xs hover:border-gray-300 transition-all"
              >
                <div className="flex-1 bg-slate-200 flex items-center justify-center overflow-hidden">
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>

                <div className="bg-white p-1 text-[9px] border-t flex justify-between items-center gap-1">
                  <span className="text-gray-500 font-mono truncate max-w-[70%]" title={item.name}>
                    {item.name}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(item.url);
                      toast.success('URL copiada para a área de transferência!');
                    }}
                    className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                    title="Copiar URL Pública"
                  >
                    🔗
                  </button>
                </div>

                <button
                  onClick={() => handleDeletarMidia(item)}
                  className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Excluir Definitivamente"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};