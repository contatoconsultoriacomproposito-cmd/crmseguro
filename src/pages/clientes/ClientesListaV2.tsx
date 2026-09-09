import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, RotateCcw, User, Building2, ChevronDown, ChevronUp,
  Eye, Calendar, Trash2, Car, Heart, Home, Briefcase, Stethoscope, Smile, ShieldAlert,
  ChevronRight, ChevronLeft, Loader2, Plus, Users
} from 'lucide-react';
import { buscarClientesV2, buscarListaCnaes, excluirClienteV2, buscarClienteCompletoPorId, criarClienteV2, atualizarClienteV2 } from './clienteServiceV2';
import type { FiltrosClientesV2, ClienteV2Formatado, CnaeOpcao  } from './clienteServiceV2';
import { CnaeMultiSelect } from './CnaeMultiSelect';
import { ModalCadastroCliente } from './ModalCadastroCliente';
import { ModalAcoesComerciais } from './ModalAcoesComerciais';
import { salvarAcaoComercialV2 } from './clienteServiceV2';
import { toast } from "sonner";
const ITENS_POR_PAGINA = 10;

const FILTROS_INICIAIS: FiltrosClientesV2 = {
    buscaGlobal: '',
    uf: '',
    municipio: '',
    bairro: '',
    cep: '',
    situacao_cadastral: '',
    tipo_cliente: '',
    origem: '',
    fase_atendimento: '',
    temperatura: '',
    status_kanban: '',
    fase_kanban: '',
    corretor_id: '',
    porte: '',
    matriz_filial: '',
    opcao_pelo_mei: '',
    opcao_pelo_simples: '',
    cnae_principal: [],
    busca_socio: '',
    data_abertura_inicio: '',
    data_abertura_fim: '',
    data_retorno_inicio: '',
    data_retorno_fim: '',
    data_retorno_sinistro_inicio: '',
    data_retorno_sinistro_fim: '',
    tipo_acao: '',
    proxima_acao_interacao: '',
    data_venda_inicio: '',
    data_venda_fim: '',
    valor_proposta_min: '',
    valor_proposta_max: '',
    status_proposta: '',
    seguradora_id: '',
    produto_id: '',
    data_cotacao_inicio: '',
    data_cotacao_fim: '',
    data_inicio_vigencia: '',
    data_fim_vigencia: '',
    periodicidade: '',
    status_renovacao: ''
  };

const SEGURADORAS_OPTIONS = [
    { id: "860331a9-8c3c-47a9-be10-6634b74917a7", nome: "AIG" },
    { id: "c8cb9881-faf9-4a6d-bcc2-b7da7ebfb160", nome: "AKAD SEGUROS" },
    { id: "ce38bc61-0cab-4dc6-a0ed-bc24622439ec", nome: "ALLIANZ" },
    { id: "01cc3143-b016-42b9-9e7b-cd8b9a05f7d3", nome: "ALLSEG SEGURADORA" },
    { id: "e44b4b4d-283f-4c6b-949a-9984980dceb8", nome: "AZUL SEGUROS" },
    { id: "e17d59c9-d959-4ebd-bfe5-5da3f915a697", nome: "BRADESCO" },
    { id: "5f5582cf-2baa-4aff-a863-a4946e3a8226", nome: "ESSOR" },
    { id: "8cbcdf66-8a0a-4e97-b9b2-b413e0029745", nome: "EXCELSIOR SEGUROS" },
    { id: "9d8f6b17-3709-4a46-aee1-56075c71daf0", nome: "HDI SEGUROS" },
    { id: "2dbe9b84-4316-45e9-85e4-25d222745c7e", nome: "PORTO SEGURO" },
    { id: "21736433-4c58-4f5c-9e41-a9456243cb8f", nome: "TOKIO MARINE" },
    { id: "9cb10f4f-7488-4737-b9cb-528f3256f3c6", nome: "YELUM" }
  ];
