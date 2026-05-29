import React from 'react';
import { usePainelMarketing } from '../context/PainelMarketingContext';

export const Linha3BotaoDisparo: React.FC = () => {
  const {
    campanhaSelecionada,
    idsLeadsSelecionados,
    enviandoDisparo,
    dispararCampanhaLote
  } = usePainelMarketing();

  const totalSelecionados = idsLeadsSelecionados.length;
  const possuiCampanha = !!campanhaSelecionada;
  const podeDisparar = possuiCampanha && totalSelecionados > 0 && !enviandoDisparo;

  return (
    <div className="w-full bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
      
      {/* BLOCO ESQUERDO: INFORMAÇÕES DINÂMICAS DO STATUS DE PREPARAÇÃO */}
      <div className="text-left flex items-center gap-3">
        <div className="text-2xl">
          {!possuiCampanha ? '🎯' : totalSelecionados === 0 ? '👥' : '⚡'}
        </div>
        <div>
          <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider">
            Status de Preparação do Lote
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {!possuiCampanha ? (
              <span className="text-amber-600 font-medium animate-pulse">
                Aguardando seleção: Escolha uma campanha mãe na coluna 1.
              </span>
            ) : totalSelecionados === 0 ? (
              <span className="text-blue-600 font-medium">
                Campanha <strong className="text-gray-800">"{campanhaSelecionada.nome_evento}"</strong> ativa. Agora marque os alvos na Linha 1.
              </span>
            ) : (
              <span className="text-emerald-600 font-medium">
                Pronto para envio! <strong className="text-gray-800">{totalSelecionados}</strong> destinatários receberão o template de <strong className="text-gray-800">"{campanhaSelecionada.nome_evento}"</strong>.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* BLOCO DIREITO: BOTÃO DE DISPARO EM LOTE DA EDGE FUNCTION */}
      <div className="w-full sm:w-auto">
        <button
          onClick={dispararCampanhaLote}
          disabled={!podeDisparar}
          className={`w-full sm:w-64 px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
            podeDisparar
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer active:scale-[0.99]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300/30'
          }`}
        >
          {enviandoDisparo ? (
            <>
              <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Processando Fila Resend...</span>
            </>
          ) : (
            <>
              <span>🚀 Disparar para {totalSelecionados} Contatos</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};