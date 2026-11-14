import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle, CalendarDays, ChevronDown, ChevronLeft, ChevronRight,
  FileDown, Filter, Loader2, RefreshCw, RotateCcw, Search, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../auth/AuthContext';
import { usePermissoes } from '../../../hooks/usePermissoes';
import { listarRenovacoes, obterOpcoesRenovacoes } from '../services/renovacoesService';
import { gerarPdfRenovacoes } from '../services/renovacoesPdfService';
import type { FiltrosRenovacoes, OpcoesRenovacoes, ResultadoRenovacoes } from '../types/renovacoes';

const PAGE_SIZE = 20;

function dataLocal(date: Date): string {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function filtrosIniciais(): FiltrosRenovacoes {
  const inicio = new Date();
  const fim = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 90);
  return {
    busca: '',
    corretor_ids: [],
    produto_ids: [],
    data_venda_inicio: '',
    data_venda_fim: '',
    vigencia_inicio: dataLocal(inicio),
    vigencia_fim: dataLocal(fim),
  };
}

const moeda = (valor: number): string =>
  Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function dataBR(valor?: string | null): string {
  if (!valor) return '—';
  const [ano, mes, dia] = valor.slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : valor;
}

function FiltroDropdown({
  titulo, quantidade, children,
}: { titulo: string; quantidade: number; children: ReactNode }) {
  return (
    <details className="group relative">
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 [&::-webkit-details-marker]:hidden dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
        {titulo}
        {quantidade > 0 && (
          <span className="rounded-full bg-blue-600 px-1.5 text-xs font-bold text-white">{quantidade}</span>
        )}
        <ChevronDown size={15} className="text-slate-400 transition group-open:rotate-180" />
      </summary>
      <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <p className="px-2 pb-2 text-xs font-semibold text-slate-500">{titulo}</p>
        <div className="max-h-64 overflow-y-auto">{children}</div>
      </div>
    </details>
  );
}

function FiltroCheckbox({
  checked, label, detalhe, onChange,
}: { checked: boolean; label: string; detalhe?: string | null; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer gap-2.5 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600"
      />
      <span className="min-w-0 text-sm text-slate-700 dark:text-slate-200">
        <span className="block break-words">{label}</span>
        {detalhe && <span className="block text-xs text-slate-400">{detalhe}</span>}
      </span>
    </label>
  );
}

function PeriodoFiltro({
  titulo, inicio, fim, onInicio, onFim,
}: { titulo: string; inicio: string; fim: string; onInicio: (v: string) => void; onFim: (v: string) => void }) {
  return (
    <div className="flex min-w-[315px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-950">
      <span className="shrink-0 text-xs font-semibold text-slate-500">{titulo}</span>
      <input
        aria-label={`${titulo}: de`}
        type="date"
        value={inicio}
        max={fim || undefined}
        onChange={e => onInicio(e.target.value)}
        className="h-9 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      />
      <span className="text-xs text-slate-400">até</span>
      <input
        aria-label={`${titulo}: até`}
        type="date"
        value={fim}
        min={inicio || undefined}
        onChange={e => onFim(e.target.value)}
        className="h-9 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      />
    </div>
  );
}

