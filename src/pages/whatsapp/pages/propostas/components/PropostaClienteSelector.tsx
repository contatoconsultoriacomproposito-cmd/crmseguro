import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Loader2,
  Search,
  User,
  X,
} from "lucide-react";
import { buscarClientesProposta } from "../services/propostaClientesService";
import type { PropostaClienteResumo } from "../types/propostas";

interface PropostaClienteSelectorProps {
  value: PropostaClienteResumo | null;
  onChange: (cliente: PropostaClienteResumo | null) => void;
  disabled?: boolean;
}

function formatarDocumento(cliente: PropostaClienteResumo): string {
  if (!cliente.documento) return "Documento não informado";

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

export default function PropostaClienteSelector({
  value,
  onChange,
  disabled = false,
}: PropostaClienteSelectorProps) {
  const [busca, setBusca] = useState(value?.nome ?? "");
  const [clientes, setClientes] = useState<PropostaClienteResumo[]>([]);
  const [aberto, setAberto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setBusca(value.nome);
    }
  }, [value]);

  useEffect(() => {
    function handleClickFora(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setAberto(false);
      }
    }

    document.addEventListener("mousedown", handleClickFora);

    return () => {
      document.removeEventListener("mousedown", handleClickFora);
    };
  }, []);

  useEffect(() => {
    if (disabled || value) return;

    const termo = busca.trim();

    if (termo.length < 2) {
      setClientes([]);
      setErro("");
      return;
    }

    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setErro("");

      try {
        const resultado = await buscarClientesProposta(termo, 30);
        setClientes(resultado);
      } catch (error) {
        console.error("Erro ao buscar clientes da proposta:", error);

        setClientes([]);
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível pesquisar clientes."
        );
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [busca, disabled, value]);

  function selecionarCliente(cliente: PropostaClienteResumo) {
    onChange(cliente);
    setBusca(cliente.nome);
    setAberto(false);
    setClientes([]);
    setErro("");
  }

  function limparCliente() {
    onChange(null);
    setBusca("");
    setClientes([]);
    setErro("");
    setAberto(true);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        Cliente *
      </label>

      <div className="relative">
        <Search
          size={17}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          value={busca}
          disabled={disabled}
          onFocus={() => {
            if (!value) setAberto(true);
          }}
          onChange={(event) => {
            setBusca(event.target.value);
            setAberto(true);
            setErro("");

            if (value) {
              onChange(null);
            }
          }}
          placeholder="Nome, CPF ou CNPJ..."
          className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-900/50"
        />

        {loading ? (
          <Loader2
            size={17}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
          />
        ) : value ? (
          <button
            type="button"
            onClick={limparCliente}
            disabled={disabled}
            title="Remover cliente"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={15} />
          </button>
        ) : null}
      </div>

      {value && (
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-2.5 dark:border-blue-900/60 dark:bg-blue-950/20">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            {value.tipo === "PF" ? (
              <User size={16} />
            ) : (
              <Building2 size={16} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {value.nome}
            </p>

            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
              <span>{value.tipo === "PF" ? "Pessoa física" : "Empresa"}</span>
              <span>•</span>
              <span>{formatarDocumento(value)}</span>

              {(value.municipio || value.uf) && (
                <>
                  <span>•</span>
                  <span>
                    {[value.municipio, value.uf]
                      .filter(Boolean)
                      .join("/")}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {aberto &&
        !value &&
        busca.trim().length >= 2 && (
          <div className="absolute z-40 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-3 py-5 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 size={16} className="animate-spin" />
                Pesquisando...
              </div>
            ) : erro ? (
              <div className="px-3 py-4 text-center text-sm text-red-600 dark:text-red-400">
                {erro}
              </div>
            ) : clientes.length === 0 ? (
              <div className="px-3 py-5 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhum cliente encontrado.
              </div>
            ) : (
              clientes.map((cliente) => (
                <button
                  key={`${cliente.origem}-${cliente.id}`}
                  type="button"
                  onClick={() => selecionarCliente(cliente)}
                  className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {cliente.tipo === "PF" ? (
                      <User size={16} />
                    ) : (
                      <Building2 size={16} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {cliente.nome}
                    </p>

                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {cliente.tipo === "PF"
                            ? "Pessoa física"
                            : "Empresa"}
                        </span>

                        {cliente.origem === "LEGADO" && (
                        <>
                            <span>•</span>

                            <span className="font-medium text-amber-600 dark:text-amber-400">
                            Cadastro anterior
                            </span>
                        </>
                        )}

                      <span>•</span>

                      <span>{formatarDocumento(cliente)}</span>

                      {(cliente.municipio || cliente.uf) && (
                        <>
                          <span>•</span>
                          <span>
                            {[cliente.municipio, cliente.uf]
                              .filter(Boolean)
                              .join("/")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
    </div>
  );
}