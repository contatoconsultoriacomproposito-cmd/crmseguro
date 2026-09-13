import React, { useState } from 'react';
import { Building2, User, Phone, Calendar, Clock, AlertCircle, Flame, Loader2, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner'; // Ajuste se usar outra biblioteca de toast

interface SlimProps {
  cliente: any;
  onUpdateSuccess?: (clienteId: string, dadosAtualizados: Record<string, any>) => void;
}

export const VisualCardSlim = ({ cliente, onUpdateSuccess }: SlimProps) => {
  const isPJ = cliente.tipo_cliente === 'PJ';
  
  // Estados locais para edição rápida e feedback visual imediato
  const [temperaturaAtual, setTemperaturaAtual] = useState(cliente.temperatura || 'frio');
  const [dataRetornoAtual, setDataRetornoAtual] = useState(cliente.data_retorno || '');
  const [horarioRetornoAtual, setHorarioRetornoAtual] = useState(cliente.horario_retorno || '');
  
  // Estados de controle de UI (Loading e Modo Edição da Data/Hora)
  const [salvandoTemp, setSalvandoTemp] = useState(false);
  const [editandoDataHora, setEditandoDataHora] = useState(false);
  const [novaData, setNovaData] = useState(cliente.data_retorno || '');
  const [novoHorario, setNovoHorario] = useState(cliente.horario_retorno || '');
  const [salvandoDataHora, setSalvandoDataHora] = useState(false);

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

  const atrasado = verificarAtraso(dataRetornoAtual);

  // Mapeamento de cores para a temperatura
  const corTemperatura: Record<string, string> = {
    quente: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-900',
    morno: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900',
    frio: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900'
  };

  const tempKey = (temperaturaAtual || 'frio').toLowerCase();

  // Função para salvar alteração de temperatura
  const handleMudancaTemperatura = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    e.preventDefault();
    
    const novaTemp = e.target.value;
    const temperaturaAnterior = temperaturaAtual;

    setTemperaturaAtual(novaTemp);
    setSalvandoTemp(true);

    try {
      const { error } = await supabase
        .from('tab_clientes')
        .update({ temperatura: novaTemp })
        .eq('id', cliente.id);

      if (error) throw error;

      toast.success(`Temperatura alterada para ${novaTemp.toUpperCase()}!`);
      
      if (onUpdateSuccess) {
        onUpdateSuccess(cliente.id, { temperatura: novaTemp });
      }
    } catch (err: any) {
      console.error('Erro ao atualizar temperatura:', err);
      setTemperaturaAtual(temperaturaAnterior);
      toast.error('Erro ao salvar temperatura. Tente novamente.');
    } finally {
      setSalvandoTemp(false);
    }
  };

  // Função para salvar alteração de data e horário de retorno
  const handleSalvarDataHora = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const dataAntiga = dataRetornoAtual;
    const horarioAntigo = horarioRetornoAtual;

    setSalvandoDataHora(true);

    try {
      const payload = {
        data_retorno: novaData || null,
        horario_retorno: novoHorario || null
      };

      const { error } = await supabase
        .from('tab_clientes')
        .update(payload)
        .eq('id', cliente.id);

      if (error) throw error;

      setDataRetornoAtual(novaData);
      setHorarioRetornoAtual(novoHorario);
      setEditandoDataHora(false);
      toast.success('Retorno agendado atualizado com sucesso!');

      if (onUpdateSuccess) {
        onUpdateSuccess(cliente.id, payload);
      }
    } catch (err: any) {
      console.error('Erro ao atualizar data/horário:', err);
      setNovaData(dataAntiga);
      setNovoHorario(horarioAntigo);
      toast.error('Erro ao atualizar o retorno.');
    } finally {
      setSalvandoDataHora(false);
    }
  };

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
        
        {/* Esquerda: Data e Horário de Retorno (Interativo / Editável) */}
        <div className="flex items-center gap-1.5">
          <Calendar size={11} className={atrasado ? 'text-red-500' : 'text-slate-400'} />
          
          {!editandoDataHora ? (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                setEditandoDataHora(true);
              }}
              title="Clique para alterar data e horário"
              className="flex items-center gap-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 px-1 py-0.5 rounded transition-colors"
            >
              <div className="flex items-center gap-1">
                <span className={`text-[10px] font-black ${atrasado ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-zinc-300'}`}>
                  {dataRetornoAtual ? dataRetornoAtual.split('-').reverse().join('/') : '--/--/--'}
                </span>
                {horarioRetornoAtual && (
                  <span className="text-[9px] font-semibold text-slate-400 flex items-center gap-0.5">
                    <Clock size={8} />
                    {horarioRetornoAtual.slice(0, 5)}
                  </span>
                )}
              </div>

              {atrasado && (
                <div className="flex items-center gap-0.5 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1 py-0.5 rounded text-[8px] font-black uppercase ml-1 animate-pulse">
                  <AlertCircle size={9} />
                </div>
              )}
            </div>
          ) : (
            /* Modo de Edição Compacto de Data e Hora */
            <div 
              className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-800 p-1 rounded-lg border border-slate-200 dark:border-zinc-700" 
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <input 
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
                className="text-[9px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded px-1 py-0.5 text-slate-800 dark:text-zinc-200 focus:outline-none"
              />
              <input 
                type="time"
                value={novoHorario}
                onChange={(e) => setNovoHorario(e.target.value)}
                className="text-[9px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded px-1 py-0.5 text-slate-800 dark:text-zinc-200 focus:outline-none w-16"
              />

              {salvandoDataHora ? (
                <Loader2 size={12} className="animate-spin text-slate-500 mx-1" />
              ) : (
                <div className="flex items-center gap-0.5">
                  <button 
                    onClick={handleSalvarDataHora}
                    className="p-0.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded transition-colors"
                    title="Salvar"
                  >
                    <Check size={10} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditandoDataHora(false);
                      setNovaData(dataRetornoAtual);
                      setNovoHorario(horarioRetornoAtual);
                    }}
                    className="p-0.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded transition-colors"
                    title="Cancelar"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Direita: Seletor de Temperatura Interativo + Bloqueio de Modal + Loading */}
        <div 
          className="relative flex items-center gap-1" 
          onClick={(e) => e.stopPropagation()} 
          onMouseDown={(e) => e.stopPropagation()}
        >
          {salvandoTemp && <Loader2 size={10} className="animate-spin text-slate-400" />}
          
          <div className="relative">
            <select
              value={tempKey}
              onChange={handleMudancaTemperatura}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={salvandoTemp}
              aria-label="Temperatura do cliente"
              className={`appearance-none cursor-pointer pl-2 pr-5 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-offset-1 transition-colors ${corTemperatura[tempKey] || corTemperatura.frio} ${salvandoTemp ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="frio" className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200">Frio</option>
              <option value="morno" className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200">Morno</option>
              <option value="quente" className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200">Quente</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5 text-current opacity-70">
              <Flame size={8} />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};