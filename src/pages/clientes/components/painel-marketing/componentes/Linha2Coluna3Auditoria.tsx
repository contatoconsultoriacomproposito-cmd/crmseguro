import React from 'react';
import { usePainelMarketing } from '../context/PainelMarketingContext';

export const Linha2Coluna3Auditoria: React.FC = () => {
  const {
    auditoria,
    disparoSelecionado,
    loadingAuditoria,
    clienteAuditoriaSelecionado,
    setClienteAuditoriaSelecionado
  } = usePainelMarketing();

  // ------------------------------------------------------------------
  // CÁLCULO DE MÉTRICAS RÁPIDAS DO LOTE ATUAL
  // ------------------------------------------------------------------
  const metricas = React.useMemo(() => {
    if (!auditoria.length) return { entregues: 0, abertos: 0, cliques: 0, bounces: 0 };
    
    return auditoria.reduce(
      (acc, curr) => {
        if (curr.status_entrega === 'entregue' || curr.status_entrega === 'enviado') acc.entregues++;
        if (curr.abriu_email) acc.abertos++;
        if (curr.clicou_whatsapp) acc.cliques++;
        if (curr.status_entrega === 'erro_bounced') acc.bounces++;
        return acc;
      },
      { entregues: 0, abertos: 0, cliques: 0, bounces: 0 }
    );
  }, [auditoria]);

  // Função auxiliar para renderizar badges visuais com base no status do Resend
  const renderBadgeStatus = (status: string, abriu: boolean, clicou: boolean) => {
    if (clicou) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">🔥 Clicou Whats</span>;
    if (abriu) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700">🌤️ Abriu E-mail</span>;
    if (status === 'erro_bounced') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">🚨 Bounce (Erro)</span>;
    if (status === 'entregue') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">📥 Entregue</span>;
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">⏳ Processando</span>;
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[520px] relative">
      
      {/* CABEÇALHO DA COLUNA */}
      <div className="border-b pb-2 mb-3">
        <h2 className="font-semibold text-sm text-gray-700">📊 3. Rastreamento e Termometria</h2>
        <p className="text-[10px] text-gray-400">
          {disparoSelecionado 
            ? `Logs do Lote: ${disparoSelecionado.id.substring(0, 8)}...` 
            : 'Selecione um histórico de envio'}
        </p>
      </div>

      {!disparoSelecionado ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <div className="text-gray-300 text-3xl mb-1">👈</div>
          <p className="text-xs text-gray-400">
            Selecione um lote na coluna central para inspecionar os relatórios de entrega em tempo real.
          </p>
        </div>
      ) : loadingAuditoria ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-xs text-gray-400 animate-pulse">Lendo tab_campanhas_emails_detalhe...</p>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          
          {/* CARDS COM CONTADORES DE PERFORMANCE DO LOTE */}
          <div className="grid grid-cols-4 gap-1.5 mb-3 text-center">
            <div className="bg-blue-50/50 border border-blue-100 p-1.5 rounded-lg">
              <p className="text-[9px] font-bold text-blue-500 uppercase">Enviados</p>
              <p className="text-sm font-bold text-blue-700 font-mono">{auditoria.length}</p>
            </div>
            <div className="bg-orange-50/50 border border-orange-100 p-1.5 rounded-lg">
              <p className="text-[9px] font-bold text-orange-500 uppercase">Abertos</p>
              <p className="text-sm font-bold text-orange-700 font-mono">{metricas.abertos}</p>
            </div>
            <div className="bg-green-50/50 border border-green-100 p-1.5 rounded-lg">
              <p className="text-[9px] font-bold text-green-500 uppercase">Cliques</p>
              <p className="text-sm font-bold text-green-700 font-mono">{metricas.cliques}</p>
            </div>
            <div className="bg-red-50/50 border border-red-100 p-1.5 rounded-lg">
              <p className="text-[9px] font-bold text-red-500 uppercase">Bounces</p>
              <p className="text-sm font-bold text-red-700 font-mono">{metricas.bounces}</p>
            </div>
          </div>

          {/* LISTA DE ENVIOS INDIVIDUAIS */}
          <div className="overflow-y-auto flex-1 divide-y border rounded-lg bg-slate-50/30 custom-scrollbar">
            {auditoria.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-400">
                Nenhum log de disparo encontrado para este lote.
              </div>
            ) : (
              auditoria.map((log) => {
                const isInspecting = clienteAuditoriaSelecionado?.id === log.id;
                return (
                  <div
                    key={log.id}
                    onClick={() => setClienteAuditoriaSelecionado(isInspecting ? null : log)}
                    className={`p-2.5 flex justify-between items-center cursor-pointer transition-all ${
                      isInspecting 
                        ? 'bg-slate-200/60 font-medium border-l-4 border-slate-700 pl-1.5' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-left max-w-[60%]">
                      <p className="text-xs font-bold text-gray-700 truncate">{log.nome_cliente}</p>
                      <p className="text-[10px] text-gray-400 font-mono truncate">{log.email_cliente}</p>
                    </div>
                    <div>
                      {renderBadgeStatus(log.status_entrega, log.abriu_email, log.clicou_whatsapp)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          PAINEL LATERAL INJETADO (INSPEÇÃO DETALHADA DO CLIENTE CLICADO)
         ==================================================================== */}
      {clienteAuditoriaSelecionado && (
        <div className="absolute inset-y-0 right-0 w-80 bg-slate-900 text-slate-100 shadow-2xl p-4 flex flex-col z-20 rounded-r-xl border-l border-slate-800 animate-slideLeft">
          <div className="flex justify-between items-start border-b border-slate-800 pb-3">
            <div className="text-left">
              <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                Inspeção de Auditoria
              </span>
              <h3 className="font-bold text-xs text-white mt-1 truncate max-w-[200px]">
                {clienteAuditoriaSelecionado.nome_cliente}
              </h3>
            </div>
            <button
              onClick={() => setClienteAuditoriaSelecionado(null)}
              className="text-slate-400 hover:text-white text-xs p-1"
            >
              ✕ Fechar
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs text-left custom-scrollbar">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">E-mail de Destino</p>
              <p className="text-slate-300 font-mono mt-0.5 break-all select-all bg-slate-950 p-2 rounded border border-slate-800">
                {clienteAuditoriaSelecionado.email_cliente}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase">Tipo do Lead</p>
                <p className="text-slate-200 font-bold mt-0.5">{clienteAuditoriaSelecionado.tipo_cliente || 'PF'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase">Vínculo CRM</p>
                <p className="text-slate-200 font-bold mt-0.5">
                  {clienteAuditoriaSelecionado.cadastrado_no_sistema ? '✅ Cadastrado' : '📁 Via CSV'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Linha do Tempo (Resend Triggers)</p>
              <div className="space-y-2 border-l border-slate-800 pl-3 ml-1.5">
                <div className="relative">
                  <div className={`absolute -left-[17px] top-1 w-2 h-2 rounded-full ${clienteAuditoriaSelecionado.resend_id ? 'bg-blue-500' : 'bg-slate-700'}`} />
                  <p className="font-bold text-slate-300">Mensagem Processada</p>
                  <p className="text-[10px] text-slate-500 font-mono break-all">{clienteAuditoriaSelecionado.resend_id || 'Aguardando ID...'}</p>
                </div>
                
                <div className="relative">
                  <div className={`absolute -left-[17px] top-1 w-2 h-2 rounded-full ${clienteAuditoriaSelecionado.status_entrega === 'entregue' || clienteAuditoriaSelecionado.abriu_email ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                  <p className="font-bold text-slate-300">Entrega na Caixa</p>
                  <p className="text-[10px] text-slate-500">{clienteAuditoriaSelecionado.status_entrega === 'entregue' || clienteAuditoriaSelecionado.abriu_email ? 'Sucesso confirmado pelo servidor' : 'Pendente ou Bounce'}</p>
                </div>

                <div className="relative">
                  <div className={`absolute -left-[17px] top-1 w-2 h-2 rounded-full ${clienteAuditoriaSelecionado.abriu_email ? 'bg-orange-500 animate-pulse' : 'bg-slate-700'}`} />
                  <p className="font-bold text-slate-300">Abertura de E-mail</p>
                  <p className="text-[10px] text-slate-500">{clienteAuditoriaSelecionado.abriu_email ? 'O cliente visualizou o template' : 'Não visualizado ainda'}</p>
                </div>

                <div className="relative">
                  <div className={`absolute -left-[17px] top-1 w-2 h-2 rounded-full ${clienteAuditoriaSelecionado.clicou_whatsapp ? 'bg-green-500' : 'bg-slate-700'}`} />
                  <p className="font-bold text-slate-300">Gatilho WhatsApp</p>
                  <p className="text-[10px] text-slate-500">{clienteAuditoriaSelecionado.clicou_whatsapp ? 'Clicou no botão wa.me' : 'Sem cliques no link'}</p>
                </div>
              </div>
            </div>

            {clienteAuditoriaSelecionado.ultimo_evento_em && (
              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 text-center font-mono">
                Última atualização: {new Date(clienteAuditoriaSelecionado.ultimo_evento_em).toLocaleString('pt-BR')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};