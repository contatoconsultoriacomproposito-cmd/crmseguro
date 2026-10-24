import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  FileText,
  Loader2,
  PackagePlus,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import PropostaClienteSelector from "./PropostaClienteSelector";
import PropostaItemForm, {
  type PropostaItemFormValue,
} from "./PropostaItemForm";
import {
  adicionarItemProposta,
  criarProposta,
  excluirItemProposta,
} from "../services/propostasService";
import type {
  Proposta,
  PropostaClienteResumo,
  PropostaItem,
} from "../types/propostas";
import {
  buscarClienteInicialProposta,
  resolverClienteProposta,
  type ClienteInicialProposta,
} from "../services/propostaClientesService";

interface ModalNovaPropostaProps {
  open: boolean;
  clienteInicial?: ClienteInicialProposta | null;
  bloquearClienteInicial?: boolean;
  onClose: () => void;
  onCreated?: (proposta: Proposta) => void;
}

interface FormState {
  cliente: PropostaClienteResumo | null;
  data_emissao: string;
  data_validade: string;
  observacoes: string;
}

function hojeLocal(): string {
  const agora = new Date();
  const offset = agora.getTimezoneOffset();
  const local = new Date(
    agora.getTime() - offset * 60 * 1000
  );

  return local.toISOString().slice(0, 10);
}

function adicionarDias(
  dataIso: string,
  quantidadeDias: number
): string {
  const partes = dataIso.split("-").map(Number);

  if (partes.length !== 3) {
    return "";
  }

  const [ano, mes, dia] = partes;

  if (!ano || !mes || !dia) {
    return "";
  }

  const data = new Date(ano, mes - 1, dia);
  data.setDate(data.getDate() + quantidadeDias);

  const novoAno = data.getFullYear();
  const novoMes = String(data.getMonth() + 1).padStart(
    2,
    "0"
  );
  const novoDia = String(data.getDate()).padStart(2, "0");

  return `${novoAno}-${novoMes}-${novoDia}`;
}

function criarEstadoInicial(): FormState {
  const dataEmissao = hojeLocal();

  return {
    cliente: null,
    data_emissao: dataEmissao,
    data_validade: adicionarDias(dataEmissao, 15),
    observacoes: "",
  };
}

function formatarMoeda(valor?: number | null): string {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarDocumento(
  cliente: PropostaClienteResumo | null
): string {
  if (!cliente?.documento) {
    return "Documento não informado";
  }

  const numeros = cliente.documento.replace(/\D/g, "");

  if (cliente.tipo === "PF" && numeros.length === 11) {
    return numeros.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      "$1.$2.$3-$4"
    );
  }

  if (cliente.tipo === "PJ" && numeros.length === 14) {
    return numeros.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
    );
  }

  return cliente.documento;
}