const PRODUTOS_OPTIONS = [
    { id: "846dc4bb-d3bc-4498-ae26-989486b16d7e", nome: "PREVIDENCIA JOVEM" },
    { id: "701560ea-7fea-4c65-bc40-9442acbfc10c", nome: "SEGURO AUTO" },
    { id: "91988815-fad3-47e9-965f-a6da847d51bc", nome: "SEGURO CONDOMÍNIO" },
    { id: "8d1f7395-bede-4fb2-a0cb-9a778332f5eb", nome: "SEGURO DE SAÚDE" },
    { id: "3343e787-428b-4336-8e28-c37a625a85e4", nome: "SEGURO DE VIDA" },
    { id: "8b722f8c-d1b1-483f-a486-bc86f7e78f9d", nome: "SEGURO DENTAL" },
    { id: "b3e9dc33-2943-485e-87a3-2150c7aa17ab", nome: "SEGURO EMPRESARIAL" },
    { id: "3b31498c-8152-49c5-a970-df3f2af7dd6f", nome: "SEGURO EQUIPAMENTO AGRÍCOLA" },
    { id: "07774156-e101-42d7-9883-4c10987e1922", nome: "SEGURO EQUIPAMENTOS" },
    { id: "7a58af28-f962-4aca-840a-341b10f582d6", nome: "SEGURO PREVIDÊNCIA" },
    { id: "a42bba27-dfa4-4369-84c3-d172909ac332", nome: "SEGURO RESIDENCIAL" },
    { id: "b6fd4043-a996-446c-b565-02d5e0b190ab", nome: "SEGURO RESPONSABILIDADE CIVIL (RC)" },
    { id: "220b9234-2ab3-4845-8a03-03a523976e4d", nome: "SEGURO TRANSPORTE DE CARGA" },
    { id: "9cdf00fd-703d-454b-a9c1-d28a7458a3a1", nome: "SEGURO VIAGEM" }
  ];
const PERIODICIDADE_OPTIONS = [
    "ÚNICO",
    "MENSAL",
    "ANUAL",
    "PERSONALIZADO"
  ];
const STATUS_RENOVACAO_OPTIONS = [
    { value: "NÃO SE APLICA", label: "NÃO SE APLICA" },
    { value: "A RENOVAR", label: "A RENOVAR" },
    { value: "RENOVAÇÃO AUTOMÁTICA", label: "RENOVAÇÃO AUTOMÁTICA" },
    { value: "NAO_RENOVADO", label: "NÃO RENOVADO" },
    { value: "RENOVADO", label: "RENOVADO" }
  ];

const PRODUTO_ICONES: Record<string, { icon: React.ReactNode; label: string; bgClass: string }> = {
  auto: { icon: <Car size={16} />, label: 'Auto', bgClass: 'bg-sky-100 text-sky-800' },
  vida: { icon: <Heart size={16} />, label: 'Vida', bgClass: 'bg-pink-100 text-pink-800' },
  residencial: { icon: <Home size={16} />, label: 'Residencial', bgClass: 'bg-amber-100 text-amber-800' },
  empresarial: { icon: <Briefcase size={16} />, label: 'Empresarial', bgClass: 'bg-indigo-100 text-indigo-800' },
  saude: { icon: <Stethoscope size={16} />, label: 'Saúde', bgClass: 'bg-emerald-100 text-emerald-800' },
  odontologico: { icon: <Smile size={16} />, label: 'Odontológico', bgClass: 'bg-purple-100 text-purple-800' },
};

const renderIconesProdutos = (produtos: string[]) => {
  if (produtos.length === 0) {
    return <span className="text-slate-400 text-xs">Nenhum</span>;
  }

  const conhecidos: { key: string; label: string; icon: React.ReactNode; bgClass: string }[] = [];
  const outros: string[] = [];

  produtos.forEach((prod) => {
    const prodNorm = prod.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const chaveEncontrada = Object.keys(PRODUTO_ICONES).find((key) => prodNorm.includes(key));

    if (chaveEncontrada) {
      if (!conhecidos.some((item) => item.key === chaveEncontrada)) {
        conhecidos.push({ key: chaveEncontrada, ...PRODUTO_ICONES[chaveEncontrada] });
      }
    } else {
      outros.push(prod);
    }
  });

  return (
    <div className="flex gap-1.5 items-center flex-wrap">
      {conhecidos.map((item) => (
        <span key={item.key} title={item.label} className={`${item.bgClass} p-1 rounded-md flex items-center`}>
          {item.icon}
        </span>
      ))}
      {outros.length > 0 && (
        <span title={`Outros: ${outros.join(', ')}`} className="bg-slate-100 text-slate-700 px-1.5 py-1 rounded-md text-xs font-bold flex items-center gap-0.5">
          <ShieldAlert size={14} /> +{outros.length}
        </span>
      )}
    </div>
  );
};

