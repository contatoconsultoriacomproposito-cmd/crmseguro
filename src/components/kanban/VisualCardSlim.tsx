import { Building2, User, Phone, Calendar, Clock, AlertCircle } from 'lucide-react';

interface SlimProps {
  cliente: any;
}

export const VisualCardSlim = ({ cliente }: SlimProps) => {
  const isPJ = cliente.tipo_cliente === 'PJ';

  // Formata o documento CPF ou CNPJ de forma simples
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

  // Trata e busca os contatos dentro do JSONB
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

  const listaContatos = parseContatos(cliente.contatos);
  const contatoPrincipal = listaContatos.find((c: any) => c.principal) || listaContatos[0];

  // Verificação de atraso na data de retorno
  const verificarAtraso = (dataRetorno: string) => {
    if (!dataRetorno) return false;
    const [ano, mes, dia] = dataRetorno.split('-').map(Number);
    const dataAgendada = new Date(ano, mes - 1, dia, 23, 59);
    return dataAgendada < new Date();
  };

  const atrasado = verificarAtraso(cliente.data_retorno);

  // Mapeamento de cores para a temperatura
  const corTemperatura: Record<string, string> = {
    quente: 'bg-red-100 text-red-700 border-red-200',
    morno: 'bg-amber-100 text-amber-700 border-amber-200',
    frio: 'bg-blue-100 text-blue-700 border-blue-200'
  };

  const tempKey = (cliente.temperatura || 'frio').toLowerCase();

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-3.5 shadow-sm hover:shadow-md transition-all">
      
      {/* 1) TOPO: Tipo Cliente (Esq) | Origem (Centro) | Fase Atendimento (Dir) */}
      <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-slate-100 dark:border-zinc-800/80 gap-1">
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${isPJ ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
          {isPJ ? <Building2 size={10} /> : <User size={10} />}
          <span>{isPJ ? 'PJ' : 'PF'}</span>
        </div>

        <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-tight truncate max-w-[90px] text-center">
          {cliente.origem || 'MANUAL'}
        </span>

        <span className="text-[9px] font-black text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md uppercase tracking-tight truncate max-w-[110px] text-right">
          {cliente.fase_atendimento?.replace('_', ' ') || 'Não contatado'}
        </span>
      </div>

      {/* 2) MEIO: Dados do Cliente (Esq) | Contato JSONB (Centro -> Dir) */}
      <div className="grid grid-cols-12 gap-2 my-2 items-start">
        {/* Lado Esquerdo: Razão Social, Fantasia e CPF/CNPJ */}
        <div className="col-span-7 pr-1 space-y-0.5">
          <h3 className="font-black text-slate-800 dark:text-white text-[11px] uppercase leading-snug line-clamp-2">
            {cliente.nome_razao_social || 'Sem nome'}
          </h3>

          {isPJ && cliente.nome_fantasia && (
            <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase leading-none truncate">
              {cliente.nome_fantasia}
            </p>
          )}

          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter pt-0.5">
            {isPJ ? 'CNPJ' : 'CPF'}: {formatarDocumento(cliente.cpf_cnpj)}
          </p>
        </div>

        {/* Lado Direito: Contatos (Nome + Telefone) */}
        <div className="col-span-5 bg-slate-50 dark:bg-zinc-800/40 rounded-lg p-1.5 border border-slate-100 dark:border-zinc-800/50 space-y-0.5">
          {contatoPrincipal ? (
            <>
              <p className="text-[9px] font-bold text-slate-700 dark:text-zinc-300 truncate leading-none uppercase">
                {contatoPrincipal.nome || 'Sem nome'}
              </p>
              <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-500 dark:text-zinc-400">
                <Phone size={9} className="shrink-0 text-slate-400" />
                <span className="truncate">{contatoPrincipal.telefone || 'Sem tel.'}</span>
              </div>
            </>
          ) : (
            <span className="text-[8px] text-slate-400 italic block text-center">Sem contato</span>
          )}
        </div>
      </div>

      {/* 3) INFERIOR: Retorno + Horário (Esq) | Temperatura (Dir) */}
      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex justify-between items-center">
        {/* Esquerda: Data e Horário de Retorno */}
        <div className="flex items-center gap-1.5">
          <Calendar size={11} className={atrasado ? 'text-red-500' : 'text-slate-400'} />
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className={`text-[10px] font-black ${atrasado ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-zinc-300'}`}>
                {cliente.data_retorno ? cliente.data_retorno.split('-').reverse().join('/') : '--/--/--'}
              </span>
              {cliente.horario_retorno && (
                <span className="text-[9px] font-semibold text-slate-400 flex items-center gap-0.5">
                  <Clock size={8} />
                  {cliente.horario_retorno.slice(0, 5)}
                </span>
              )}
            </div>
          </div>

          {atrasado && (
            <div className="flex items-center gap-0.5 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1 py-0.5 rounded text-[8px] font-black uppercase ml-1 animate-pulse">
              <AlertCircle size={9} />
            </div>
          )}
        </div>

        {/* Direita: Temperatura */}
        <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider ${corTemperatura[tempKey] || corTemperatura.frio}`}>
          {cliente.temperatura || 'Frio'}
        </div>
      </div>

    </div>
  );
};