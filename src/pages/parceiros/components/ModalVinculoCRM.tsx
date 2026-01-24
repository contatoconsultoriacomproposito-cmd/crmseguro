import React from 'react';
import { Search, XCircle, RefreshCw, Link, Fingerprint } from 'lucide-react';

interface ModalVinculoCRMProps {
  isOpen: boolean;
  onClose: () => void;
  buscaClienteCRM: string;
  setBuscaClienteCRM: (val: string) => void;
  buscarClientesCRM: (val: string) => void;
  buscandoCRM: boolean;
  clientesEncontrados: any[];
  vincularCliente: (id: string) => void;
  documentoReferencia?: string; // Nova prop para o CPF/CNPJ da indicação
}

export const ModalVinculoCRM: React.FC<ModalVinculoCRMProps> = ({
  isOpen, 
  onClose, 
  buscaClienteCRM, 
  setBuscaClienteCRM, 
  buscarClientesCRM, 
  buscandoCRM, 
  clientesEncontrados, 
  vincularCliente,
  documentoReferencia
}) => {
  if (!isOpen) return null;

  const handleBuscarReferencia = () => {
    if (documentoReferencia) {
      setBuscaClienteCRM(documentoReferencia);
      buscarClientesCRM(documentoReferencia);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[500] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl border border-slate-100 animate-in zoom-in duration-300">
        
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase italic">Vincular Cliente</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Busque o cadastro oficial no seu CRM</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <XCircle className="text-slate-300" size={24} />
          </button>
        </div>

        {/* ÁREA DE BUSCA INTELIGENTE */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            {buscandoCRM ? (
              <RefreshCw className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={20} />
            ) : (
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            )}
            <input 
              type="text"
              className="w-full h-16 pl-14 pr-6 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-blue-500 transition-all uppercase placeholder:text-slate-300 text-sm"
              placeholder="PESQUISAR POR NOME OU DOCUMENTO..."
              value={buscaClienteCRM}
              onChange={(e) => {
                setBuscaClienteCRM(e.target.value);
                buscarClientesCRM(e.target.value);
              }}
            />
          </div>

          {documentoReferencia && (
            <button 
              onClick={handleBuscarReferencia}
              className="h-16 px-6 bg-blue-50 text-blue-600 border-2 border-blue-100 rounded-2xl font-black uppercase text-[10px] flex flex-col items-center justify-center gap-1 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all group shrink-0"
              title="Buscar pelo documento da indicação"
            >
              <Fingerprint size={18} className="group-hover:scale-110 transition-transform" />
              <span>Usar Ref.</span>
            </button>
          )}
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
          {buscandoCRM ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 animate-pulse">
              <RefreshCw className="text-blue-500 animate-spin" size={32} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Consultando CRM...</span>
            </div>
          ) : clientesEncontrados.length > 0 ? (
            clientesEncontrados.map(cliente => (
              <div key={cliente.id} className="group flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-blue-500 transition-all shadow-sm active:scale-[0.99]">
                <div className="flex flex-col gap-1 max-w-[70%]">
                  <p className="text-[11px] font-black text-slate-800 uppercase truncate leading-none">
                    {cliente.tipo_cliente === 'PJ' ? (cliente.nome_fantasia || cliente.razao_social || cliente.nome) : cliente.nome}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-tighter">
                      {cliente.tipo_cliente === 'PJ' ? `CNPJ: ${cliente.cnpj}` : `CPF: ${cliente.cpf}`}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => vincularCliente(cliente.id)}
                  className="px-4 h-10 bg-blue-600 text-white rounded-xl font-black uppercase text-[9px] hover:bg-blue-700 transition-all shadow-md flex items-center gap-2 shrink-0"
                >
                  <Link size={14} /> Vincular
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
              <p className="text-slate-300 font-black text-[9px] uppercase tracking-[0.2em]">
                {buscaClienteCRM.length > 2 
                  ? "Nenhum cliente oficial encontrado para esta pesquisa." 
                  : "Aguardando termo ou referência para pesquisa..."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};