export const ClientesListaV2: React.FC = () => {
  const [clientes, setClientes] = useState<ClienteV2Formatado[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalRegistros, setTotalRegistros] = useState<number>(0);
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const [listaCnaes, setListaCnaes] = useState<CnaeOpcao[]>([]);
  const [exibirAvancados, setExibirAvancados] = useState<boolean>(true);
  const [sociosExpandidos, setSociosExpandidos] = useState<Record<string, boolean>>({});
  const [gruposExpandidos, setGruposExpandidos] = useState({
    localizacao: false,
    perfilEmpresa: false,
    propostas: false,
    crm: false
  });
  type GrupoKey = keyof typeof gruposExpandidos;
  const toggleGrupo = useCallback((grupo: GrupoKey) => {
    setGruposExpandidos(prev => ({ ...prev, [grupo]: !prev[grupo] }));
  }, []);
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);
  const [modalAcaoAberto, setModalAcaoAberto] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosClientesV2>(FILTROS_INICIAIS);
  useEffect(() => {
    async function carregarCnaes() {
      const cnaes = await buscarListaCnaes();
      setListaCnaes(cnaes);
    }
    carregarCnaes();
  }, []);
  const carregarClientes = useCallback(async () => {
    setLoading(true);
    const resultado = await buscarClientesV2(filtros, paginaAtual, ITENS_POR_PAGINA);
    setClientes(resultado.dados);
    setTotalRegistros(resultado.total);
    setLoading(false);
  }, [filtros, paginaAtual]);
  useEffect(() => {
    const handler = setTimeout(() => {
      carregarClientes();
    }, 400);
    return () => clearTimeout(handler);
  }, [carregarClientes]);
  const handleFiltroChange = useCallback((campo: keyof FiltrosClientesV2, valor: any) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
    setPaginaAtual(1);
  }, []);
  const handleLimparFiltros = useCallback(() => {
    setFiltros(FILTROS_INICIAIS);
    setPaginaAtual(1);
  }, []);
  const toggleExpandirSocios = useCallback((clienteId: string) => {
    setSociosExpandidos(prev => ({ ...prev, [clienteId]: !prev[clienteId] }));
  }, []);
  const totalPaginas = useMemo(() => Math.ceil(totalRegistros / ITENS_POR_PAGINA), [totalRegistros]);

  const handleEditarCliente = async (cliente: ClienteV2Formatado) => {
    const dadosCompletos = await buscarClienteCompletoPorId(cliente.id);
    setClienteSelecionado(dadosCompletos || cliente);
    setModalCadastroAberto(true);
  };
  const handleNovaAcao = async (cliente: ClienteV2Formatado) => {
    const dadosCompletos = await buscarClienteCompletoPorId(cliente.id);
    setClienteSelecionado(dadosCompletos || cliente);
    setModalAcaoAberto(true);
  };
  const handleSalvarCliente = async (payloadCliente: any, abrirOportunidade: boolean = false) => {
    try {
      let clienteSalvo = clienteSelecionado;
      if (clienteSelecionado?.id) {
        await atualizarClienteV2(clienteSelecionado.id, payloadCliente);
        toast.success("Cliente atualizado com sucesso!");
        clienteSalvo = { ...clienteSelecionado, ...payloadCliente };
      } else {
        const novoCliente = await criarClienteV2(payloadCliente);
        toast.success("Cliente cadastrado com sucesso!");
        clienteSalvo = novoCliente;
      }
      setModalCadastroAberto(false);
      await carregarClientes();
      if (abrirOportunidade) {
        if (!clienteSalvo?.id) {
          throw new Error("Cliente criado sem ID. Não foi possível abrir a ação comercial.");
        }
        setClienteSelecionado(clienteSalvo);
        setModalAcaoAberto(true);
      } else {
        setClienteSelecionado(null);
      }
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      toast.error("Ocorreu um erro ao salvar o cliente.");
    }
  };

  const handleExcluirCliente = async (id: string) => {
    const confirmar = window.confirm("Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.");
    if (!confirmar) return;
    const sucesso = await excluirClienteV2(id);
    if (sucesso) {
      toast.success("Cliente excluído com sucesso!");
      await carregarClientes();
    } else {
      toast.error("Erro ao excluir o cliente. Tente novamente.");
    }
  };
  
  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-slate-800">
            <Users className="text-blue-600" size={24} />
            <h1 className="text-xl font-bold tracking-tight">Consulta de Clientes</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Filtre, pesquise e gerencie cadastros, propostas e histórico de interações do CRM.
          </p>
        </div>
        <button
          onClick={() => {
            setClienteSelecionado(null);
            setModalCadastroAberto(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          Novo Cliente
        </button>
      </div>
      <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
        <div className="flex gap-3 items-center mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Busque por Razão Social, Nome Fantasia, Nome, CPF ou CNPJ..."
              value={filtros.buscaGlobal}
              onChange={(e) => handleFiltroChange('buscaGlobal', e.target.value)}
              className="w-full py-2.5 pl-10 pr-3 rounded-lg border border-slate-200 outline-none text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
          <button
            onClick={() => setExibirAvancados(!exibirAvancados)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-indigo-100 bg-blue-50 text-blue-600 font-semibold text-xs cursor-pointer hover:bg-blue-100 transition-colors"
          >
            {exibirAvancados ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {exibirAvancados ? 'Ocultar Avançados' : 'Exibir Avançados'}
          </button>
          <button
            onClick={handleLimparFiltros}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-500 font-medium text-xs cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <RotateCcw size={15} /> Limpar
          </button>
        </div>
        {exibirAvancados && (
          <div className="flex flex-col gap-4 mt-4">
              <div className="border border-slate-100 bg-slate-50/50 p-3 rounded-lg">
                  <div
                      onClick={() => toggleGrupo('localizacao')}
                      className="flex justify-between items-center cursor-pointer select-none"
                  >
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">1. LOCALIZAÇÃO E TIPO</span>
                      <span className="text-xs text-slate-400">{gruposExpandidos.localizacao ? '▲' : '▼'}</span>
                  </div>
                  {gruposExpandidos.localizacao && (
                      <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-2 mt-4">
                          <select
                              value={filtros.tipo_cliente}
                              onChange={(e) => handleFiltroChange('tipo_cliente', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          >
                              <option value="">Tipo (PF / PJ)</option>
                              <option value="PF">Pessoa Física (PF)</option>
                              <option value="PJ">Pessoa Jurídica (PJ)</option>
                          </select>
                          <div className="grid grid-cols-[80px_1fr_1fr_110px] gap-2">
                              <input type="text" placeholder="UF" value={filtros.uf} onChange={(e) => handleFiltroChange('uf', e.target.value)} className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                              <input type="text" placeholder="Município" value={filtros.municipio} onChange={(e) => handleFiltroChange('municipio', e.target.value)} className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                              <input type="text" placeholder="Bairro" value={filtros.bairro} onChange={(e) => handleFiltroChange('bairro', e.target.value)} className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                              <input type="text" placeholder="CEP" value={filtros.cep} onChange={(e) => handleFiltroChange('cep', e.target.value)} className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                          </div>
                      </div>
                  )}
              </div>
              <div className="border border-slate-100 bg-slate-50/50 p-3 rounded-lg">
                  <div
                      onClick={() => toggleGrupo('perfilEmpresa')}
                      className="flex justify-between items-center cursor-pointer select-none"
                  >
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">2. PERFIL DA EMPRESA</span>
                      <span className="text-xs text-slate-400">{gruposExpandidos.perfilEmpresa ? '▲' : '▼'}</span>
                  </div>
                  {gruposExpandidos.perfilEmpresa && (
                      <div className="flex flex-col gap-4 mt-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <div className="flex flex-col">
                                  <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Situação Cadastral</label>
                                  <select
                                      value={filtros.situacao_cadastral}
                                      onChange={(e) => handleFiltroChange('situacao_cadastral', e.target.value)}
                                      className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  >
                                      <option value="">Situação (Todas)</option>
                                      <option value="ATIVA">ATIVA</option>
                                      <option value="BAIXADA">BAIXADA</option>
                                      <option value="SUSPENSA">SUSPENSA</option>
                                      <option value="INAPTA">INAPTA</option>
                                      <option value="NULA">NULA</option>
                                  </select>
                              </div>
                              <div className="flex flex-col">
                                  <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Abertura (Início)</label>
                                  <input
                                      type="date"
                                      value={filtros.data_abertura_inicio}
                                      onChange={(e) => handleFiltroChange('data_abertura_inicio', e.target.validity.badInput ? 'DATA_INVALIDA' : e.target.value)}
                                      className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  />
                              </div>
                              <div className="flex flex-col">
                                  <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Abertura (Fim)</label>
                                  <input
                                      type="date"
                                      value={filtros.data_abertura_fim}
                                      onChange={(e) => handleFiltroChange('data_abertura_fim', e.target.validity.badInput ? 'DATA_INVALIDA' : e.target.value)}
                                      className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  />
                              </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                              <select value={filtros.porte} onChange={(e) => handleFiltroChange('porte', e.target.value)} className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                  <option value="">Porte (Todos)</option>
                                  <option value="MICRO EMPRESA">Microempresa (ME)</option>
                                  <option value="EMPRESA DE PEQUENO PORTE">Empresa de Pequeno Porte (EPP)</option>
                                  <option value="DEMAIS">Demais (Médio / Grande Porte)</option>
                              </select>
                              <select value={filtros.opcao_pelo_mei ?? ''} onChange={(e) => handleFiltroChange('opcao_pelo_mei', e.target.value)} className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                  <option value="">É MEI? (Todos)</option>
                                  <option value="true">Sim</option>
                                  <option value="false">Não</option>
                              </select>
                              <select value={filtros.opcao_pelo_simples ?? ''} onChange={(e) => handleFiltroChange('opcao_pelo_simples', e.target.value)} className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                  <option value="">Simples? (Todos)</option>
                                  <option value="true">Sim</option>
                                  <option value="false">Não</option>
                              </select>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-2.5">
                              <CnaeMultiSelect
                                  cnaesDisponiveis={listaCnaes}
                                  selecionados={filtros.cnae_principal}
                                  onChange={(novosCnaes) => handleFiltroChange('cnae_principal', novosCnaes)}
                              />
                              <select value={filtros.origem} onChange={(e) => handleFiltroChange('origem', e.target.value)} className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                  <option value="">Origem (Todas)</option>
                                  <option value="IMPORTAÇÃO">IMPORTAÇÃO</option>
                                  <option value="CARTEIRA">CARTEIRA</option>
                                  <option value="AGENDA">AGENDA</option>
                                  <option value="MANUAL">MANUAL</option>
                              </select>
                          </div>
                      </div>
                  )}
              </div>
              <div className="border border-slate-100 bg-slate-50/50 p-3 rounded-lg">
                  <div
                      onClick={() => toggleGrupo('propostas')}
                      className="flex justify-between items-center cursor-pointer select-none"
                  >
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">3. FILTROS DE PROPOSTAS COMERCIAIS</span>
                      <span className="text-xs text-slate-400">{gruposExpandidos.propostas ? '▲' : '▼'}</span>
                  </div>
                  {gruposExpandidos.propostas && (
                      <div className="flex flex-col gap-3 mt-4">
                          <div className="grid grid-cols-5 gap-2">
                              <div className="flex flex-col">
                                  <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Status da Proposta</label>
                                  <select
                                    value={filtros.status_proposta}
                                    onChange={(e) => handleFiltroChange('status_proposta', e.target.value)}
                                    className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  >
                                    <option value="">Status (Todos)</option>
                                    <option value="Vendido">Vendido</option>
                                    <option value="Em negociação">Em negociação</option>
                                    <option value="Perdido">Perdido</option>
                                  </select>
                              </div>
                              <div className="flex flex-col">
                                  <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Valor Mín (R$)</label>
                                  <input
                                    type="number"
                                    placeholder="Valor Mín R$"
                                    value={filtros.valor_proposta_min}
                                    onChange={(e) => handleFiltroChange('valor_proposta_min', e.target.value)}
                                    className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  />
                              </div>
                              <div className="flex flex-col">
                                  <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Valor Máx (R$)</label>
                                  <input
                                    type="number"
                                    placeholder="Valor Máx R$"
                                    value={filtros.valor_proposta_max}
                                    onChange={(e) => handleFiltroChange('valor_proposta_max', e.target.value)}
                                    className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  />
                              </div>
                              <div className="flex flex-col">
                                  <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Venda (De)</label>
                                  <input
                                    type="date"
                                    value={filtros.data_venda_inicio}
                                    onChange={(e) => handleFiltroChange('data_venda_inicio', e.target.validity.badInput ? 'DATA_INVALIDA' : e.target.value)}
                                    className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  />
                              </div>
                              <div className="flex flex-col">
                                  <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Venda (Até)</label>
                                  <input
                                    type="date"
                                    value={filtros.data_venda_fim}
                                    onChange={(e) => handleFiltroChange('data_venda_fim', e.target.validity.badInput ? 'DATA_INVALIDA' : e.target.value)}
                                    className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  />
                              </div>
                          </div>
                          <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr] gap-2">
                              <div className="flex flex-col">
                                  <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Seguradora</label>
                                  <select
                                    value={filtros.seguradora_id}
                                    onChange={(e) => handleFiltroChange('seguradora_id', e.target.value)}
                                    className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  >
                                    <option value="">Todas as Seguradoras</option>
                                    {SEGURADORAS_OPTIONS.map((seg) => (
                                        <option key={seg.id} value={seg.id}>
                                        {seg.nome}
                                        </option>
                                    ))}
                                  </select>
                              </div>
                              <div className="flex flex-col">
                                  <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Produto</label>
                                  <select
                                    value={filtros.produto_id}
                                    onChange={(e) => handleFiltroChange('produto_id', e.target.value)}
                                    className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  >
                                    <option value="">Todos os Produtos</option>
                                    {PRODUTOS_OPTIONS.map((prod) => (
                                        <option key={prod.id} value={prod.id}>
                                        {prod.nome}
                                        </option>
                                    ))}
                                  </select>
                              </div>
                              <div className="flex flex-col">
                                  <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Cotação (De)</label>
                                  <input
                                    type="date"
                                    value={filtros.data_cotacao_inicio}
                                    onChange={(e) => handleFiltroChange('data_cotacao_inicio', e.target.validity.badInput ? 'DATA_INVALIDA' : e.target.value)}
                                    className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  />
                              </div>
                              <div className="flex flex-col">
                                  <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Cotação (Até)</label>
                                  <input
                                    type="date"
                                    value={filtros.data_cotacao_fim}
                                    onChange={(e) => handleFiltroChange('data_cotacao_fim', e.target.validity.badInput ? 'DATA_INVALIDA' : e.target.value)}
                                    className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  />
                              </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                              <div className="flex flex-col">
                                  <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Início da Vigência</label>
                                  <input
                                    type="date"
                                    value={filtros.data_inicio_vigencia}
                                    onChange={(e) => handleFiltroChange('data_inicio_vigencia', e.target.validity.badInput ? 'DATA_INVALIDA' : e.target.value)}
                                    className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  />
                              </div>
                              <div className="flex flex-col">
                                  <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Fim da Vigência</label>
                                  <input
                                    type="date"
                                    value={filtros.data_fim_vigencia}
                                    onChange={(e) => handleFiltroChange('data_fim_vigencia', e.target.validity.badInput ? 'DATA_INVALIDA' : e.target.value)}
                                    className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  />
                              </div>
                              <div className="flex flex-col">
                                  <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Periodicidade</label>
                                  <select
                                    value={filtros.periodicidade}
                                    onChange={(e) => handleFiltroChange('periodicidade', e.target.value)}
                                    className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  >
                                    <option value="">Todas</option>
                                    {PERIODICIDADE_OPTIONS.map((item) => (
                                        <option key={item} value={item}>
                                        {item}
                                        </option>
                                    ))}
                                  </select>
                              </div>
                          </div>
                          <div className="flex flex-col w-full">
                              <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Status Renovação</label>
                              <select
                                  value={filtros.status_renovacao}
                                  onChange={(e) => handleFiltroChange('status_renovacao', e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              >
                                  <option value="">Todos</option>
                                  {STATUS_RENOVACAO_OPTIONS.map((item) => (
                                  <option key={item.value} value={item.value}>
                                      {item.label}
                                  </option>
                                  ))}
                              </select>
                          </div>
                      </div>
                  )}
              </div>
              <div className="border border-slate-100 bg-slate-50/50 p-3 rounded-lg">
                  <div
                      onClick={() => toggleGrupo('crm')}
                      className="flex justify-between items-center cursor-pointer select-none"
                  >
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">4. RETORNO CRM & INTERAÇÕES</span>
                      <span className="text-xs text-slate-400">{gruposExpandidos.crm ? '▲' : '▼'}</span>
                  </div>
                  {gruposExpandidos.crm && (
                      <div className="grid grid-cols-4 gap-2 mt-4">
                          <div className="flex flex-col">
                              <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Retorno (De)</label>
                              <input
                                  type="date"
                                  value={filtros.data_retorno_inicio || ''}
                                  onChange={(e) => handleFiltroChange('data_retorno_inicio', e.target.validity.badInput ? 'DATA_INVALIDA' : e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              />
                          </div>
                          <div className="flex flex-col">
                              <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Retorno (Até)</label>
                              <input
                                  type="date"
                                  value={filtros.data_retorno_fim || ''}
                                  onChange={(e) => handleFiltroChange('data_retorno_fim', e.target.validity.badInput ? 'DATA_INVALIDA' : e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              />
                          </div>
                          <div className="flex flex-col">
                              <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Retorno Sinistro (De)</label>
                              <input
                                  type="date"
                                  value={filtros.data_retorno_sinistro_inicio || ''}
                                  onChange={(e) => handleFiltroChange('data_retorno_sinistro_inicio', e.target.validity.badInput ? 'DATA_INVALIDA' : e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              />
                          </div>
                          <div className="flex flex-col">
                              <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Retorno Sinistro (Até)</label>
                              <input
                                  type="date"
                                  value={filtros.data_retorno_sinistro_fim || ''}
                                  onChange={(e) => handleFiltroChange('data_retorno_sinistro_fim', e.target.validity.badInput ? 'DATA_INVALIDA' : e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              />
                          </div>
                          <div className="flex flex-col">
                              <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Tipo de Ação</label>
                              <select value={filtros.tipo_acao || ''} onChange={(e) => handleFiltroChange('tipo_acao', e.target.value)} className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                  <option value="">Todas</option>
                                  <option value="ligacao">Ligação</option>
                                  <option value="whatsapp">WhatsApp</option>
                                  <option value="email">E-mail</option>
                                  <option value="visita">Visita Presencial</option>
                                  <option value="email_marketing">E-mail Marketing</option>
                                  <option value="sms">SMS</option>
                                  <option value="entrega_folders">Folders/Panfletos</option>
                                  <option value="outros">Outros</option>
                              </select>
                          </div>
                          <div className="flex flex-col">
                              <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Próxima Ação</label>
                              <select value={filtros.proxima_acao_interacao || ''} onChange={(e) => handleFiltroChange('proxima_acao_interacao', e.target.value)} className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                  <option value="">Todas</option>
                                  <option value="ligacao">📞 Ligar</option>
                                  <option value="whatsapp">💬 WhatsApp</option>
                                  <option value="email">📧 E-mail</option>
                                  <option value="visita">🏢 Visitar</option>
                                  <option value="email_marketing">📬 E-mail Mkt</option>
                                  <option value="sms">📱 SMS</option>
                                  <option value="entrega_folders">📄 Entregar Folders</option>
                                  <option value="outros">📌 Outros</option>
                              </select>
                          </div>
                          <div className="flex flex-col">
                              <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Fase Atendimento</label>
                              <select value={filtros.fase_atendimento || ''} onChange={(e) => handleFiltroChange('fase_atendimento', e.target.value)} className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                  <option value="">Todas</option>
                                  <option value="CLIENTE">Cliente</option>
                                  <option value="LEAD">Lead</option>
                                  <option value="NEGOCIACAO">Negociação</option>
                                  <option value="PERDIDO">Perdido</option>
                                  <option value="QUALIFICADO">Qualificado</option>
                              </select>
                          </div>
                          <div className="flex flex-col">
                              <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Temperatura</label>
                              <select value={filtros.temperatura || ''} onChange={(e) => handleFiltroChange('temperatura', e.target.value)} className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                  <option value="">Todas</option>
                                  <option value="frio">Frio</option>
                                  <option value="morno">Morno</option>
                                  <option value="quente">Quente</option>
                              </select>
                          </div>
                          <div className="flex flex-col">
                              <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Status Kanban</label>
                              <select value={filtros.status_kanban || ''} onChange={(e) => handleFiltroChange('status_kanban', e.target.value)} className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                  <option value="">Todos</option>
                                  <option value="novo">Novo</option>
                                  <option value="lead">Lead</option>
                                  <option value="vendido">Vendido</option>
                                  <option value="perdido">Perdido</option>
                              </select>
                          </div>
                          <div className="flex flex-col">
                              <label className="text-[10px] text-slate-500 font-semibold mb-0.5">Fase Kanban</label>
                              <select value={filtros.fase_kanban || ''} onChange={(e) => handleFiltroChange('fase_kanban', e.target.value)} className="w-full px-2 py-1.5 rounded-md border border-slate-300 text-xs outline-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                  <option value="">Todas</option>
                                  <option value="novo">Novo</option>
                                  <option value="nao_contatado">Não Contatado</option>
                                  <option value="contato_realizado">Contato Realizado</option>
                                  <option value="negociacao_lead">Negociação (Lead)</option>
                                  <option value="pos_vendas">Pós-Vendas</option>
                                  <option value="renovacao">Renovação</option>
                                  <option value="negociacao_cliente">Negociação (Cliente)</option>
                                  <option value="recuperacao">Recuperação</option>
                                  <option value="contato_realizado_perdido">Contato Realizado (Perdido)</option>
                                  <option value="negociacao_perdido">Negociação (Perdido)</option>
                              </select>
                          </div>
                      </div>
                  )}
              </div>
          </div>
        )}
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-500">
            <Loader2 className="animate-spin mx-auto mb-3 text-blue-600" size={32} />
            <p className="m-0 text-sm">Carregando dados dos clientes...</p>
          </div>
        ) : clientes.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <p className="m-0 text-sm font-medium">Nenhum cliente encontrado com os filtros selecionados.</p>
          </div>
        ) : (
          <>
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="p-3.5 w-12">Tipo</th>
                  <th className="p-3.5">Nome / Razão Social & Fantasia</th>
                  <th className="p-3.5">CPF / CNPJ</th>
                  <th className="p-3.5">
                    {filtros.tipo_cliente === 'PF' ? 'Tipo de Contato' : 'Sócios (PJ)'}
                  </th>
                  <th className="p-3.5">Localização</th>
                  <th className="p-3.5">Produtos (Vendidos)</th>
                  <th className="p-3.5">Retorno & Próx. Ação</th>
                  <th className="p-3.5">Responsável</th>
                  <th className="p-3.5 text-center w-28">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => {
                  const listaSocios = cliente.socios_texto ? cliente.socios_texto.split(',').map(s => s.trim()) : [];
                  const sociosExibidos = listaSocios.slice(0, 2);
                  const temMaisSocios = listaSocios.length > 2;
                  const isExpandido = sociosExpandidos[cliente.id];
                  return (
                    <tr key={cliente.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="p-3.5">
                        {cliente.tipo_cliente === 'PJ' ? (
                          <span title="Pessoa Jurídica" className="bg-indigo-100 text-indigo-700 p-1.5 rounded-lg inline-flex">
                            <Building2 size={16} />
                          </span>
                        ) : (
                          <span title="Pessoa Física" className="bg-amber-100 text-amber-700 p-1.5 rounded-lg inline-flex">
                            <User size={16} />
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">{cliente.nome_razao_social}</div>
                        {cliente.nome_fantasia && (
                          <div className="text-xs text-slate-500">Fantasia: {cliente.nome_fantasia}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">
                        {cliente.cpf_cnpj || '-'}
                      </td>
                      <td className="p-3.5">
                        {cliente.tipo_cliente === 'PJ' ? (
                          listaSocios.length > 0 ? (
                            <div>
                              <div className="text-xs text-slate-700">
                                {(isExpandido ? listaSocios : sociosExibidos).join(', ')}
                              </div>
                              {temMaisSocios && (
                                <button
                                  onClick={() => toggleExpandirSocios(cliente.id)}
                                  className="bg-transparent text-blue-600 text-[11px] font-semibold cursor-pointer p-0 mt-0.5 flex items-center gap-0.5 hover:underline"
                                >
                                  {isExpandido ? 'Ver menos' : `+${listaSocios.length - 2} sócio(s)`}
                                  {isExpandido ? <ChevronUp size={12} /> : <ChevronRight size={12} />}
                                </button>
                              )}
                            </div>
                          ) : <span className="text-slate-300">-</span>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Pessoa Física</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {cliente.municipio ? `${cliente.municipio} / ${cliente.uf}` : '-'}
                      </td>
                      <td className="p-3.5">
                        {renderIconesProdutos(cliente.produtos)}
                      </td>
                      <td className="p-3.5">
                        <div className="text-xs font-semibold text-blue-600">
                          {cliente.data_retorno || 'Sem data'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {cliente.proxima_acao}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">
                        {cliente.responsavel_nome}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex gap-1.5 justify-center">
                          <button
                              title="Visualizar / Editar"
                              className="border border-slate-200 bg-white p-1.5 rounded-md cursor-pointer flex items-center justify-center hover:bg-slate-100 text-slate-600 transition-colors"
                              onClick={() => handleEditarCliente(cliente)}
                          >
                              <Eye size={15} />
                          </button>
                          <button
                              title="Nova Ação Comercial"
                              className="border border-slate-200 bg-white p-1.5 rounded-md cursor-pointer flex items-center justify-center hover:bg-slate-100 text-blue-600 transition-colors"
                              onClick={() => handleNovaAcao(cliente)}
                          >
                              <Calendar size={15} />
                          </button>
                          <button
                              title="Excluir"
                              className="border border-slate-200 bg-white p-1.5 rounded-md cursor-pointer flex items-center justify-center hover:bg-slate-100 text-red-500 transition-colors"
                              onClick={() => handleExcluirCliente(cliente.id)}
                          >
                              <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-3.5 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs text-slate-500">
                Exibindo <b>{clientes.length}</b> de <b>{totalRegistros}</b> registros
              </span>
              <div className="flex gap-2 items-center">
                <button
                  disabled={paginaAtual === 1}
                  onClick={() => setPaginaAtual(p => p - 1)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 bg-white rounded-md text-xs font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-slate-50 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} /> Anterior
                </button>
                <span className="text-xs font-semibold text-slate-700 px-2">
                  Página {paginaAtual} de {totalPaginas || 1}
                </span>
                <button
                  disabled={paginaAtual >= totalPaginas}
                  onClick={() => setPaginaAtual(p => p + 1)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 bg-white rounded-md text-xs font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-slate-50 transition-colors cursor-pointer"
                >
                  Próxima <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    {modalCadastroAberto && (
    <ModalCadastroCliente
        isOpen={modalCadastroAberto}
        onClose={() => {
        setModalCadastroAberto(false);
        setClienteSelecionado(null);
        }}
        cliente={clienteSelecionado}
        handleSubmit={handleSalvarCliente}
    />
    )}
      {modalAcaoAberto && clienteSelecionado && (
        <ModalAcoesComerciais
            isOpen={modalAcaoAberto}
            lead={clienteSelecionado}
            clienteContexto={clienteSelecionado}
            onClose={() => {
            setModalAcaoAberto(false);
            setClienteSelecionado(null);
            }}
            onSave={async (dadosAcao) => {
            try {
                await salvarAcaoComercialV2(dadosAcao);
                await carregarClientes();
                setModalAcaoAberto(false);
                setClienteSelecionado(null);
            } catch (err) {
                console.error('Erro ao salvar no ClientesListaV2:', err);
                toast.error("Ocorreu um erro ao registrar a interação. Verifique os dados e tente novamente.");
            }
            }}
        />
        )}
    </div>
  );
};
export default ClientesListaV2;
