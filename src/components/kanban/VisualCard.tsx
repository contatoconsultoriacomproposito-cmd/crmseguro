import { useState } from 'react';
import { 
  Building2, 
  User, 
  FileText, 
  Calendar, 
  Clock, 
  AlertCircle, 
  Phone,
  UserCheck,
  Briefcase,
  Package,
  ShieldAlert,
  DollarSign
} from 'lucide-react';
import { ModalDocumentos } from './components_visual_card/ModalDocumentos';

// Importações para renderização do conteúdo das abas
import { TabContatos } from '../kanban/components_visual_card/TabContatos';
import { TabPropostas } from '../kanban/components_visual_card/TabPropostas';
import TabProdutos from './components_visual_card/TabProdutos';
import TabSinistros from './components_visual_card/TabSinistros';
import TabComissoes from './components_visual_card/TabComissoes';
import { TabDados } from './components_visual_card/TabDados';

interface VisualCardProps {
  cliente: any;
  status?: string;
  onUpdate?: () => void;
  isModal?: boolean;
}

export const VisualCard = ({ cliente, onUpdate, isModal = false }: VisualCardProps) => {
  const [abaAtiva, setAbaAtiva] = useState<number>(1);
  const [modalDocsAberto, setModalDocsAberto] = useState<boolean>(false);

  // Função fallback para evitar erro de tipo em componentes que exigem onUpdate obrigatório
  const handleUpdate = onUpdate || (() => {});

  const isPJ = cliente?.tipo_cliente === 'PJ';

  // Formatação do CPF/CNPJ
  const formatarDocumento = (doc: string) => {
    if (!doc) return 'Não informado';
    const num = doc.replace(/\D/g, '');
    if (num.length === 11) {
      return num.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (num.length === 14) {
      return num.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
  };

  // Leitura do JSONB de contatos para PF
  const parseContatos = (contatosRaw: any) => {
    if (!contatosRaw) return [];
    if (typeof contatosRaw === 'string') {
      try {
        return JSON.parse(contatosRaw);
      } catch {
        return [];
      }
    }
    return Array.isArray(contatosRaw) ? contatosRaw : [];
  };

  const listaContatos = parseContatos(cliente?.contatos);
  const contatoPrincipal = listaContatos.find((c: any) => c.principal) || listaContatos[0];

  // Verificação de atraso na data de retorno
  const verificarAtraso = (dataRetorno: string) => {
    if (!dataRetorno) return false;
    const [ano, mes, dia] = dataRetorno.split('-').map(Number);
    const dataAgendada = new Date(ano, mes - 1, dia, 23, 59);
    return dataAgendada < new Date();
  };

  const atrasado = verificarAtraso(cliente?.data_retorno);

  // Definição das 6 abas
  const abas = [
    { id: 1, label: 'Dados', icon: UserCheck },
    { id: 2, label: 'Ações Comerciais', icon: Phone },
    { id: 3, label: 'Propostas', icon: Briefcase },
    { id: 4, label: 'Produtos', icon: Package },
    { id: 5, label: 'Assistências/Sinistros', icon: ShieldAlert },
    { id: 6, label: 'Comissões', icon: DollarSign }
  ];

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-[24px] border border-slate-200 dark:border-zinc-800 p-5 shadow-lg transition-all w-full max-w-5xl mx-auto ${isModal ? 'shadow-2xl' : ''}`}>
      
      {/* 1) PARTE SUPERIOR (CABEÇALHO) */}
      <div className="grid grid-cols-12 gap-4 pb-4 mb-4 border-b border-slate-100 dark:border-zinc-800 items-center">
        
        {/* LADO ESQUERDO: Tipo, Doc + PJ (Razão/Fantasia) ou PF (Contato JSONB) */}
        <div className="col-span-5 space-y-1.5">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${isPJ ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
              {isPJ ? <Building2 size={12} /> : <User size={12} />}
              <span>{isPJ ? 'Pessoa Jurídica' : 'Pessoa Física'}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-tight">
              {isPJ ? 'CNPJ' : 'CPF'}: {formatarDocumento(cliente?.cpf_cnpj)}
            </span>
          </div>

          {isPJ ? (
            <div className="space-y-0.5">
              <h2 className="font-black text-slate-800 dark:text-white text-sm uppercase leading-snug truncate">
                {cliente?.nome_razao_social || 'Sem Razão Social'}
              </h2>
              {cliente?.nome_fantasia && (
                <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase leading-none truncate">
                  Fantasia: {cliente.nome_fantasia}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-2 border border-slate-100 dark:border-zinc-800 space-y-0.5">
              <span className="text-[8px] font-black uppercase text-slate-400 block">Contato Principal</span>
              {contatoPrincipal ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold text-slate-700 dark:text-zinc-200 truncate uppercase">
                    {contatoPrincipal.nome || 'Sem nome'}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 shrink-0">
                    <Phone size={10} className="text-slate-400" />
                    <span>{contatoPrincipal.telefone || 'Sem telefone'}</span>
                  </div>
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 italic">Nenhum contato cadastrado</span>
              )}
            </div>
          )}
        </div>

        {/* CENTRO: Botão para inserir/gerenciar documentos */}
        <div className="col-span-3 flex justify-center items-center">
          <button
            onClick={() => setModalDocsAberto(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl text-[11px] font-bold transition-all shadow-sm active:scale-95"
          >
            <FileText size={14} />
            <span>Documentos</span>
          </button>
        </div>

        {/* LADO DIREITO: Data, Horário de Retorno e Status Atrasado */}
        <div className="col-span-4 flex flex-col items-end justify-center space-y-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Agendamento de Retorno</span>
          
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-zinc-800">
            <Calendar size={13} className={atrasado ? 'text-red-500' : 'text-slate-400'} />
            <span className={`text-[12px] font-black ${atrasado ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-zinc-200'}`}>
              {cliente?.data_retorno ? cliente.data_retorno.split('-').reverse().join('/') : '--/--/--'}
            </span>

            {cliente?.horario_retorno && (
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 border-l border-slate-200 dark:border-zinc-700 pl-2 ml-1">
                <Clock size={11} />
                <span>{cliente.horario_retorno.slice(0, 5)}</span>
              </div>
            )}
          </div>

          {atrasado && (
            <div className="flex items-center gap-1 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-md text-[9px] font-black uppercase animate-pulse">
              <AlertCircle size={10} />
              <span>Atrasado</span>
            </div>
          )}
        </div>

      </div>

      {/* 2) PARTE MEIO (NAVEGAÇÃO DAS 6 ABAS) */}
      <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800/60 rounded-2xl mb-4 overflow-x-auto">
        {abas.map((aba) => {
          const IconeAba = aba.icon;
          const isAtiva = abaAtiva === aba.id;

          return (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                isAtiva
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-white/50'
              }`}
            >
              <IconeAba size={13} className={isAtiva ? 'text-slate-900 dark:text-white' : 'text-slate-400'} />
              <span>{aba.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3) ÁREA DE CONTEÚDO DINÂMICO DAS ABAS */}
      <div className="min-h-[220px] bg-slate-50 dark:bg-zinc-800/30 rounded-2xl p-4 border border-slate-100 dark:border-zinc-800/50">
        {abaAtiva === 1 && (
          <TabDados 
            cliente={cliente} 
            onUpdate={handleUpdate} 
            onDelete={() => {
              // Callback opcional após a exclusão do cliente
              handleUpdate();
            }}
          />
        )}
        {abaAtiva === 2 && <TabContatos clienteId={cliente?.id} onUpdate={handleUpdate} />}
        {abaAtiva === 3 && <TabPropostas clienteId={cliente.id} onUpdate={onUpdate} />}
        {abaAtiva === 4 && <TabProdutos clienteId={cliente?.id} onUpdate={handleUpdate} />}
        {abaAtiva === 5 && <TabSinistros clienteId={cliente?.id} />}
        {abaAtiva === 6 && <TabComissoes clienteId={cliente?.id} />}
      </div>

      {/* Modal de Documentos */}
      {modalDocsAberto && (
        <ModalDocumentos 
          cliente={cliente} 
          onClose={() => setModalDocsAberto(false)} 
        />
      )}
    </div>
  );
};