import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  FileCheck2,
  Loader2,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";
import { emitirContrato } from "../services/propostasService";
import type {
  ContratoResumo,
  PeriodicidadeContrato,
  PropostaItem,
} from "../types/propostas";

interface ModalEmitirContratoProps {
  open: boolean;
  contrato: ContratoResumo | null;
  contratoAnterior?: ContratoResumo | null;
  item?: PropostaItem | null;
  onClose: () => void;
  onSuccess?: (contrato: ContratoResumo) => void;
}

interface FormState {
  numero_apolice: string;
  inicio_vigencia: string;
  fim_vigencia: string;
  periodicidade: PeriodicidadeContrato | "";
}

const PERIODICIDADES: Array<{
  value: PeriodicidadeContrato;
  label: string;
}> = [
  {
    value: "ANUAL",
    label: "Anual",
  },
  {
    value: "MENSAL",
    label: "Mensal",
  },
  {
    value: "PERSONALIZADO",
    label: "Personalizado",
  },
  {
    value: "UNICO",
    label: "Único",
  },
];

function adicionarDias(data: string, dias: number): string {
  if (!data) return "";

  const [ano, mes, dia] = data.split("-").map(Number);
  const resultado = new Date(Date.UTC(ano, mes - 1, dia));

  resultado.setUTCDate(resultado.getUTCDate() + dias);

  return resultado.toISOString().slice(0, 10);
}

function adicionarAnos(data: string, anos: number): string {
  if (!data) return "";

  const [ano, mes, dia] = data.split("-").map(Number);
  const resultado = new Date(Date.UTC(ano + anos, mes - 1, dia));

  return resultado.toISOString().slice(0, 10);
}

function estadoInicial(
  contrato: ContratoResumo | null,
  contratoAnterior: ContratoResumo | null
): FormState {
  const inicioSugerido =
    !contrato?.inicio_vigencia &&
    contratoAnterior?.fim_vigencia
      ? adicionarDias(
          contratoAnterior.fim_vigencia,
          1
        )
      : "";

  const fimSugerido =
    !contrato?.fim_vigencia &&
    inicioSugerido
      ? adicionarAnos(inicioSugerido, 1)
      : "";

  return {
    numero_apolice:
      contrato?.numero_apolice ?? "",
    inicio_vigencia:
      contrato?.inicio_vigencia ??
      inicioSugerido,
    fim_vigencia:
      contrato?.fim_vigencia ??
      fimSugerido,
    periodicidade:
      contrato?.periodicidade ?? "ANUAL",
  };
}