export default function ModalNovaProposta({
  open,
  clienteInicial = null,
  bloquearClienteInicial = false,
  onClose,
  onCreated,
}: ModalNovaPropostaProps) {
  const [form, setForm] =
    useState<FormState>(criarEstadoInicial);

  const [proposta, setProposta] =
    useState<Proposta | null>(null);

  const [itens, setItens] = useState<PropostaItem[]>([]);

  const [mostrarNovoItem, setMostrarNovoItem] =
    useState(false);

  const [criandoProposta, setCriandoProposta] =
    useState(false);

  const [salvandoItem, setSalvandoItem] =
    useState(false);

  const [excluindoItemId, setExcluindoItemId] =
    useState<string | null>(null);

  const [erro, setErro] = useState("");

  const [
    carregandoClienteInicial,
    setCarregandoClienteInicial,
  ] = useState(false);

  const totalOfertado = useMemo(() => {
    return itens.reduce(
      (total, item) =>
        total + Number(item.valor_premio ?? 0),
      0
    );
  }, [itens]);

  const propostaCriada = Boolean(proposta);

  const podeFecharModal =
    !criandoProposta &&
    !salvandoItem &&
    !excluindoItemId;

  const atualizarForm = useCallback(
    <K extends keyof FormState>(
      campo: K,
      valor: FormState[K]
    ) => {
      setForm((atual) => ({
        ...atual,
        [campo]: valor,
      }));

      setErro("");
    },
    []
  );

  const limparEstado = useCallback(() => {
    setForm(criarEstadoInicial());
    setProposta(null);
    setItens([]);
    setMostrarNovoItem(false);
    setCriandoProposta(false);
    setSalvandoItem(false);
    setExcluindoItemId(null);
    setErro("");
  }, []);

  useEffect(() => {
    if (
      !open ||
      !clienteInicial?.id
    ) {
      return;
    }

    let ativo = true;

    const carregar = async () => {
      setCarregandoClienteInicial(
        true
      );
      setErro("");

      try {
        const cliente =
          await buscarClienteInicialProposta(
            clienteInicial
          );

        if (!ativo) return;

        setForm((atual) => ({
          ...atual,
          cliente,
        }));
      } catch (error) {
        console.error(
          "Erro ao carregar cliente inicial da proposta:",
          error
        );

        if (!ativo) return;

        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o cliente da proposta."
        );
      } finally {
        if (ativo) {
          setCarregandoClienteInicial(
            false
          );
        }
      }
    };

    void carregar();

    return () => {
      ativo = false;
    };
  }, [
    open,
    clienteInicial?.id,
    clienteInicial?.tipo,
  ]);

  const fechar = useCallback(() => {
    if (!podeFecharModal) return;

    limparEstado();
    onClose();
  }, [
    limparEstado,
    onClose,
    podeFecharModal,
  ]);

  const validarCabecalho =
    useCallback((): string | null => {
      if (!form.cliente) {
        return "Selecione o cliente da proposta.";
      }

      if (!form.cliente.corretor_id) {
        return "O cliente selecionado não possui responsável comercial definido.";
      }

      if (!form.data_emissao) {
        return "Informe a data de emissão.";
      }

      if (
        form.data_validade &&
        form.data_validade < form.data_emissao
      ) {
        return "A validade não pode ser anterior à data de emissão.";
      }

      return null;
    }, [form]);

  const criarCabecalho = useCallback(async () => {
    if (criandoProposta || proposta) return;

    const validacao = validarCabecalho();

    if (validacao) {
      setErro(validacao);
      return;
    }

    if (!form.cliente) return;

setCriandoProposta(true);
setErro("");

try {
  const clienteResolvido =
    await resolverClienteProposta(
      form.cliente
    );

  setForm((atual) => ({
    ...atual,
    cliente: clienteResolvido,
  }));

  const novaProposta = await criarProposta({
    corretor_id:
      clienteResolvido.corretor_id,
    crm_pessoa_id:
      clienteResolvido.tipo === "PF"
        ? clienteResolvido.id
        : null,
    crm_empresa_id:
      clienteResolvido.tipo === "PJ"
        ? clienteResolvido.id
        : null,
        tipo_negocio: "NOVO",
        data_emissao: form.data_emissao,
        data_validade:
          form.data_validade || null,
        observacoes:
          form.observacoes.trim() || null,
        contrato_origem_renovacao_id: null,
      });

      setProposta(novaProposta);
      setMostrarNovoItem(true);
    } catch (error) {
      console.error(
        "Erro ao criar proposta:",
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a proposta."
      );
    } finally {
      setCriandoProposta(false);
    }
  }, [
    criandoProposta,
    proposta,
    validarCabecalho,
    form,
  ]);

  const adicionarItem = useCallback(
    async (item: PropostaItemFormValue) => {
      if (!proposta || salvandoItem) return;

      setSalvandoItem(true);
      setErro("");

      try {
        const novoItem =
          await adicionarItemProposta({
            proposta_id: proposta.id,
            ...item,
            ordem: itens.length + 1,
          });

        setItens((atual) => [
          ...atual,
          novoItem,
        ]);

        setMostrarNovoItem(false);
      } catch (error) {
        console.error(
          "Erro ao adicionar item à proposta:",
          error
        );

        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível adicionar o item."
        );
      } finally {
        setSalvandoItem(false);
      }
    },
    [
      proposta,
      salvandoItem,
      itens.length,
    ]
  );

  const excluirItem = useCallback(
    async (itemId: string) => {
      if (excluindoItemId) return;

      setExcluindoItemId(itemId);
      setErro("");

      try {
        await excluirItemProposta(itemId);

        setItens((atual) =>
          atual.filter(
            (item) => item.id !== itemId
          )
        );
      } catch (error) {
        console.error(
          "Erro ao excluir item da proposta:",
          error
        );

        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível excluir o item."
        );
      } finally {
        setExcluindoItemId(null);
      }
    },
    [excluindoItemId]
  );

  const concluir = useCallback(() => {
    if (!proposta) return;

    if (itens.length === 0) {
      setErro(
        "Adicione pelo menos um item à proposta."
      );
      return;
    }

    const propostaFinal: Proposta = {
      ...proposta,
      valor_total_ofertado: totalOfertado,
    };

    onCreated?.(propostaFinal);

    limparEstado();
    onClose();
  }, [
    itens.length,
    limparEstado,
    onClose,
    onCreated,
    proposta,
    totalOfertado,
  ]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <FileText size={20} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Nova Proposta
              </h2>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                {proposta
                  ? `${proposta.numero_proposta} • Em negociação`
                  : "Cadastre a proposta comercial e os produtos ofertados."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fechar}
            disabled={!podeFecharModal}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {erro && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                <AlertTriangle
                  size={18}
                  className="mt-0.5 shrink-0"
                />

                <span>{erro}</span>
              </div>
            )}

            <section>
              <div className="mb-4 flex items-center gap-2">
                <User
                  size={18}
                  className="text-blue-600 dark:text-blue-400"
                />

                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Cliente
                </h3>
              </div>

              {!proposta ? (
                carregandoClienteInicial ? (
                  <div className="flex h-20 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Carregando cliente...
                    </div>
                  </div>
                ) : bloquearClienteInicial && form.cliente ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                        <User size={17} />
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {form.cliente.nome}
                        </p>

                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span>
                            {form.cliente.tipo === "PF"
                              ? "Pessoa física"
                              : "Empresa"}
                          </span>

                          <span>•</span>

                          <span>
                            {formatarDocumento(form.cliente)}
                          </span>
                        </div>

                        <p className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                          Cliente vinculado à conversa do WhatsApp
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <PropostaClienteSelector
                    value={form.cliente}
                    onChange={(cliente) =>
                      atualizarForm(
                        "cliente",
                        cliente
                      )
                    }
                    disabled={
                      criandoProposta ||
                      carregandoClienteInicial
                    }
                  />
                )
              ) : (
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                      <User size={17} />
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {form.cliente?.nome}
                      </p>

                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>
                          {form.cliente?.tipo === "PF"
                            ? "Pessoa física"
                            : "Empresa"}
                        </span>

                        <span>•</span>

                        <span>
                          {formatarDocumento(form.cliente)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <div className="my-6 border-t border-slate-200 dark:border-slate-800" />

            <section>
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays
                  size={18}
                  className="text-blue-600 dark:text-blue-400"
                />

                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Dados da proposta
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Data de emissão *
                  </label>

                  <input
                    type="date"
                    value={form.data_emissao}
                    disabled={propostaCriada}
                    onChange={(event) => {
                      const novaData =
                        event.target.value;

                      setForm((atual) => ({
                        ...atual,
                        data_emissao: novaData,
                        data_validade:
                          novaData
                            ? adicionarDias(
                                novaData,
                                15
                              )
                            : "",
                      }));

                      setErro("");
                    }}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-900/50"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Validade
                  </label>

                  <input
                    type="date"
                    value={form.data_validade}
                    disabled={propostaCriada}
                    min={form.data_emissao}
                    onChange={(event) =>
                      atualizarForm(
                        "data_validade",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-900/50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Observações
                  </label>

                  <textarea
                    value={form.observacoes}
                    disabled={propostaCriada}
                    onChange={(event) =>
                      atualizarForm(
                        "observacoes",
                        event.target.value
                      )
                    }
                    rows={3}
                    placeholder="Observações gerais da negociação..."
                    className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-900/50"
                  />
                </div>
              </div>

              {!proposta && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      void criarCabecalho()
                    }
                    disabled={
                      criandoProposta ||
                      carregandoClienteInicial ||
                      !form.cliente
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {criandoProposta ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Plus size={16} />
                    )}

                    Criar proposta e adicionar produtos
                  </button>
                </div>
              )}
            </section>

            {proposta && (
              <>
                <div className="my-6 border-t border-slate-200 dark:border-slate-800" />

                <section>
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <PackagePlus
                        size={18}
                        className="text-blue-600 dark:text-blue-400"
                      />

                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                          Produtos ofertados
                        </h3>

                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          Inclua uma linha para
                          cada produto e seguradora
                          apresentados ao cliente.
                        </p>
                      </div>
                    </div>

                    {!mostrarNovoItem && (
                      <button
                        type="button"
                        onClick={() => {
                          setMostrarNovoItem(
                            true
                          );
                          setErro("");
                        }}
                        disabled={
                          Boolean(
                            excluindoItemId
                          )
                        }
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
                      >
                        <Plus size={15} />
                        Adicionar produto
                      </button>
                    )}
                  </div>

                  {itens.length > 0 && (
                    <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px]">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/50">
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Produto
                              </th>

                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Seguradora
                              </th>

                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Cotação
                              </th>

                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Prêmio
                              </th>

                              <th className="w-16 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Ação
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {itens.map(
                              (item) => (
                                <tr
                                  key={
                                    item.id
                                  }
                                  className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                                >
                                  <td className="px-4 py-3">
                                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                      {item
                                        .produto
                                        ?.nome ||
                                        "Produto"}
                                    </div>

                                    {item
                                      .parcelamento_cotado && (
                                      <div className="mt-0.5 text-xs text-slate-500">
                                        {
                                          item.parcelamento_cotado
                                        }
                                      </div>
                                    )}
                                  </td>

                                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                                    {item
                                      .seguradora
                                      ?.nome ||
                                      "Seguradora"}
                                  </td>

                                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                                    {item.numero_cotacao ||
                                      "—"}
                                  </td>

                                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-white">
                                    {formatarMoeda(
                                      item.valor_premio
                                    )}
                                  </td>

                                  <td className="px-4 py-3 text-right">
                                    <button
                                      type="button"
                                      title="Excluir item"
                                      onClick={() =>
                                        void excluirItem(
                                          item.id
                                        )
                                      }
                                      disabled={Boolean(
                                        excluindoItemId
                                      )}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                    >
                                      {excluindoItemId ===
                                      item.id ? (
                                        <Loader2
                                          size={
                                            15
                                          }
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <Trash2
                                          size={
                                            15
                                          }
                                        />
                                      )}
                                    </button>
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>

                          <tfoot>
                            <tr className="border-t border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/50">
                              <td
                                colSpan={3}
                                className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-slate-300"
                              >
                                Total ofertado
                              </td>

                              <td className="px-4 py-3 text-right text-base font-bold text-slate-900 dark:text-white">
                                {formatarMoeda(
                                  totalOfertado
                                )}
                              </td>

                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {itens.length === 0 &&
                    !mostrarNovoItem && (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/50">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          <PackagePlus
                            size={19}
                          />
                        </div>

                        <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                          Nenhum produto
                          adicionado
                        </p>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Adicione pelo menos um
                          produto para concluir a
                          proposta.
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            setMostrarNovoItem(
                              true
                            )
                          }
                          className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
                        >
                          <Plus
                            size={15}
                          />
                          Adicionar produto
                        </button>
                      </div>
                    )}

                  {mostrarNovoItem && (
                    <div className="mt-4">
                      <PropostaItemForm
                        onSubmit={
                          adicionarItem
                        }
                        onCancel={() =>
                          setMostrarNovoItem(
                            false
                          )
                        }
                        loading={salvandoItem}
                        submitLabel="Adicionar à proposta"
                      />
                    </div>
                  )}
                </section>

                <div className="my-6 border-t border-slate-200 dark:border-slate-800" />

                <section>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Proposta
                      </p>

                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                        {proposta.numero_proposta}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Produtos
                      </p>

                      <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                        {itens.length}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Total ofertado
                      </p>

                      <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                        {formatarMoeda(
                          totalOfertado
                        )}
                      </p>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {proposta
                ? "A proposta permanecerá em negociação até o fechamento da venda."
                : "Primeiro salve os dados principais para adicionar os produtos."}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={fechar}
                disabled={!podeFecharModal}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {proposta
                  ? "Fechar"
                  : "Cancelar"}
              </button>

              {proposta && (
                <button
                  type="button"
                  onClick={concluir}
                  disabled={
                    itens.length === 0 ||
                    salvandoItem ||
                    Boolean(
                      excluindoItemId
                    )
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check size={16} />
                  Concluir cadastro
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}