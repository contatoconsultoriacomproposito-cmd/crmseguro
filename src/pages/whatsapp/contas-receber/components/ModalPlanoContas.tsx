import { usePermissoes } from '../../hooks/usePermissoes';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useRef,
  type FormEvent,
  type ReactNode,
} from 'react';

import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  Edit3,
  FolderTree,
  Loader2,
  Plus,
  Power,
  PowerOff,
  Trash2,
  X,
} from 'lucide-react';

import {
  alterarStatusPlanoConta,
  atualizarPlanoConta,
  buscarPlanoContasCompleto,
  buscarDependenciasPlanoConta,
  excluirPlanoConta,
  criarPlanoConta,
  type DependenciasPlanoConta,
  type PlanoContaItem,
  type TipoReceitaContaReceber,
} from '../services/contasReceberService';

interface Props {
  aberto: boolean;
  onClose: () => void;
  onAlterado?: () => void | Promise<void>;
}

interface FormState {
  id: string | null;
  parentId: string;
  codigo: string;
  nome: string;
  descricao: string;
  tipoReceita: TipoReceitaContaReceber;
}

const FORM_INICIAL: FormState = {
  id: null,
  parentId: '',
  codigo: '',
  nome: '',
  descricao: '',
  tipoReceita: 'FIXA',
};

interface PlanoContaNode extends PlanoContaItem {
  filhos: PlanoContaNode[];
}

