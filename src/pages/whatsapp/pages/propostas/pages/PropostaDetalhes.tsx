import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
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
  buscarContratoPorId
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
  buscarCorretoresComissao,
  buscarSupervisoresComissao,
  salvarComissaoContrato,
} from "../../comissoes/services/comissoesService";

import type {
  OpcaoParticipanteComissao,
} from "../../comissoes/services/comissoesService";


import type {
  ComissaoContratoDetalhada,
  ContextoPermissaoComissao,
  CriarComissaoPayload,
} from "../../comissoes/types/comissoes";

import {
  podeCriarComissao,
  podeEditarComissao,
} from "../../comissoes/services/comissoesPermissoes";

import ComissaoContratoCard from "../../comissoes/components/ComissaoContratoCard";

import { ModalLancamentoComissao } from "../../comissoes/components/ModalLancamentoComissao";

interface EdicaoCabecalhoState {
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

export default function PropostaDetalhes() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { userProfile } = useAuth();

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

  const [financeirosPorContrato, setFinanceirosPorContrato] =
  useState<Record<string, FinanceiroContratoDetalhado | null>>({});

  const [carregandoFinanceiros, setCarregandoFinanceiros] =
    useState<Record<string, boolean>>({});

  const [comissoesPorContrato, setComissoesPorContrato] =
  useState<Record<string, ComissaoContratoDetalhada | null>>({});

  const [carregandoComissoes, setCarregandoComissoes] =
    useState<Record<string, boolean>>({});

  const [contratoFinanceiro, setContratoFinanceiro] =
    useState<ContratoResumo | null>(null);

  const [contratoComissao, setContratoComissao] =
    useState<ContratoResumo | null>(null);

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
    if (!contratoId) return;

    setCarregandoComissoes((atual) => ({
      ...atual,
      [contratoId]: true,
    }));

    try {
      const resultado =
        await buscarComissaoContratoDetalhada(
          contratoId
        );

      setComissoesPorContrato((atual) => ({
        ...atual,
        [contratoId]: resultado,
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
    } finally {
      setCarregandoComissoes((atual) => ({
        ...atual,
        [contratoId]: false,
      }));
    }
  },
  []
);

  const carregarProposta = useCallback(async () => {
    if (!id) {
      setErro("Proposta não identificada.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      const resultado =
        await buscarPropostaPorId(id);

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
    []
  );

  const handleContratoEmitido = useCallback(
    async (_contrato: ContratoResumo) => {
      setContratoParaEmitir(null);
      setContratoAnteriorEmissao(null);
      await carregarProposta();
    },
    [carregarProposta]
  );

  useEffect(() => {
    void carregarProposta();
  }, [carregarProposta]);

  const podeEditar =
  proposta?.status === "EM_NEGOCIACAO";

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
    };
  }, [userProfile]);

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

const contextoComissao = useMemo<ContextoPermissaoComissao | null>(() => {
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
    corretoraId:
      userProfile.tipo_usuario === "CORRETORA"
        ? userProfile.id
        : userProfile.corretora_id ?? null,
  };
}, [userProfile]);

const usuarioPodeConfigurarComissao =
  contextoComissao
    ? (
        podeCriarComissao(contextoComissao) ||
        podeEditarComissao(contextoComissao)
      )
    : false;

const usuarioPodeOperarFinanceiro =
  contextoFinanceiro
    ? podeOperarFinanceiro(contextoFinanceiro)
    : false;

const podeOperarContrato = useCallback(
  (contrato: ContratoResumo): boolean => {
    if (!userProfile) return false;

    if (userProfile.tipo_usuario === "CORRETORA") {
      return true;
    }

    if (userProfile.tipo_usuario === "CORRETOR") {
      return contrato.corretor_id === userProfile.id;
    }

    return false;
  },
  [userProfile],
);

useEffect(() => {
  let ativo = true;

  async function carregarParticipantesComissao() {
    if (!usuarioPodeConfigurarComissao) {
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
}, [usuarioPodeConfigurarComissao]);

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

    if (
      cabecalho.data_validade &&
      cabecalho.data_validade <
        proposta.data_emissao
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

  async function handleSalvarComissao(
    payload: CriarComissaoPayload
  ) {
    if (
      !contratoComissao ||
      salvandoComissao
    ) {
      return;
    }

    setSalvandoComissao(true);

    try {
      await salvarComissaoContrato(payload);

      await carregarComissaoContrato(
        contratoComissao.id
      );

      toast.success(
        comissoesPorContrato[contratoComissao.id]
          ? "Comissão atualizada com sucesso."
          : "Comissão configurada com sucesso."
      );

      setContratoComissao(null);
    } catch (error) {
      console.error(
        "Erro ao salvar comissão:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a comissão."
      );
    } finally {
      setSalvandoComissao(false);
    }
  }

  if (loading) {
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
                  Proposta não encontrada
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

            {contextoAcoesProposta && (
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

            {podeEditar && (
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

                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Ações
                          </th>
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

                                <td className="px-4 py-4 text-right">
                                  {podeEditar ? (
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
                                  ) : contrato ? (
                                    <ChevronRight
                                      size={17}
                                      className="ml-auto text-slate-400"
                                    />
                                  ) : (
                                    <span className="text-sm text-slate-400">
                                      —
                                    </span>
                                  )}
                                </td>
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

                          <td />
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
                          proposta.data_emissao
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

                          {contrato.status ===
                            "AGUARDANDO_EMISSAO" && (
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

                          {contrato.status === "ATIVO" && (
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

                            <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                              {contrato.numero_apolice ||
                                "Aguardando emissão"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Vigência
                            </p>

                            <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                              {contrato.inicio_vigencia
                                ? formatarData(
                                    contrato.inicio_vigencia
                                  )
                                : "—"}
                            </p>
                          </div>
                        </div>
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
                                usuarioPodeOperarFinanceiro &&
                                podeOperarContrato(contrato)
                              }
                              onLancarFinanceiro={() =>
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
                                carregandoComissoes[contrato.id] ?? false
                              }
                              comissao={
                                comissoesPorContrato[contrato.id] ?? null
                              }
                              podeOperar={
                                usuarioPodeConfigurarComissao &&
                                podeOperarContrato(contrato)
                              }
                              onConfigurarComissao={() =>
                                setContratoComissao(contrato)
                              }
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
        open={modalFechamentoAberto}
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
        open={Boolean(contratoParaRenovar)}
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

      {contextoAcoesProposta && (
        <ModalAcoesProposta
          open={modalAcoesAberto}
          proposta={proposta}
          contexto={contextoAcoesProposta}
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

      {contratoFinanceiro && (
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

      {contratoComissao && (
      <ModalLancamentoComissao
        aberto={Boolean(contratoComissao)}
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