function formatarMoeda(
  valor?: number | null
): string {
  return Number(valor ?? 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

export default function ModalEmitirContrato({
  open,
  contrato,
  contratoAnterior = null,
  item = null,
  onClose,
  onSuccess,
}: ModalEmitirContratoProps) {
  const [form, setForm] = useState<FormState>(
    () =>
      estadoInicial(
        contrato,
        contratoAnterior
      )
  );

  const [salvando, setSalvando] =
    useState(false);

  const [erro, setErro] =
    useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setForm(
      estadoInicial(
        contrato,
        contratoAnterior
      )
    );
    setErro(null);
    setSalvando(false);
  }, [open, contrato, contratoAnterior]);

  const titulo = useMemo(() => {
    const produto =
      item?.produto?.nome ?? "Contrato";

    const seguradora =
      item?.seguradora?.nome;

    return [produto, seguradora]
      .filter(Boolean)
      .join(" • ");
  }, [item]);

  const avisoVigencia = useMemo(() => {
    if (
      !contratoAnterior?.fim_vigencia ||
      !form.inicio_vigencia
    ) {
      return null;
    }

    const fimAnterior =
      contratoAnterior.fim_vigencia;

    const inicioEsperado =
      adicionarDias(fimAnterior, 1);

    if (form.inicio_vigencia <= fimAnterior) {
      return {
        tipo: "SOBREPOSICAO" as const,
        texto:
          "A nova vigência inicia antes do término da vigência anterior. Os contratos terão períodos de vigência sobrepostos.",
      };
    }

    if (form.inicio_vigencia > inicioEsperado) {
      return {
        tipo: "INTERVALO" as const,
        texto:
          "A nova vigência inicia após o período esperado de continuidade. Haverá um intervalo entre as vigências.",
      };
    }

    return null;
  }, [
    contratoAnterior?.fim_vigencia,
    form.inicio_vigencia,
  ]);

  function atualizar<
    K extends keyof FormState
  >(
    campo: K,
    valor: FormState[K]
  ) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));

    setErro(null);
  }

  function validar(): string | null {
    if (!contrato) {
      return "Contrato não identificado.";
    }

    if (
      contrato.status !==
      "AGUARDANDO_EMISSAO"
    ) {
      return "Este contrato não está aguardando emissão.";
    }

    if (!form.numero_apolice.trim()) {
      return "Informe o número da apólice.";
    }

    if (!form.inicio_vigencia) {
      return "Informe o início da vigência.";
    }

    if (!form.fim_vigencia) {
      return "Informe o fim da vigência.";
    }

    if (
      form.fim_vigencia <
      form.inicio_vigencia
    ) {
      return "O fim da vigência não pode ser anterior ao início.";
    }

    if (!form.periodicidade) {
      return "Informe a periodicidade.";
    }

    return null;
  }

  async function salvar() {
    if (salvando) return;

    const validacao = validar();

    if (validacao) {
      setErro(validacao);
      return;
    }

    if (
      !contrato ||
      !form.periodicidade
    ) {
      return;
    }

    setSalvando(true);
    setErro(null);

    try {
      const contratoEmitido =
        await emitirContrato({
          contrato_id: contrato.id,
          numero_apolice:
            form.numero_apolice,
          inicio_vigencia:
            form.inicio_vigencia,
          fim_vigencia:
            form.fim_vigencia,
          periodicidade:
            form.periodicidade,
        });

      onSuccess?.(contratoEmitido);
    } catch (error) {
      console.error(
        "Erro ao emitir contrato:",
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a emissão da apólice."
      );
    } finally {
      setSalvando(false);
    }
  }

  if (!open || !contrato) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <FileCheck2 size={20} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Emitir Apólice
              </h2>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                {titulo}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

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

          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={19}
                className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
              />

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                  {titulo}
                </p>

                <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">
                      Valor da venda
                    </p>

                    <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
                      {formatarMoeda(
                        contrato.valor_aceito
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Status atual
                    </p>

                    <p className="mt-0.5 font-semibold text-amber-600 dark:text-amber-400">
                      Aguardando emissão
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section>
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays
                size={18}
                className="text-blue-600 dark:text-blue-400"
              />

              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Dados da apólice
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Número da apólice *
                </label>

                <input
                  type="text"
                  value={
                    form.numero_apolice
                  }
                  disabled={salvando}
                  onChange={(event) =>
                    atualizar(
                      "numero_apolice",
                      event.target.value
                    )
                  }
                  placeholder="Número emitido pela seguradora"
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Início da vigência *
                </label>

                <input
                  type="date"
                  value={
                    form.inicio_vigencia
                  }
                  disabled={salvando}
                  onChange={(event) =>
                    atualizar(
                      "inicio_vigencia",
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Fim da vigência *
                </label>

                <input
                  type="date"
                  value={form.fim_vigencia}
                  min={
                    form.inicio_vigencia ||
                    undefined
                  }
                  disabled={salvando}
                  onChange={(event) =>
                    atualizar(
                      "fim_vigencia",
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Periodicidade *
                </label>

                <select
                  value={form.periodicidade}
                  disabled={salvando}
                  onChange={(event) =>
                    atualizar(
                      "periodicidade",
                      event.target
                        .value as PeriodicidadeContrato
                    )
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {PERIODICIDADES.map(
                    (opcao) => (
                      <option
                        key={opcao.value}
                        value={opcao.value}
                      >
                        {opcao.label}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
                    </section>

          {avisoVigencia && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0"
              />

              <div>
                <p className="font-semibold">
                  {avisoVigencia.tipo === "SOBREPOSICAO"
                    ? "Sobreposição de vigências"
                    : "Intervalo entre vigências"}
                </p>

                <p className="mt-1">
                  {avisoVigencia.texto}
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-sm text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-300">
            Ao confirmar a emissão, o contrato passará de{" "}
            <strong>
              Aguardando emissão
            </strong>{" "}
            para <strong>Ativo</strong>.
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() =>
              void salvar()
            }
            disabled={salvando}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvando ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <Save size={16} />
            )}

            Confirmar Emissão
          </button>
        </div>
      </div>
    </div>
  );
}