export default function ModalPlanoContas({
  aberto,
  onClose,
  onAlterado,
}: Props) {
  const { escopo } = usePermissoes();
  const podeCriarPlano = escopo('financeiro.contas_pagar', 'plano_create') === 'tenant';
  const podeEditarPlano = escopo('financeiro.contas_pagar', 'plano_update') === 'tenant';
  const podeDesativarPlano = escopo('financeiro.contas_pagar', 'plano_delete') === 'tenant';

  const [itens, setItens] = useState<PlanoContaItem[]>([]);
  const [filtroSituacao, setFiltroSituacao] = useState<'TODAS' | 'ATIVAS' | 'INATIVAS'>('TODAS');
  const [contaParaExcluir, setContaParaExcluir] = useState<PlanoContaItem | null>(null);
  const [dependencias, setDependencias] = useState<DependenciasPlanoConta | null>(null);
  const [destinoExclusaoId, setDestinoExclusaoId] = useState('');
  const [carregandoExclusao, setCarregandoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState('');

  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [alterandoStatusId, setAlterandoStatusId] =
    useState<string | null>(null);

  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  const [formAberto, setFormAberto] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_INICIAL);

  const [expandidos, setExpandidos] = useState<Set<string>>(
    new Set()
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [solicitacaoRolagem, setSolicitacaoRolagem] = useState(0);

  function rolarParaFormulario() {
    // O contador também funciona quando o formulário já estava aberto.
    setSolicitacaoRolagem((valor) => valor + 1);
  }

  useLayoutEffect(() => {
    if (!aberto || !formAberto || solicitacaoRolagem === 0) return;

    // Executa após o React incluir/atualizar o formulário no DOM.
    // Rola somente o conteúdo do modal, sem mover a página de fundo.
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, [aberto, formAberto, solicitacaoRolagem]);

  const arvore = useMemo(() => {
    const todaArvore = montarArvore(itens);
    if (filtroSituacao === 'TODAS') return todaArvore;
    const ativo = filtroSituacao === 'ATIVAS';
    // Mantém ancestrais como contexto quando um descendente atende ao filtro.
    const filtrar = (nodes: PlanoContaNode[]): PlanoContaNode[] =>
      nodes.flatMap((node) => {
        const filhos = filtrar(node.filhos);
        return node.ativo === ativo || filhos.length
          ? [{ ...node, filhos }]
          : [];
      });
    return filtrar(todaArvore);
  }, [itens, filtroSituacao]);

  const destinosExclusao = useMemo(
    () => itens.filter((item) =>
      item.ativo && item.id !== contaParaExcluir?.id &&
      (!dependencias?.comissoes || item.tipo_receita === 'VARIAVEL')
    ),
    [itens, contaParaExcluir?.id, dependencias?.comissoes]
  );

  const possuiVinculos = Boolean(
    dependencias && (dependencias.lancamentos > 0 || dependencias.provisionamentos > 0)
  );

  const contaEditando = useMemo(
    () =>
      form.id
        ? itens.find((item) => item.id === form.id) ?? null
        : null,
    [form.id, itens]
  );

  const opcoesPai = useMemo(() => {
    if (!form.id) {
      return itens;
    }

    const descendentes = obterIdsDescendentes(
      form.id,
      itens
    );

    return itens.filter(
      (item) =>
        item.id !== form.id &&
        !descendentes.has(item.id)
    );
  }, [form.id, itens]);

  useEffect(() => {
    if (!aberto) {
      return;
    }

    void carregar();
  }, [aberto]);

  async function carregar() {
    try {
      setLoading(true);
      setErro('');

      const dados =
        await buscarPlanoContasCompleto();

      setItens(dados);

      setExpandidos(
        new Set(
          dados
            .filter((item) =>
              dados.some(
                (filho) =>
                  filho.parent_id === item.id
              )
            )
            .map((item) => item.id)
        )
      );
    } catch (error) {
      console.error(
        '[PlanoContas] Erro ao carregar:',
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar o plano de contas.'
      );
    } finally {
      setLoading(false);
    }
  }

  function abrirNovaRaiz() {
    setErro('');
    setMensagem('');

    setForm({
      ...FORM_INICIAL,
    });

    setFormAberto(true);
    rolarParaFormulario();
  }

  function abrirNovaSubconta(
    parent: PlanoContaItem
  ) {
    setErro('');
    setMensagem('');

    setForm({
      ...FORM_INICIAL,
      parentId: parent.id,
      tipoReceita: parent.tipo_receita,
    });

    setFormAberto(true);
    rolarParaFormulario();

    setExpandidos((prev) => {
      const novo =
        new Set(prev);

      novo.add(parent.id);

      return novo;
    });
  }

  function abrirEdicao(
    item: PlanoContaItem
  ) {
    setErro('');
    setMensagem('');

    setForm({
      id: item.id,
      parentId:
        item.parent_id ?? '',
      codigo:
        item.codigo ?? '',
      nome:
        item.nome,
      descricao:
        item.descricao ?? '',
      tipoReceita:
        item.tipo_receita,
    });

    setFormAberto(true);
    rolarParaFormulario();
  }

  function fecharFormulario() {
    if (salvando) {
      return;
    }

    setFormAberto(false);
    setForm(FORM_INICIAL);
    setErro('');
  }

  function alterarCampo<
    K extends keyof FormState
  >(
    campo: K,
    valor: FormState[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();
    if (form.id ? !podeEditarPlano : !podeCriarPlano) { setErro('Sem permissão para esta operação no plano de contas.'); return; }

    if (salvando) {
      return;
    }

    setErro('');
    setMensagem('');

    const nome =
      form.nome.trim();

    if (!nome) {
      setErro(
        'Informe o nome da conta.'
      );
      return;
    }


    try {
      setSalvando(true);

      if (form.id) {
        await atualizarPlanoConta(
            form.id,
            {
                parent_id:
                form.parentId ||
                null,

                codigo:
                form.codigo ||
                null,

                nome,

                descricao:
                form.descricao ||
                null,

                tipo_receita:
                form.tipoReceita,
            }
        );

        setMensagem(
          'Conta atualizada com sucesso.'
        );
      } else {
        await criarPlanoConta({
            parent_id:
                form.parentId ||
                null,

            codigo:
                form.codigo ||
                null,

            nome,

            descricao:
                form.descricao ||
                null,

            tipo_receita:
                form.tipoReceita,
        });

        setMensagem(
          'Conta criada com sucesso.'
        );
      }

      setFormAberto(false);
      setForm(FORM_INICIAL);

      await carregar();

      if (onAlterado) {
        await onAlterado();
      }
    } catch (error) {
      console.error(
        '[PlanoContas] Erro ao salvar:',
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar a conta.'
      );
    } finally {
      setSalvando(false);
    }
  }

  async function handleAlterarStatus(
    item: PlanoContaItem
  ) {
    if (item.ativo ? !podeDesativarPlano : !podeEditarPlano) { setErro('Sem permissão para alterar a situação da conta.'); return; }
    if (alterandoStatusId) {
      return;
    }

    setErro('');
    setMensagem('');

    try {
      setAlterandoStatusId(
        item.id
      );

      await alterarStatusPlanoConta(
        item.id,
        !item.ativo
      );

      setMensagem(
        item.ativo
          ? 'Conta desativada com sucesso.'
          : 'Conta ativada com sucesso.'
      );

      await carregar();

      if (onAlterado) {
        await onAlterado();
      }
    } catch (error) {
      console.error(
        '[PlanoContas] Erro ao alterar status:',
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível alterar o status da conta.'
      );
    } finally {
      setAlterandoStatusId(
        null
      );
    }
  }

  async function abrirExclusao(item: PlanoContaItem) {
    if (!podeDesativarPlano) return;
    if (itens.some((filho) => filho.parent_id === item.id)) {
      setErro('Esta conta possui subcontas. Reorganize ou exclua as subcontas primeiro.');
      return;
    }
    setErro('');
    setErroExclusao('');
    setDependencias(null);
    setDestinoExclusaoId('');
    setContaParaExcluir(item);
    setCarregandoExclusao(true);
    try {
      setDependencias(await buscarDependenciasPlanoConta(item.id));
    } catch (error) {
      setErroExclusao(error instanceof Error ? error.message : 'Não foi possível consultar os vínculos.');
    } finally {
      setCarregandoExclusao(false);
    }
  }

  async function confirmarExclusao() {
    if (!contaParaExcluir || !dependencias || excluindo || !podeDesativarPlano) return;
    if (possuiVinculos && !destinoExclusaoId) {
      setErroExclusao('Escolha a conta de destino para transferir os vínculos.');
      return;
    }
    setExcluindo(true);
    setErroExclusao('');
    try {
      const resultado = await excluirPlanoConta(
        contaParaExcluir.id,
        possuiVinculos ? destinoExclusaoId : null
      );
      setContaParaExcluir(null);
      setDependencias(null);
      setDestinoExclusaoId('');
      setMensagem(
        `Conta excluída com sucesso. ${resultado.lancamentos_transferidos} lançamento(s) e ${resultado.provisionamentos_transferidos} provisionamento(s) transferido(s).`
      );
      await carregar();
      if (onAlterado) await onAlterado();
    } catch (error) {
      setErroExclusao(error instanceof Error ? error.message : 'Não foi possível excluir a conta.');
    } finally {
      setExcluindo(false);
    }
  }

  function alternarExpandido(
    id: string
  ) {
    setExpandidos((prev) => {
      const novo =
        new Set(prev);

      if (novo.has(id)) {
        novo.delete(id);
      } else {
        novo.add(id);
      }

      return novo;
    });
  }

  if (!aberto) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
              <FolderTree size={21} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Plano de Contas
              </h2>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Organize as receitas e defina sua classificação como fixa ou variável.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={salvando || excluindo}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={19} />
          </button>
        </div>

        {/* BODY */}
        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 overflow-y-auto p-5"
        >
          {/* MENSAGENS */}
          {erro && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              <AlertTriangle
                size={17}
                className="mt-0.5 shrink-0"
              />

              <span>{erro}</span>
            </div>
          )}

          {mensagem && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              <Check
                size={17}
                className="mt-0.5 shrink-0"
              />

              <span>
                {mensagem}
              </span>
            </div>
          )}

          {/* TOPO */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Estrutura hierárquica
              </h3>

              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                A classificação fixa ou variável pertence ao Plano de Contas e é herdada pelos lançamentos.
              </p>
            </div>

            {podeCriarPlano && <button
              type="button"
              onClick={
                abrirNovaRaiz
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus size={17} />
              Nova conta raiz
            </button>}
          </div>

          {/* FORM */}
          {formAberto && (
            <form
              onSubmit={handleSubmit}
              className="mb-5 rounded-xl border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900 dark:bg-blue-950/20"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {form.id
                      ? 'Editar conta'
                      : form.parentId
                        ? 'Nova subconta'
                        : 'Nova conta raiz'}
                  </h3>

                  {form.id &&
                    contaEditando && (
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Editando:{' '}
                      {contaEditando.codigo
                        ? `${contaEditando.codigo} - `
                        : ''}
                      {contaEditando.nome}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={
                    fecharFormulario
                  }
                  disabled={salvando}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Campo
                  label="Conta superior"
                  className="md:col-span-2"
                >
                  <select
                    value={
                      form.parentId
                    }
                    onChange={(e) => {
                      const parentId =
                        e.target.value;

                      alterarCampo(
                        'parentId',
                        parentId
                      );

                      if (parentId) {
                        const parent =
                          itens.find(
                            (item) =>
                              item.id ===
                              parentId
                          );

                        if (parent) {
                          alterarCampo(
                            'tipoReceita',
                            parent.tipo_receita
                          );
                        }
                      }
                    }}
                    className={
                      inputClass
                    }
                  >
                    <option value="">
                      Nenhuma — conta raiz
                    </option>

                    {opcoesPai.map(
                      (item) => (
                        <option
                          key={
                            item.id
                          }
                          value={
                            item.id
                          }
                        >
                          {item.codigo
                            ? `${item.codigo} - `
                            : ''}
                          {obterCaminhoPlano(
                            item,
                            itens
                          )}
                        </option>
                      )
                    )}
                  </select>
                </Campo>

                <Campo label="Código">
                  <input
                    value={
                      form.codigo
                    }
                    onChange={(e) =>
                      alterarCampo(
                        'codigo',
                        e.target.value
                      )
                    }
                    placeholder="Ex.: 1.2.3"
                    className={
                      inputClass
                    }
                  />
                </Campo>

                <Campo
                  label="Tipo de receita"
                  obrigatorio
                >
                  <select
                    value={
                      form.tipoReceita
                    }
                    onChange={(e) =>
                      alterarCampo(
                        'tipoReceita',
                        e.target
                          .value as TipoReceitaContaReceber
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="FIXA">
                      Fixa
                    </option>

                    <option value="VARIAVEL">
                      Variável
                    </option>
                  </select>
                </Campo>

                <Campo
                  label="Nome"
                  obrigatorio
                  className="md:col-span-2"
                >
                  <input
                    value={
                      form.nome
                    }
                    onChange={(e) =>
                      alterarCampo(
                        'nome',
                        e.target.value
                      )
                    }
                    placeholder="Ex.: Energia elétrica"
                    className={
                      inputClass
                    }
                  />
                </Campo>

                <Campo
                  label="Descrição"
                  className="md:col-span-2"
                >
                  <textarea
                    rows={3}
                    value={
                      form.descricao
                    }
                    onChange={(e) =>
                      alterarCampo(
                        'descricao',
                        e.target.value
                      )
                    }
                    placeholder="Descrição opcional desta conta..."
                    className={`${inputClass} h-auto resize-none py-3`}
                  />
                </Campo>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={
                    fecharFormulario
                  }
                  disabled={salvando}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvando}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvando && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {form.id
                    ? 'Salvar alterações'
                    : 'Criar conta'}
                </button>
              </div>
            </form>
          )}

          {/* FILTRO DE SITUAÇÃO */}
          <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar contas por situação">
            {([
              ['TODAS', 'Todas'],
              ['ATIVAS', 'Ativas'],
              ['INATIVAS', 'Inativas'],
            ] as const).map(([valor, titulo]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setFiltroSituacao(valor)}
                aria-pressed={filtroSituacao === valor}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  filtroSituacao === valor
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {titulo}
                <span className="ml-1 opacity-80">
                  ({valor === 'TODAS' ? itens.length : itens.filter((i) => i.ativo === (valor === 'ATIVAS')).length})
                </span>
              </button>
            ))}
          </div>

          {/* ÁRVORE */}
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            {loading ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center p-8">
                <Loader2
                  size={26}
                  className="mb-3 animate-spin text-blue-500"
                />

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Carregando plano de contas...
                </p>
              </div>
            ) : arvore.length ===
              0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                  <FolderTree
                    size={23}
                  />
                </div>

                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Nenhuma conta cadastrada
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Crie a primeira conta raiz para começar.
                </p>
              </div>
            ) : (
              <div>
                {arvore.map(
                  (node) => (
                    <LinhaPlanoConta
                      key={
                        node.id
                      }
                      node={
                        node
                      }
                      nivel={0}
                      expandidos={
                        expandidos
                      }
                      onAlternar={
                        alternarExpandido
                      }
                      onAdicionarFilho={
                        abrirNovaSubconta
                      }
                      onEditar={
                        abrirEdicao
                      }
                      onAlterarStatus={
                        handleAlterarStatus
                      }
                      onExcluir={abrirExclusao}
                      podeCriar={podeCriarPlano}
                      podeEditar={podeEditarPlano}
                      podeAlterarStatusAtivo={podeDesativarPlano}
                      podeExcluir={podeDesativarPlano}
                      alterandoStatusId={
                        alterandoStatusId
                      }
                    />
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando || excluindo}
            className="h-10 rounded-lg border border-slate-200 px-5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Fechar
          </button>
        </div>
      </div>
      {contaParaExcluir && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="titulo-excluir-plano" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-3 flex items-center gap-2 text-red-600 dark:text-red-400">
              <Trash2 size={20} />
              <h3 id="titulo-excluir-plano" className="text-base font-bold">Excluir conta do plano</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Deseja excluir definitivamente <strong>{contaParaExcluir.nome}</strong>?
            </p>
            {carregandoExclusao ? (
              <div className="my-5 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Verificando vínculos financeiros...</div>
            ) : dependencias && (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <p>Lançamentos vinculados: <strong>{dependencias.lancamentos}</strong></p>
                  <p>Provisionamentos vinculados: <strong>{dependencias.provisionamentos}</strong></p>
                  {dependencias.comissoes > 0 && <p>Destes, lançamentos de comissões: <strong>{dependencias.comissoes}</strong></p>}
                </div>
                {possuiVinculos ? (
                  <div>
                    <label htmlFor="destino-plano-exclusao" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Transferir vínculos para</label>
                    <select
                      id="destino-plano-exclusao"
                      value={destinoExclusaoId}
                      onChange={(e) => setDestinoExclusaoId(e.target.value)}
                      className={inputClass}
                      disabled={excluindo}
                    >
                      <option value="">Selecione uma conta ativa</option>
                      {destinosExclusao.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.codigo ? `${item.codigo} - ` : ''}{obterCaminhoPlano(item, itens)}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Os valores, baixas, origem, status e tipo histórico dos lançamentos serão preservados.
                      {dependencias.comissoes > 0 ? ' Como existem comissões, o destino deve ser uma conta de receita variável.' : ''}
                    </p>
                    {destinosExclusao.length === 0 && (
                      <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">Não há destino elegível. Cadastre ou ative uma conta compatível antes de excluir.</p>
                    )}
                  </div>
                ) : <p className="text-sm text-slate-500">Esta conta não possui vínculos financeiros diretos.</p>}
              </div>
            )}
            {erroExclusao && <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{erroExclusao}</div>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={excluindo}
                onClick={() => { setContaParaExcluir(null); setDependencias(null); setErroExclusao(''); }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
              >Cancelar</button>
              <button
                type="button"
                onClick={() => void confirmarExclusao()}
                disabled={excluindo || carregandoExclusao || !dependencias || (possuiVinculos && !destinoExclusaoId)}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {excluindo ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                {possuiVinculos ? 'Transferir e excluir' : 'Excluir definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * LINHA DA ÁRVORE
 * ============================================================
 */

function LinhaPlanoConta({
  node,
  nivel,
  expandidos,
  onAlternar,
  onAdicionarFilho,
  onEditar,
  onAlterarStatus,
  onExcluir,
  podeCriar,
  podeEditar,
  podeAlterarStatusAtivo,
  podeExcluir,
  alterandoStatusId,
}: {
  node: PlanoContaNode;
  nivel: number;
  expandidos: Set<string>;
  onAlternar: (id: string) => void;
  onAdicionarFilho: (
    item: PlanoContaItem
  ) => void;
  onEditar: (
    item: PlanoContaItem
  ) => void;
  onAlterarStatus: (
    item: PlanoContaItem
  ) => void;
  alterandoStatusId: string | null;
  onExcluir: (item: PlanoContaItem) => void;
  podeCriar: boolean;
  podeEditar: boolean;
  podeAlterarStatusAtivo: boolean;
  podeExcluir: boolean;
}) {
  const temFilhos =
    node.filhos.length > 0;

  const expandido =
    expandidos.has(node.id);

  const alterandoStatus =
    alterandoStatusId ===
    node.id;

  return (
    <>
      <div
        className={`flex min-h-[58px] items-center border-b border-slate-100 px-3 transition last:border-b-0 dark:border-slate-800 ${
          node.ativo
            ? 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60'
            : 'bg-slate-50/70 opacity-60 dark:bg-slate-950/40'
        }`}
      >
        <div
          className="flex min-w-0 flex-1 items-center gap-2"
          style={{
            paddingLeft:
              `${nivel * 24}px`,
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (temFilhos) {
                onAlternar(
                  node.id
                );
              }
            }}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition ${
              temFilhos
                ? 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                : 'cursor-default text-slate-200 dark:text-slate-700'
            }`}
          >
            {temFilhos ? (
              expandido ? (
                <ChevronDown
                  size={16}
                />
              ) : (
                <ChevronRight
                  size={16}
                />
              )
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {node.codigo && (
                <span className="shrink-0 text-xs font-bold text-slate-400">
                  {node.codigo}
                </span>
              )}

              <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {node.nome}
              </span>

              <BadgeTipoReceita
                tipo={
                  node.tipo_receita
                }
              />

              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                node.ativo
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {node.ativo ? 'Ativa' : 'Inativa'}
              </span>
            </div>

            {node.descricao && (
              <p className="mt-0.5 truncate text-xs text-slate-400">
                {node.descricao}
              </p>
            )}
          </div>
        </div>

        <div className="ml-3 flex shrink-0 items-center gap-1">
          {podeCriar && <button
            type="button"
            title="Adicionar subconta"
            onClick={() =>
              onAdicionarFilho(
                node
              )
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
          >
            <CirclePlus
              size={16}
            />
          </button>}

          {podeEditar && <button
            type="button"
            title="Editar"
            onClick={() =>
              onEditar(node)
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40 dark:hover:text-amber-300"
          >
            <Edit3 size={15} />
          </button>}

          {(node.ativo ? podeAlterarStatusAtivo : podeEditar) && <button
            type="button"
            title={
              node.ativo
                ? 'Desativar'
                : 'Ativar'
            }
            disabled={
              alterandoStatus
            }
            onClick={() =>
              onAlterarStatus(
                node
              )
            }
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
              node.ativo
                ? 'text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-300'
                : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300'
            }`}
          >
            {alterandoStatus ? (
              <Loader2
                size={15}
                className="animate-spin"
              />
            ) : node.ativo ? (
              <PowerOff
                size={15}
              />
            ) : (
              <Power
                size={15}
              />
            )}
          </button>}
          {podeExcluir && (
            <button
              type="button"
              title={temFilhos ? 'Esta conta possui subcontas' : 'Excluir definitivamente'}
              aria-label={`Excluir conta ${node.nome}`}
              disabled={temFilhos}
              onClick={() => onExcluir(node)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-950/40"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {temFilhos &&
        expandido &&
        node.filhos.map(
          (filho) => (
            <LinhaPlanoConta
              key={
                filho.id
              }
              node={filho}
              nivel={
                nivel + 1
              }
              expandidos={
                expandidos
              }
              onAlternar={
                onAlternar
              }
              onAdicionarFilho={
                onAdicionarFilho
              }
              onEditar={
                onEditar
              }
              onAlterarStatus={
                onAlterarStatus
              }
              onExcluir={onExcluir}
              podeCriar={podeCriar}
              podeEditar={podeEditar}
              podeAlterarStatusAtivo={podeAlterarStatusAtivo}
              podeExcluir={podeExcluir}
              alterandoStatusId={
                alterandoStatusId
              }
            />
          )
        )}
    </>
  );
}

function BadgeTipoReceita({
  tipo,
}: {
  tipo: TipoReceitaContaReceber;
}) {
  if (tipo === 'FIXA') {
    return (
      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        Fixa
      </span>
    );
  }

  return (
    <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
      Variável
    </span>
  );
}

/* ============================================================
 * COMPONENTES
 * ============================================================
 */

function Campo({
  label,
  obrigatorio = false,
  className = '',
  children,
}: {
  label: string;
  obrigatorio?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={`flex flex-col gap-1.5 ${className}`}
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}

        {obrigatorio && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

/* ============================================================
 * HELPERS DA ÁRVORE
 * ============================================================
 */

function montarArvore(
  itens: PlanoContaItem[]
): PlanoContaNode[] {
  const mapa =
    new Map<
      string,
      PlanoContaNode
    >();

  for (const item of itens) {
    mapa.set(item.id, {
      ...item,
      filhos: [],
    });
  }

  const raizes:
    PlanoContaNode[] = [];

  for (const item of itens) {
    const node =
      mapa.get(item.id);

    if (!node) {
      continue;
    }

    if (
      item.parent_id &&
      mapa.has(item.parent_id)
    ) {
      mapa
        .get(item.parent_id)!
        .filhos.push(node);
    } else {
      raizes.push(node);
    }
  }

  const ordenar = (
    lista: PlanoContaNode[]
  ) => {
    lista.sort(
      compararPlanoConta
    );

    for (const item of lista) {
      ordenar(item.filhos);
    }
  };

  ordenar(raizes);

  return raizes;
}

function compararPlanoConta(
  a: PlanoContaItem,
  b: PlanoContaItem
) {
  const codigoA =
    a.codigo ?? '';

  const codigoB =
    b.codigo ?? '';

  const codigoCompare =
    codigoA.localeCompare(
      codigoB,
      'pt-BR',
      {
        numeric: true,
      }
    );

  if (codigoCompare !== 0) {
    return codigoCompare;
  }

  return a.nome.localeCompare(
    b.nome,
    'pt-BR'
  );
}

function obterIdsDescendentes(
  id: string,
  itens: PlanoContaItem[]
): Set<string> {
  const resultado =
    new Set<string>();

  const visitar = (
    parentId: string
  ) => {
    const filhos =
      itens.filter(
        (item) =>
          item.parent_id ===
          parentId
      );

    for (const filho of filhos) {
      resultado.add(
        filho.id
      );

      visitar(
        filho.id
      );
    }
  };

  visitar(id);

  return resultado;
}

function obterCaminhoPlano(
  item: PlanoContaItem,
  itens: PlanoContaItem[]
): string {
  const partes =
    [item.nome];

  let parentId =
    item.parent_id;

  let seguranca = 0;

  while (
    parentId &&
    seguranca < 100
  ) {
    const parent =
      itens.find(
        (atual) =>
          atual.id ===
          parentId
      );

    if (!parent) {
      break;
    }

    partes.unshift(
      parent.nome
    );

    parentId =
      parent.parent_id;

    seguranca += 1;
  }

  return partes.join(' > ');
}

const inputClass =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';
