import { useEffect, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import type { FiltrosComissoes, TipoParticipanteComissao, SituacaoPagamentoComissao, SituacaoRecebimentoComissao } from "../types/comissoes";
import { TIPOS_PARTICIPANTE_COMISSAO, SITUACOES_PAGAMENTO_COMISSAO, SITUACOES_RECEBIMENTO_COMISSAO } from "../types/comissoes";
import { MultiSelectComissoes, type OpcaoMultiSelectComissoes } from "./MultiSelectComissoes";

interface Props {
  filtros: FiltrosComissoes;
  loading?: boolean;
  temFiltrosAtivos?: boolean;
  corretores?: OpcaoMultiSelectComissoes[];
  seguradoras?: OpcaoMultiSelectComissoes[];
  produtos?: OpcaoMultiSelectComissoes[];
  participantes?: OpcaoMultiSelectComissoes[];
  apenasCorretor?: boolean;
  onFiltroChange: <K extends keyof FiltrosComissoes>(campo: K, valor: FiltrosComissoes[K]) => void;
  onLimpar: () => void;
}
const inputClassName = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100";

export function ComissoesFiltros({ filtros, loading = false, temFiltrosAtivos = false, corretores = [], seguradoras = [], produtos = [], participantes = [], apenasCorretor = false, onFiltroChange, onLimpar }: Props) {
  const [busca, setBusca] = useState(filtros.busca ?? "");
  const [inicio, setInicio] = useState(filtros.data_inicio ?? "");
  const [fim, setFim] = useState(filtros.data_fim ?? "");
  useEffect(() => { setBusca(filtros.busca ?? ""); }, [filtros.busca]);
  useEffect(() => { setInicio(filtros.data_inicio ?? ""); }, [filtros.data_inicio]);
  useEffect(() => { setFim(filtros.data_fim ?? ""); }, [filtros.data_fim]);
  useEffect(() => {
    if (busca === (filtros.busca ?? "")) return;
    const id = window.setTimeout(() => onFiltroChange("busca", busca.trim()), 350);
    return () => window.clearTimeout(id);
  }, [busca, filtros.busca, onFiltroChange]);
  const intervaloInvalido = Boolean(inicio && fim && fim < inicio);
  const datasAlteradas = inicio !== (filtros.data_inicio ?? "") || fim !== (filtros.data_fim ?? "");

  function alterar<K extends keyof FiltrosComissoes>(campo: K, valores: string[]) {
    onFiltroChange(campo, valores as FiltrosComissoes[K]);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Filtros</h2>
        <button type="button" disabled={loading || !temFiltrosAtivos} onClick={() => { setBusca(""); setInicio(""); setFim(""); onLimpar(); }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-700 disabled:opacity-40 dark:text-slate-400"><RotateCcw size={14} /> Limpar tudo</button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Buscar</label>
          <div className="relative"><Search size={15} className="absolute left-3 top-3 text-slate-400" />
            <input className={`${inputClassName} pl-9`} value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Cliente, apólice, produto, seguradora..." /></div>
        </div>
        <div><label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Venda a partir de</label>
          <input className={inputClassName} type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
        <div><label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Venda até</label>
          <input className={inputClassName} type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
        {!apenasCorretor && <MultiSelectComissoes label="Corretor" opcoes={corretores} value={filtros.corretor_id} onChange={(v) => alterar("corretor_id", v)} placeholder="Todos os corretores" />}
        <MultiSelectComissoes label="Seguradora" opcoes={seguradoras} value={filtros.seguradora_id} onChange={(v) => alterar("seguradora_id", v)} placeholder="Todas as seguradoras" />
        <MultiSelectComissoes label="Produto" opcoes={produtos} value={filtros.produto_id} onChange={(v) => alterar("produto_id", v)} placeholder="Todos os produtos" />
        {!apenasCorretor && <MultiSelectComissoes label="Situação do recebimento" opcoes={SITUACOES_RECEBIMENTO_COMISSAO as {value: SituacaoRecebimentoComissao;label:string}[]} value={filtros.situacao_recebimento} onChange={(v) => alterar("situacao_recebimento", v)} />}
        <MultiSelectComissoes label={apenasCorretor ? "Situação do pagamento" : "Situação do pagamento"} opcoes={SITUACOES_PAGAMENTO_COMISSAO as {value: SituacaoPagamentoComissao;label:string}[]} value={filtros.situacao_pagamento} onChange={(v) => alterar("situacao_pagamento", v)} />
        {!apenasCorretor && <>
          <MultiSelectComissoes label="Tipo de participante" opcoes={TIPOS_PARTICIPANTE_COMISSAO as {value: TipoParticipanteComissao;label:string}[]} value={filtros.tipo_participante} onChange={(v) => alterar("tipo_participante", v)} />
          <MultiSelectComissoes label="Participante" opcoes={participantes} value={filtros.participante_id} onChange={(v) => alterar("participante_id", v)} placeholder="Todos os participantes" />
        </>}
      </div>
      {(intervaloInvalido || datasAlteradas) && <div className="mt-3 flex items-center justify-end gap-3">
        {intervaloInvalido && <span className="text-xs text-red-600">A data final deve ser igual ou posterior à inicial.</span>}
        <button type="button" disabled={intervaloInvalido || !datasAlteradas || loading}
          onClick={() => { onFiltroChange("data_inicio", inicio); onFiltroChange("data_fim", fim); }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Aplicar período</button>
      </div>}
    </section>
  );
}
