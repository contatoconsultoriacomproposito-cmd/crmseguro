import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Edit3,
  FileText,
  Loader2,
  PackagePlus,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  User,
  X,
  FileCheck2,

} from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import PropostaItemForm, {
  type PropostaItemFormValue,
} from "../components/PropostaItemForm";
import PropostaStatusBadge from "../components/PropostaStatusBadge";
import {
  adicionarItemProposta,
  atualizarItemProposta,
  atualizarProposta,
  buscarPropostaPorId,
  excluirItemProposta,
  buscarProdutoRenovacaoOrigem,
  buscarContratoPorId,
  atualizarNumeroApoliceContrato,
  atualizarVigenciaContrato,
  reativarContrato,
} from "../services/propostasService";
import type {
  PropostaDetalhada,
  PropostaItem,
  ResultadoPropostaItem,
  ResultadoFechamentoProposta,
  ContratoResumo,
  ResultadoInicioRenovacao,
  ProdutoRenovacaoOrigem
} from "../types/propostas";
import ModalFecharProposta from "../components/ModalFecharProposta";
import ModalEmitirContrato from "../components/ModalEmitirContrato";
import ModalIniciarRenovacao from "../components/ModalIniciarRenovacao";
import ModalAcoesProposta from "../components/ModalAcoesProposta";
import { useAuth } from "../../../../../auth/AuthContext";
import { usePermissoes } from "../../../hooks/usePermissoes";

import FinanceiroContratoCard from "../../financeiro/components/FinanceiroContratoCard";
import ModalLancamentoFinanceiro from "../../financeiro/components/ModalLancamentoFinanceiro";
import { buscarFinanceiroContratoDetalhado } from "../../financeiro/services/financeiroService";
import { podeOperarFinanceiro } from "../../financeiro/services/financeiroPermissoes";
import type {
  FinanceiroContratoDetalhado,
  ContextoPermissaoFinanceiro,
} from "../../financeiro/types/financeiro";

import {
  buscarComissaoContratoDetalhada,
  buscarMinhaComissaoContratoCorretor,
  buscarCorretoresComissao,
  buscarSupervisoresComissao,
  salvarComissaoContrato,
  atualizarCondicoesComissao,
  gerenciarRateiosComissao,
  consultarComissaoParaOperacao,
} from "../../comissoes/services/comissoesService";

import type {
  OpcaoParticipanteComissao,
} from "../../comissoes/services/comissoesService";


import type {
  ComissaoContratoDetalhada,
  CriarComissaoPayload,
  ItemMinhaComissaoCorretor,
} from "../../comissoes/types/comissoes";

import ComissaoContratoCard from "../../comissoes/components/ComissaoContratoCard";

import {
  ModalLancamentoComissao,
  type ModoModalComissao,
} from "../../comissoes/components/ModalLancamentoComissao";

interface EdicaoCabecalhoState {
  data_emissao: string;
  data_validade: string;
  observacoes: string;
}

function formatarMoeda(valor?: number | null): string {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(valor?: string | null): string {
  if (!valor) return "—";

  const [ano, mes, dia] = valor.split("-");

  if (!ano || !mes || !dia) return valor;

  return `${dia}/${mes}/${ano}`;
}

function formatarDocumento(
  documento: string | null,
  tipo: "PF" | "PJ"
): string {
  if (!documento) {
    return "Documento não informado";
  }

  const numeros = documento.replace(/\D/g, "");

  if (tipo === "PF" && numeros.length === 11) {
    return numeros.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      "$1.$2.$3-$4"
    );
  }

  if (tipo === "PJ" && numeros.length === 14) {
    return numeros.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
    );
  }

  return documento;
}

function formatarTipoNegocio(tipo: string): string {
  return tipo === "RENOVACAO"
    ? "Renovação"
    : "Novo negócio";
}

function labelResultado(
  resultado: ResultadoPropostaItem
): string {
  switch (resultado) {
    case "CONTRATADO":
      return "Contratado";
    case "NAO_CONTRATADO":
      return "Não contratado";
    default:
      return "Pendente";
  }
}

function classeResultado(
  resultado: ResultadoPropostaItem
): string {
  switch (resultado) {
    case "CONTRATADO":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
    case "NAO_CONTRATADO":
      return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
  }
}

function ordenarItens(
  itens: PropostaItem[]
): PropostaItem[] {
  return [...itens].sort(
    (a, b) => a.ordem - b.ordem
  );
}

// Normaliza os valores retornados pelo hook para o contrato do serviço.
function normalizarEscopoAcao(valor: string): "none" | "own" | "tenant" {
  return valor === "own" || valor === "tenant" ? valor : "none";
}

