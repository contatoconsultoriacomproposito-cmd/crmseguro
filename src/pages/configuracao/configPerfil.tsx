import {
  Building2,
  Save,
  MapPin,
  Phone,
  Mail,
  Loader2,
  CheckCircle2,
  Globe,
  ShieldCheck,
  Upload,
  X,
  ImageIcon,
  Instagram,
  Facebook,
  User,
  UserCheck,
  ShieldAlert,
  FileText,
  Database,
  Smartphone,
  Users,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "../../auth/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { buscarCEP, buscarCNPJ } from "../../services/brasilApi";
import { maskCNPJ, maskPhone } from "../../utils/masks";

import { ModalPlanos } from "./components/modalPlanos";
import { ModalSite } from "../whatsapp/configuracao-corretora/modalSite";

const STORAGE_GRATUITO_MB = 250;

export default function ConfigCorretora() {
  const {
    user,
    userProfile,
    loading: authLoading,
  } = useAuth();

  const navigate = useNavigate();

  const corretoraId =
    userProfile?.corretora_id ||
    user?.id ||
    null;

  const [
    activeTab,
    setActiveTab,
  ] = useState<
    "perfil" |
    "plano" |
    "pessoal"
  >("perfil");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    fetchingConfig,
    setFetchingConfig,
  ] = useState(true);

  const [
    loadingCNPJ,
    setLoadingCNPJ,
  ] = useState(false);

  const [
    loadingCEP,
    setLoadingCEP,
  ] = useState(false);

  const [
    showSuccess,
    setShowSuccess,
  ] = useState(false);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    isModalPlanosOpen,
    setIsModalPlanosOpen,
  ] = useState(false);

  const [
    isModalSiteOpen,
    setIsModalSiteOpen,
  ] = useState(false);

  const [
    assinaturaDb,
    setAssinaturaDb,
  ] = useState<any>(null);

  const [
    usoStorage,
    setUsoStorage,
  ] = useState({
    bytes: 0,
    mb: 0,
    percentual: 0,
  });

  const [
    isSyncingStorage,
    setIsSyncingStorage,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState({
    razao_social: "",
    cnpj: "",
    logotipo_url: "",
    website: "",
    instagram: "",
    facebook: "",
    registro_susep: "",
    whatsapp_comercial: "",
    plano: "FREE",
    status_pagamento: "ATIVO",
    data_expiracao: "",
    nome_fantasia: "",
    descricao_identificador_matriz_filial: "",
    natureza_juridica: "",
    porte: "",
    capital_social: "",
    opcao_pelo_mei: false,
    opcao_pelo_simples: false,
    cep: "",
    logradouro: "",
    numero: "",
    bairro: "",
    municipio: "",
    uf: "",
    complemento: "",
    email_corporativo: "",
    ddd_telefone_1: "",
    nome_responsavel: "",
    telefone_responsavel: "",
    email_responsavel: "",
  });

  const fetchConfig =
    useCallback(async () => {
      if (!corretoraId) return;

      try {
        const {
          data: corretora,
          error,
        } = await supabase
          .from(
            "tab_corretora_config"
          )
          .select(`
            *,
            usuarios_perfis (
              created_at
            )
          `)
          .eq(
            "id",
            corretoraId
          )
          .maybeSingle();

        if (error) throw error;

        if (!corretora) {
          return;
        }

        const {
          storage_usado_bytes: _storage,
          ...dadosLimpos
        } = corretora;

        const criadoEm =
          corretora
            .usuarios_perfis
            ?.created_at;

        const dataCriacao =
          criadoEm
            ? new Date(criadoEm)
            : new Date();

        const expiracaoFree =
          new Date(dataCriacao);

        expiracaoFree.setDate(
          expiracaoFree.getDate() + 7
        );

        setForm(prev => ({
          ...prev,
          ...dadosLimpos,

          data_expiracao:
            corretora
              .data_expiracao ||
            expiracaoFree
              .toISOString(),

          status_pagamento:
            corretora
              .status_pagamento ||
            "ATIVO",

          capital_social:
            corretora
              .capital_social
              ?.toString() ||
            "",
        }));
      } catch (error) {
        console.error(
          "Erro fetchConfig:",
          error
        );
      } finally {
        setFetchingConfig(false);
      }
    }, [corretoraId]);

  const fetchAssinatura =
    useCallback(async () => {
      if (!corretoraId) return;

      try {
        const {
          data,
          error,
        } = await supabase
          .from("tab_planos")
          .select("*")
          .eq(
            "corretora_id",
            corretoraId
          )
          .order(
            "data_inicio",
            {
              ascending: false,
            }
          )
          .limit(1);

        if (error) throw error;

        setAssinaturaDb(
          data?.[0] || null
        );
      } catch (error) {
        console.error(
          "Erro fetchAssinatura:",
          error
        );
      }
    }, [corretoraId]);

  const limiteStorageMb =
    useMemo(() => {
      return Number(
        assinaturaDb
          ?.storage_limite_mb ||
        STORAGE_GRATUITO_MB
      );
    }, [assinaturaDb]);

  const fetchUsoStorage =
    useCallback(async () => {
      if (!corretoraId) return;

      try {
        const {
          error: rpcError,
        } = await supabase.rpc(
          "sync_corretora_storage_usage",
          {
            p_corretora_id:
              corretoraId,
          }
        );

        if (rpcError) {
          console.warn(
            "Erro ao sincronizar uso de storage:",
            rpcError
          );
        }

        const {
          data,
          error,
        } = await supabase
          .from(
            "tab_corretora_config"
          )
          .select(
            "storage_usado_bytes"
          )
          .eq(
            "id",
            corretoraId
          )
          .maybeSingle();

        if (error) throw error;

        const bytes =
          Number(
            data
              ?.storage_usado_bytes ||
            0
          );

        const mb =
          bytes /
          (1024 * 1024);

        setUsoStorage({
          bytes,
          mb,

          percentual:
            limiteStorageMb > 0
              ? Math.min(
                  (
                    mb /
                    limiteStorageMb
                  ) *
                    100,
                  100
                )
              : 0,
        });
      } catch (error) {
        console.error(
          "Erro fetchUsoStorage:",
          error
        );
      }
    }, [
      corretoraId,
      limiteStorageMb,
    ]);

  const repairStorageSizes =
    async () => {
      setIsSyncingStorage(true);

      try {
        await fetchUsoStorage();

        toast.success(
          "Uso de armazenamento atualizado."
        );
      } catch (error: any) {
        toast.error(
          error?.message ||
          "Não foi possível sincronizar o armazenamento."
        );
      } finally {
        setIsSyncingStorage(
          false
        );
      }
    };

  useEffect(() => {
    if (corretoraId) {
      void fetchConfig();
    }
  }, [
    corretoraId,
    fetchConfig,
  ]);

  useEffect(() => {
    if (
      activeTab === "plano" &&
      corretoraId
    ) {
      void fetchAssinatura();
    }
  }, [
    activeTab,
    corretoraId,
    fetchAssinatura,
  ]);

  useEffect(() => {
    if (
      activeTab === "plano" &&
      corretoraId
    ) {
      void fetchUsoStorage();
    }
  }, [
    activeTab,
    corretoraId,
    fetchUsoStorage,
  ]);

  useEffect(() => {
    const handleLogoUpdate =
      (event: Event) => {
        const customEvent =
          event as CustomEvent<string>;

        if (
          customEvent.detail
        ) {
          setForm(prev => ({
            ...prev,
            logotipo_url:
              customEvent.detail,
          }));
        }
      };

    window.addEventListener(
      "logoUpdated",
      handleLogoUpdate
    );

    return () => {
      window.removeEventListener(
        "logoUpdated",
        handleLogoUpdate
      );
    };
  }, []);

  if (
    authLoading ||
    (
      fetchingConfig &&
      !form.razao_social
    )
  ) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white dark:bg-zinc-950">
        <Loader2
          className="mb-4 animate-spin text-blue-600"
          size={40}
        />

        <p className="animate-pulse font-medium text-slate-500">
          Autenticando sessão segura...
        </p>
      </div>
    );
  }

  if (
    !userProfile ||
    userProfile.tipo_usuario !==
      "CORRETORA"
  ) {
    return (
      <div className="mx-auto mt-20 max-w-md rounded-[32px] border border-red-100 bg-white p-8 text-center dark:bg-zinc-900">
        <ShieldAlert
          className="mx-auto mb-4 text-red-600"
          size={48}
        />

        <h2 className="mb-2 text-xl font-bold">
          Acesso Restrito
        </h2>

        <button
          type="button"
          onClick={() =>
            navigate(-1)
          }
          className="mt-4 rounded-xl bg-slate-100 px-6 py-2"
        >
          Voltar
        </button>
      </div>
    );
  }

  const handleChange = (
    e:
      React.ChangeEvent<HTMLInputElement>
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    let finalValue: any =
      type === "checkbox"
        ? checked
        : value;

    if (name === "cnpj") {
      finalValue =
        maskCNPJ(value);
    }

    if (
      [
        "whatsapp_comercial",
        "ddd_telefone_1",
        "telefone_responsavel",
      ].includes(name)
    ) {
      finalValue =
        maskPhone(value);
    }

    setForm(prev => ({
      ...prev,
      [name]: finalValue,
    }));
  };

  async function handleUpload(
    e:
      React.ChangeEvent<HTMLInputElement>
  ) {
    try {
      const file =
        e.target.files?.[0];

      if (!file) return;

      if (
        file.size >
        2 * 1024 * 1024
      ) {
        toast.error(
          "O logotipo deve ter no máximo 2 MB."
        );
        return;
      }

      setUploading(true);

      const fileExt =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "png";

      const fileName =
        `${corretoraId}-${Date.now()}.${fileExt}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from("logo_corretoras")
        .upload(
          fileName,
          file,
          {
            upsert: true,
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: {
          publicUrl,
        },
      } = supabase.storage
        .from("logo_corretoras")
        .getPublicUrl(
          fileName
        );

      const {
        error: dbError,
      } = await supabase
        .from(
          "tab_corretora_config"
        )
        .upsert({
          id: corretoraId,
          logotipo_url:
            publicUrl,
          logo_tamanho_bytes:
            file.size,
        });

      if (dbError) {
        throw dbError;
      }

      setForm(prev => ({
        ...prev,
        logotipo_url:
          publicUrl,
      }));

      window.dispatchEvent(
        new CustomEvent(
          "logoUpdated",
          {
            detail: publicUrl,
          }
        )
      );

      setShowSuccess(true);

      window.setTimeout(
        () =>
          setShowSuccess(false),
        3000
      );

      await fetchUsoStorage();
    } catch (error: any) {
      console.error(
        "Erro no upload:",
        error
      );

      toast.error(
        error?.message ||
        "Erro no upload."
      );
    } finally {
      setUploading(false);

      e.target.value = "";
    }
  }

  async function handleBuscarCNPJ() {
    const clean =
      form.cnpj.replace(
        /\D/g,
        ""
      );

    if (
      clean.length !== 14
    ) {
      toast.error(
        "CNPJ inválido."
      );
      return;
    }

    setLoadingCNPJ(true);

    try {
      const data =
        await buscarCNPJ(clean);

      setForm(prev => ({
        ...prev,

        razao_social:
          (
            data.razao_social ||
            ""
          ).toUpperCase(),

        nome_fantasia:
          (
            data.nome_fantasia ||
            ""
          ).toUpperCase(),

        natureza_juridica:
          (
            data.natureza_juridica ||
            ""
          ).toUpperCase(),

        porte:
          (
            data.porte ||
            ""
          ).toUpperCase(),

        capital_social:
          data.capital_social
            ?.toString() ||
          "",

        ddd_telefone_1:
          data.ddd_telefone_1
            ? maskPhone(
                data
                  .ddd_telefone_1
              )
            : "",

        opcao_pelo_mei:
          !!data
            .opcao_pelo_mei,

        opcao_pelo_simples:
          !!data
            .opcao_pelo_simples,

        cep:
          data.cep ||
          prev.cep,

        logradouro:
          (
            data.logradouro ||
            ""
          ).toUpperCase(),

        bairro:
          (
            data.bairro ||
            ""
          ).toUpperCase(),

        municipio:
          (
            data.municipio ||
            ""
          ).toUpperCase(),

        uf:
          (
            data.uf ||
            ""
          ).toUpperCase(),

        numero:
          data.numero ||
          "",
      }));
    } catch {
      toast.error(
        "Erro ao buscar CNPJ."
      );
    } finally {
      setLoadingCNPJ(false);
    }
  }

  async function handleBuscarCEP() {
    const clean =
      form.cep.replace(
        /\D/g,
        ""
      );

    if (
      clean.length !== 8
    ) {
      toast.error(
        "CEP inválido."
      );
      return;
    }

    setLoadingCEP(true);

    try {
      const data =
        await buscarCEP(clean);

      setForm(prev => ({
        ...prev,

        logradouro:
          (
            data.street ||
            ""
          ).toUpperCase(),

        bairro:
          (
            data.neighborhood ||
            ""
          ).toUpperCase(),

        municipio:
          (
            data.city ||
            ""
          ).toUpperCase(),

        uf:
          (
            data.state ||
            ""
          ).toUpperCase(),
      }));
    } catch {
      toast.error(
        "CEP não encontrado."
      );
    } finally {
      setLoadingCEP(false);
    }
  }

  async function handleSalvar(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!corretoraId) return;

    setLoading(true);

    const payload: any =
      {};

    const lowercaseFields = [
      "logotipo_url",
      "website",
      "instagram",
      "facebook",
      "email_corporativo",
      "email_responsavel",
    ];

    Object.keys(
      form
    ).forEach(key => {
      const value =
        (form as any)[key];

      if (
        typeof value ===
          "string" &&
        value.trim() === ""
      ) {
        payload[key] = null;
        return;
      }

      if (
        key ===
        "capital_social"
      ) {
        payload[key] =
          value
            ? Number(
                value
                  .toString()
                  .replace(
                    ",",
                    "."
                  )
              )
            : null;

        return;
      }

      if (
        lowercaseFields.includes(
          key
        )
      ) {
        payload[key] =
          typeof value ===
          "string"
            ? value
                .toLowerCase()
                .trim()
            : value;

        return;
      }

      payload[key] =
        typeof value ===
        "string"
          ? value
              .toUpperCase()
              .trim()
          : value;
    });

    payload.id =
      corretoraId;

    try {
      const {
        error,
      } = await supabase
        .from(
          "tab_corretora_config"
        )
        .upsert(payload);

      if (error) throw error;

      window.dispatchEvent(
        new CustomEvent(
          "logoUpdated",
          {
            detail:
              payload
                .logotipo_url,
          }
        )
      );

      setShowSuccess(true);

      window.setTimeout(
        () =>
          setShowSuccess(false),
        3000
      );
    } catch (error: any) {
      toast.error(
        error?.message ||
        "Não foi possível salvar as configurações."
      );
    } finally {
      setLoading(false);
    }
  }

  const planoNome =
    assinaturaDb
      ?.plano_nome ||
    form.plano ||
    "FREE";

  const statusPlano =
    assinaturaDb
      ?.status_assinatura ||
    form.status_pagamento ||
    "PENDENTE";

  const planoAtivo =
    [
      "ATIVO",
      "ACTIVE",
    ].includes(
      statusPlano
        .toString()
        .toUpperCase()
    );

  const dataRenovacao =
    assinaturaDb
      ?.data_fim ||
    form.data_expiracao;

  const quantidadeWhatsapp =
    Number(
      assinaturaDb
        ?.qtd_conexoes_whatsapp ||
      1
    );

  const valorMensal =
    Number(
      assinaturaDb
        ?.valor_mensal_total ||
      assinaturaDb
        ?.valor_total ||
      0
    );

  return (
    <div className="mx-auto max-w-5xl animate-in fade-in pb-20 duration-500">
      {showSuccess && (
        <div className="fixed right-8 top-24 z-50 flex items-center gap-3 rounded-2xl bg-emerald-500 px-6 py-4 text-white shadow-2xl animate-in slide-in-from-right">
          <CheckCircle2
            size={24}
          />

          <span className="font-bold">
            Configurações salvas!
          </span>
        </div>
      )}

      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Painel da Corretora
        </h1>

        <p className="text-sm text-slate-500">
          Gerencie os dados institucionais e sua assinatura.
        </p>
      </header>

      <div className="mb-8 flex w-fit gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-zinc-900">
        <TabButton
          active={
            activeTab ===
            "perfil"
          }
          onClick={() =>
            setActiveTab(
              "perfil"
            )
          }
          icon={
            <Building2
              size={18}
            />
          }
          label="Dados da Empresa"
        />

        <TabButton
          active={
            activeTab ===
            "pessoal"
          }
          onClick={() =>
            setActiveTab(
              "pessoal"
            )
          }
          icon={
            <Phone
              size={18}
            />
          }
          label="Dados do Responsável"
        />

        <TabButton
          active={false}
          onClick={() =>
            setIsModalSiteOpen(
              true
            )
          }
          icon={
            <Globe
              size={18}
            />
          }
          label="Site Corporativo"
        />

        <TabButton
          active={
            activeTab ===
            "plano"
          }
          onClick={() =>
            setActiveTab(
              "plano"
            )
          }
          icon={
            <ShieldCheck
              size={18}
            />
          }
          label="Assinatura"
        />
      </div>

      {activeTab ===
        "perfil" && (
        <form
          onSubmit={
            handleSalvar
          }
          className="space-y-6 animate-in fade-in duration-300"
        >
          <Section
            icon={
              <Building2
                size={20}
                className="text-blue-500"
              />
            }
            title="Identificação Jurídica"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-6">
              <div className="md:col-span-2">
                <ActionInput
                  label="CNPJ"
                  name="cnpj"
                  value={
                    form.cnpj
                  }
                  onChange={
                    handleChange
                  }
                  onAction={
                    handleBuscarCNPJ
                  }
                  loading={
                    loadingCNPJ
                  }
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="md:col-span-4">
                <Input
                  label="Razão Social"
                  name="razao_social"
                  value={
                    form.razao_social
                  }
                  onChange={
                    handleChange
                  }
                  readOnly
                />
              </div>

              <div className="md:col-span-3">
                <Input
                  label="Nome Fantasia"
                  name="nome_fantasia"
                  value={
                    form.nome_fantasia
                  }
                  onChange={
                    handleChange
                  }
                  readOnly
                />
              </div>

              <div className="md:col-span-3">
                <Input
                  label="Natureza Jurídica"
                  name="natureza_juridica"
                  value={
                    form.natureza_juridica
                  }
                  onChange={
                    handleChange
                  }
                  readOnly
                />
              </div>

              <div className="md:col-span-6">
                <label className="mb-1.5 ml-1 text-[10px] font-black uppercase text-slate-400">
                  Logotipo da Corretora
                </label>

                <div className="flex items-center gap-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
                    {form.logotipo_url ? (
                      <>
                        <img
                          src={
                            form.logotipo_url
                          }
                          alt="Logo"
                          className="h-full w-full object-contain p-2"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setForm(
                              prev => ({
                                ...prev,
                                logotipo_url:
                                  "",
                              })
                            )
                          }
                          className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X
                            size={20}
                          />
                        </button>
                      </>
                    ) : (
                      <ImageIcon
                        size={32}
                        className="text-slate-300"
                      />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="mb-3 text-xs text-slate-500">
                      PNG ou JPG de até 2 MB.
                    </p>

                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-slate-200">
                      {uploading ? (
                        <Loader2
                          className="animate-spin text-blue-600"
                          size={18}
                        />
                      ) : (
                        <Upload
                          size={18}
                          className="text-blue-600"
                        />
                      )}

                      {uploading
                        ? "Enviando..."
                        : "Selecionar Logo"}

                      <input
                        type="file"
                        accept="image/*"
                        onChange={
                          handleUpload
                        }
                        disabled={
                          uploading
                        }
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <Input
                  label="Capital Social"
                  name="capital_social"
                  value={
                    form.capital_social
                  }
                  onChange={
                    handleChange
                  }
                  readOnly
                />
              </div>

              <div className="md:col-span-2">
                <Input
                  label="Porte"
                  name="porte"
                  value={
                    form.porte
                  }
                  onChange={
                    handleChange
                  }
                  readOnly
                />
              </div>
            </div>
          </Section>

          <Section
            icon={
              <MapPin
                size={20}
                className="text-orange-500"
              />
            }
            title="Sede da Empresa"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-6">
              <div className="md:col-span-2">
                <ActionInput
                  label="CEP"
                  name="cep"
                  value={
                    form.cep
                  }
                  onChange={
                    handleChange
                  }
                  onAction={
                    handleBuscarCEP
                  }
                  loading={
                    loadingCEP
                  }
                  placeholder="00000-000"
                />
              </div>

              <div className="md:col-span-3">
                <Input
                  label="Logradouro"
                  name="logradouro"
                  value={
                    form.logradouro
                  }
                  onChange={
                    handleChange
                  }
                />
              </div>

              <div className="md:col-span-1">
                <Input
                  label="Nº"
                  name="numero"
                  value={
                    form.numero
                  }
                  onChange={
                    handleChange
                  }
                />
              </div>

              <div className="md:col-span-2">
                <Input
                  label="Bairro"
                  name="bairro"
                  value={
                    form.bairro
                  }
                  onChange={
                    handleChange
                  }
                />
              </div>

              <div className="md:col-span-2">
                <Input
                  label="Cidade"
                  name="municipio"
                  value={
                    form.municipio
                  }
                  onChange={
                    handleChange
                  }
                  readOnly
                />
              </div>

              <div className="md:col-span-1">
                <Input
                  label="UF"
                  name="uf"
                  value={
                    form.uf
                  }
                  onChange={
                    handleChange
                  }
                  maxLength={2}
                  readOnly
                />
              </div>

              <div className="md:col-span-1">
                <Input
                  label="Comp."
                  name="complemento"
                  value={
                    form.complemento
                  }
                  onChange={
                    handleChange
                  }
                />
              </div>
            </div>
          </Section>

          <Section
            icon={
              <Globe
                size={20}
                className="text-indigo-500"
              />
            }
            title="Canais Digitais"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <Input
                label="WhatsApp Comercial"
                name="whatsapp_comercial"
                icon={
                  <Phone
                    size={14}
                  />
                }
                value={
                  form.whatsapp_comercial
                }
                onChange={
                  handleChange
                }
              />

              <Input
                label="Telefone API (CNPJ)"
                name="ddd_telefone_1"
                icon={
                  <Phone
                    size={14}
                  />
                }
                value={
                  form.ddd_telefone_1
                }
                onChange={
                  handleChange
                }
              />

              <Input
                label="E-mail Corporativo"
                name="email_corporativo"
                type="email"
                icon={
                  <Mail
                    size={14}
                  />
                }
                value={
                  form.email_corporativo
                }
                onChange={
                  handleChange
                }
              />

              <Input
                label="Website"
                name="website"
                icon={
                  <Globe
                    size={14}
                  />
                }
                value={
                  form.website
                }
                onChange={
                  handleChange
                }
              />

              <Input
                label="Instagram"
                name="instagram"
                icon={
                  <Instagram
                    size={14}
                  />
                }
                value={
                  form.instagram
                }
                onChange={
                  handleChange
                }
              />

              <Input
                label="Facebook"
                name="facebook"
                icon={
                  <Facebook
                    size={14}
                  />
                }
                value={
                  form.facebook
                }
                onChange={
                  handleChange
                }
              />

              <Input
                label="Registro SUSEP"
                name="registro_susep"
                value={
                  form.registro_susep
                }
                onChange={
                  handleChange
                }
                placeholder="Obrigatório para PJ"
                icon={
                  <FileText
                    size={14}
                  />
                }
              />
            </div>
          </Section>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-2xl bg-blue-600 px-12 py-3.5 font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <Loader2
                  className="animate-spin"
                  size={20}
                />
              ) : (
                <Save
                  size={20}
                />
              )}

              Salvar Dados Empresariais
            </button>
          </div>
        </form>
      )}

      {activeTab ===
        "pessoal" && (
        <form
          onSubmit={
            handleSalvar
          }
          className="space-y-6 animate-in fade-in duration-300"
        >
          <Section
            icon={
              <UserCheck
                size={20}
                className="text-green-500"
              />
            }
            title="Responsável e Contato Direto"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <Input
                  label="Nome do Contato / Responsável"
                  name="nome_responsavel"
                  placeholder="NOME COMPLETO"
                  icon={
                    <User
                      size={14}
                    />
                  }
                  value={
                    form.nome_responsavel
                  }
                  onChange={
                    handleChange
                  }
                />
              </div>

              <Input
                label="Telefone Whats (Pessoal)"
                name="telefone_responsavel"
                placeholder="(00) 00000-0000"
                icon={
                  <Phone
                    size={14}
                  />
                }
                value={
                  form.telefone_responsavel
                }
                onChange={
                  handleChange
                }
              />

              <Input
                label="E-mail Pessoal"
                name="email_responsavel"
                type="email"
                placeholder="email@exemplo.com"
                icon={
                  <Mail
                    size={14}
                  />
                }
                value={
                  form.email_responsavel
                }
                onChange={
                  handleChange
                }
              />
            </div>
          </Section>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-2xl bg-blue-600 px-12 py-3.5 font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <Loader2
                  className="animate-spin"
                  size={20}
                />
              ) : (
                <Save
                  size={20}
                />
              )}

              Salvar Dados do Responsável
            </button>
          </div>
        </form>
      )}

      {activeTab ===
        "plano" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner dark:bg-blue-500/10">
                  <ShieldCheck
                    size={28}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white">
                      Plano {planoNome}
                    </h3>

                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                        planoAtivo
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-amber-100 text-amber-600"
                      }`}
                    >
                      {statusPlano}
                    </span>
                  </div>

                  <p className="mt-0.5 text-sm text-slate-500">
                    Usuários ilimitados, site corporativo e integração completa com o CRM.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsModalPlanosOpen(
                    true
                  )
                }
                className="rounded-2xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95"
              >
                {form.plano ===
                "FREE"
                  ? "Escolher Plano"
                  : "Gerenciar Plano"}
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
              <PlanInfoCard
                icon={
                  <Users
                    size={20}
                  />
                }
                label="Usuários"
                value="ILIMITADOS"
                hint="Sem cobrança por usuário"
              />

              <PlanInfoCard
                icon={
                  <Smartphone
                    size={20}
                  />
                }
                label="WhatsApp"
                value={`${quantidadeWhatsapp} conexão${
                  quantidadeWhatsapp !==
                  1
                    ? "ões"
                    : ""
                }`}
                hint="1 conexão inclusa no plano"
              />

              <PlanInfoCard
                icon={
                  <Globe
                    size={20}
                  />
                }
                label="Site Corporativo"
                value="INCLUSO"
                hint="Integrado ao CRM"
              />

              <PlanInfoCard
                icon={
                  <Database
                    size={20}
                  />
                }
                label="Armazenamento"
                value={formatStorage(
                  limiteStorageMb
                )}
                hint="250 MB inclusos"
              />
            </div>

            {assinaturaDb && (
              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-800/30">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">
                      Mensalidade equivalente
                    </p>

                    <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                      {formatMoney(
                        valorMensal
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">
                      Valor contratado
                    </p>

                    <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                      {formatMoney(
                        Number(
                          assinaturaDb
                            ?.valor_total ||
                          0
                        )
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">
                      Ciclo
                    </p>

                    <p className="text-sm font-black uppercase text-slate-700 dark:text-slate-200">
                      {assinaturaDb
                        ?.periodicidade ||
                        "--"}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">
                      Próxima renovação
                    </p>

                    <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                      {dataRenovacao
                        ? new Date(
                            dataRenovacao
                          ).toLocaleDateString(
                            "pt-BR"
                          )
                        : "--/--/----"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-800/30">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">
                    Uso de armazenamento
                  </p>

                  <p className="text-sm font-black text-blue-600">
                    {usoStorage.mb.toFixed(
                      2
                    )}{" "}
                    MB

                    <span className="font-medium text-slate-400">
                      {" "}
                      /{" "}
                      {formatStorage(
                        limiteStorageMb
                      )}
                    </span>
                  </p>

                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-700">
                    <div
                      className={`h-full transition-all duration-700 ${
                        usoStorage.percentual >
                        90
                          ? "bg-red-500"
                          : "bg-blue-600"
                      }`}
                      style={{
                        width:
                          `${usoStorage.percentual}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-[9px] leading-tight text-slate-400">
                    Soma total dos arquivos da corretora e dos corretores vinculados.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    repairStorageSizes
                  }
                  disabled={
                    isSyncingStorage
                  }
                  className="flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase text-blue-500 transition-colors hover:text-blue-700 disabled:opacity-50"
                >
                  {isSyncingStorage ? (
                    <Loader2
                      className="animate-spin"
                      size={12}
                    />
                  ) : (
                    <Save
                      size={12}
                    />
                  )}

                  Atualizar
                </button>
              </div>
            </div>
          </div>

          <ModalPlanos
            isOpen={
              isModalPlanosOpen
            }
            onClose={() => {
              setIsModalPlanosOpen(
                false
              );

              void fetchConfig();
              void fetchAssinatura();
            }}
            planoAtual={
              assinaturaDb
                ?.periodicidade ||
              form.plano ||
              "FREE"
            }
          />
        </div>
      )}

      <ModalSite
        isOpen={
          isModalSiteOpen
        }
        onClose={() =>
          setIsModalSiteOpen(
            false
          )
        }
        corretoraId={
          corretoraId ||
          undefined
        }
      />
    </div>
  );
}

function PlanInfoCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-800/30">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10">
        {icon}
      </div>

      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-slate-800 dark:text-slate-100">
        {value}
      </p>

      <p className="mt-1 text-[10px] text-slate-400">
        {hint}
      </p>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: any) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-800/30">
        {icon}

        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
          {title}
        </h2>
      </div>

      <div className="p-6 md:p-8">
        {children}
      </div>
    </div>
  );
}

function Input({
  label,
  icon,
  className = "",
  ...props
}: any) {
  return (
    <div className="flex flex-col">
      <label className="mb-1.5 ml-1 text-[10px] font-black uppercase text-slate-400">
        {label}
      </label>

      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-4 text-slate-400">
            {icon}
          </span>
        )}

        <input
          {...props}
          value={
            props.value ?? ""
          }
          className={`h-11 w-full rounded-xl border border-slate-200 bg-white text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-900 ${
            icon
              ? "pl-11 pr-4"
              : "px-4"
          } ${className}`}
        />
      </div>
    </div>
  );
}

function ActionInput({
  label,
  onAction,
  loading,
  ...props
}: any) {
  return (
    <div className="flex flex-col">
      <label className="mb-1.5 ml-1 text-[10px] font-black uppercase text-slate-400">
        {label}
      </label>

      <div className="relative">
        <input
          {...props}
          value={
            props.value ?? ""
          }
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 pr-24 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-900"
        />

        <button
          type="button"
          onClick={onAction}
          disabled={loading}
          className="absolute bottom-1 right-1 top-1 flex items-center justify-center rounded-lg border border-blue-100 bg-blue-50 px-4 text-[10px] font-bold uppercase tracking-wider text-blue-600 transition-all hover:bg-blue-600 hover:text-white disabled:opacity-50 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Buscar"
          )}
        </button>
      </div>
    </div>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${
        active
          ? "bg-white text-blue-600 shadow-sm dark:bg-zinc-800 dark:text-white"
          : "text-slate-500 hover:text-slate-700 dark:text-zinc-400"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function formatMoney(
  value: number
) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(value || 0);
}

function formatStorage(
  mb: number
) {
  if (mb < 1024) {
    return `${mb} MB`;
  }

  const gb =
    mb / 1024;

  return `${Number.isInteger(gb) ? gb : gb.toFixed(2)} GB`;
}