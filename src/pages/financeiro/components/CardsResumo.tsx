import { ArrowUpRight, ArrowDownLeft, DollarSign } from 'lucide-react';

interface CardsResumoProps {
  entradas: number;
  saidas: number;
  saldo: number;
}

export default function CardsResumo({ entradas, saidas, saldo }: CardsResumoProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
      <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-gray-400 uppercase">Entradas</span>
          <h3 className="text-2xl font-bold text-emerald-600 mt-1">R$ {entradas.toFixed(2)}</h3>
        </div>
        <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600"><ArrowUpRight size={24} /></div>
      </div>
      <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-gray-400 uppercase">Saídas</span>
          <h3 className="text-2xl font-bold text-rose-600 mt-1">R$ {saidas.toFixed(2)}</h3>
        </div>
        <div className="bg-rose-50 p-3 rounded-xl text-rose-600"><ArrowDownLeft size={24} /></div>
      </div>
      <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-gray-400 uppercase">Saldo do Período</span>
          <h3 className={`text-2xl font-bold mt-1 ${saldo >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
            R$ {saldo.toFixed(2)}
          </h3>
        </div>
        <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><DollarSign size={24} /></div>
      </div>
    </div>
  );
}