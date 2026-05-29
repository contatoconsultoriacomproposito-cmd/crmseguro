import React from 'react';
import { usePainelMarketing } from '../context/PainelMarketingContext';

export const Linha2Coluna2Disparos: React.FC = () => {
  const {
    disparos,
    campanhaSelecionada,
    disparoSelecionado,
    loadingDisparos,
    setDisparoSelecionado
  } = usePainelMarketing();

  // Função auxiliar para formatar a data e hora do envio de forma elegante
  const formatarData = (dataIso: string) => {
    try {
      const data = new Date(dataIso);
      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dataIso;
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[520px]">
      
      {/* CABEÇALHO DA COLUNA */}
      <div className="border-b pb-2 mb-3">
        <h2 className="font-semibold text-sm text-gray-700">🚀 2. Histórico de Envio (Filhos)</h2>
        <p className="text-[10px] text-gray-400">
          {campanhaSelecionada 
            ? `Lotes de: ${campanhaSelecionada.nome_evento}` 
            : 'Selecione uma campanha mãe ao lado'}
        </p>
      </div>

      {/* ÁREA DE LISTAGEM */}
      <div className="overflow-y-auto flex-1 space-y-2 pr-1 custom-scrollbar">
        {!campanhaSelecionada ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="text-gray-300 text-3xl mb-1">👈</div>
            <p className="text-xs text-gray-400">
              Escolha uma campanha na primeira coluna para rastrear os lotes enviados.
            </p>
          </div>
        ) : loadingDisparos ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-xs text-gray-400 animate-pulse">Buscando em tab_campanhas_disparos...</p>
          </div>
        ) : disparos.length === 0 ? (
          <div className="text-center py-12 text-xs text-gray-400 p-4 bg-slate-50 rounded-xl border border-dashed">
            Nenhum lote foi disparado para esta campanha até o momento.
          </div>
        ) : (
          disparos.map((disparo) => {
            const isSelected = disparoSelecionado?.id === disparo.id;
            return (
              <div
                key={disparo.id}
                onClick={() => setDisparoSelecionado(isSelected ? null : disparo)}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/40 shadow-sm ring-1 ring-indigo-500'
                    : 'border-gray-100 hover:border-gray-300 bg-slate-50/50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-400 font-mono">
                    ID: {disparo.id.substring(0, 8)}...
                  </span>
                  <span className="text-[11px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                    {disparo.total_enviados} envios
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Data do Disparo</p>
                    <p className="text-xs font-semibold text-gray-700 font-mono mt-0.5">
                      📅 {formatarData(disparo.data_disparo)}
                    </p>
                  </div>
                  
                  {isSelected && (
                    <span className="text-xs text-indigo-600 animate-pulse font-medium">
                      Inspecionando ➡️
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* RODAPÉ INFORMATIVO DA COLUNA */}
      {campanhaSelecionada && disparos.length > 0 && (
        <div className="text-[10px] text-gray-400 pt-2 border-t mt-2 text-right">
          Total de <span className="font-bold text-gray-600">{disparos.length}</span> lotes arquivados
        </div>
      )}
    </div>
  );
};