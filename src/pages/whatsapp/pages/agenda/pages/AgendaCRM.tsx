import { useCallback, useMemo, useRef, useState, } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, Plus, RefreshCw, } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import AgendaCalendar, { type AgendaCalendarNovoHorario, type AgendaCalendarPeriodo, type AgendaCalendarReagendamento, type AgendaCalendarRef, type AgendaCalendarView, } from '../components/AgendaCalendar';
import ModalNovoCompromisso, { type NovoCompromissoSubmitPayload, } from '../components/ModalNovoCompromisso';
import ModalCompromisso, { type ModalCompromissoEdicao, type ModalCompromissoReagendamento, } from '../components/ModalCompromisso';
import { atualizarCompromisso, buscarCompromissos, buscarResumoAgenda, buscarFilaOperacional, cancelarCompromisso, concluirCompromisso, criarCompromisso, criarCompromissos, reagendarCompromisso, type ResumoAgenda, } from '../services/agendaService';
import type { AgendaCategoria, AgendaItem, AgendaNatureza, AgendaPrioridade, AgendaStatus, } from '../types/agenda';
interface AgendaPeriodo {
    inicio: string;
    fim: string;
}
interface AgendaFiltros {
    responsavelId: string | null;
    categorias: AgendaCategoria[];
    naturezas: AgendaNatureza[];
    status: AgendaStatus[];
    prioridades: AgendaPrioridade[];
}
type FilaOperacionalTipo = 'HOJE' | 'ATRASADOS' | 'PROXIMOS' | 'PENDENTES';
const FILA_OPERACIONAL_CONFIG: Record<FilaOperacionalTipo, {
    titulo: string;
    descricao: string;
    vazio: string;
}> = {
    HOJE: {
        titulo: 'Compromissos de hoje',
        descricao: 'compromissos para hoje',
        vazio: 'Nenhum compromisso pendente para hoje.',
    },
    ATRASADOS: {
        titulo: 'Compromissos atrasados',
        descricao: 'compromissos exigem atenção',
        vazio: 'Nenhum compromisso atrasado.',
    },
    PROXIMOS: {
        titulo: 'Próximos compromissos',
        descricao: 'compromissos futuros',
        vazio: 'Nenhum compromisso futuro pendente.',
    },
    PENDENTES: {
        titulo: 'Compromissos pendentes',
        descricao: 'compromissos em aberto',
        vazio: 'Nenhum compromisso pendente.',
    },
};
export default function AgendaCRM() {
    const navigate = useNavigate();
    const { userProfile } = useAuth();
    const agendaCalendarRef = useRef<AgendaCalendarRef | null>(null);
    const [visualizacao, setVisualizacao] = useState<AgendaCalendarView>('dayGridMonth');
    const [periodo, setPeriodo] = useState<AgendaPeriodo | null>(null);
    const [dataReferencia, setDataReferencia,] = useState<Date>(new Date());
    const [filtros] = useState<AgendaFiltros>({
        responsavelId: null,
        categorias: [],
        naturezas: [],
        status: [],
        prioridades: [],
    });
    const [compromissos, setCompromissos] = useState<AgendaItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [recarregando, setRecarregando] = useState(false);
    const [resumo, setResumo] = useState<ResumoAgenda>({
        hoje: 0,
        atrasados: 0,
        proximos: 0,
        pendentes: 0,
    });
    const [filaOperacional, setFilaOperacional] = useState<AgendaItem[]>([]);
    const [filaOperacionalTipo, setFilaOperacionalTipo] = useState<FilaOperacionalTipo | null>(null);
    const [carregandoFilaOperacional, setCarregandoFilaOperacional] = useState<FilaOperacionalTipo | null>(null);
    const [salvandoNovoCompromisso, setSalvandoNovoCompromisso,] = useState(false);
    const [salvandoCompromisso, setSalvandoCompromisso,] = useState(false);
    const [compromissoSelecionado, setCompromissoSelecionado,] = useState<AgendaItem | null>(null);
    const [modalCompromissoAberto, setModalCompromissoAberto,] = useState(false);
    const [modalNovoCompromissoAberto, setModalNovoCompromissoAberto,] = useState(false);
    const [novoCompromissoHorario, setNovoCompromissoHorario,] = useState<AgendaCalendarNovoHorario | null>(null);
    const corretoraId = useMemo(() => {
        if (!userProfile) {
            return null;
        }
        if (userProfile.tipo_usuario ===
            'CORRETORA') {
            return userProfile.id;
        }
        return userProfile.corretora_id ?? null;
    }, [userProfile]);
    const isCorretor = userProfile?.tipo_usuario ===
        'CORRETOR';
    const responsavelEfetivoId = isCorretor
        ? userProfile?.id ?? null
        : filtros.responsavelId;
    const carregarResumo = useCallback(async () => {
        if (!corretoraId) {
            setResumo({
                hoje: 0,
                atrasados: 0,
                proximos: 0,
                pendentes: 0,
            });
            return;
        }
        try {
            const data = await buscarResumoAgenda({
                corretoraId,
                responsavelId: responsavelEfetivoId,
            });
            setResumo(data);
        }
        catch (error) {
            console.error('Erro ao carregar resumo da agenda:', error);
        }
    }, [
        corretoraId,
        responsavelEfetivoId,
    ]);
    const carregarFilaOperacional = useCallback(async (tipo: FilaOperacionalTipo) => {
        if (!corretoraId) {
            setFilaOperacional([]);
            return;
        }
        setCarregandoFilaOperacional(tipo);
        try {
            const data = await buscarFilaOperacional({
                corretoraId,
                responsavelId: responsavelEfetivoId,
                tipo,
            });
            setFilaOperacional(data);
            return true;
        }
        catch (error) {
            console.error('Erro ao carregar fila operacional da agenda:', error);
            toast.error('Não foi possível carregar os compromissos.');
            return false;
        }
        finally {
            setCarregandoFilaOperacional(null);
        }
    }, [corretoraId, responsavelEfetivoId]);
    const handleAbrirFilaOperacional = useCallback(async (tipo: FilaOperacionalTipo) => {
        if (filaOperacionalTipo === tipo) {
            setFilaOperacionalTipo(null);
            setFilaOperacional([]);
            return;
        }
        setFilaOperacionalTipo(tipo);
        const carregou = await carregarFilaOperacional(tipo);
        if (!carregou) {
            setFilaOperacionalTipo(null);
            setFilaOperacional([]);
        }
    }, [filaOperacionalTipo, carregarFilaOperacional]);
    const fecharFilaOperacional = useCallback(() => {
        setFilaOperacionalTipo(null);
        setFilaOperacional([]);
    }, []);
    const atualizarCamadaOperacional = useCallback(async () => {
        const tarefas: Promise<unknown>[] = [
            carregarResumo(),
        ];
        if (filaOperacionalTipo) {
            tarefas.push(carregarFilaOperacional(filaOperacionalTipo));
        }
        await Promise.all(tarefas);
    }, [
        carregarResumo,
        carregarFilaOperacional,
        filaOperacionalTipo,
    ]);
    const carregarCompromissos = useCallback(async (periodoCarregar: AgendaPeriodo, silent = false) => {
        if (!corretoraId) {
            setCompromissos([]);
            setLoading(false);
            setRecarregando(false);
            return;
        }
        if (silent) {
            setRecarregando(true);
        }
        else {
            setLoading(true);
        }
        try {
            const data = await buscarCompromissos({
                corretoraId,
                inicio: periodoCarregar.inicio,
                fim: periodoCarregar.fim,
                responsavelId: responsavelEfetivoId,
                categorias: filtros.categorias,
                naturezas: filtros.naturezas,
                status: filtros.status,
                prioridades: filtros.prioridades,
            });
            setCompromissos(data);
        }
        catch (error) {
            console.error('Erro ao carregar agenda:', error);
            toast.error('Não foi possível carregar a agenda.');
        }
        finally {
            setLoading(false);
            setRecarregando(false);
        }
    }, [
        corretoraId,
        responsavelEfetivoId,
        filtros.categorias,
        filtros.naturezas,
        filtros.status,
        filtros.prioridades,
    ]);
    const handlePeriodoChange = useCallback((novoPeriodo: AgendaCalendarPeriodo) => {
        const proximoPeriodo = {
            inicio: novoPeriodo.inicio,
            fim: novoPeriodo.fim,
        };
        setPeriodo(proximoPeriodo);
        setDataReferencia(novoPeriodo.dataReferencia);
        setVisualizacao(novoPeriodo.visualizacao);
        carregarCompromissos(proximoPeriodo);
        void carregarResumo();
    }, [
        carregarCompromissos,
        carregarResumo,
    ]);
    const handleAtualizar = useCallback(() => {
        if (!periodo) {
            return;
        }
        void carregarCompromissos(periodo, true);
        void atualizarCamadaOperacional();
    }, [
        periodo,
        carregarCompromissos,
        atualizarCamadaOperacional,
    ]);
    const handleAnterior = useCallback(() => {
        agendaCalendarRef.current?.anterior();
    }, []);
    const handleHoje = useCallback(() => {
        agendaCalendarRef.current?.hoje();
    }, []);
    const handleProximo = useCallback(() => {
        agendaCalendarRef.current?.proximo();
    }, []);
    const handleVisualizacao = useCallback((novaVisualizacao: AgendaCalendarView) => {
        setVisualizacao(novaVisualizacao);
        agendaCalendarRef.current
            ?.alterarVisualizacao(novaVisualizacao);
    }, []);
    const abrirCompromisso = useCallback((compromisso: AgendaItem) => {
        setCompromissoSelecionado(compromisso);
        setModalCompromissoAberto(true);
    }, []);
    const fecharCompromisso = useCallback(() => {
        setModalCompromissoAberto(false);
        setCompromissoSelecionado(null);
    }, []);
    const handleAbrirVinculo = useCallback((compromisso: AgendaItem) => {
        if (compromisso.tipoOrigem !==
            'WHATSAPP' ||
            !compromisso.origemId) {
            return;
        }
        navigate('/whatsapp/conversas', {
            state: {
                conversationId: compromisso.origemId,
            },
        });
    }, [navigate]);
    const sincronizarCompromisso = useCallback((compromissoAtualizado: AgendaItem) => {
        setCompromissos(current => current.map(compromisso => compromisso.id === compromissoAtualizado.id
            ? compromissoAtualizado
            : compromisso));
        setFilaOperacional(current => current.map(compromisso => compromisso.id === compromissoAtualizado.id
            ? compromissoAtualizado
            : compromisso));
        setCompromissoSelecionado(compromissoAtualizado);
    }, []);
    const handleConcluirCompromisso = useCallback(async (compromisso: AgendaItem) => {
        setSalvandoCompromisso(true);
        try {
            const atualizado = await concluirCompromisso(compromisso.id);
            sincronizarCompromisso(atualizado);
            await atualizarCamadaOperacional();
            setModalCompromissoAberto(false);
            setCompromissoSelecionado(null);
            toast.success('Compromisso concluído.');
        }
        catch (error) {
            console.error('Erro ao concluir compromisso:', error);
            toast.error('Não foi possível concluir o compromisso.');
            throw error;
        }
        finally {
            setSalvandoCompromisso(false);
        }
    }, [
        sincronizarCompromisso,
        atualizarCamadaOperacional,
    ]);
    const abrirNovoCompromisso = useCallback(() => {
        setNovoCompromissoHorario(null);
        setModalNovoCompromissoAberto(true);
    }, []);
    const handleNovoHorario = useCallback((horario: AgendaCalendarNovoHorario) => {
        setNovoCompromissoHorario(horario);
        setModalNovoCompromissoAberto(true);
    }, []);
    const fecharNovoCompromisso = useCallback(() => {
        setModalNovoCompromissoAberto(false);
        setNovoCompromissoHorario(null);
    }, []);
    const handleSalvarNovosCompromissos = useCallback(async (payload: NovoCompromissoSubmitPayload) => {
        const { vinculo, compromissos: novosCompromissos, } = payload;
        if (!corretoraId ||
            !userProfile?.id) {
            toast.error('Não foi possível identificar o usuário ou a corretora.');
            return;
        }
        if (novosCompromissos.length === 0) {
            return;
        }
        setSalvandoNovoCompromisso(true);
        try {
            const payloads = novosCompromissos.map(compromisso => ({
                corretoraId,
                responsavelId: responsavelEfetivoId ??
                    userProfile.id,
                criadoPorId: userProfile.id,
                natureza: compromisso.natureza,
                categoria: compromisso.categoria,
                titulo: compromisso.titulo,
                descricao: compromisso.descricao,
                inicioEm: compromisso.inicioEm,
                fimEm: compromisso.fimEm,
                diaInteiro: compromisso.diaInteiro,
                prioridade: compromisso.prioridade,
                crmPessoaId: vinculo?.tipo === 'PESSOA'
                    ? vinculo.id
                    : null,
                crmEmpresaId: vinculo?.tipo === 'EMPRESA'
                    ? vinculo.id
                    : null,
                clienteIdLegado: vinculo?.tipo === 'LEGADO'
                    ? vinculo.id
                    : null,
                tipoOrigem: 'MANUAL',
            }));
            if (payloads.length === 1) {
                await criarCompromisso(payloads[0]);
            }
            else {
                await criarCompromissos(payloads);
            }
            setModalNovoCompromissoAberto(false);
            setNovoCompromissoHorario(null);
            toast.success(payloads.length === 1
                ? 'Compromisso criado com sucesso.'
                : `${payloads.length} compromissos criados com sucesso.`);
            if (periodo) {
                await carregarCompromissos(periodo, true);
            }
            await atualizarCamadaOperacional();
        }
        catch (error) {
            console.error('Erro ao criar compromisso:', error);
            toast.error('Não foi possível salvar o compromisso.');
            throw error;
        }
        finally {
            setSalvandoNovoCompromisso(false);
        }
    }, [
        corretoraId,
        userProfile?.id,
        responsavelEfetivoId,
        periodo,
        carregarCompromissos,
        atualizarCamadaOperacional,
    ]);
    const handleReagendar = useCallback(async (reagendamento: AgendaCalendarReagendamento) => {
        const compromissoAtualizado = await reagendarCompromisso(reagendamento.compromisso.id, {
            inicioEm: reagendamento.inicioEm,
            fimEm: reagendamento.fimEm,
            diaInteiro: reagendamento.diaInteiro,
        });
        setCompromissos(current => current.map(compromisso => compromisso.id ===
            compromissoAtualizado.id
            ? compromissoAtualizado
            : compromisso));
        await atualizarCamadaOperacional();
        toast.success('Compromisso reagendado.');
    }, [atualizarCamadaOperacional]);
    const tituloPeriodo = useMemo(() => {
        if (visualizacao === 'dayGridMonth') {
            const texto = new Intl.DateTimeFormat('pt-BR', {
                month: 'long',
                year: 'numeric',
            }).format(dataReferencia);
            return (texto.charAt(0).toUpperCase() +
                texto.slice(1));
        }
        if (visualizacao === 'timeGridDay') {
            const texto = new Intl.DateTimeFormat('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            }).format(dataReferencia);
            return (texto.charAt(0).toUpperCase() +
                texto.slice(1));
        }
        return new Intl.DateTimeFormat('pt-BR', {
            month: 'long',
            year: 'numeric',
        }).format(dataReferencia);
    }, [
        dataReferencia,
        visualizacao,
    ]);
    const handleReagendarCompromissoModal = useCallback(async (compromisso: AgendaItem, reagendamento: ModalCompromissoReagendamento) => {
        setSalvandoCompromisso(true);
        try {
            const atualizado = await reagendarCompromisso(compromisso.id, {
                inicioEm: reagendamento.inicioEm,
                fimEm: reagendamento.fimEm,
                diaInteiro: reagendamento.diaInteiro,
            });
            sincronizarCompromisso(atualizado);
            await atualizarCamadaOperacional();
            setModalCompromissoAberto(false);
            setCompromissoSelecionado(null);
            toast.success('Compromisso reagendado.');
        }
        catch (error) {
            console.error('Erro ao reagendar compromisso:', error);
            toast.error('Não foi possível reagendar o compromisso.');
            throw error;
        }
        finally {
            setSalvandoCompromisso(false);
        }
    }, [
        sincronizarCompromisso,
        atualizarCamadaOperacional,
    ]);
    const handleEditarCompromisso = useCallback(async (compromisso: AgendaItem, edicao: ModalCompromissoEdicao) => {
        setSalvandoCompromisso(true);
        try {
            const atualizado = await atualizarCompromisso(compromisso.id, {
                titulo: edicao.titulo,
                descricao: edicao.descricao,
                categoria: edicao.categoria,
                prioridade: edicao.prioridade,
            });
            sincronizarCompromisso(atualizado);
            setModalCompromissoAberto(false);
            setCompromissoSelecionado(null);
            toast.success('Compromisso atualizado.');
        }
        catch (error) {
            console.error('Erro ao editar compromisso:', error);
            toast.error('Não foi possível atualizar o compromisso.');
            throw error;
        }
        finally {
            setSalvandoCompromisso(false);
        }
    }, [sincronizarCompromisso]);
    const handleCancelarCompromisso = useCallback(async (compromisso: AgendaItem) => {
        setSalvandoCompromisso(true);
        try {
            const atualizado = await cancelarCompromisso(compromisso.id);
            sincronizarCompromisso(atualizado);
            await atualizarCamadaOperacional();
            setModalCompromissoAberto(false);
            setCompromissoSelecionado(null);
            toast.success('Compromisso cancelado.');
        }
        catch (error) {
            console.error('Erro ao cancelar compromisso:', error);
            toast.error('Não foi possível cancelar o compromisso.');
            throw error;
        }
        finally {
            setSalvandoCompromisso(false);
        }
    }, [
        sincronizarCompromisso,
        atualizarCamadaOperacional,
    ]);
    return (<div className="min-h-full bg-slate-50">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 p-4 lg:p-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays size={22} className="text-blue-600"/>
              <h1 className="text-xl font-bold text-slate-900">
                Agenda
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Central de compromissos e
              decisões do CRM
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleAtualizar} disabled={recarregando || !periodo} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
              <RefreshCw size={16} className={recarregando
            ? 'animate-spin'
            : ''}/>
              Atualizar
            </button>
            <button type="button" onClick={abrirNovoCompromisso} className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700">
              <Plus size={17}/>
              Novo compromisso
            </button>
          </div>
        </header>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <button type="button" onClick={() => void handleAbrirFilaOperacional('HOJE')} disabled={carregandoFilaOperacional !== null} className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition disabled:cursor-wait disabled:opacity-70 ${filaOperacionalTipo === 'HOJE'
            ? 'border-blue-300 ring-2 ring-blue-100'
            : 'border-slate-200 hover:border-blue-200 hover:bg-blue-50/30'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Hoje
              </span>
              <CalendarDays size={17} className="text-blue-500"/>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {resumo.hoje}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {carregandoFilaOperacional === 'HOJE'
            ? 'carregando...'
            : 'compromissos pendentes'}
            </p>
          </button>

          <button type="button" onClick={() => void handleAbrirFilaOperacional('ATRASADOS')} disabled={carregandoFilaOperacional !== null} className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition disabled:cursor-wait disabled:opacity-70 ${filaOperacionalTipo === 'ATRASADOS'
            ? 'border-red-300 ring-2 ring-red-100'
            : 'border-slate-200 hover:border-red-200 hover:bg-red-50/30'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Atrasados
              </span>
              <AlertCircle size={17} className="text-red-500"/>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {resumo.atrasados}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {carregandoFilaOperacional === 'ATRASADOS'
            ? 'carregando...'
            : 'exigem atenção'}
            </p>
          </button>

          <button type="button" onClick={() => void handleAbrirFilaOperacional('PROXIMOS')} disabled={carregandoFilaOperacional !== null} className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition disabled:cursor-wait disabled:opacity-70 ${filaOperacionalTipo === 'PROXIMOS'
            ? 'border-orange-300 ring-2 ring-orange-100'
            : 'border-slate-200 hover:border-orange-200 hover:bg-orange-50/30'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Próximos
              </span>
              <AlertCircle size={17} className="text-orange-500"/>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {resumo.proximos}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {carregandoFilaOperacional === 'PROXIMOS'
            ? 'carregando...'
            : 'compromissos futuros'}
            </p>
          </button>

          <button type="button" onClick={() => void handleAbrirFilaOperacional('PENDENTES')} disabled={carregandoFilaOperacional !== null} className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition disabled:cursor-wait disabled:opacity-70 ${filaOperacionalTipo === 'PENDENTES'
            ? 'border-emerald-300 ring-2 ring-emerald-100'
            : 'border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Pendentes
              </span>
              <CheckCircle2 size={17} className="text-emerald-500"/>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {resumo.pendentes}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {carregandoFilaOperacional === 'PENDENTES'
            ? 'carregando...'
            : 'compromissos em aberto'}
            </p>
          </button>
        </section>

        {filaOperacionalTipo && (<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <AlertCircle size={17} className={filaOperacionalTipo === 'ATRASADOS'
                ? 'text-red-500'
                : filaOperacionalTipo === 'PROXIMOS'
                    ? 'text-orange-500'
                    : filaOperacionalTipo === 'PENDENTES'
                        ? 'text-emerald-500'
                        : 'text-blue-500'}/>
                  <h2 className="truncate font-bold text-slate-900">
                    {FILA_OPERACIONAL_CONFIG[filaOperacionalTipo].titulo}
                  </h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {filaOperacional.length}{' '}
                  {FILA_OPERACIONAL_CONFIG[filaOperacionalTipo].descricao}
                </p>
              </div>

              <button type="button" onClick={fecharFilaOperacional} className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
                Fechar
              </button>
            </div>

            {carregandoFilaOperacional === filaOperacionalTipo ? (<div className="p-6 text-center text-sm text-slate-500">
                Carregando compromissos...
              </div>) : filaOperacional.length === 0 ? (<div className="p-6 text-center text-sm text-slate-500">
                {FILA_OPERACIONAL_CONFIG[filaOperacionalTipo].vazio}
              </div>) : (<div className="divide-y divide-slate-100">
                {filaOperacional.map(compromisso => (<button key={compromisso.id} type="button" onClick={() => abrirCompromisso(compromisso)} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {compromisso.titulo}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>
                          {new Intl.DateTimeFormat('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                    }).format(new Date(compromisso.inicioEm))}
                        </span>
                        <span>•</span>
                        <span>{compromisso.categoria}</span>
                      </div>
                    </div>

                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${compromisso.prioridade === 'URGENTE'
                        ? 'bg-red-100 text-red-700'
                        : compromisso.prioridade === 'ALTA'
                            ? 'bg-orange-100 text-orange-700'
                            : compromisso.prioridade === 'BAIXA'
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-blue-50 text-blue-700'}`}>
                      {compromisso.prioridade}
                    </span>
                  </button>))}
              </div>)}
          </section>)}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <div className="flex items-center gap-2">
                <button type="button" onClick={handleAnterior} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                Anterior
                </button>
                <button type="button" onClick={handleHoje} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                Hoje
                </button>
                <button type="button" onClick={handleProximo} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                Próximo
                </button>
            </div>
            <div className="text-center">
            <h2 className="text-base font-bold capitalize text-slate-800">
                {tituloPeriodo}
            </h2>
            </div>
            <div className="inline-flex w-fit rounded-lg border border-slate-200 bg-slate-50 p-1 lg:justify-self-end">
                <button type="button" onClick={() => handleVisualizacao('dayGridMonth')} className={`h-8 rounded-md px-3 text-sm font-semibold transition ${visualizacao ===
            'dayGridMonth'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-slate-500 hover:text-slate-800'}`}>
                Mês
                </button>
                <button type="button" onClick={() => handleVisualizacao('timeGridWeek')} className={`h-8 rounded-md px-3 text-sm font-semibold transition ${visualizacao ===
            'timeGridWeek'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-slate-500 hover:text-slate-800'}`}>
                Semana
                </button>
                <button type="button" onClick={() => handleVisualizacao('timeGridDay')} className={`h-8 rounded-md px-3 text-sm font-semibold transition ${visualizacao ===
            'timeGridDay'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-slate-500 hover:text-slate-800'}`}>
                Dia
                </button>
            </div>
            </div>
          {loading && (<div className="flex h-1 overflow-hidden bg-slate-100">
              <div className="w-full animate-pulse bg-blue-500"/>
            </div>)}
          <div className="p-4">
            <AgendaCalendar ref={agendaCalendarRef} compromissos={compromissos} visualizacao={visualizacao} onPeriodoChange={handlePeriodoChange} onCompromissoClick={abrirCompromisso} onNovoHorario={handleNovoHorario} onReagendar={handleReagendar}/>
          </div>
        </section>
      </div>
      <ModalCompromisso aberto={modalCompromissoAberto} compromisso={compromissoSelecionado} salvando={salvandoCompromisso} onClose={fecharCompromisso} onConcluir={handleConcluirCompromisso} onReagendar={handleReagendarCompromissoModal} onEditar={handleEditarCompromisso} onCancelar={handleCancelarCompromisso} onAbrirVinculo={handleAbrirVinculo}/>
      {corretoraId && (<ModalNovoCompromisso aberto={modalNovoCompromissoAberto} corretoraId={corretoraId} horarioInicial={novoCompromissoHorario} salvando={salvandoNovoCompromisso} onClose={fecharNovoCompromisso} onSubmit={handleSalvarNovosCompromissos}/>)}
    </div>);
}
