import React from 'react';
import { 
  User, Phone, Mail, FileText,
  CheckCircle2, XCircle, Clock, 
  Lock, DollarSign, Upload, ChevronLeft
} from 'lucide-react';

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
  };
  modoCotacao: boolean;
  formCotacao: { valor: string; arquivo: any };
  setFormCotacao: (val: any) => void;
  maskCurrency: (val: string) => string;
}

export const PainelAcoes: React.FC<PainelAcoesProps> = ({ 
  indicacao, loading, acoes, modoCotacao, formCotacao, setFormCotacao, maskCurrency 
}) => {
  if (!indicacao) return null;

  const renderHeader = () => (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-blue-200">
          <User size={32} />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-black text-slate-800 uppercase italic leading-none">{indicacao.nome_cliente}</h2>
            {indicacao.id_cliente_crm && (
              <span className="bg-blue-100 text-blue-600 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter">Vinculado ao CRM</span>
            )}
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">ID da Indicação: {indicacao.id.split('-')[0]}</p>
        </div>
      </div>
      
      <div className="flex gap-2">
        <button 
          onClick={() => acoes.setShowRecusaModal(true)}
          className="h-14 px-6 rounded-2xl border-2 border-slate-100 text-slate-400 hover:text-red-600 hover:border-red-100 transition-all group"
        >
          <XCircle size={20} className="group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    // SE ESTIVER EM MODO COTAÇÃO, EXIBE O FORMULÁRIO (Usa as variáveis que estavam sobrando)
    if (modoCotacao) {
      return (
        <div className="bg-purple-50 rounded-[2.5rem] p-8 animate-in zoom-in duration-300">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => acoes.setModoCotacao(false)} className="p-2 hover:bg-purple-100 rounded-full text-purple-600">
              <ChevronLeft size={24} />
            </button>
            <h3 className="text-xl font-black text-slate-800 uppercase italic">Enviar Proposta</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 mb-2 block tracking-widest">Valor do Orçamento (R$)</label>
              <input 
                type="text"
                className="w-full h-16 px-6 bg-white border-2 border-purple-100 rounded-2xl font-black text-slate-800 outline-none focus:border-purple-500 transition-all"
                placeholder="0,00"
                value={formCotacao.valor}
                onChange={(e) => setFormCotacao({ ...formCotacao, valor: maskCurrency(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 mb-2 block tracking-widest">Anexo da Proposta (PDF)</label>
              <label className="w-full h-16 px-6 bg-white border-2 border-dashed border-purple-200 rounded-2xl flex items-center justify-between cursor-pointer hover:border-purple-500 transition-all">
                <span className="text-slate-400 font-bold text-xs uppercase truncate">
                  {formCotacao.arquivo ? "Arquivo selecionado" : "Selecionar arquivo..."}
                </span>
                <Upload size={20} className="text-purple-400" />
                <input type="file" className="hidden" onChange={(e) => setFormCotacao({ ...formCotacao, arquivo: e.target.files?.[0] })} />
              </label>
            </div>
          </div>

          <button className="w-full h-16 bg-purple-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] mt-8 shadow-xl shadow-purple-200 hover:bg-purple-700 transition-all">
            Finalizar e Enviar para o Parceiro
          </button>
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
            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-8 font-medium">Esta indicação acabou de chegar. Analise os dados básicos antes de iniciar o atendimento comercial.</p>
            <button 
              onClick={acoes.iniciarAtendimento}
              disabled={loading}
              className="h-16 px-10 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95"
            >
              {loading ? "Processando..." : "Assumir Indicação agora"}
            </button>
          </div>
        );

      case 'EM_ATENDIMENTO':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {!indicacao.id_cliente_crm ? (
                <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white flex items-center justify-between shadow-xl shadow-blue-100">
                   <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                         <Lock size={24} />
                      </div>
                      <div>
                         <h4 className="font-black uppercase italic text-lg">Vínculo Obrigatório</h4>
                         <p className="text-blue-100 text-xs font-medium">Para prosseguir, vincule este lead a um cadastro oficial.</p>
                      </div>
                   </div>
                   <button onClick={acoes.abrirVinculo} className="h-12 px-6 bg-white text-blue-600 rounded-xl font-black uppercase text-[10px] hover:bg-blue-50 transition-colors">Vincular no CRM</button>
                </div>
             ) : (
                <div className="grid grid-cols-2 gap-4">
                   <button 
                     onClick={() => acoes.setModoCotacao(true)}
                     className="h-24 bg-purple-600 text-white rounded-[2rem] font-black uppercase text-[11px] flex flex-col items-center justify-center gap-2 hover:bg-purple-700 transition-all shadow-lg shadow-purple-100"
                   >
                      <FileText size={24} /> Enviar Cotação
                   </button>
                   <button 
                     onClick={acoes.finalizarVendaDireta}
                     className="h-24 bg-emerald-500 text-white rounded-[2rem] font-black uppercase text-[11px] flex flex-col items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
                   >
                      <CheckCircle2 size={24} /> Finalizar Venda
                   </button>
                </div>
             )}
          </div>
        );

      case 'COTADO':
        return (
          <div className="bg-purple-50/50 border-2 border-purple-100 rounded-[3rem] p-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 uppercase italic">Proposta Enviada</h4>
                  <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Aguardando retorno do cliente</p>
                </div>
              </div>
              <button 
                onClick={() => acoes.setShowComissaoModal(true)}
                className="h-14 px-8 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 flex items-center gap-2"
              >
                <CheckCircle2 size={16} /> Confirmar Venda
              </button>
            </div>
          </div>
        );

      case 'VENDIDO':
        return (
          <div className="bg-emerald-50/50 border-2 border-emerald-100 rounded-[3rem] p-10 text-center">
            <div className="w-16 h-16 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase italic">Venda Concluída</h3>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mt-1">Negócio fechado com sucesso</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 bg-white rounded-[3.5rem] p-10 shadow-2xl shadow-slate-200/50 border border-slate-50 overflow-y-auto custom-scrollbar">
      {renderHeader()}
      
      {/* Dados de Contato (Sempre visível) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Phone size={12} className="text-blue-500" /> WhatsApp / Tel
          </p>
          <p className="font-bold text-slate-700">{indicacao.telefone_cliente || 'NÃO INFORMADO'}</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Mail size={12} className="text-blue-500" /> E-mail
          </p>
          <p className="font-bold text-slate-700 lowercase truncate">{indicacao.email_cliente || 'NÃO INFORMADO'}</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <FileText size={12} className="text-blue-500" /> Produto
          </p>
          <p className="font-bold text-slate-700 uppercase">{indicacao.produto_interesse}</p>
        </div>
      </div>

      {renderContent()}
    </div>
  );
};