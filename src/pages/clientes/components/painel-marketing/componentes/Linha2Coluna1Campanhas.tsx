import React, { useState, useEffect, useRef } from 'react';
import { usePainelMarketing } from '../context/PainelMarketingContext';
import { supabase } from '../../../../../lib/supabaseClient';
import { toast } from 'sonner';
import type { FormEvent } from 'react';
import type { Campanha } from '../context/PainelMarketingContext';

interface ArteBucket {
  name: string;
  url: string;
}

export const Linha2Coluna1Campanhas: React.FC = () => {
  const {
    campanhas,
    campanhaSelecionada,
    loadingCampanhas,
    setCampanhaSelecionada,
    carregarCampanhas
  } = usePainelMarketing();

  // Estados locais para controle do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [idEdicao, setIdEdicao] = useState<string | null>(null);
  const [nomeEvento, setNomeEvento] = useState('');
  const [tipoEvento, setTipoEvento] = useState<'fixo' | 'aniversario'>('fixo');
  const [msgEmail, setMsgEmail] = useState('');
  const [urlArte, setUrlArte] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Estados para o gerenciamento de mídias/arquivos do Storage
  const [artesDoBucket, setArtesDoBucket] = useState<ArteBucket[]>([]);
  const [loadingBucket, setLoadingBucket] = useState(false);
  const [abaMidia, setAbaMidia] = useState<'upload' | 'galeria'>('upload');
  const [uploadingFile, setUploadingFile] = useState(false);

  // Ref para controlar a posição do cursor no Textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ------------------------------------------------------------------
  // BUSCAR ARTES EXISTENTES NO STORAGE (BUCKET: artes-campanhas)
  // ------------------------------------------------------------------
  const carregarArtesDoStorage = async () => {
    setLoadingBucket(true);
    try {
      const { data, error } = await supabase.storage.from('artes-campanhas').list('', {
        limit: 50,
        sortBy: { column: 'name', order: 'desc' }
      });

      if (error) throw error;

      if (data) {
        // Gera a URL pública estável para cada arquivo listado no bucket
        const listaFormatada = data
          .filter(file => file.name !== '.emptyFolderPlaceholder')
          .map(file => {
            const { data: urlData } = supabase.storage.from('artes-campanhas').getPublicUrl(file.name);
            return {
              name: file.name,
              url: urlData.publicUrl
            };
          });
        setArtesDoBucket(listaFormatada);
      }
    } catch (err: any) {
      console.error('Erro ao listar galeria do storage:', err.message);
    } finally {
      setLoadingBucket(false);
    }
  };

  // Monitora a abertura da galeria para carregar as imagens sob demanda
  useEffect(() => {
    if (isModalOpen && abaMidia === 'galeria') {
      carregarArtesDoStorage();
    }
  }, [isModalOpen, abaMidia]);

  // ------------------------------------------------------------------
  // UPLOAD DE NOVA ARTE PARA O STORAGE
  // ------------------------------------------------------------------
  const handleUploadArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      // Cria um nome limpo e único usando timestamp para evitar colisões de arquivos iguais
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_campanha.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('artes-campanhas')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('artes-campanhas').getPublicUrl(fileName);
      setUrlArte(urlData.publicUrl);
      toast.success('Arte carregada e vinculada com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao fazer upload da arte: ' + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  // ------------------------------------------------------------------
  // INJEÇÃO DINÂMICA DE VARIÁVEIS NO TEXTAREA (VIA CLIQUE)
  // ------------------------------------------------------------------
  const injetarVariavel = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const textoAtual = msgEmail;

    // Reconstrói a string inserindo a variável exatamente no meio/posição do cursor
    const novoTexto = textoAtual.substring(0, startPos) + tag + textoAtual.substring(endPos);
    setMsgEmail(novoTexto);

    // Reposiciona o cursor logo após a tag injetada de forma assíncrona para o React re-renderizar
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(startPos + tag.length, startPos + tag.length);
    }, 10);
  };

  // ------------------------------------------------------------------
  // ABERTURA DOS MODAIS (CRIAR E EDITAR)
  // ------------------------------------------------------------------
  const handleAbrirCriacao = () => {
    setIdEdicao(null);
    setNomeEvento('');
    setTipoEvento('fixo');
    setMsgEmail('');
    setUrlArte('');
    setAbaMidia('upload');
    setIsModalOpen(true);
  };

  const handleAbrirEdicao = (camp: Campanha, e: React.MouseEvent) => {
    e.stopPropagation();
    setIdEdicao(camp.id);
    setNomeEvento(camp.nome_evento);
    setTipoEvento(camp.tipo_evento);
    setMsgEmail(camp.mensagem_email || '');
    setUrlArte(camp.url_arte_storage || '');
    setAbaMidia(camp.url_arte_storage ? 'galeria' : 'upload');
    setIsModalOpen(true);
  };

  // ------------------------------------------------------------------
  // SUBMIT DO FORMULÁRIO (SALVAR NO SUPABASE)
  // ------------------------------------------------------------------
  const handleSalvarCampanha = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSalvando(true);

    try {
      // 1. Obtém a sessão bruta do Auth
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      
      if (!user) {
        toast.error('Sessão expirada. Autentique-se novamente.');
        return;
      }

      // 2. BUSCA DO PERFIL REAL (Garante que leremos o corretora_id e o id correto do banco)
      const { data: perfil, error: perfilError } = await supabase
        .from('usuarios_perfis')
        .select('id, corretora_id')
        .eq('id', user.id)
        .single();

      if (perfilError || !perfil) {
        throw new Error('Não foi possível validar o escopo do seu usuário no banco.');
      }

      // 3. Aplica a amarração correta e infalível com base no perfil verificado
      const idCorretoraReal = perfil.corretora_id; 
      const idCorretorReal = perfil.id;

      const dadosPayload = {
        nome_evento: nomeEvento,
        tipo_evento: tipoEvento,
        mensagem_email: msgEmail,
        url_arte_storage: urlArte || null,
        corretora_id: idCorretoraReal, // ID da Empresa (e8d1fdac...)
        corretor_id: idCorretorReal,   // ID do Usuário (ca91a699...)
        updated_at: new Date().toISOString()
      };

      if (idEdicao) {
        const { error } = await supabase
          .from('tab_campanhas')
          .update(dadosPayload)
          .eq('id', idEdicao);

        if (error) throw error;
        toast.success('Campanha atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('tab_campanhas')
          .insert([{ ...dadosPayload, created_at: new Date().toISOString() }]);

        if (error) throw error;
        toast.success('Nova campanha registrada com sucesso!');
      }

      setIsModalOpen(false);
      carregarCampanhas();
    } catch (err: any) {
      toast.error('Erro ao gravar campanha: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirCampanha = async (idCampanha: string, nomeCampanha: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita selecionar a campanha ao clicar em excluir

    const confirmar = window.confirm(`Tem certeza que deseja excluir a campanha "${nomeCampanha}"?`);
    if (!confirmar) return;

    try {
      const { error } = await supabase
        .from('tab_campanhas')
        .delete()
        .eq('id', idCampanha);

      if (error) throw error;

      toast.success('Campanha excluída com sucesso!');
      
      // Se a campanha excluída for a que estava selecionada no painel, limpa a seleção
      if (campanhaSelecionada?.id === idCampanha) {
        setCampanhaSelecionada(null);
      }
      
      carregarCampanhas(); // Atualiza a lista mãe
    } catch (err: any) {
      toast.error('Erro ao excluir campanha: ' + err.message);
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[520px]">
      
      {/* CABEÇALHO DA COLUNA */}
      <div className="flex justify-between items-center border-b pb-2 mb-3">
        <div>
          <h2 className="font-semibold text-sm text-gray-700">📅 1. Campanhas e Gatilhos</h2>
          <p className="text-[10px] text-gray-400">Regras e templates cadastrados</p>
        </div>
        <button
          onClick={handleAbrirCriacao}
          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
        >
          + Nova Regra
        </button>
      </div>

      {/* ÁREA DE LISTAGEM */}
      <div className="overflow-y-auto flex-1 space-y-2 pr-1 custom-scrollbar">
        {loadingCampanhas ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-xs text-gray-400 animate-pulse">Consultando tab_campanhas...</p>
          </div>
        ) : campanhas.length === 0 ? (
          <div className="text-center py-12 text-xs text-gray-400">
            Nenhuma campanha configurada neste perfil.
          </div>
        ) : (
          campanhas.map((camp) => {
            const isSelected = campanhaSelecionada?.id === camp.id;
            return (
              <div
                key={camp.id}
                onClick={() => setCampanhaSelecionada(isSelected ? null : camp)}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/40 shadow-sm ring-1 ring-blue-500'
                    : 'border-gray-100 hover:border-gray-300 bg-slate-50/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    camp.tipo_evento === 'aniversario' 
                      ? 'bg-pink-50 text-pink-700' 
                      : 'bg-indigo-50 text-indigo-700'
                  }`}>
                    {camp.tipo_evento === 'aniversario' ? '🎂 Aniversário' : '⏱️ Recorrente/Fixo'}
                  </span>
                  {/* GRUPO DE AÇÕES: EDITAR E EXCLUIR */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleAbrirEdicao(camp, e)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5"
                  >
                    ✏️ Editar
                  </button>
                  <span className="text-gray-300 text-[10px]">|</span>
                  <button
                    onClick={(e) => handleExcluirCampanha(camp.id, camp.nome_evento, e)}
                    className="text-[11px] text-red-500 hover:text-red-700 font-medium flex items-center gap-0.5"
                    title="Excluir Campanha"
                  >
                    🗑️ Excluir
                  </button>
                  </div>
                </div>

                <h3 className="font-bold text-xs text-gray-800 mt-2 line-clamp-1">
                  {camp.nome_evento}
                </h3>
                
                <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 font-sans">
                  {camp.mensagem_email || '(Sem template de e-mail definido)'}
                </p>

                {camp.url_arte_storage && (
                  <div className="mt-2 text-[10px] text-gray-400 flex items-center gap-1.5 bg-white p-1 rounded border border-gray-100">
                    <img src={camp.url_arte_storage} alt="Arte" className="w-5 h-5 object-cover rounded" />
                    <span>🖼️ Imagem vinculada e ativa</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ====================================================================
          MODAL AVANÇADO DE CRIAÇÃO E CONFIGURAÇÃO DE CAMPANHAS
         ==================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            
            {/* HEAD */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-sm">
                  {idEdicao ? '📝 Modificar Regra de Campanha' : '✨ Nova Regra de Campanha'}
                </h3>
                <p className="text-[10px] text-slate-300">Estruturação de gatilho, tags e mídias</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors text-xs"
              >
                ✕ Fechar
              </button>
            </div>

            {/* FORM CONTAINER COM SCROLL INTERNO SE PRECISAR */}
            <form onSubmit={handleSalvarCampanha} className="p-5 space-y-4 text-left overflow-y-auto flex-1 custom-scrollbar">
              
              {/* CAMPO: TÍTULO */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Título da Campanha</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Campanha de Boas-Vindas ou Renovação de Apólices"
                  value={nomeEvento}
                  onChange={(e) => setNomeEvento(e.target.value)}
                  className="w-full p-2 text-xs border rounded-lg focus:border-blue-500 outline-none"
                />
              </div>

              {/* GRID: GATILHO E INPUT MANUAL DE URL */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Gatilho de Disparo</label>
                  <select
                    value={tipoEvento}
                    onChange={(e) => setTipoEvento(e.target.value as 'fixo' | 'aniversario')}
                    className="w-full p-2 text-xs border rounded-lg focus:border-blue-500 outline-none bg-white font-medium"
                  >
                    <option value="fixo">⏱️ Envio Manual / Lote Fixo</option>
                    <option value="aniversario">🎂 Disparo por Aniversário</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">URL Direta da Arte (Opcional)</label>
                  <input 
                    type="url" 
                    placeholder="Link direto ou gerado automaticamente..."
                    value={urlArte}
                    onChange={(e) => setUrlArte(e.target.value)}
                    className="w-full p-2 text-xs border rounded-lg focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* SEÇÃO INTEGRADA: STORAGE (ARTES-CAMPANHAS) */}
              <div className="bg-slate-50 p-3 rounded-xl border border-gray-100 space-y-2">
                <div className="flex justify-between items-center border-b pb-1.5">
                  <span className="text-[10px] font-bold text-slate-700 uppercase">🖼️ Gerenciador de Artes Integrado</span>
                  <div className="flex gap-1 bg-white p-0.5 rounded-lg border">
                    <button
                      type="button"
                      onClick={() => setAbaMidia('upload')}
                      className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all ${abaMidia === 'upload' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                      Upload Local
                    </button>
                    <button
                      type="button"
                      onClick={() => setAbaMidia('galeria')}
                      className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all ${abaMidia === 'galeria' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                      Ver Galeria Bucket
                    </button>
                  </div>
                </div>

                {/* ABA DE UPLOAD LOCAL */}
                {abaMidia === 'upload' && (
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-lg p-3 bg-white cursor-pointer hover:bg-gray-50 transition-colors">
                      <span className="text-[11px] font-medium text-blue-600">
                        {uploadingFile ? '🚀 Enviando para o Storage...' : '📂 Clique para selecionar imagem'}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleUploadArquivo} 
                        disabled={uploadingFile} 
                      />
                    </label>
                    {urlArte && (
                      <div className="w-14 h-14 border rounded-lg overflow-hidden shrink-0 bg-white shadow-xs relative group">
                        <img src={urlArte} alt="Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setUrlArte('')} className="absolute inset-0 bg-black/60 text-white text-[9px] font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">Remover</button>
                      </div>
                    )}
                  </div>
                )}

                {/* ABA DE GALERIA DO BUCKET */}
                {abaMidia === 'galeria' && (
                  <div className="space-y-1.5">
                    {loadingBucket ? (
                      <p className="text-[10px] text-center text-gray-400 py-4 animate-pulse">Lendo bucket artes-campanhas...</p>
                    ) : artesDoBucket.length === 0 ? (
                      <p className="text-[10px] text-center text-gray-400 py-4">Nenhuma arte encontrada na raiz deste bucket.</p>
                    ) : (
                      <div className="grid grid-cols-5 gap-2 max-h-[105px] overflow-y-auto pr-1 custom-scrollbar">
                        {artesDoBucket.map((item) => {
                          const isActive = urlArte === item.url;
                          return (
                            <div
                              key={item.name}
                              onClick={() => setUrlArte(item.url)}
                              className={`aspect-square rounded-md border overflow-hidden cursor-pointer relative bg-white transition-all ${isActive ? 'ring-2 ring-blue-500 border-transparent shadow-xs' : 'hover:border-gray-400'}`}
                              title={item.name}
                            >
                              <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                              {isActive && (
                                <div className="absolute top-0.5 right-0.5 bg-blue-600 text-white text-[7px] w-3 h-3 rounded-full flex items-center justify-center font-bold">✓</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CAMPO TEXTAREA + SELETOR DE TAGS DINÂMICAS */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase block">Conteúdo do E-mail</label>
                  
                  {/* BARRA DE VARIÁVEIS POR CLIQUE */}
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-400 font-medium mr-1">Injetar variável:</span>
                    <button
                      type="button"
                      onClick={() => injetarVariavel('{nome}')}
                      className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-[10px] font-bold rounded border border-blue-200 shadow-2xs transition-colors"
                      title="Insere o Nome Completo do Lead"
                    >
                      {'{nome}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => injetarVariavel('{nome_fantasia}')}
                      className="px-2 py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 text-[10px] font-bold rounded border border-purple-200 shadow-2xs transition-colors"
                      title="Insere o Nome Fantasia / Razão Social"
                    >
                      {'{nome_fantasia}'}
                    </button>
                  </div>
                </div>

                <textarea 
                  ref={textareaRef}
                  rows={5}
                  required
                  placeholder="Olá {nome}, tudo bem? Identificamos ótimas condições para sua empresa {nome_fantasia}..."
                  value={msgEmail}
                  onChange={(e) => setMsgEmail(e.target.value)}
                  className="w-full p-2 text-xs border rounded-lg focus:border-blue-500 outline-none font-sans leading-relaxed"
                />
              </div>

              {/* FOOTER DO FORM COM AÇÕES DE SALVAMENTO */}
              <div className="pt-3 border-t flex justify-end gap-2 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-bold shadow-sm transition-colors"
                >
                  {salvando ? 'Salvando...' : '💾 Salvar Configuração'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};