export default function PropostaDetalhes() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { userProfile } = useAuth();
  const { escopo, loading: carregandoPermissoes } = usePermissoes();

  // As permissões são independentes das permissões dos módulos Financeiro e Comissões.
  // Escopo own = corretor responsável da proposta, não necessariamente quem a criou.
  const podeExecutarAcao = useCallback(
    (acao: string, propostaAtual: PropostaDetalhada | null): boolean => {
      if (!userProfile || !propostaAtual || carregandoPermissoes) return false;
      const escopoAcao = escopo("operacoes.propostas", acao);
      if (escopoAcao === "tenant") return true;
      return escopoAcao === "own" && propostaAtual.corretor_id === userProfile.id;
    },
    [escopo, carregandoPermissoes, userProfile],
  );

  const escopoLeitura = escopo("operacoes.propostas", "read");

  const [proposta, setProposta] =
    useState<PropostaDetalhada | null>(null);

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [editandoCabecalho, setEditandoCabecalho] =
    useState(false);

  const [salvandoCabecalho, setSalvandoCabecalho] =
    useState(false);

  const [modalFechamentoAberto, setModalFechamentoAberto] =
  useState(false);

  const [modalAcoesAberto, setModalAcoesAberto] =
    useState(false);

  const [contratoParaEmitir, setContratoParaEmitir] =
  useState<ContratoResumo | null>(null);

  const [contratoAnteriorEmissao, setContratoAnteriorEmissao] =
  useState<ContratoResumo | null>(null);

  const [carregandoContratoAnterior, setCarregandoContratoAnterior] =
  useState(false);

  const [contratoParaRenovar, setContratoParaRenovar] =
  useState<ContratoResumo | null>(null);

    // Edição do número da apólice de contrato ativo
  const [contratoEditandoApolice, setContratoEditandoApolice] =
    useState<string | null>(null);

  const [novoNumeroApolice, setNovoNumeroApolice] =
    useState("");

  const [salvandoNumeroApolice, setSalvandoNumeroApolice] =
  useState(false);

  // Edição da vigência de contrato ativo
  const [contratoEditandoVigencia, setContratoEditandoVigencia] =
    useState<string | null>(null);

  const [novoInicioVigencia, setNovoInicioVigencia] =
    useState("");

  const [novoFimVigencia, setNovoFimVigencia] =
    useState("");

  const [salvandoVigencia, setSalvandoVigencia] =
    useState(false);

  
  // Reativação excepcional de contrato encerrado
  const [contratoParaReativar, setContratoParaReativar] =
    useState<string | null>(null);

  const [inicioReativacao, setInicioReativacao] =
    useState("");

  const [fimReativacao, setFimReativacao] =
    useState("");

  const [salvandoReativacao, setSalvandoReativacao] =
    useState(false);


  const [financeirosPorContrato, setFinanceirosPorContrato] =
  useState<Record<string, FinanceiroContratoDetalhado | null>>({});

  const [carregandoFinanceiros, setCarregandoFinanceiros] =
    useState<Record<string, boolean>>({});

  const [comissoesPorContrato, setComissoesPorContrato] =
  useState<Record<string, ComissaoContratoDetalhada | null>>({});

  const [
    minhasComissoesPorContrato,
    setMinhasComissoesPorContrato,
  ] = useState<Record<string, ItemMinhaComissaoCorretor | null>>({});

  const [carregandoComissoes, setCarregandoComissoes] =
    useState<Record<string, boolean>>({});

  const [contratoFinanceiro, setContratoFinanceiro] =
    useState<ContratoResumo | null>(null);

  const [contratoComissao, setContratoComissao] =
    useState<ContratoResumo | null>(null);

  const [modoModalComissao, setModoModalComissao] =
    useState<ModoModalComissao>("CRIACAO");

  const [contratoEscolhendoModoComissao, setContratoEscolhendoModoComissao] =
    useState<ContratoResumo | null>(null);

  const [abrindoComissaoId, setAbrindoComissaoId] =
    useState<string | null>(null);

  const [salvandoComissao, setSalvandoComissao] =
    useState(false);

  const [opcoesCorretoresComissao, setOpcoesCorretoresComissao] =
    useState<OpcaoParticipanteComissao[]>([]);

  const [opcoesSupervisoresComissao, setOpcoesSupervisoresComissao] =
    useState<OpcaoParticipanteComissao[]>([]);

  const [carregandoParticipantesComissao, setCarregandoParticipantesComissao] =
    useState(false);
  

  const [cabecalho, setCabecalho] =
    useState<EdicaoCabecalhoState>({
      data_emissao: "",
      data_validade: "",
      observacoes: "",
    });

  const [mostrarNovoItem, setMostrarNovoItem] =
    useState(false);

  const [itemEmEdicao, setItemEmEdicao] =
    useState<PropostaItem | null>(null);

  const [salvandoItem, setSalvandoItem] =
    useState(false);

  const [excluindoItemId, setExcluindoItemId] =
    useState<string | null>(null);

  const [produtoRenovacao, setProdutoRenovacao] =
    useState<ProdutoRenovacaoOrigem | null>(null);

  const [loadingProdutoRenovacao, setLoadingProdutoRenovacao] =
    useState(false);

  const podeEditar =
    proposta?.status === "EM_NEGOCIACAO" && podeExecutarAcao("update", proposta);
  const podeFecharVenda =
    proposta?.status === "EM_NEGOCIACAO" && podeExecutarAcao("close", proposta);
  
  
  const podeEmitirApolice = podeExecutarAcao("issue", proposta);
  const podeCorrigirVigencia = podeExecutarAcao("correct_term", proposta);
  const podeReativarContrato = podeExecutarAcao("reactivate", proposta);
  const podeRenovar = podeExecutarAcao("renew", proposta);


  const podeLancarFinanceiro = podeExecutarAcao("financial", proposta);

  const permissoesAcoes = {
    delete: podeExecutarAcao("delete", proposta),
    lose: podeExecutarAcao("lose", proposta),
    reverse: podeExecutarAcao("reverse", proposta),
    update: podeExecutarAcao("update", proposta),
  };
  // Reabrir uma proposta perdida requer update + lose, além das regras legadas.
  const podeAbrirAcoes =
    permissoesAcoes.delete ||
    permissoesAcoes.lose ||
    permissoesAcoes.reverse;


  const carregarProdutoRenovacao = useCallback(
    async (propostaAtual: PropostaDetalhada) => {
      if (propostaAtual.tipo_negocio !== "RENOVACAO") {
        setProdutoRenovacao(null);
        setLoadingProdutoRenovacao(false);
        return;
      }

      setLoadingProdutoRenovacao(true);

      try {
        const produto =
          await buscarProdutoRenovacaoOrigem(
            propostaAtual.id,
          );

        setProdutoRenovacao(produto);
      } catch (error) {
        console.error(
          "Erro ao carregar produto da renovação:",
          error,
        );

        setProdutoRenovacao(null);

        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível identificar o produto da renovação.",
        );
      } finally {
        setLoadingProdutoRenovacao(false);
      }
    },
    [],
  );

  const carregarFinanceiroContrato = useCallback(
    async (contratoId: string) => {
      if (!contratoId) return;

      setCarregandoFinanceiros((atual) => ({
        ...atual,
        [contratoId]: true,
      }));

      try {
        const resultado =
          await buscarFinanceiroContratoDetalhado(contratoId);

        setFinanceirosPorContrato((atual) => ({
          ...atual,
          [contratoId]: resultado,
        }));
      } catch (error) {
        console.error(
          "Erro ao carregar financeiro do contrato:",
          error,
        );

        setFinanceirosPorContrato((atual) => ({
          ...atual,
          [contratoId]: null,
        }));
      } finally {
        setCarregandoFinanceiros((atual) => ({
          ...atual,
          [contratoId]: false,
        }));
      }
    },
    [],
  );

  const carregarComissaoContrato = useCallback(
  async (contratoId: string) => {
    if (!contratoId || !userProfile) return;

    setCarregandoComissoes((atual) => ({
      ...atual,
      [contratoId]: true,
    }));

    try {
      if (userProfile.tipo_usuario === "CORRETOR") {
        const resultado =
          await buscarMinhaComissaoContratoCorretor(
            contratoId
          );

        setMinhasComissoesPorContrato((atual) => ({
          ...atual,
          [contratoId]: resultado,
        }));

        setComissoesPorContrato((atual) => ({
          ...atual,
          [contratoId]: null,
        }));

        return;
      }

      if (userProfile.tipo_usuario === "CORRETORA") {
        const resultado =
          await buscarComissaoContratoDetalhada(
            contratoId
          );

        setComissoesPorContrato((atual) => ({
          ...atual,
          [contratoId]: resultado,
        }));

        setMinhasComissoesPorContrato((atual) => ({
          ...atual,
          [contratoId]: null,
        }));

        return;
      }

      setComissoesPorContrato((atual) => ({
        ...atual,
        [contratoId]: null,
      }));

      setMinhasComissoesPorContrato((atual) => ({
        ...atual,
        [contratoId]: null,
      }));
    } catch (error) {
      console.error(
        "Erro ao carregar comissão do contrato:",
        error
      );

      setComissoesPorContrato((atual) => ({
        ...atual,
        [contratoId]: null,
      }));

      setMinhasComissoesPorContrato((atual) => ({
        ...atual,
        [contratoId]: null,
      }));
    } finally {
      setCarregandoComissoes((atual) => ({
        ...atual,
        [contratoId]: false,
      }));
    }
  },
  [userProfile]
);

  const carregarProposta = useCallback(async () => {
    if (!id) {
      setErro("Proposta não identificada.");
      setLoading(false);
      return;
    }

    if (carregandoPermissoes) return;

    if (escopoLeitura === "none") {
      setProposta(null);
      setErro("Você não possui permissão para abrir o detalhamento de propostas.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      const resultado =
        await buscarPropostaPorId(id);

      if (!podeExecutarAcao("read", resultado)) {
        setProposta(null);
        setErro("Você não possui permissão para visualizar esta proposta.");
        return;
      }

      const propostaOrdenada: PropostaDetalhada = {
        ...resultado,
        itens: ordenarItens(resultado.itens),
      };

      setProposta(propostaOrdenada);

      const contratosAtivos =
        propostaOrdenada.contratos.filter(
          (contrato) => contrato.status === "ATIVO",
        );

      await Promise.all(
        contratosAtivos.flatMap((contrato) => [
          carregarFinanceiroContrato(
            contrato.id
          ),
          carregarComissaoContrato(
            contrato.id
          ),
        ])
      );

      setCabecalho({
        data_emissao: resultado.data_emissao ?? "",
        data_validade:
          resultado.data_validade ?? "",
        observacoes:
          resultado.observacoes ?? "",
      });

      await carregarProdutoRenovacao(
        propostaOrdenada,
      );
    } catch (error) {
      console.error(
        "Erro ao carregar proposta:",
        error,
      );

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a proposta.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    id,
    carregarProdutoRenovacao,
    carregarFinanceiroContrato,
    carregarComissaoContrato,
    carregandoPermissoes,
    escopoLeitura,
    podeExecutarAcao,
  ]);

  const handleFechamentoConcluido = useCallback(
    async (
      _resultado: ResultadoFechamentoProposta
    ) => {
      setModalFechamentoAberto(false);
      await carregarProposta();
    },
    [carregarProposta]
  );

  const itemContratoParaRenovar = useMemo(() => {
    if (!contratoParaRenovar) return null;

    return (
      proposta?.itens.find(
        (item) =>
          item.id ===
          contratoParaRenovar.proposta_item_id,
      ) ?? null
    );
  }, [contratoParaRenovar, proposta]);

  const handleRenovacaoIniciada = useCallback(
    (resultado: ResultadoInicioRenovacao) => {
      setContratoParaRenovar(null);

      navigate(
        `/whatsapp/propostas/${resultado.proposta.id}`,
      );
    },
    [navigate],
  );

  const itemContratoParaEmitir = useMemo(() => {
    if (!contratoParaEmitir) return null;

    return (
      proposta?.itens.find(
        (item) =>
          item.id ===
          contratoParaEmitir.proposta_item_id
      ) ?? null
    );
  }, [contratoParaEmitir, proposta]);

  const abrirEmissaoContrato = useCallback(
    async (contrato: ContratoResumo) => {
      if (!podeEmitirApolice || !userProfile ||
        (userProfile.tipo_usuario === "CORRETOR" && contrato.corretor_id !== userProfile.id)) return;
      setContratoAnteriorEmissao(null);
      setContratoParaEmitir(contrato);

      if (!contrato.contrato_anterior_id) {
        return;
      }

      setCarregandoContratoAnterior(true);

      try {
        const contratoAnterior =
          await buscarContratoPorId(
            contrato.contrato_anterior_id
          );

        setContratoAnteriorEmissao(
          contratoAnterior
        );
      } catch (error) {
        console.error(
          "Erro ao carregar contrato anterior:",
          error
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a vigência do contrato anterior."
        );
      } finally {
        setCarregandoContratoAnterior(false);
      }
    },
    [podeEmitirApolice, userProfile]
  );

  const handleContratoEmitido = useCallback(
    async (_contrato: ContratoResumo) => {
      setContratoParaEmitir(null);
      setContratoAnteriorEmissao(null);
      await carregarProposta();
    },
    [carregarProposta]
  );

    const iniciarEdicaoApolice = (
    contrato: ContratoResumo
  ) => {
    if (
      contrato.status !== "ATIVO" ||
      !podeEmitirApolice ||
      salvandoNumeroApolice
    ) {
      return;
    }

    setContratoEditandoApolice(contrato.id);
    setNovoNumeroApolice(
      contrato.numero_apolice ?? ""
    );
  };

  const cancelarEdicaoApolice = () => {
    if (salvandoNumeroApolice) return;

    setContratoEditandoApolice(null);
    setNovoNumeroApolice("");
  };

  const salvarNumeroApolice = async (
    contrato: ContratoResumo
  ) => {
    if (
      contrato.status !== "ATIVO" ||
      !podeEmitirApolice ||
      salvandoNumeroApolice
    ) {
      return;
    }

    const numero = novoNumeroApolice.trim();

    if (!numero) {
      toast.error("Informe o número da apólice.");
      return;
    }

    try {
      setSalvandoNumeroApolice(true);

      const resultado =
        await atualizarNumeroApoliceContrato(
          contrato.id,
          numero
        );

      // Atualiza imediatamente o contrato na tela.
      setProposta((atual) => {
        if (!atual) return atual;

        return {
          ...atual,
          contratos: atual.contratos.map((item) =>
            item.id === contrato.id
              ? {
                  ...item,
                  numero_apolice:
                    resultado.numero_apolice,
                }
              : item
          ),
        };
      });

      setContratoEditandoApolice(null);
      setNovoNumeroApolice("");

      toast.success(
        resultado.alterado
          ? "Número da apólice atualizado com sucesso."
          : "O número da apólice já estava atualizado."
      );
    } catch (error) {
      console.error(
        "Erro ao atualizar número da apólice:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a apólice."
      );
    } finally {
      setSalvandoNumeroApolice(false);
    }
  };


  // ============================================================
  // CORREÇÃO DA VIGÊNCIA DE CONTRATO ATIVO
  // ============================================================

  const iniciarEdicaoVigencia = (
    contrato: ContratoResumo
  ) => {
    
    if (
      contrato.status !== "ATIVO" ||
      !podeCorrigirVigencia ||
      salvandoVigencia
    ) {
      return;
    }


    setContratoEditandoVigencia(contrato.id);
    setNovoInicioVigencia(contrato.inicio_vigencia ?? "");
    setNovoFimVigencia(contrato.fim_vigencia ?? "");
  };

  const cancelarEdicaoVigencia = () => {
    if (salvandoVigencia) return;

    setContratoEditandoVigencia(null);
    setNovoInicioVigencia("");
    setNovoFimVigencia("");
  };

  const salvarVigencia = async (
    contrato: ContratoResumo
  ) => {
    if (
      contrato.status !== "ATIVO" ||
      !podeCorrigirVigencia ||
      salvandoVigencia
    ) {
      return;
    }

    if (!novoInicioVigencia || !novoFimVigencia) {
      toast.error("Informe o início e o fim da vigência.");
      return;
    }

    if (novoFimVigencia < novoInicioVigencia) {
      toast.error(
        "O fim da vigência não pode ser anterior ao início."
      );
      return;
    }

    try {
      setSalvandoVigencia(true);

      const resultado = await atualizarVigenciaContrato(
        contrato.id,
        novoInicioVigencia,
        novoFimVigencia
      );

      // Atualiza imediatamente o contrato na tela.
      setProposta((atual) => {
        if (!atual) return atual;

        return {
          ...atual,
          contratos: atual.contratos.map((item) =>
            item.id === contrato.id
              ? {
                  ...item,
                  inicio_vigencia: resultado.inicio_vigencia,
                  fim_vigencia: resultado.fim_vigencia,
                }
              : item
          ),
        };
      });

      setContratoEditandoVigencia(null);
      setNovoInicioVigencia("");
      setNovoFimVigencia("");

      toast.success(
        resultado.alterado
          ? "Vigência atualizada com sucesso."
          : "A vigência já estava atualizada."
      );
    } catch (error) {
      console.error(
        "Erro ao atualizar vigência do contrato:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a vigência."
      );
    } finally {
      setSalvandoVigencia(false);
    }
  };


  // ============================================================
  // REATIVAÇÃO DE CONTRATO ENCERRADO
  // ============================================================

  const iniciarReativacao = (contrato: ContratoResumo) => {
    if (
      contrato.status !== "ENCERRADO" ||
      !podeReativarContrato ||
      salvandoReativacao
    ) {
      return;
    }

    setContratoParaReativar(contrato.id);
    setInicioReativacao(contrato.inicio_vigencia ?? "");
    setFimReativacao(contrato.fim_vigencia ?? "");
  };

  const cancelarReativacao = () => {
    if (salvandoReativacao) return;

    setContratoParaReativar(null);
    setInicioReativacao("");
    setFimReativacao("");
  };

  const confirmarReativacao = async (contrato: ContratoResumo) => {
    if (
      contrato.status !== "ENCERRADO" ||
      contratoParaReativar !== contrato.id ||
      !podeReativarContrato ||
      salvandoReativacao
    ) {
      return;
    }

    if (!inicioReativacao || !fimReativacao) {
      toast.error("Informe o início e o fim da vigência.");
      return;
    }

    if (fimReativacao < inicioReativacao) {
      toast.error(
        "O fim da vigência não pode ser anterior ao início."
      );
      return;
    }

    const confirmado = window.confirm(
      `CONFIRMAR REATIVAÇÃO\n\n` +
      `Apólice: ${contrato.numero_apolice ?? "Não informada"}\n\n` +
      `Status atual: ENCERRADO\n` +
      `Novo status: ATIVO\n\n` +
      `Início: ${formatarData(inicioReativacao)}\n` +
      `Fim: ${formatarData(fimReativacao)}\n\n` +
      `Esta operação será registrada na auditoria.\n\n` +
      `Deseja realmente reativar este contrato?`
    );

    if (!confirmado) return;

    try {
      setSalvandoReativacao(true);

      const resultado = await reativarContrato(
        contrato.id,
        inicioReativacao,
        fimReativacao
      );

      setProposta((atual) => {
        if (!atual) return atual;

        return {
          ...atual,
          contratos: atual.contratos.map((item) =>
            item.id === contrato.id
              ? {
                  ...item,
                  status: "ATIVO" as const,
                  inicio_vigencia: resultado.inicio_vigencia,
                  fim_vigencia: resultado.fim_vigencia,
                }
              : item
          ),
        };
      });

      setContratoParaReativar(null);
      setInicioReativacao("");
      setFimReativacao("");

      toast.success("Contrato reativado com sucesso.");

      // Recarrega também financeiro e comissões,
      // agora que o contrato voltou ao status ATIVO.
      void carregarProposta();
    } catch (error) {
      console.error("Erro ao reativar contrato:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível reativar o contrato."
      );
    } finally {
      setSalvandoReativacao(false);
    }
  };



  useEffect(() => {
    void carregarProposta();
  }, [carregarProposta]);

    const contextoAcoesProposta = useMemo(() => {
    if (!userProfile) {
      return null;
    }

    if (
      userProfile.tipo_usuario !== "CORRETORA" &&
      userProfile.tipo_usuario !== "CORRETOR" &&
      userProfile.tipo_usuario !== "ADMIN"
    ) {
      return null;
    }

    return {
      tipoUsuario: userProfile.tipo_usuario,
      usuarioId: userProfile.id,
      // Mesmo escopo efetivo utilizado pelos botões do detalhamento.
      // O serviço recebe as quatro chaves e nega por padrão as ausentes.
      escopos: {
        delete: carregandoPermissoes ? "none" as const : normalizarEscopoAcao(escopo("operacoes.propostas", "delete")),
        lose: carregandoPermissoes ? "none" as const : normalizarEscopoAcao(escopo("operacoes.propostas", "lose")),
        update: carregandoPermissoes ? "none" as const : normalizarEscopoAcao(escopo("operacoes.propostas", "update")),
        reverse: carregandoPermissoes ? "none" as const : normalizarEscopoAcao(escopo("operacoes.propostas", "reverse")),
      },
    };
  }, [userProfile, escopo, carregandoPermissoes]);

  const contextoFinanceiro = useMemo<ContextoPermissaoFinanceiro | null>(() => {
  if (!userProfile) {
    return null;
  }

  if (
    userProfile.tipo_usuario !== "CORRETORA" &&
    userProfile.tipo_usuario !== "CORRETOR" &&
    userProfile.tipo_usuario !== "ADMIN"
  ) {
    return null;
  }

  return {
    tipoUsuario: userProfile.tipo_usuario,
    usuarioId: userProfile.id,
  };
}, [userProfile]);

const podeExecutarAcaoComissao = useCallback(
  (
    acao: "create" | "update" | "manage_splits",
    contrato: ContratoResumo
  ): boolean => {
    if (!userProfile || carregandoPermissoes) {
      return false;
    }

    const corretoraId =
      userProfile.tipo_usuario === "CORRETORA"
        ? userProfile.id
        : userProfile.corretora_id;

    if (
      !corretoraId ||
      contrato.corretora_id !== corretoraId
    ) {
      return false;
    }

    // A CORRETORA administra as comissões da própria empresa.
    if (userProfile.tipo_usuario === "CORRETORA") {
      return true;
    }

    if (userProfile.tipo_usuario !== "CORRETOR") {
      return false;
    }

    const escopoAcao = escopo(
      "operacoes.comissoes",
      acao
    );

    if (escopoAcao === "tenant") {
      return true;
    }

    if (escopoAcao === "own") {
      return contrato.corretor_id === userProfile.id;
    }

    return false;
  },
  [userProfile, carregandoPermissoes, escopo]
);

const usuarioPodeCarregarParticipantesComissao = Boolean(
  proposta?.contratos.some((contrato) =>
    podeExecutarAcaoComissao("create", contrato) ||
    podeExecutarAcaoComissao("manage_splits", contrato)
  )
);

const usuarioPodeOperarFinanceiro =
  contextoFinanceiro
    ? podeOperarFinanceiro(contextoFinanceiro)
    : false;

const podeOperarContrato = useCallback(
  (contrato: ContratoResumo): boolean => {
    if (!userProfile || !proposta) return false;

    if (userProfile.tipo_usuario === "CORRETORA") {
      return true;
    }

    if (userProfile.tipo_usuario === "CORRETOR") {
      return contrato.corretor_id === userProfile.id;
    }

    return false;
  },
  [userProfile, proposta],
);





useEffect(() => {
  let ativo = true;

  async function carregarParticipantesComissao() {
    if (!usuarioPodeCarregarParticipantesComissao) {
      setOpcoesCorretoresComissao([]);
      setOpcoesSupervisoresComissao([]);
      setCarregandoParticipantesComissao(false);
      return;
    }

    try {
      setCarregandoParticipantesComissao(true);

      const [
        corretores,
        supervisores,
      ] = await Promise.all([
        buscarCorretoresComissao(),
        buscarSupervisoresComissao(),
      ]);

      if (!ativo) return;

      setOpcoesCorretoresComissao(corretores);
      setOpcoesSupervisoresComissao(supervisores);
    } catch (error) {
      if (!ativo) return;

      console.error(
        "Erro ao carregar participantes da comissão:",
        error
      );

      setOpcoesCorretoresComissao([]);
      setOpcoesSupervisoresComissao([]);

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os participantes da comissão."
      );
    } finally {
      if (ativo) {
        setCarregandoParticipantesComissao(false);
      }
    }
  }

  void carregarParticipantesComissao();

  return () => {
    ativo = false;
  };
}, [usuarioPodeCarregarParticipantesComissao]);

  const produtoRenovacaoPronto =
    proposta?.tipo_negocio !== "RENOVACAO" ||
    Boolean(produtoRenovacao);

  useEffect(() => {
    if (
      proposta?.tipo_negocio === "RENOVACAO" &&
      proposta.itens.length === 0 &&
      produtoRenovacao &&
      !loadingProdutoRenovacao
    ) {
      setMostrarNovoItem(true);
    }
  }, [
    proposta?.tipo_negocio,
    proposta?.itens.length,
    produtoRenovacao,
    loadingProdutoRenovacao,
  ]);

  const totalItens =
    proposta?.itens.length ?? 0;

  const totalContratados = useMemo(() => {
    return (
      proposta?.itens.filter(
        (item) =>
          item.resultado === "CONTRATADO"
      ).length ?? 0
    );
  }, [proposta]);

  const totalNaoContratados = useMemo(() => {
    return (
      proposta?.itens.filter(
        (item) =>
          item.resultado ===
          "NAO_CONTRATADO"
      ).length ?? 0
    );
  }, [proposta]);

  const contratosPorItem = useMemo(() => {
    const mapa = new Map(
      proposta?.contratos.map((contrato) => [
        contrato.proposta_item_id,
        contrato,
      ]) ?? []
    );

    return mapa;
  }, [proposta]);

  async function salvarCabecalho() {
    if (
      !proposta ||
      !podeEditar ||
      salvandoCabecalho
    ) {
      return;
    }

    const emissaoEfetiva = proposta.tipo_negocio === "RENOVACAO"
      ? cabecalho.data_emissao
      : proposta.data_emissao;

    if (!emissaoEfetiva) {
      setErro("Informe a data de emissão.");
      return;
    }

    if (
      cabecalho.data_validade &&
      cabecalho.data_validade < emissaoEfetiva
    ) {
      setErro(
        "A validade não pode ser anterior à emissão da proposta."
      );
      return;
    }

    setSalvandoCabecalho(true);
    setErro(null);

    try {
      await atualizarProposta(
        proposta.id,
        {
          ...(proposta.tipo_negocio === "RENOVACAO"
            ? { data_emissao: cabecalho.data_emissao }
            : {}),
          data_validade:
            cabecalho.data_validade || null,
          observacoes:
            cabecalho.observacoes.trim() ||
            null,
        }
      );

      await carregarProposta();
      setEditandoCabecalho(false);
    } catch (error) {
      console.error(
        "Erro ao atualizar proposta:",
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a proposta."
      );
    } finally {
      setSalvandoCabecalho(false);
    }
  }

  async function adicionarItem(
    item: PropostaItemFormValue
  ) {
    if (
      !proposta ||
      !podeEditar ||
      salvandoItem
    ) {
      return;
    }

    setSalvandoItem(true);
    setErro(null);

    try {
      await adicionarItemProposta({
        proposta_id: proposta.id,
        ...item,
        ordem: proposta.itens.length + 1,
      });

      setMostrarNovoItem(false);
      await carregarProposta();
    } catch (error) {
      console.error(
        "Erro ao adicionar item:",
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
  }

  async function salvarEdicaoItem(
    item: PropostaItemFormValue
  ) {
    if (
      !itemEmEdicao ||
      !podeEditar ||
      salvandoItem
    ) {
      return;
    }

    setSalvandoItem(true);
    setErro(null);

    try {
      await atualizarItemProposta(
        itemEmEdicao.id,
        {
          produto_id: item.produto_id,
          seguradora_id:
            item.seguradora_id,
          valor_premio:
            item.valor_premio,
          valor_liquido:
            item.valor_liquido,
          numero_cotacao:
            item.numero_cotacao,
          parcelamento_cotado:
            item.parcelamento_cotado,
          meio_pagamento_cotado:
            item.meio_pagamento_cotado,
          coberturas_franquias:
            item.coberturas_franquias,
          ordem: itemEmEdicao.ordem,
        }
      );

      setItemEmEdicao(null);
      await carregarProposta();
    } catch (error) {
      console.error(
        "Erro ao atualizar item:",
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o item."
      );
    } finally {
      setSalvandoItem(false);
    }
  }

  async function excluirItem(
    item: PropostaItem
  ) {
    if (
      !podeEditar ||
      excluindoItemId
    ) {
      return;
    }

    const confirmar = window.confirm(
      `Excluir ${item.produto?.nome ?? "este produto"} da proposta?`
    );

    if (!confirmar) return;

    setExcluindoItemId(item.id);
    setErro(null);

    try {
      await excluirItemProposta(item.id);
      await carregarProposta();
    } catch (error) {
      console.error(
        "Erro ao excluir item:",
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
  }

  function cancelarEdicaoCabecalho() {
    if (!proposta) return;

    setCabecalho({
      data_emissao: proposta.data_emissao ?? "",
      data_validade:
        proposta.data_validade ?? "",
      observacoes:
        proposta.observacoes ?? "",
    });

    setEditandoCabecalho(false);
  }

  const handleAcaoPropostaAtualizada = useCallback(async () => {
    setModalAcoesAberto(false);
    await carregarProposta();
  }, [carregarProposta]);

  const handlePropostaExcluida = useCallback(async () => {
    setModalAcoesAberto(false);
    navigate("/whatsapp/propostas");
  }, [navigate]);

  async function abrirModalComissaoAutorizado(
    contrato: ContratoResumo,
    modo: ModoModalComissao
  ) {
    const acao = modo === "CRIACAO" ? "create" :
      modo === "CONDICOES" ? "update" : "manage_splits";
    if (!podeExecutarAcaoComissao(acao, contrato)) {
      toast.error("Você não possui permissão para esta operação.");
      return;
    }
    setAbrindoComissaoId(contrato.id);
    try {
      const consulta = await consultarComissaoParaOperacao(contrato.id, acao);
      if (modo === "CRIACAO") {
        if (consulta.existe) {
          toast.error("Já existe comissão neste contrato. Solicite acesso à edição.");
          return;
        }
        setComissoesPorContrato((atual) => ({...atual, [contrato.id]: null}));
      } else {
        if (!consulta.existe || !consulta.detalhes) {
          toast.error("Comissão inexistente ou dados não disponíveis para edição.");
          return;
        }
        setComissoesPorContrato((atual) => ({...atual, [contrato.id]: consulta.detalhes}));
      }
      setModoModalComissao(modo);
      setContratoComissao(contrato);
    } catch (error) {
      toast.error(error instanceof Error ? error.message :
        "Não foi possível carregar a comissão com segurança.");
    } finally {
      setAbrindoComissaoId(null);
    }
  }

  async function abrirConfiguracaoComissao(contrato: ContratoResumo) {
    if (abrindoComissaoId || salvandoComissao) return;
    const podeCriar = podeExecutarAcaoComissao("create", contrato);
    const podeAtualizar = podeExecutarAcaoComissao("update", contrato);
    const podeRateios = podeExecutarAcaoComissao("manage_splits", contrato);
    if (!podeCriar && !podeAtualizar && !podeRateios) return;

    // O split pessoal ja prova que existe comissao: nao oferecer criacao
    // quando o usuario tem apenas 'create', sem 'update'/'manage_splits'.
    if (!podeAtualizar && !podeRateios &&
        (comissoesPorContrato[contrato.id] || minhasComissoesPorContrato[contrato.id])) {
      return;
    }

    // A existência é verificada pelo backend, nunca inferida de consultas RLS.
    // Se a criação estiver permitida e ainda não houver comissão, abrir criação.
    if (podeCriar) {
      setAbrindoComissaoId(contrato.id);
      try {
        const estado = await consultarComissaoParaOperacao(contrato.id, "create");
        if (!estado.existe) {
          // A função executa novamente a verificação antes de abrir o modal.
          await abrirModalComissaoAutorizado(contrato, "CRIACAO");
          return;
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message :
          "Não foi possível verificar a existência da comissão.");
        return;
      } finally {
        setAbrindoComissaoId(null);
      }
    }
    // Priorizar edição de comissões existentes sem cair no modo criação.
    if (podeAtualizar && podeRateios) {
      setContratoEscolhendoModoComissao(contrato);
      return;
    }
    if (podeAtualizar || podeRateios) {
      await abrirModalComissaoAutorizado(contrato,
        podeAtualizar ? "CONDICOES" : "RATEIOS");
      return;
    }
    if (podeCriar) await abrirModalComissaoAutorizado(contrato, "CRIACAO");
  }

  async function handleSalvarComissao(payload: CriarComissaoPayload) {
    if (!contratoComissao || salvandoComissao) return;
    if (payload.contrato_id !== contratoComissao.id) {
      toast.error("Contrato da comissão incompatível com o formulário.");
      return;
    }

    const acao = modoModalComissao === "CRIACAO"
      ? "create"
      : modoModalComissao === "CONDICOES"
        ? "update"
        : "manage_splits";

    if (!podeExecutarAcaoComissao(acao, contratoComissao)) {
      toast.error("Você não possui permissão para executar esta operação.");
      return;
    }

    const existente = comissoesPorContrato[contratoComissao.id] ?? null;
    if (modoModalComissao === "CRIACAO" && existente) {
      toast.error("Esta comissão já existe. Reabra para escolher a operação de edição.");
      return;
    }
    if (modoModalComissao !== "CRIACAO" && !existente) {
      toast.error("Carregue a comissão existente antes de editá-la.");
      return;
    }

    setSalvandoComissao(true);
    try {
      if (modoModalComissao === "CRIACAO") {
        await salvarComissaoContrato(payload);
      } else if (modoModalComissao === "CONDICOES") {
        await atualizarCondicoesComissao(payload);
      } else {
        await gerenciarRateiosComissao(contratoComissao.id, payload.splits ?? []);
      }

      await carregarComissaoContrato(contratoComissao.id);
      toast.success(
        modoModalComissao === "CRIACAO"
          ? "Comissão configurada com sucesso."
          : modoModalComissao === "CONDICOES"
            ? "Condições da comissão atualizadas com sucesso."
            : "Rateios atualizados com sucesso."
      );
      setContratoComissao(null);
    } catch (error) {
      console.error("Erro ao salvar comissão:", error);
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a comissão.");
    } finally {
      setSalvandoComissao(false);
    }
  }

  if (loading || carregandoPermissoes) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div className="text-center">
          <Loader2
            size={32}
            className="mx-auto animate-spin text-blue-600"
          />

          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Carregando proposta...
          </p>
        </div>
      </div>
    );
  }

  if (!proposta) {
    return (
      <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
        <div className="mx-auto max-w-4xl">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>

          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={20}
                className="mt-0.5 shrink-0"
              />

              <div>
                <p className="font-semibold">
                  Acesso à proposta indisponível
                </p>

                <p className="mt-1 text-sm">
                  {erro ??
                    "Não foi possível localizar a proposta informada."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft size={16} />
            Voltar para propostas
          </button>
        </div>

        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <FileText size={22} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {proposta.numero_proposta}
                </h1>

                <PropostaStatusBadge
                  status={proposta.status}
                />
              </div>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {formatarTipoNegocio(
                  proposta.tipo_negocio
                )}
                {" • "}
                Emitida em{" "}
                {formatarData(
                  proposta.data_emissao
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                void carregarProposta()
              }
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw size={16} />
              Atualizar
            </button>

            {contextoAcoesProposta && podeAbrirAcoes && (
              <button
                type="button"
                onClick={() =>
                  setModalAcoesAberto(true)
                }
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Edit3 size={16} />
                Ações
              </button>
            )}

            {podeFecharVenda && (
              <button
                type="button"
                onClick={() =>
                  setModalFechamentoAberto(true)
                }
                disabled={proposta.itens.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 size={17} />
                Fechar Venda
              </button>
            )}
          </div>
        </div>

        {erro && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Atenção
              </p>

              <p className="mt-0.5 text-sm">
                {erro}
              </p>
            </div>
          </div>
        )}

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Produtos ofertados
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {totalItens}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total ofertado
            </p>

            <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatarMoeda(
                proposta.valor_total_ofertado
              )}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total vendido
            </p>

            <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatarMoeda(
                proposta.valor_total_vendido
              )}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Contratos gerados
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {proposta.contratos.length}
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <PackagePlus
                  size={18}
                  className="text-blue-600 dark:text-blue-400"
                />

                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white">
                    Produtos ofertados
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Produtos e seguradoras apresentados ao cliente.
                  </p>
                </div>
              </div>

              {podeEditar &&
                !mostrarNovoItem &&
                !itemEmEdicao && (
                  <button
                    type="button"
                    onClick={() =>
                      setMostrarNovoItem(true)
                    }
                    disabled={
                      !produtoRenovacaoPronto ||
                      loadingProdutoRenovacao
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingProdutoRenovacao ? (
                      <Loader2
                        size={15}
                        className="animate-spin"
                      />
                    ) : (
                      <Plus size={15} />
                    )}

                    {loadingProdutoRenovacao
                      ? "Identificando produto..."
                      : proposta.tipo_negocio === "RENOVACAO"
                        ? "Adicionar cotação"
                        : "Adicionar produto"}
                  </button>
                )}
            </div>

            <div className="p-5">
              {mostrarNovoItem && (
                <div className="mb-5">
                  <PropostaItemForm
                    onSubmit={adicionarItem}
                    onCancel={() =>
                      setMostrarNovoItem(false)
                    }
                    loading={salvandoItem}
                    submitLabel={
                      proposta.tipo_negocio === "RENOVACAO"
                        ? "Adicionar cotação"
                        : "Adicionar à proposta"
                    }
                    produtoFixoId={
                      proposta.tipo_negocio === "RENOVACAO"
                        ? produtoRenovacao?.produto_id ?? null
                        : null
                    }
                    produtoFixoNome={
                      proposta.tipo_negocio === "RENOVACAO"
                        ? produtoRenovacao?.produto_nome ?? null
                        : null
                    }
                  />
                </div>
              )}

              {itemEmEdicao && (
                <div className="mb-5">
                  <PropostaItemForm
                    key={itemEmEdicao.id}
                    initialValue={{
                      produto_id:
                        itemEmEdicao.produto_id,
                      seguradora_id:
                        itemEmEdicao.seguradora_id,
                      valor_premio:
                        itemEmEdicao.valor_premio,
                      valor_liquido:
                        itemEmEdicao.valor_liquido,
                      numero_cotacao:
                        itemEmEdicao.numero_cotacao,
                      parcelamento_cotado:
                        itemEmEdicao.parcelamento_cotado,
                      meio_pagamento_cotado:
                        itemEmEdicao.meio_pagamento_cotado,
                      coberturas_franquias:
                        itemEmEdicao.coberturas_franquias,
                      ordem:
                        itemEmEdicao.ordem,
                    }}
                    onSubmit={
                      salvarEdicaoItem
                    }
                    onCancel={() =>
                      setItemEmEdicao(null)
                    }
                    loading={salvandoItem}
                    submitLabel="Salvar alterações"

                    produtoFixoId={
                      proposta.tipo_negocio === "RENOVACAO"
                        ? produtoRenovacao?.produto_id ?? null
                        : null
                    }
                    produtoFixoNome={
                      proposta.tipo_negocio === "RENOVACAO"
                        ? produtoRenovacao?.produto_nome ?? null
                        : null
                    }
                  />
                </div>
              )}

              {proposta.itens.length === 0 ? (
                  !mostrarNovoItem && (
                    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {proposta.tipo_negocio === "RENOVACAO" ? (
                          <RefreshCw size={21} />
                        ) : (
                          <PackagePlus size={21} />
                        )}
                      </div>

                      <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">
                        {proposta.tipo_negocio === "RENOVACAO"
                          ? produtoRenovacao?.produto_nome ?? "Produto da renovação"
                          : "Nenhum produto"}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {proposta.tipo_negocio === "RENOVACAO"
                          ? "Adicione uma nova cotação para o produto desta renovação."
                          : "Esta proposta ainda não possui produtos ofertados."}
                      </p>
                    </div>
                  )
                ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/50">
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Produto
                          </th>

                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Seguradora
                          </th>

                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Cotação / Condição
                          </th>

                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Resultado
                          </th>

                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Prêmio
                          </th>

                         {podeEditar && (
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Ações
                            </th>
                          )}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {proposta.itens.map(
                          (item) => {
                            const contrato =
                              contratosPorItem.get(
                                item.id
                              );

                            return (
                              <tr
                                key={item.id}
                                className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                              >
                                <td className="px-4 py-4">
                                  <p className="font-semibold text-slate-900 dark:text-white">
                                    {item.produto
                                      ?.nome ||
                                      "Produto"}
                                  </p>

                                  {item.produto
                                    ?.categoria && (
                                    <p className="mt-0.5 text-xs text-slate-500">
                                      {
                                        item
                                          .produto
                                          .categoria
                                      }
                                    </p>
                                  )}
                                </td>

                                <td className="px-4 py-4">
                                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    {item
                                      .seguradora
                                      ?.nome ||
                                      "Seguradora"}
                                  </p>
                                </td>

                                <td className="px-4 py-4">
                                  <p className="text-sm text-slate-700 dark:text-slate-200">
                                    {item.numero_cotacao ||
                                      "—"}
                                  </p>

                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {item.parcelamento_cotado ||
                                      "Condição não informada"}
                                  </p>

                                  {item.meio_pagamento_cotado && (
                                    <p className="mt-0.5 text-xs text-slate-400">
                                      {
                                        item.meio_pagamento_cotado
                                      }
                                    </p>
                                  )}
                                </td>

                                <td className="px-4 py-4">
                                  <span
                                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${classeResultado(
                                      item.resultado
                                    )}`}
                                  >
                                    {labelResultado(
                                      item.resultado
                                    )}
                                  </span>

                                  {contrato && (
                                    <div className="mt-2">
                                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                        Contrato gerado
                                      </p>

                                      <p className="mt-0.5 text-xs text-slate-500">
                                        {
                                          contrato.status
                                        }
                                      </p>
                                    </div>
                                  )}
                                </td>

                                <td className="px-4 py-4 text-right">
                                  <p className="font-semibold text-slate-900 dark:text-white">
                                    {formatarMoeda(
                                      item.valor_premio
                                    )}
                                  </p>

                                  {contrato && (
                                    <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                                      Aceito:{" "}
                                      {formatarMoeda(
                                        contrato.valor_aceito
                                      )}
                                    </p>
                                  )}
                                </td>

                                {podeEditar && (
                                  <td className="px-4 py-4 text-right">
                                    <div className="inline-flex items-center gap-1">
                                      <button
                                        type="button"
                                        title="Editar item"
                                        onClick={() => {
                                          setMostrarNovoItem(
                                            false
                                          );
                                          setItemEmEdicao(
                                            item
                                          );
                                        }}
                                        disabled={
                                          salvandoItem ||
                                          Boolean(excluindoItemId) ||
                                          !produtoRenovacaoPronto ||
                                          loadingProdutoRenovacao
                                        }
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 dark:hover:bg-blue-950/30 dark:hover:text-blue-400"
                                      >
                                        <Edit3
                                          size={
                                            15
                                          }
                                        />
                                      </button>

                                      <button
                                        type="button"
                                        title="Excluir item"
                                        onClick={() =>
                                          void excluirItem(
                                            item
                                          )
                                        }
                                        disabled={
                                          salvandoItem ||
                                          Boolean(excluindoItemId) ||
                                          !produtoRenovacaoPronto ||
                                          loadingProdutoRenovacao
                                        }
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
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
                                        </div>
                                          </td>
                                        )}
                              </tr>
                            );
                          }
                        )}
                      </tbody>

                      <tfoot>
                        <tr className="border-t border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/50">
                          <td
                            colSpan={4}
                            className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-slate-300"
                          >
                            Total ofertado
                          </td>

                          <td className="px-4 py-3 text-right text-base font-bold text-slate-900 dark:text-white">
                            {formatarMoeda(
                              proposta.valor_total_ofertado
                            )}
                          </td>

                          {podeEditar && <td />}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {proposta.cliente?.tipo ===
                  "PJ" ? (
                    <Building2
                      size={18}
                      className="text-blue-600 dark:text-blue-400"
                    />
                  ) : (
                    <User
                      size={18}
                      className="text-blue-600 dark:text-blue-400"
                    />
                  )}

                  <h2 className="font-semibold text-slate-900 dark:text-white">
                    Cliente
                  </h2>
                </div>
              </div>

              <div className="p-5">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {proposta.cliente?.nome ??
                    "Cliente não identificado"}
                </p>

                {proposta.cliente && (
                  <>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {formatarDocumento(
                        proposta.cliente
                          .documento,
                        proposta.cliente.tipo
                      )}
                    </p>

                    {(proposta.cliente
                      .municipio ||
                      proposta.cliente.uf) && (
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                        {[
                          proposta.cliente
                            .municipio,
                          proposta.cliente.uf,
                        ]
                          .filter(Boolean)
                          .join(" / ")}
                      </p>
                    )}

                    {proposta.cliente
                      .telefone && (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        {
                          proposta.cliente
                            .telefone
                        }
                      </p>
                    )}

                    {proposta.cliente.email && (
                      <p className="mt-1 break-all text-sm text-slate-600 dark:text-slate-300">
                        {proposta.cliente.email}
                      </p>
                    )}
                  </>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <CalendarDays
                    size={18}
                    className="text-blue-600 dark:text-blue-400"
                  />

                  <h2 className="font-semibold text-slate-900 dark:text-white">
                    Dados da proposta
                  </h2>
                </div>

                {podeEditar &&
                  !editandoCabecalho && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditandoCabecalho(
                          true
                        )
                      }
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                    >
                      <Edit3 size={14} />
                      Editar
                    </button>
                  )}
              </div>

              <div className="p-5">
                {editandoCabecalho ? (
                  <div className="space-y-4">
                    {proposta.tipo_negocio === "RENOVACAO" && (
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Data de emissão
                        </label>
                        <input
                          type="date"
                          required
                          value={cabecalho.data_emissao}
                          disabled={salvandoCabecalho}
                          onChange={(event) =>
                            setCabecalho((atual) => ({
                              ...atual,
                              data_emissao: event.target.value,
                            }))
                          }
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Na renovação, a data da venda será igual à emissão informada.
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Validade
                      </label>

                      <input
                        type="date"
                        value={
                          cabecalho.data_validade
                        }
                        min={
                          proposta.tipo_negocio === "RENOVACAO"
                            ? cabecalho.data_emissao
                            : proposta.data_emissao
                        }
                        onChange={(event) =>
                          setCabecalho(
                            (atual) => ({
                              ...atual,
                              data_validade:
                                event.target
                                  .value,
                            })
                          )
                        }
                        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Observações
                      </label>

                      <textarea
                        rows={4}
                        value={
                          cabecalho.observacoes
                        }
                        onChange={(event) =>
                          setCabecalho(
                            (atual) => ({
                              ...atual,
                              observacoes:
                                event.target
                                  .value,
                            })
                          )
                        }
                        className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={
                          cancelarEdicaoCabecalho
                        }
                        disabled={
                          salvandoCabecalho
                        }
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <X size={14} />
                        Cancelar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void salvarCabecalho()
                        }
                        disabled={
                          salvandoCabecalho
                        }
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                      >
                        {salvandoCabecalho ? (
                          <Loader2
                            size={14}
                            className="animate-spin"
                          />
                        ) : (
                          <Save size={14} />
                        )}

                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Emissão
                      </p>

                      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                        {formatarData(
                          proposta.data_emissao
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Validade
                      </p>

                      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                        {formatarData(
                          proposta.data_validade
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Responsável
                      </p>

                      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                        {proposta.corretor_nome ||
                          "—"}
                      </p>
                    </div>

                    {proposta.data_venda && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Data da venda
                        </p>

                        <p className="mt-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          {formatarData(
                            proposta.data_venda
                          )}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Observações
                      </p>

                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        {proposta.observacoes ||
                          "Nenhuma observação registrada."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {proposta.status !==
            "EM_NEGOCIACAO" && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck
                    size={18}
                    className="text-emerald-600 dark:text-emerald-400"
                  />

                  <div>
                    <h2 className="font-semibold text-slate-900 dark:text-white">
                      Resultado da negociação
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Resultado registrado no fechamento da proposta.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 p-5 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Contratados
                  </p>

                  <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {totalContratados}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Não contratados
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-700 dark:text-slate-200">
                    {totalNaoContratados}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Valor vendido
                  </p>

                  <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatarMoeda(
                      proposta.valor_total_vendido
                    )}
                  </p>
                </div>
              </div>
            </section>
          )}

          {proposta.contratos.length >
            0 && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <CircleDollarSign
                    size={18}
                    className="text-emerald-600 dark:text-emerald-400"
                  />

                  <h2 className="font-semibold text-slate-900 dark:text-white">
                    Contratos
                  </h2>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {proposta.contratos.map(
                  (contrato) => {
                    const item =
                      proposta.itens.find(
                        (itemAtual) =>
                          itemAtual.id ===
                          contrato.proposta_item_id
                      );

                    return (
                      <div
                        key={contrato.id}
                        className="p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {item?.produto
                                ?.nome ||
                                "Contrato"}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {item
                                ?.seguradora
                                ?.nome || "—"}
                            </p>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-2">
                          <span
                            className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                              contrato.status === "ATIVO"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
                            }`}
                          >
                            {contrato.status ===
                            "AGUARDANDO_EMISSAO"
                              ? "Aguardando emissão"
                              : contrato.status === "ATIVO"
                              ? "Ativo"
                              : contrato.status}
                          </span>

                          {podeEmitirApolice &&
                            podeOperarContrato(contrato) &&
                            contrato.status === "AGUARDANDO_EMISSAO" && (
                            <button
                              type="button"
                              onClick={() =>
                                void abrirEmissaoContrato(
                                  contrato
                                )
                              }
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700"
                            >
                              <FileCheck2 size={14} />
                              Emitir apólice
                            </button>
                          )}

                          {podeRenovar &&
                            podeOperarContrato(contrato) &&
                            contrato.status === "ATIVO" && (
                            <button
                              type="button"
                              onClick={() =>
                                setContratoParaRenovar(contrato)
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
                            >
                              <RefreshCw size={14} />
                              Renovar
                            </button>
                          )}


                          {podeReativarContrato &&
                            contrato.status === "ENCERRADO" && (
                              <button
                                type="button"
                                onClick={() => iniciarReativacao(contrato)}
                                disabled={salvandoReativacao}
                                className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
                              >
                                <RefreshCw size={14} />
                                Reativar contrato
                              </button>
                          )}


                        </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <p className="text-xs text-slate-500">
                              Valor aceito
                            </p>

                            <p className="mt-0.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatarMoeda(
                                contrato.valor_aceito
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Valor atual
                            </p>

                            <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                              {formatarMoeda(
                                contrato.valor_atual
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Apólice
                            </p>

                            {contratoEditandoApolice === contrato.id ? (
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <input
                                  type="text"
                                  value={novoNumeroApolice}
                                  onChange={(event) =>
                                    setNovoNumeroApolice(event.target.value)
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      void salvarNumeroApolice(contrato);
                                    }

                                    if (event.key === "Escape") {
                                      cancelarEdicaoApolice();
                                    }
                                  }}
                                  disabled={salvandoNumeroApolice}
                                  autoFocus
                                  placeholder="Número da apólice"
                                  className="h-9 w-48 rounded-lg border border-blue-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    void salvarNumeroApolice(contrato)
                                  }
                                  disabled={
                                    salvandoNumeroApolice ||
                                    !novoNumeroApolice.trim()
                                  }
                                  title="Salvar número da apólice"
                                  aria-label="Salvar número da apólice"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  {salvandoNumeroApolice ? (
                                    <Loader2
                                      size={15}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Save size={15} />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={cancelarEdicaoApolice}
                                  disabled={salvandoNumeroApolice}
                                  title="Cancelar edição"
                                  aria-label="Cancelar edição"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            ) : (
                              <div className="mt-0.5 flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                  {contrato.numero_apolice ||
                                    "Aguardando emissão"}
                                </span>

                                {contrato.status === "ATIVO" &&
                                  podeEmitirApolice && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        iniciarEdicaoApolice(contrato)
                                      }
                                      title="Editar número da apólice"
                                      aria-label="Editar número da apólice"
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                  )}
                              </div>
                            )}
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Vigência
                            </p>

                            {contratoEditandoVigencia === contrato.id ? (
                              <div className="mt-2 space-y-2">

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="mb-1 block text-xs text-slate-500">
                                      Início
                                    </label>

                                    <input
                                      type="date"
                                      value={novoInicioVigencia}
                                      onChange={(event) =>
                                        setNovoInicioVigencia(event.target.value)
                                      }
                                      disabled={salvandoVigencia}
                                      className="h-9 w-full min-w-0 rounded-lg border border-blue-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                    />
                                  </div>

                                  <div>
                                    <label className="mb-1 block text-xs text-slate-500">
                                      Fim
                                    </label>

                                    <input
                                      type="date"
                                      value={novoFimVigencia}
                                      onChange={(event) =>
                                        setNovoFimVigencia(event.target.value)
                                      }
                                      disabled={salvandoVigencia}
                                      className="h-9 w-full min-w-0 rounded-lg border border-blue-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => void salvarVigencia(contrato)}
                                    disabled={
                                      salvandoVigencia ||
                                      !novoInicioVigencia ||
                                      !novoFimVigencia ||
                                      novoFimVigencia < novoInicioVigencia
                                    }
                                    title="Salvar vigência"
                                    aria-label="Salvar vigência"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    {salvandoVigencia ? (
                                      <Loader2
                                        size={15}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Save size={15} />
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={cancelarEdicaoVigencia}
                                    disabled={salvandoVigencia}
                                    title="Cancelar edição"
                                    aria-label="Cancelar edição"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                                  >
                                    <X size={15} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-0.5 flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                  {contrato.inicio_vigencia
                                    ? formatarData(contrato.inicio_vigencia)
                                    : "—"}
                                  {" até "}
                                  {contrato.fim_vigencia
                                    ? formatarData(contrato.fim_vigencia)
                                    : "—"}
                                </span>

                                {contrato.status === "ATIVO" &&
                                  podeCorrigirVigencia && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        iniciarEdicaoVigencia(contrato)
                                      }
                                      title="Editar vigência"
                                      aria-label="Editar vigência"
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                  )}
                              </div>
                            )}
                          </div>

                        </div>


                        {contrato.status === "ENCERRADO" &&
                          podeReativarContrato &&
                          contratoParaReativar === contrato.id && (
                            <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                              <div className="mb-4 flex items-start gap-3">
                                <AlertTriangle
                                  size={18}
                                  className="mt-0.5 shrink-0 text-amber-600"
                                />

                                <div>
                                  <p className="text-sm font-bold text-amber-900 dark:text-amber-300">
                                    Reativação excepcional
                                  </p>
                                  <p className="mt-1 text-xs text-amber-800 dark:text-amber-400">
                                    Confira a vigência correta da apólice antes de
                                    reativar. Esta operação será auditada e poderá
                                    ser recusada caso exista renovação vinculada.
                                  </p>
                                </div>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    Início da vigência
                                  </label>
                                  <input
                                    type="date"
                                    value={inicioReativacao}
                                    onChange={(event) =>
                                      setInicioReativacao(event.target.value)
                                    }
                                    disabled={salvandoReativacao}
                                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                  />
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    Fim da vigência corrigido
                                  </label>
                                  <input
                                    type="date"
                                    value={fimReativacao}
                                    min={inicioReativacao || undefined}
                                    onChange={(event) =>
                                      setFimReativacao(event.target.value)
                                    }
                                    disabled={salvandoReativacao}
                                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                  />
                                </div>
                              </div>

                              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                                A data final corrigida deve ser posterior à data
                                atual. A reativação não altera outros dados comerciais
                                do contrato.
                              </p>

                              <div className="mt-4 flex flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={cancelarReativacao}
                                  disabled={salvandoReativacao}
                                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                >
                                  Cancelar
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void confirmarReativacao(contrato)}
                                  disabled={
                                    salvandoReativacao ||
                                    !inicioReativacao ||
                                    !fimReativacao ||
                                    fimReativacao < inicioReativacao
                                  }
                                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {salvandoReativacao ? (
                                    <Loader2 size={15} className="animate-spin" />
                                  ) : (
                                    <RefreshCw size={15} />
                                  )}
                                  Confirmar reativação
                                </button>
                              </div>
                            </div>
                        )}



                        {contrato.status === "ATIVO" && (
                          <div className="mt-5 grid gap-4 xl:grid-cols-2">
                            <FinanceiroContratoCard
                              loading={
                                carregandoFinanceiros[contrato.id] ?? false
                              }
                              financeiro={
                                financeirosPorContrato[contrato.id] ?? null
                              }
                              podeOperar={
                                podeLancarFinanceiro &&
                                usuarioPodeOperarFinanceiro &&
                                podeOperarContrato(contrato)
                              }
                              onLancarFinanceiro={() =>
                                podeLancarFinanceiro &&
                                usuarioPodeOperarFinanceiro &&
                                podeOperarContrato(contrato) &&
                                setContratoFinanceiro(contrato)
                              }
                              onVerFinanceiro={() =>
                                navigate(
                                  `/whatsapp/financeiro/contratos/${contrato.id}`
                                )
                              }
                            />

                            <ComissaoContratoCard
                              loading={
                                (carregandoComissoes[contrato.id] ?? false) || abrindoComissaoId === contrato.id
                              }
                              comissao={
                                comissoesPorContrato[contrato.id] ?? null
                              }
                              minhaComissao={
                                minhasComissoesPorContrato[contrato.id] ?? null
                              }
                              podeCriar={
                                podeExecutarAcaoComissao("create", contrato) &&
                                !(comissoesPorContrato[contrato.id] ?? null) &&
                                !(minhasComissoesPorContrato[contrato.id] ?? null)
                              }
                              podeEditar={
                                podeExecutarAcaoComissao("update", contrato) ||
                                podeExecutarAcaoComissao("manage_splits", contrato)
                              }
                              onConfigurarComissao={() => {
                                void abrirConfiguracaoComissao(contrato);
                              }}
                              onVerComissao={() =>
                                navigate(
                                  `/whatsapp/comissoes/contratos/${contrato.id}`
                                )
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </section>
          )}

          {proposta.status ===
            "EM_NEGOCIACAO" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <Clock3
                  size={18}
                  className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
                />

                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    Proposta em negociação
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                    Você ainda pode adicionar,
                    editar ou remover produtos.
                    Após o fechamento da venda,
                    os itens ficarão protegidos
                    contra alterações.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>


      <ModalFecharProposta
        open={modalFechamentoAberto && Boolean(podeFecharVenda)}
        proposta={proposta}
        onClose={() =>
          setModalFechamentoAberto(false)
        }
        onSuccess={
          handleFechamentoConcluido
        }
      />

      <ModalEmitirContrato
        open={
          Boolean(contratoParaEmitir) &&
          podeEmitirApolice &&
          !carregandoContratoAnterior
        }
        contrato={contratoParaEmitir}
        contratoAnterior={
          contratoAnteriorEmissao
        }
        item={itemContratoParaEmitir}
        onClose={() => {
          setContratoParaEmitir(null);
          setContratoAnteriorEmissao(null);
        }}
        onSuccess={handleContratoEmitido}
      />

      <ModalIniciarRenovacao
        open={Boolean(contratoParaRenovar) && podeRenovar}
        contrato={contratoParaRenovar}
        cliente={proposta?.cliente ?? null}
        item={itemContratoParaRenovar}
        corretorAtualId={
          proposta?.corretor_id ?? null
        }
        onClose={() =>
          setContratoParaRenovar(null)
        }
        onSuccess={handleRenovacaoIniciada}
      />

      {contextoAcoesProposta && podeAbrirAcoes && (
        <ModalAcoesProposta
          open={modalAcoesAberto && podeAbrirAcoes}
          proposta={proposta}
          contexto={contextoAcoesProposta}
          permissoes={permissoesAcoes}
          onClose={() =>
            setModalAcoesAberto(false)
          }
          onUpdated={
            handleAcaoPropostaAtualizada
          }
          onDeleted={
            handlePropostaExcluida
          }
        />
      )}

      {contratoFinanceiro && podeLancarFinanceiro && usuarioPodeOperarFinanceiro && podeOperarContrato(contratoFinanceiro) && (
        <ModalLancamentoFinanceiro
          open={Boolean(contratoFinanceiro)}
          contratoId={contratoFinanceiro.id}
          valorContrato={contratoFinanceiro.valor_aceito}
          onClose={() =>
            setContratoFinanceiro(null)
          }
          onSaved={async () => {
            await carregarFinanceiroContrato(
              contratoFinanceiro.id,
            );

            setContratoFinanceiro(null);
          }}
        />
      )}

      {contratoEscolhendoModoComissao && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Escolher operação de comissão"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900"
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              O que deseja editar?
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Cada operação possui permissão independente e salva apenas os próprios dados.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <button type="button" className="rounded-lg border border-slate-200 px-4 py-3 text-left font-medium hover:bg-slate-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
                onClick={() => {
                  const contrato = contratoEscolhendoModoComissao;
                  setContratoEscolhendoModoComissao(null);
                  void abrirModalComissaoAutorizado(contrato, "CONDICOES");
                }}>
                Editar condições e recebimentos
              </button>
              <button type="button" className="rounded-lg border border-slate-200 px-4 py-3 text-left font-medium hover:bg-slate-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
                onClick={() => {
                  const contrato = contratoEscolhendoModoComissao;
                  setContratoEscolhendoModoComissao(null);
                  void abrirModalComissaoAutorizado(contrato, "RATEIOS");
                }}>
                Gerenciar participantes e rateios
              </button>
              <button type="button" className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => setContratoEscolhendoModoComissao(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {contratoComissao &&
        podeExecutarAcaoComissao(
          modoModalComissao === "CRIACAO" ? "create" :
          modoModalComissao === "CONDICOES" ? "update" : "manage_splits",
          contratoComissao
        ) && (
      <ModalLancamentoComissao
        aberto={Boolean(contratoComissao)}
        modo={modoModalComissao}
        contratoId={contratoComissao.id}
        valorBaseSugerido={
          comissoesPorContrato[
            contratoComissao.id
          ]?.comissao.valor_base_original ??
          contratoComissao.valor_aceito
        }
        dadosIniciais={
          comissoesPorContrato[
            contratoComissao.id
          ] ?? null
        }
        salvando={
          salvandoComissao ||
          carregandoParticipantesComissao
        }
        corretores={
          opcoesCorretoresComissao
        }
        supervisores={
          opcoesSupervisoresComissao
        }
        onFechar={() =>
          setContratoComissao(null)
        }
        onSalvar={handleSalvarComissao}
      />
    )}

    </div>
  );
}