export default function RenovacoesLista() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { escopo } = usePermissoes();
  const administrador = userProfile?.tipo_usuario === 'CORRETORA' || userProfile?.tipo_usuario === 'ADMIN';
  const escopoLeitura = administrador ? 'tenant' : escopo('operacoes.renovacoes', 'read');
  const escopoExportacao = administrador ? 'tenant' : escopo('operacoes.renovacoes', 'export');
  const podeVisualizar = escopoLeitura === 'tenant' || escopoLeitura === 'own';
  const podeExportar = podeVisualizar && (escopoExportacao === 'tenant' || escopoExportacao === 'own');

  const [filtros, setFiltros] = useState<FiltrosRenovacoes>(filtrosIniciais);
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(true);
  const [opcoes, setOpcoes] = useState<OpcoesRenovacoes>({ corretores: [], produtos: [] });
  const [erroOpcoes, setErroOpcoes] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoRenovacoes | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const [recarregar, setRecarregar] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const busca = filtros.busca?.trim() ?? '';
      setBuscaAplicada(busca.length >= 3 ? busca : '');
      setPagina(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [filtros.busca]);

  const parametros = useMemo<FiltrosRenovacoes>(() => ({
    busca: buscaAplicada,
    corretor_ids: filtros.corretor_ids,
    produto_ids: filtros.produto_ids,
    data_venda_inicio: filtros.data_venda_inicio,
    data_venda_fim: filtros.data_venda_fim,
    vigencia_inicio: filtros.vigencia_inicio,
    vigencia_fim: filtros.vigencia_fim,
  }), [
    buscaAplicada,
    filtros.corretor_ids,
    filtros.produto_ids,
    filtros.data_venda_inicio,
    filtros.data_venda_fim,
    filtros.vigencia_inicio,
    filtros.vigencia_fim,
  ]);

  useEffect(() => {
    if (!podeVisualizar) return;
    let ativo = true;
    obterOpcoesRenovacoes()
      .then(data => { if (ativo) setOpcoes(data); })
      .catch(error => {
        if (ativo) setErroOpcoes(error instanceof Error ? error.message : 'Erro ao carregar opções.');
      });
    return () => { ativo = false; };
  }, [podeVisualizar]);

  useEffect(() => {
    if (!podeVisualizar) {
      setResultado(null);
      setLoading(false);
      return;
    }
    let ativo = true;
    setLoading(true);
    setErro(null);
    listarRenovacoes(parametros, pagina, PAGE_SIZE)
      .then(data => {
        if (!ativo) return;
        setResultado(data);
      })
      .catch(error => {
        if (!ativo) return;
        setResultado(null);
        setErro(error instanceof Error ? error.message : 'Não foi possível consultar renovações.');
      })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [parametros, pagina, podeVisualizar, recarregar]);

  const filtrosExtras = (filtros.corretor_ids?.length ?? 0) +
    (filtros.produto_ids?.length ?? 0) +
    Number(Boolean(filtros.data_venda_inicio || filtros.data_venda_fim));
  const total = resultado?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const inicioExibido = total ? (pagina - 1) * PAGE_SIZE + 1 : 0;
  const fimExibido = Math.min(pagina * PAGE_SIZE, total);

  useEffect(() => {
    if (resultado && pagina > totalPaginas) setPagina(totalPaginas);
  }, [resultado, pagina, totalPaginas]);

  function alterarCampo(chave: keyof FiltrosRenovacoes, valor: string): void {
    setFiltros(prev => ({ ...prev, [chave]: valor }));
    if (chave !== 'busca') setPagina(1);
  }

  function alternarValor(chave: 'corretor_ids' | 'produto_ids', id: string): void {
    setFiltros(prev => {
      const atual = prev[chave] ?? [];
      return { ...prev, [chave]: atual.includes(id) ? atual.filter(x => x !== id) : [...atual, id] };
    });
    setPagina(1);
  }

  const atualizar = useCallback(() => setRecarregar(prev => prev + 1), []);

  async function exportarPdf(): Promise<void> {
    if (!podeExportar || exportando) return;
    setExportando(true);
    setErro(null);
    try {
      const exportacao = await listarRenovacoes(parametros, 1, PAGE_SIZE, true);
      await gerarPdfRenovacoes(exportacao, parametros);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível exportar o relatório PDF.');
    } finally {
      setExportando(false);
    }
  }

  if (!podeVisualizar) {
    return (
      <div className="min-h-full bg-slate-50 p-6 dark:bg-slate-950">
        <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <RotateCcw size={36} className="mx-auto mb-4 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Renovações</h1>
          <p className="mt-2 text-sm text-slate-500">Você não possui permissão para consultar as renovações.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <RotateCcw size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Renovações</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Carteira a renovar pela data de vencimento das apólices.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={atualizar}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Atualizar
            </button>
            {podeExportar && (
              <button
                type="button"
                onClick={() => void exportarPdf()}
                disabled={loading || exportando || !resultado || total === 0}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {exportando ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                Exportar PDF
              </button>
            )}
          </div>
        </header>

        <section aria-label="Valor estimado por produto" className="mb-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Valor estimado de renovação por produto</h2>
            <span className="text-xs text-slate-500">Todos os registros filtrados, independentemente da página</span>
          </div>
          <div className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Prêmio total atual</p>
              <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">{moeda(resultado?.valor_total ?? 0)}</p>
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">{total} contratos a renovar</p>
            </div>
            {(resultado?.por_produto ?? []).map(produto => (
              <div key={produto.produto_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p title={produto.produto_nome} className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">{produto.produto_nome}</p>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{moeda(produto.valor_total)}</p>
                <p className="mt-1 text-xs text-slate-400">{produto.quantidade} contrato(s)</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">Estimativa baseada no prêmio atual do contrato, não em nova cotação.</p>
        </section>

        <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
              <input
                aria-label="Busca global de renovações"
                type="text"
                value={filtros.busca ?? ''}
                onChange={e => alterarCampo('busca', e.target.value)}
                placeholder="Buscar por proposta, cliente, CPF/CNPJ, apólice, produto ou corretor..."
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              {(filtros.busca?.trim().length ?? 0) > 0 && (filtros.busca?.trim().length ?? 0) < 3 && (
                <p className="mt-1 text-xs text-amber-600">Digite pelo menos 3 caracteres para pesquisar.</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMostrarFiltros(prev => !prev)}
              aria-expanded={mostrarFiltros}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              <Filter size={16} />Filtros {filtrosExtras > 0 && `(${filtrosExtras})`}
              <ChevronDown size={15} className={mostrarFiltros ? 'rotate-180' : ''} />
            </button>
          </div>
          {mostrarFiltros && (
            <div className="mt-4 flex flex-wrap items-start gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <FiltroDropdown titulo="Corretor" quantidade={filtros.corretor_ids?.length ?? 0}>
                {opcoes.corretores.length > 0 ? opcoes.corretores.map(c => (
                  <FiltroCheckbox key={c.id} checked={(filtros.corretor_ids ?? []).includes(c.id)} label={c.nome} onChange={() => alternarValor('corretor_ids', c.id)} />
                )) : <p className="p-3 text-xs text-slate-500">Nenhum corretor disponível.</p>}
              </FiltroDropdown>
              <FiltroDropdown titulo="Produto" quantidade={filtros.produto_ids?.length ?? 0}>
                {opcoes.produtos.length > 0 ? opcoes.produtos.map(p => (
                  <FiltroCheckbox key={p.id} checked={(filtros.produto_ids ?? []).includes(p.id)} label={p.nome} detalhe={p.categoria} onChange={() => alternarValor('produto_ids', p.id)} />
                )) : <p className="p-3 text-xs text-slate-500">Nenhum produto disponível.</p>}
              </FiltroDropdown>
              <PeriodoFiltro
                titulo="Venda" inicio={filtros.data_venda_inicio ?? ''} fim={filtros.data_venda_fim ?? ''}
                onInicio={v => alterarCampo('data_venda_inicio', v)} onFim={v => alterarCampo('data_venda_fim', v)}
              />
              <PeriodoFiltro
                titulo="Fim da vigência" inicio={filtros.vigencia_inicio ?? ''} fim={filtros.vigencia_fim ?? ''}
                onInicio={v => alterarCampo('vigencia_inicio', v)} onFim={v => alterarCampo('vigencia_fim', v)}
              />
              <button
                type="button"
                onClick={() => { setFiltros(filtrosIniciais()); setBuscaAplicada(''); setPagina(1); }}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={15} />Restaurar filtros
              </button>
              {erroOpcoes && <p className="w-full text-sm text-amber-700">{erroOpcoes}</p>}
            </div>
          )}
        </section>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
          <p><strong className="text-slate-900 dark:text-white">{total}</strong> renovações encontradas</p>
          {total > 0 && <p className="text-xs">Exibindo {inicioExibido}–{fimExibido} de {total}</p>}
        </div>
        {erro && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            <AlertTriangle size={18} className="shrink-0" />{erro}
          </div>
        )}
        {loading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <Loader2 size={26} className="animate-spin text-blue-600" />
            <p className="mt-3 text-sm text-slate-500">Carregando renovações...</p>
          </div>
        ) : total === 0 ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-7 text-center dark:border-slate-700 dark:bg-slate-900">
            <div>
              <CalendarDays size={30} className="mx-auto mb-3 text-slate-400" />
              <p className="font-semibold text-slate-800 dark:text-slate-200">Nenhuma renovação encontrada</p>
              <p className="mt-1 text-sm text-slate-500">Ajuste o período ou os demais filtros.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60">
                  <tr>
                    <th className="px-4 py-3">Proposta / Cliente</th>
                    <th className="px-4 py-3">Venda / Vigência</th>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3 text-right">Prêmio atual</th>
                    <th className="px-4 py-3">Apólice atual</th>
                    <th className="px-4 py-3">Corretor</th>
                    <th className="px-4 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(resultado?.dados ?? []).map(item => (
                    <tr key={item.contrato_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-4">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.numero_proposta}</p>
                        <p className="mt-1 max-w-[250px] text-sm text-slate-600 dark:text-slate-300">{item.cliente_nome}</p>
                        {item.renovacao_em_andamento && (
                          <span className="mt-1 inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">Renovação em andamento</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">Venda: {dataBR(item.data_venda)}</p>
                        <p className="mt-1">Início: {dataBR(item.inicio_vigencia)}</p>
                        <p className="mt-1 font-semibold text-blue-700 dark:text-blue-400">Fim: {dataBR(item.fim_vigencia)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex max-w-[230px] rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{item.produto_nome}</span>
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-slate-800 dark:text-white">{moeda(item.valor_premio_atual)}</td>
                      <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{item.numero_apolice || '—'}</td>
                      <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{item.corretor_nome}</td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/whatsapp/propostas/${item.proposta_id}`)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          Abrir <ChevronRight size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && totalPaginas > 1 && (
          <footer className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500">Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong></p>
            <div className="flex gap-2">
              <button type="button" aria-label="Página anterior" disabled={pagina <= 1} onClick={() => setPagina(p => Math.max(1, p - 1))} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700">
                <ChevronLeft size={16} />
              </button>
              <button type="button" aria-label="Próxima página" disabled={pagina >= totalPaginas} onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700">
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
