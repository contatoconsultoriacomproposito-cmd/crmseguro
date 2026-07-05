import { Search } from 'lucide-react';

type PrecisaoBusca = '0' | '5' | '10';
type FiltroStatusParcela = 'todos' | 'vencidas' | 'a_vencer' | 'hoje';

interface PainelFiltrosProps {
  busca: string;
  setBusca: (v: string) => void;
  precisao: PrecisaoBusca;
  setPrecisao: (v: PrecisaoBusca) => void;
  tipoFiltro: 'todos' | 'entrada' | 'saida';
  setTipoFiltro: (v: 'todos' | 'entrada' | 'saida') => void;
  statusParcela: FiltroStatusParcela;
  setStatusParcela: (v: FiltroStatusParcela) => void;
  tipoDataFiltro: 'vencimento' | 'quitacao';
  setTipoDataFiltro: (v: 'vencimento' | 'quitacao') => void;
  dataInicio: string;
  setDataInicio: (v: string) => void;
  dataFim: string;
  setDataFim: (v: string) => void;
}

export default function PainelFiltros({
  busca, setBusca,
  precisao, setPrecisao,
  tipoFiltro, setTipoFiltro,
  statusParcela, setStatusParcela,
  tipoDataFiltro, setTipoDataFiltro,
  dataInicio, setDataInicio,
  dataFim, setDataFim
}: PainelFiltrosProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6 flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Busca por descrição ou valor */}
        <div className="relative md:col-span-5">
          <Search className="absolute left-3 top-3.5 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por descrição ou valor (Ex: 100)..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Configuração do Range de Precisão */}
        <div className="md:col-span-3 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1">
          <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Margem:</span>
          <select 
            value={precisao} 
            onChange={(e) => setPrecisao(e.target.value as PrecisaoBusca)}
            className="w-full bg-transparent text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
          >
            <option value="0">Exata (0%)</option>
            <option value="5">Alta (±5%)</option>
            <option value="10">Média (±10%)</option>
          </select>
        </div>

        {/* Fluxo */}
        <div className="md:col-span-2">
          <select 
            value={tipoFiltro} 
            onChange={(e) => setTipoFiltro(e.target.value as any)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
          >
            <option value="todos">Todos os Fluxos</option>
            <option value="entrada">Apenas Entradas</option>
            <option value="saida">Apenas Saídas</option>
          </select>
        </div>

        {/* Status de Parcela */}
        <div className="md:col-span-2">
          <select 
            value={statusParcela} 
            onChange={(e) => setStatusParcela(e.target.value as FiltroStatusParcela)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
          >
            <option value="todos">Todas as Parcelas</option>
            <option value="vencidas">⚠️ Vencidas</option>
            <option value="hoje">📅 Vencem Hoje</option>
            <option value="a_vencer">⏳ A Vencer</option>
          </select>
        </div>
      </div>

      {/* Datas */}
      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-100 text-sm">
        <div className="flex items-center gap-2 bg-gray-50 px-2.5 py-1.5 rounded-lg border">
          <input 
            type="radio" 
            id="venc" 
            checked={tipoDataFiltro === 'vencimento'} 
            onChange={() => setTipoDataFiltro('vencimento')} 
            className="cursor-pointer"
          />
          <label htmlFor="venc" className="text-xs font-medium text-gray-600 cursor-pointer">Por Vencimento</label>
          <input 
            type="radio" 
            id="quit" 
            checked={tipoDataFiltro === 'quitacao'} 
            onChange={() => setTipoDataFiltro('quitacao')} 
            className="cursor-pointer"
          />
          <label htmlFor="quit" className="text-xs font-medium text-gray-600 cursor-pointer">Por Quitação</label>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Período:</span>
          <input 
            type="date" 
            value={dataInicio} 
            onChange={(e) => setDataInicio(e.target.value)} 
            className="border border-gray-200 bg-gray-50 rounded-lg px-2 py-1 text-xs focus:outline-none"
          />
          <span className="text-gray-400">até</span>
          <input 
            type="date" 
            value={dataFim} 
            onChange={(e) => setDataFim(e.target.value)} 
            className="border border-gray-200 bg-gray-50 rounded-lg px-2 py-1 text-xs focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}