// src/pages/parceiros/components/PainelAcoes.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { 
  User, Phone, Mail, FileText,
  CheckCircle2, XCircle, Clock, 
  Link,
  MessageSquare, Download, ExternalLink,
  ShieldCheck, Building2, Paperclip,
  Briefcase, Landmark, RefreshCwIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ModuloCotacao } from './ModuloCotacao'; 

interface PainelAcoesProps {
  indicacao: any;
  loading: boolean;
  acoes: {
    iniciarAtendimento: () => void;
    abrirVinculo: () => void;
    setModoCotacao: (val: boolean) => void;
    setShowRecusaModal: (val: boolean) => void;
    setShowComissaoModal: (val: boolean) => void;
    finalizarVendaDireta: () => void;
    enviarDadosCotacao: (dados: any) => void;
  };
  modoCotacao: boolean;
  maskCurrency: (val: string) => string;
}

export const PainelAcoes: React.FC<PainelAcoesProps> = ({ 
  indicacao, loading, acoes, modoCotacao, maskCurrency 
}) => {
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [nomeCorretor, setNomeCorretor] = useState('NÃO ASSUMIDO');
  const [nomeCorretora, setNomeCorretora] = useState('NÃO DEFINIDA');
  const [dadosCotacao, setDadosCotacao] = useState<any>(null);
  const [loadingCotacao, setLoadingCotacao] = useState(false); // Novo estado de loading interno

  // Esse useEffect agora é "blindado" pela key dinâmica do componente pai
  useEffect(() => {
    if (indicacao?.id) {
      // Resetamos os dados para evitar "fantasmas" de indicações anteriores
      setDadosCotacao(null);
      
      fetchDocumentos();
      fetchNomesPerfis();
      fetchDadosCotacao();
    }
  }, [indicacao?.id]); // Apenas o ID é suficiente agora devido à key dinâmica

  const fetchNomesPerfis = async () => {
    try {
      // Busca Corretor
      if (indicacao?.corretor_id) {
        const { data: corr } = await supabase
          .from('usuarios_perfis')
          .select('nome')
          .eq('id', indicacao.corretor_id)
          .maybeSingle(); // Use maybeSingle para evitar erro de '0 rows'
        if (corr) setNomeCorretor(corr.nome);
      } else {
        setNomeCorretor('NÃO ASSUMIDO');
      }

      // Busca Corretora - Só tenta buscar se houver um ID válido
      if (indicacao?.corretora_id && indicacao.corretora_id !== 'NÃO DEFINIDA') {
        const { data: cort } = await supabase
          .from('usuarios_perfis')
          .select('nome')
          .eq('id', indicacao.corretora_id)
          .maybeSingle();
        if (cort) setNomeCorretora(cort.nome);
      } else {
        setNomeCorretora('AGUARDANDO DEFINIÇÃO');
      }
    } catch (err) {
      console.error("Erro silencioso nos perfis:", err);
    }
  };

  const fetchDocumentos = async () => {
    if (!indicacao?.id) return;
    setLoadingDocs(true);
    try {
      const { data, error } = await supabase
        .from('tab_indicacoes_documentos')
        .select('*')
        .eq('indicacao_id', indicacao.id);
      
      // Se o erro for de RLS, ele cairá aqui
      if (error) {
        console.warn("Acesso negado aos documentos por RLS");
        setDocumentos([]);
        return;
      }
      setDocumentos(data || []);
    } catch (err) {
      setDocumentos([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const fetchDadosCotacao = async () => {
    setLoadingCotacao(true);
    try {
      const { data, error } = await supabase
        .from('tab_indicacoes_cotacoes')
        .select('*')
        .eq('indicacao_id', indicacao.id)
        .order('data_envio', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setDadosCotacao(data || null);
    } catch (err) {
      console.error("Erro ao buscar cotação:", err);
    } finally {
      setLoadingCotacao(false);
    }
  };

  if (!indicacao) return null;

  // --- RENDERS ---

  const renderHeader = () => (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl">
          <User size={32} />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-black text-slate-800 uppercase italic leading-none">{indicacao.nome_cliente}</h2>
            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${
                indicacao.status_indicacao === 'NOVO' ? 'bg-orange-100 text-orange-600' : 
                indicacao.status_indicacao === 'PERDIDO' ? 'bg-red-100 text-red-600' : 
                'bg-blue-100 text-blue-600'
              }`}>
                {indicacao.status_indicacao.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span className="flex items-center gap-1.5 italic text-blue-500 font-bold">
                <Clock size={12}/> {format(new Date(indicacao.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
              </span>
              <span className="flex items-center gap-1.5"><Building2 size={12}/> ID: {indicacao.id.split('-')[0]}</span>
          </div>
        </div>
      </div>
      
      <div className="flex gap-2">
        {!['VENDIDO', 'PERDIDO'].includes(indicacao.status_indicacao) && (
          <button 
            onClick={() => acoes.setShowRecusaModal(true)}
            className="h-14 px-6 rounded-2xl border-2 border-slate-100 text-slate-400 hover:text-red-600 hover:border-red-100 transition-all group flex items-center gap-2"
          >
            <XCircle size={20} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Recusar</span>
          </button>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    if (modoCotacao) {
      return (
        <ModuloCotacao 
          onBack={() => acoes.setModoCotacao(false)}
          maskCurrency={maskCurrency}
          onSend={(dados) => {
            acoes.enviarDadosCotacao(dados);
          }}
        />
      );
    }

    // Se estiver carregando a cotação, mostra um estado de esqueleto para evitar confusão
    if (loadingCotacao) {
      return (
        <div className="py-10 text-center animate-pulse">
          <RefreshCwIcon size={32} className="mx-auto text-slate-300 animate-spin mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Dossiê...</p>
        </div>
      );
    }

    switch (indicacao.status_indicacao) {
      case 'NOVO':
        return (
          <div className="bg-orange-50/50 border-2 border-dashed border-orange-200 rounded-[3rem] p-12 text-center">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Clock className="text-orange-500 animate-pulse" size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase italic mb-2">Aguardando Triagem</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-8 font-medium">Análise o dossiê abaixo antes de assumir o atendimento.</p>
            <button 
              onClick={acoes.iniciarAtendimento}
              disabled={loading}
              className="h-16 px-10 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95"
            >
              {loading ? "Processando..." : "Assumir Indicação agora"}
            </button>
          </div>
        );
      
      case 'PERDIDO':
        return (
          <div className="bg-red-50/50 border-2 border-dashed border-red-200 rounded-[3rem] p-12 text-center">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <XCircle className="text-red-500" size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase italic mb-2">Processo Encerrado</h3>
            <div className="bg-white p-6 rounded-2xl border border-red-100 inline-block text-left max-w-md w-full shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Motivo da Perda:</p>
              <p className="text-xs text-red-600 font-bold uppercase italic leading-relaxed">
                {indicacao.motivo_perda || "Motivo não especificado"}
              </p>
            </div>
          </div>
        );   

      case 'EM_ATENDIMENTO':
        return (
          <div className="flex flex-col items-center gap-6 py-10">
             <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                <Briefcase size={32} />
             </div>
             <div className="text-center">
                <h3 className="text-lg font-black text-slate-800 uppercase italic">Indicação em Análise</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">Próximo passo: Gerar a cotação técnica para o parceiro.</p>
             </div>
             <button onClick={() => acoes.setModoCotacao(true)} className="h-20 w-full max-w-md bg-purple-600 text-white rounded-[2rem] font-black uppercase text-[11px] flex items-center justify-center gap-3 hover:bg-purple-700 transition-all shadow-xl shadow-purple-100">
                <FileText size={24} /> Criar Cotação Técnica
             </button>
          </div>
        );

      case 'APROVADA_PARCEIRO':
        return (
          <div className="space-y-6">
            <div className="bg-emerald-50 border-2 border-emerald-100 rounded-[2.5rem] p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4 className="font-black text-emerald-800 uppercase italic text-sm leading-none">Proposta Aceita!</h4>
                <p className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider mt-1">O parceiro aprovou o orçamento.</p>
              </div>
            </div>

            <div className="bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-8 text-center">
               {indicacao.id_cliente_crm ? (
                 <div className="flex flex-col items-center gap-2">
                   <ShieldCheck className="text-blue-500" size={32} />
                   <h4 className="font-black text-slate-800 uppercase italic">Cliente Vinculado ao CRM</h4>
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Pronto para finalizar a venda.</p>
                 </div>
               ) : (
                 <div className="flex flex-col items-center gap-4">
                   <h4 className="font-black text-slate-800 uppercase italic">Vínculo com o CRM Pendente</h4>
                   <button onClick={acoes.abrirVinculo} className="h-14 px-10 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 transition-all shadow-xl flex items-center justify-center gap-2">
                     <Link size={16} /> Vincular Agora
                   </button>
                 </div>
               )}
            </div>
          </div>
        );

      case 'VENDIDO':
        return (
          <div className="bg-emerald-500 rounded-[3rem] p-12 text-center text-white shadow-xl shadow-emerald-200">
            <CheckCircle2 size={48} className="mx-auto mb-4" />
            <h3 className="text-2xl font-black uppercase italic leading-none">Venda Concluída</h3>
            <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Parabéns por mais um negócio!</p>
          </div>
        );

      case 'COTADO':
        const parceiroRecusouAnterior = dadosCotacao?.status_feedback === 'RECUSADO';

        return (
          <div className="space-y-6">
            <div className={`border-2 rounded-[2.5rem] p-10 relative overflow-hidden transition-all duration-500 ${
              parceiroRecusouAnterior ? 'bg-red-50 border-red-100' : 'bg-indigo-50 border-indigo-100'
            }`}>
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${
                    parceiroRecusouAnterior ? 'bg-red-600 text-white shadow-red-200' : 'bg-indigo-600 text-white shadow-indigo-200'
                  }`}>
                    {parceiroRecusouAnterior ? <XCircle size={28} /> : <Clock size={28} className="animate-pulse" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase italic leading-none">
                      {parceiroRecusouAnterior ? 'Cotação Recusada' : 'Aguardando Aprovação'}
                    </h3>
                    <p className={`${parceiroRecusouAnterior ? 'text-red-600' : 'text-indigo-600'} text-[10px] font-bold uppercase tracking-widest mt-1`}>
                      {parceiroRecusouAnterior 
                        ? 'O parceiro solicitou renegociação' 
                        : 'Cotação técnica enviada ao parceiro'}
                    </p>
                  </div>
                </div>

                {parceiroRecusouAnterior && (
                  <div className="mb-6 bg-white/80 p-5 rounded-3xl border border-red-100 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Feedback do Parceiro (Motivo da Recusa):</p>
                    <p className="text-xs text-red-600 font-bold uppercase italic">
                      {dadosCotacao?.motivo_recusa || "Cliente achou caro / Solicita revisão"}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/80 backdrop-blur-sm p-5 rounded-3xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Seguradora</p>
                    <p className="font-black text-slate-700 uppercase italic text-xs">{dadosCotacao?.seguradora || '---'}</p>
                  </div>
                  
                  <div className="bg-white/80 backdrop-blur-sm p-5 rounded-3xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Prêmio Ofertado</p>
                    <p className="font-black text-slate-700 text-lg leading-none">
                      R$ {dadosCotacao?.valor_premio?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm p-5 rounded-3xl border border-slate-100 flex flex-col justify-center italic">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase text-center ${
                      parceiroRecusouAnterior ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {parceiroRecusouAnterior ? 'SOLICITADA REVISÃO' : 'PENDENTE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              {parceiroRecusouAnterior ? (
                <button 
                  onClick={() => acoes.setModoCotacao(true)} 
                  className="h-20 w-full max-w-md bg-purple-600 text-white rounded-[2rem] font-black uppercase text-[11px] flex items-center justify-center gap-3 hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 active:scale-95"
                >
                  <FileText size={20} /> Enviar Nova Opção
                </button>
              ) : (
                <div className="w-full max-w-md bg-slate-100 border-2 border-dashed border-slate-200 rounded-[2rem] p-6 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                    <Clock size={16} /> O parceiro ainda não respondeu
                  </p>
                </div>
              )}
              
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                {parceiroRecusouAnterior ? 'Revise as condições para o parceiro' : 'Aguarde a aprovação para finalizar'}
              </p>
            </div>
          </div>
        );


      default: return null;
    }
  };

  return (
    <div className="flex-1 bg-white rounded-[3.5rem] p-10 shadow-2xl shadow-slate-200/50 border border-slate-50 overflow-y-auto custom-scrollbar">
      {renderHeader()}
      
      {/* Informações de Origem e Responsáveis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
            <ShieldCheck size={24} />
          </div>
          <div className="overflow-hidden">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Origem / Parceiro</p>
            <p className="font-black text-slate-700 uppercase truncate text-xs">{indicacao.tab_parceiros?.nome_parceiro || 'DIRETO'}</p>
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-zinc-500 shadow-sm">
            <Briefcase size={24} />
          </div>
          <div className="overflow-hidden">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Corretor</p>
            <p className="font-black text-slate-700 uppercase truncate text-xs">{nomeCorretor}</p>
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm">
            <Landmark size={24} />
          </div>
          <div className="overflow-hidden">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Corretora</p>
            <p className="font-black text-slate-700 uppercase truncate text-xs">{nomeCorretora}</p>
          </div>
        </div>
      </div>

      {/* Dados de Contato */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Documento', val: indicacao.documento_cliente, icon: <FileText size={12} /> },
          { label: 'Telefone', val: indicacao.telefone_cliente, icon: <Phone size={12} /> },
          { label: 'E-mail', val: indicacao.email_cliente, icon: <Mail size={12} />, lower: true },
          { label: 'Produto', val: indicacao.produto_interesse, icon: <ShieldCheck size={12} /> }
        ].map((info, idx) => (
          <div key={idx} className="bg-white p-5 rounded-3xl border-2 border-slate-50">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2">
               <span className="text-blue-500">{info.icon}</span> {info.label}
            </p>
            <p className={`font-bold text-slate-700 text-xs ${info.lower ? 'lowercase truncate' : 'uppercase'}`}>
              {info.val || 'N/A'}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-6 mb-10">
        <div className="bg-amber-50/50 border-2 border-amber-100 rounded-[2.5rem] p-8">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare size={18} className="text-amber-600" />
            <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Relato do Indicador</h4>
          </div>
          <p className="text-sm text-slate-600 font-medium italic leading-relaxed">
            {indicacao.obs_indicacao || "Sem observações adicionais."}
          </p>
        </div>

        <div className="bg-blue-50/30 border-2 border-dashed border-blue-100 rounded-[2.5rem] p-8">
          <div className="flex items-center gap-3 mb-6">
            <Paperclip size={18} className="text-blue-600" />
            <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Documentação Anexa ({documentos.length})</h4>
          </div>
          
          {loadingDocs ? (
            <div className="animate-pulse text-[10px] font-black text-blue-400 uppercase">Acessando arquivos...</div>
          ) : documentos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {documentos.map((doc: any) => (
                <a 
                  key={doc.id}
                  href={doc.url_arquivo} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-white border border-blue-100 rounded-2xl hover:border-blue-500 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                      <Download size={18} />
                    </div>
                    <div className="truncate">
                      <p className="text-[10px] font-black text-slate-800 uppercase truncate">{doc.nome_arquivo}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">{doc.tipo}</p>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-slate-300 group-hover:text-blue-500" />
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl">
              <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Sem anexos disponíveis</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-10">
        {renderContent()}
      </div>
    </div>
  );
};