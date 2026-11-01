import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarRange,
  ChartNoAxesCombined,
  ChevronDown,
  CircleDollarSign,
  Filter,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import {
  buscarMovimentosFluxoCaixa,
  calcularResumoFluxoCaixa,
  consolidarFluxoCaixaPorMes,
  type FiltrosFluxoCaixa,
  type ModuloFluxoCaixa,
  type MovimentoFluxoCaixa,
  type NaturezaFluxoCaixa,
  type TipoMovimentoFluxoCaixa,
} from '../services/fluxoCaixaService';

type PeriodoRapido = 'MES' | '90_DIAS' | 'ANO' | 'TUDO';

interface FiltrosTela {
  dataInicial: string;
  dataFinal: string;
  natureza: NaturezaFluxoCaixa | '';
  tipoMovimento: TipoMovimentoFluxoCaixa | '';
  modulo: ModuloFluxoCaixa | '';
  origem: string;
}

function inicioMesAtual(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
}

function fimMesAtual(): string {
  const hoje = new Date();
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return formatarDataISO(fim);
}

function formatarDataISO(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(
    data.getDate()
  ).padStart(2, '0')}`;
}

const FILTROS_INICIAIS: FiltrosTela = {
  dataInicial: inicioMesAtual(),
  dataFinal: fimMesAtual(),
  natureza: '',
  tipoMovimento: '',
  modulo: '',
  origem: '',
};

export default function FluxoCaixa() {
  const [busca, setBusca] = useState('');
  const [periodoRapido, setPeriodoRapido] = useState<PeriodoRapido>('MES');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [filtrosEdicao, setFiltrosEdicao] = useState<FiltrosTela>(FILTROS_INICIAIS);
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosTela>(FILTROS_INICIAIS);
  const [movimentos, setMovimentos] = useState<MovimentoFluxoCaixa[]>([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState('');

  const filtrosService = useMemo<FiltrosFluxoCaixa>(
    () => ({
      busca,
      dataInicial: filtrosAplicados.dataInicial || undefined,
      dataFinal: filtrosAplicados.dataFinal || undefined,
      natureza: filtrosAplicados.natureza,
      tipoMovimento: filtrosAplicados.tipoMovimento,
      modulo: filtrosAplicados.modulo,
      origem: filtrosAplicados.origem || undefined,
    }),
    [busca, filtrosAplicados]
  );

  const resumo = useMemo(() => calcularResumoFluxoCaixa(movimentos), [movimentos]);
  const resumoMensal = useMemo(() => consolidarFluxoCaixaPorMes(movimentos), [movimentos]);

  const carregar = useCallback(async (principal = false) => {
    try {
      principal ? setLoading(true) : setAtualizando(true);
      setErro('');
      setMovimentos(await buscarMovimentosFluxoCaixa(filtrosService));
    } catch (error) {
      console.error('[FluxoCaixa] Erro ao carregar:', error);
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar o Fluxo de Caixa.'
      );
    } finally {
      setLoading(false);
      setAtualizando(false);
    }
  }, [filtrosService]);

  useEffect(() => {
    void carregar(true);
  }, []);

  useEffect(() => {
    if (!loading) void carregar();
  }, [busca, filtrosAplicados]);

  function aplicarPeriodoRapido(periodo: PeriodoRapido) {
    const hoje = new Date();
    let dataInicial = '';
    let dataFinal = '';

    if (periodo === 'MES') {
      dataInicial = inicioMesAtual();
      dataFinal = fimMesAtual();
    } else if (periodo === '90_DIAS') {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 89);
      dataInicial = formatarDataISO(inicio);
      dataFinal = formatarDataISO(hoje);
    } else if (periodo === 'ANO') {
      dataInicial = `${hoje.getFullYear()}-01-01`;
      dataFinal = `${hoje.getFullYear()}-12-31`;
    }

    setPeriodoRapido(periodo);
    const novos = { ...filtrosAplicados, dataInicial, dataFinal };
    setFiltrosEdicao(novos);
    setFiltrosAplicados(novos);
  }

  function aplicarFiltros() {
    setPeriodoRapido('TUDO');
    setFiltrosAplicados({ ...filtrosEdicao });
  }

  function limparFiltros() {
    setPeriodoRapido('MES');
    setFiltrosEdicao(FILTROS_INICIAIS);
    setFiltrosAplicados(FILTROS_INICIAIS);
  }

  const possuiFiltrosAvancados = Boolean(
    filtrosAplicados.natureza ||
      filtrosAplicados.tipoMovimento ||
      filtrosAplicados.modulo ||
      filtrosAplicados.origem
  );

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-5 p-4 md:p-6">
        <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              <WalletCards size={16} /> Financeiro
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Fluxo de Caixa
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Visão consolidada das entradas e saídas previstas e realizadas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {([
              ['MES', 'Este mês'],
              ['90_DIAS', '90 dias'],
              ['ANO', 'Este ano'],
              ['TUDO', 'Tudo'],
            ] as const).map(([valor, label]) => (
              <button
                key={valor}
                type="button"
                onClick={() => aplicarPeriodoRapido(valor)}
                className={`h-10 rounded-lg border px-4 text-sm font-medium transition ${
                  periodoRapido === valor
                    ? 'border-cyan-600 bg-cyan-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ResumoCard
            titulo="Entradas realizadas"
            valor={formatarMoeda(resumo.entradasRealizadas)}
            detalhe={`+ ${formatarMoeda(resumo.entradasPrevistas)} previsto`}
            icon={<ArrowUpCircle size={20} />}
            classe="text-emerald-600 dark:text-emerald-400"
          />
          <ResumoCard
            titulo="Saídas realizadas"
            valor={formatarMoeda(resumo.saidasRealizadas)}
            detalhe={`+ ${formatarMoeda(resumo.saidasPrevistas)} previsto`}
            icon={<ArrowDownCircle size={20} />}
            classe="text-red-600 dark:text-red-400"
          />
          <ResumoCard
            titulo="Resultado realizado"
            valor={formatarMoeda(resumo.resultadoRealizado)}
            detalhe="Entradas realizadas menos saídas realizadas"
            icon={<CircleDollarSign size={20} />}
            classe={resumo.resultadoRealizado >= 0 ? 'text-emerald-600' : 'text-red-600'}
          />
          <ResumoCard
            titulo="Resultado projetado"
            valor={formatarMoeda(resumo.resultadoProjetado)}
            detalhe={`Impacto previsto: ${formatarMoeda(resumo.resultadoPrevisto)}`}
            icon={<TrendingUp size={20} />}
            classe={resumo.resultadoProjetado >= 0 ? 'text-cyan-600' : 'text-red-600'}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar descrição, cliente, proposta, contrato, documento..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <button
              type="button"
              onClick={() => setFiltrosAbertos((v) => !v)}
              className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition ${
                possuiFiltrosAvancados
                  ? 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-300'
                  : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
              }`}
            >
              <SlidersHorizontal size={17} /> Mais filtros
              {possuiFiltrosAvancados && <span className="h-2 w-2 rounded-full bg-cyan-500" />}
            </button>

            <button
              type="button"
              title="Atualizar"
              onClick={() => void carregar()}
              disabled={atualizando}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
            >
              <RefreshCw size={17} className={atualizando ? 'animate-spin' : ''} />
            </button>
          </div>

          {filtrosAbertos && (
            <div className="border-t border-slate-100 p-4 dark:border-slate-800">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <CampoFiltro label="Data inicial">
                  <input
                    type="date"
                    value={filtrosEdicao.dataInicial}
                    onChange={(e) => setFiltrosEdicao((p) => ({ ...p, dataInicial: e.target.value }))}
                    className={classeCampo}
                  />
                </CampoFiltro>
                <CampoFiltro label="Data final">
                  <input
                    type="date"
                    value={filtrosEdicao.dataFinal}
                    onChange={(e) => setFiltrosEdicao((p) => ({ ...p, dataFinal: e.target.value }))}
                    className={classeCampo}
                  />
                </CampoFiltro>
                <CampoFiltro label="Natureza">
                  <SelectFiltro value={filtrosEdicao.natureza} onChange={(v) => setFiltrosEdicao((p) => ({ ...p, natureza: v as NaturezaFluxoCaixa | '' }))}>
                    <option value="">Todas</option>
                    <option value="ENTRADA">Entrada</option>
                    <option value="SAIDA">Saída</option>
                  </SelectFiltro>
                </CampoFiltro>
                <CampoFiltro label="Situação">
                  <SelectFiltro value={filtrosEdicao.tipoMovimento} onChange={(v) => setFiltrosEdicao((p) => ({ ...p, tipoMovimento: v as TipoMovimentoFluxoCaixa | '' }))}>
                    <option value="">Todas</option>
                    <option value="REALIZADO">Realizado</option>
                    <option value="PREVISTO">Previsto</option>
                  </SelectFiltro>
                </CampoFiltro>
                <CampoFiltro label="Módulo">
                  <SelectFiltro value={filtrosEdicao.modulo} onChange={(v) => setFiltrosEdicao((p) => ({ ...p, modulo: v as ModuloFluxoCaixa | '' }))}>
                    <option value="">Todos</option>
                    <option value="CONTAS_RECEBER">Contas a Receber</option>
                    <option value="CONTAS_PAGAR">Contas a Pagar</option>
                  </SelectFiltro>
                </CampoFiltro>
                <CampoFiltro label="Origem">
                  <SelectFiltro value={filtrosEdicao.origem} onChange={(v) => setFiltrosEdicao((p) => ({ ...p, origem: v }))}>
                    <option value="">Todas</option>
                    <option value="MANUAL">Manual</option>
                    <option value="PROVISIONAMENTO">Provisionamento</option>
                    <option value="COMISSAO">Comissão</option>
                  </SelectFiltro>
                </CampoFiltro>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={limparFiltros} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  Limpar filtros
                </button>
                <button type="button" onClick={aplicarFiltros} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                  <Filter size={16} /> Aplicar filtros
                </button>
              </div>
            </div>
          )}
        </section>

        {erro && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div><p className="font-semibold">Não foi possível carregar o Fluxo de Caixa</p><p>{erro}</p></div>
          </div>
        )}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">Evolução por mês</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Realizado e projeção do período filtrado.</p>
              </div>
              <ChartNoAxesCombined size={20} className="text-cyan-600" />
            </div>
            <GraficoMensal dados={resumoMensal} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2">
              <CalendarRange size={19} className="text-slate-500" />
              <h2 className="font-semibold text-slate-900 dark:text-white">Leitura do período</h2>
            </div>
            <div className="space-y-3 text-sm">
              <LinhaResumo label="Movimentos" valor={String(resumo.quantidadeMovimentos)} />
              <LinhaResumo label="Entradas previstas" valor={formatarMoeda(resumo.entradasPrevistas)} />
              <LinhaResumo label="Saídas previstas" valor={formatarMoeda(resumo.saidasPrevistas)} />
              <LinhaResumo label="Impacto previsto" valor={formatarMoeda(resumo.resultadoPrevisto)} />
              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  O resultado representa os movimentos registrados no CRM. Não corresponde ao saldo bancário da corretora enquanto não houver saldo inicial/conciliação bancária.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h2 className="font-semibold text-slate-900 dark:text-white">Movimentos</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Entradas e saídas consolidadas de Contas a Pagar e Contas a Receber.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1450px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/50">
                  <Th>Data</Th><Th>Movimento</Th><Th>Descrição / Contraparte</Th><Th>Cliente / Proposta / Contrato</Th><Th>Plano de contas</Th><Th>Origem</Th><Th align="right">Valor</Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="p-10 text-center text-sm text-slate-500">Carregando fluxo de caixa...</td></tr>
                ) : movimentos.length === 0 ? (
                  <tr><td colSpan={7} className="p-10 text-center text-sm text-slate-500">Nenhum movimento encontrado para os filtros selecionados.</td></tr>
                ) : movimentos.map((item) => (
                  <tr key={item.movimento_chave} className="border-b border-slate-100 transition hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/40">
                    <Td><div className="font-medium text-slate-800 dark:text-slate-100">{formatarData(item.data_movimento)}</div><div className="text-xs text-slate-400">Venc. {formatarData(item.data_vencimento)}</div></Td>
                    <Td><div className="flex flex-wrap gap-1.5"><BadgeNatureza natureza={item.natureza} /><BadgeMovimento tipo={item.tipo_movimento} /></div><div className="mt-1 text-xs text-slate-400">{item.modulo === 'CONTAS_RECEBER' ? 'Contas a Receber' : 'Contas a Pagar'}</div></Td>
                    <Td><div className="max-w-[320px] font-medium text-slate-800 dark:text-slate-100">{item.descricao}</div>{item.contraparte && <div className="mt-0.5 text-xs text-slate-500">{item.contraparte}</div>}</Td>
                    <Td><VinculoComercial item={item} /></Td>
                    <Td><div className="max-w-[260px] text-sm text-slate-700 dark:text-slate-200">{item.plano_caminho || item.plano_nome || '—'}</div>{item.tipo_financeiro && <div className="mt-0.5 text-xs text-slate-400">{item.tipo_financeiro === 'VARIAVEL' ? 'Variável' : item.tipo_financeiro === 'FIXA' ? 'Fixa' : item.tipo_financeiro}</div>}</Td>
                    <Td><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{formatarOrigem(item.origem)}</span></Td>
                    <Td align="right"><span className={`font-semibold ${item.natureza === 'ENTRADA' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{item.natureza === 'ENTRADA' ? '+' : '-'} {formatarMoeda(item.valor_movimento)}</span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

const classeCampo = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200';

function ResumoCard({ titulo, valor, detalhe, icon, classe = '' }: { titulo: string; valor: string; detalhe: string; icon: ReactNode; classe?: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">{titulo}</p><p className={`mt-1 text-2xl font-bold tracking-tight ${classe || 'text-slate-900 dark:text-white'}`}>{valor}</p><p className="mt-1 text-xs text-slate-400">{detalhe}</p></div><div className="rounded-lg bg-slate-50 p-2.5 text-slate-500 dark:bg-slate-800">{icon}</div></div></div>;
}

function CampoFiltro({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>{children}</label>;
}

function SelectFiltro({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <div className="relative"><select value={value} onChange={(e) => onChange(e.target.value)} className={`${classeCampo} appearance-none pr-9`}>{children}</select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /></div>;
}

function Th({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' | 'center' }) {
  return <th className={`px-4 py-3 text-${align} text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400`}>{children}</th>;
}

function Td({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' | 'center' }) {
  return <td className={`px-4 py-3 align-middle text-${align} text-sm`}>{children}</td>;
}

function BadgeNatureza({ natureza }: { natureza: NaturezaFluxoCaixa }) {
  return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${natureza === 'ENTRADA' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>{natureza === 'ENTRADA' ? 'Entrada' : 'Saída'}</span>;
}

function BadgeMovimento({ tipo }: { tipo: TipoMovimentoFluxoCaixa }) {
  return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${tipo === 'REALIZADO' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'}`}>{tipo === 'REALIZADO' ? 'Realizado' : 'Previsto'}</span>;
}

function VinculoComercial({ item }: { item: MovimentoFluxoCaixa }) {
  if (!item.cliente_nome && !item.proposta_numero && !item.contrato_numero && !item.numero_cotacao) return <span className="text-slate-400">—</span>;
  const contrato = item.contrato_numero || (item.numero_cotacao ? `Cotação ${item.numero_cotacao}` : null);
  return <div className="max-w-[300px] space-y-0.5"><div className="font-medium text-slate-800 dark:text-slate-100">{item.cliente_nome || 'Cliente não identificado'}</div>{item.proposta_numero && <div className="text-xs text-slate-500">Proposta: {item.proposta_numero}</div>}{contrato && <div className="text-xs text-slate-500">Contrato: {contrato}</div>}</div>;
}

function GraficoMensal({ dados }: { dados: ReturnType<typeof consolidarFluxoCaixaPorMes> }) {
  if (!dados.length) return <div className="flex h-52 items-center justify-center text-sm text-slate-400">Sem dados no período.</div>;
  const max = Math.max(...dados.flatMap((d) => [d.entradasRealizadas, d.saidasRealizadas, d.entradasPrevistas, d.saidasPrevistas]), 1);
  return <div className="space-y-4">{dados.map((d) => <div key={d.chave} className="grid grid-cols-[72px_minmax(0,1fr)_110px] items-center gap-3"><div className="text-xs font-medium capitalize text-slate-500">{d.label}</div><div className="space-y-1.5"><Barra largura={(d.entradasRealizadas / max) * 100} classe="bg-emerald-500" /><Barra largura={(d.saidasRealizadas / max) * 100} classe="bg-red-500" /><Barra largura={(d.entradasPrevistas / max) * 100} classe="bg-emerald-200 dark:bg-emerald-900" /><Barra largura={(d.saidasPrevistas / max) * 100} classe="bg-red-200 dark:bg-red-900" /></div><div className={`text-right text-xs font-semibold ${d.resultadoProjetado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatarMoeda(d.resultadoProjetado)}</div></div>)}</div>;
}

function Barra({ largura, classe }: { largura: number; classe: string }) {
  return <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${classe}`} style={{ width: `${Math.max(largura, largura > 0 ? 1.5 : 0)}%` }} /></div>;
}

function LinhaResumo({ label, valor }: { label: string; valor: string }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-slate-500 dark:text-slate-400">{label}</span><span className="font-semibold text-slate-800 dark:text-slate-100">{valor}</span></div>;
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

function formatarData(valor: string | null): string {
  if (!valor) return '—';
  const [ano, mes, dia] = valor.slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : valor;
}

function formatarOrigem(valor: string | null): string {
  if (!valor) return '—';
  if (valor === 'COMISSAO') return 'Comissão';
  if (valor === 'PROVISIONAMENTO') return 'Provisionamento';
  if (valor === 'MANUAL') return 'Manual';
  return valor;
}
