import { useState, useEffect } from 'react';
import {
  Building2,
  User,
  Zap,
  FileText,
  Search,
  AlertCircle,
  Plus,
  Trash2,
  Phone,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  X,
  ShieldCheck,
  Loader2,
  Star,
  UserCheck
} from 'lucide-react';

import {
  maskCEP,
  maskCPF,
  maskCNPJ,
  maskPhone
} from '../../utils/masks';

import { validarCPF } from '../../utils/validarCPF';
import { buscarCEP } from '../../services/brasilApi';

export const ModalCadastroCliente = ({
  onClose,
  handleSubmit,
  saving,
  isLoading,
  usuarioLogado,
  corretoresDisponiveis = [],
  cliente
}: any) => {

  // =========================================================
  // CONFIGURAÇÕES GERAIS
  // =========================================================

  const [tipoCliente, setTipoCliente] = useState<'PF' | 'PJ'>('PJ');
  const [modoCadastro, setModoCadastro] = useState<'RAPIDO' | 'COMPLETO'>('RAPIDO');
  const [donoId, setDonoId] = useState('');

  // =========================================================
  // CONTROLES VISUAIS (ACCORDIONS)
  // =========================================================

  const [openComplementarPJ, setOpenComplementarPJ] = useState(false);
  const [openEndereco, setOpenEndereco] = useState(false);
  const [openSocios, setOpenSocios] = useState(false);

  // =========================================================
  // STATUS DA CONSULTA PJ E ERROS
  // =========================================================

  const [statusConsultaCNPJ, setStatusConsultaCNPJ] = useState<'idle' | 'loading' | 'sucesso' | 'erro'>('idle');
  const [mensagemErro, setMensagemErro] = useState('');

  // =========================================================
  // IDENTIFICAÇÃO PRINCIPAL
  // =========================================================

  const [cpfCnpj, setCpfCnpj] = useState('');
  const [nomeRazaoSocial, setNomeRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [erroCPF, setErroCPF] = useState(false);

  // =========================================================
  // DADOS RECEITA PJ (dados_pj)
  // =========================================================

  const [dadosReceita, setDadosReceita] = useState({
    data_abertura: '',
    porte: '',
    capital_social: '',
    opcao_pelo_mei: false,
    opcao_pelo_simples: false,
    natureza_juridica: '',
    matriz_filial: '',
    situacao_cadastral: '',
    cnae_principal: '',
  });

  // =========================================================
  // ENDEREÇO PRINCIPAL / EMPRESA
  // =========================================================

  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [uf, setUf] = useState('');
  const [complemento, setComplemento] = useState('');
  const [loadingCEP, setLoadingCEP] = useState(false);

  // =========================================================
  // SÓCIOS E CONTATOS (PFs vinculadas com Docs/Endereço)
  // =========================================================

  const [socios, setSocios] = useState<any[]>([]);
  const [contatos, setContatos] = useState<any[]>([
    {
      id: crypto.randomUUID(),
      nome: '',
      cargo_parentesco: '',
      telefone: '',
      email: '',
      cpf: '',
      rg: '',
      rg_numero: '',
      rg_orgao: '',
      data_emissao_rg: '',
      data_emissao_doc: '',
      data_nascimento: '',
      sexo: '',
      estado_civil: '',
      naturalidade: '',
      ocupacao: '',
      principal: true,
      usar_endereco_principal: true,
      mostrarDocs: false,
      mostrarEndereco: false,
      endereco: {
        cep: '',
        logradouro: '',
        numero: '',
        bairro: '',
        municipio: '',
        uf: '',
        complemento: ''
      }
    }
  ]);

  // --- ESTADOS DADOS PESSOAIS PF ---
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [naturalidade, setNaturalidade] = useState('');
  const [ocupacao, setOcupacao] = useState('');

  // --- ESTADOS CONTROLE DE INTERFACE / SANFONA ---
  const [openDocsPF, setOpenDocsPF] = useState(true);

  // --- ESTADOS DOCUMENTOS RG ---
  const [rgNumero, setRgNumero] = useState('');
  const [rgOrgao, setRgOrgao] = useState('');
  const [dataEmissaoRG, setDataEmissaoRG] = useState('');

  // Define o dono inicial baseado no usuário logado
  useEffect(() => {
    if (usuarioLogado?.id) {
      setDonoId(usuarioLogado.id);
    }
  }, [usuarioLogado]);

  // =========================================================
  // MODO EDIÇÃO: PREENCHER DADOS SE O CLIENTE EXISTIR
  // =========================================================
  useEffect(() => {
    if (cliente) {
      // 1. Identificação Básica
      setTipoCliente(cliente.tipo_cliente || 'PJ');
      setCpfCnpj(cliente.cpf_cnpj || '');
      setNomeRazaoSocial(cliente.nome_razao_social || cliente.razao_social || cliente.nome || '');
      setNomeFantasia(cliente.nome_fantasia || '');
      
      if (cliente.corretor_id || cliente.dono_id) {
        setDonoId(cliente.corretor_id || cliente.dono_id);
      }

      // 2. Endereço Principal
      setCep(cliente.cep || '');
      setLogradouro(cliente.logradouro || '');
      setNumero(cliente.numero || '');
      setBairro(cliente.bairro || '');
      setMunicipio(cliente.municipio || '');
      setUf(cliente.uf || '');
      setComplemento(cliente.complemento || '');

      // 3. Modos Visuais
      setModoCadastro('COMPLETO');
      if (cliente.tipo_cliente === 'PJ') {
        setOpenComplementarPJ(true);
      } else {
        setOpenEndereco(true);
      }

      // 4. Parser seguro de campos JSON
      const parseSeguro = (valor: any, fallback: any) => {
        if (!valor) return fallback;
        if (typeof valor === 'string') {
          try { return JSON.parse(valor); } catch (e) { return fallback; }
        }
        return valor;
      };

      // 5. Contatos e Sócios
      const contatosBanco = parseSeguro(cliente.contatos, []);
      if (contatosBanco.length > 0) setContatos(contatosBanco);

      const sociosBanco = parseSeguro(cliente.socios, []);
      if (sociosBanco.length > 0) setSocios(sociosBanco);

      // 6. Dados PJ
      if (cliente.tipo_cliente === 'PJ') {
        const complPJ = parseSeguro(cliente.dados_pj || cliente.dados_complementares_pj, {});
        setDadosReceita({
          data_abertura: complPJ.data_abertura || '',
          porte: complPJ.porte || '',
          capital_social: complPJ.capital_social || '',
          opcao_pelo_mei: Boolean(complPJ.opcao_pelo_mei),
          opcao_pelo_simples: Boolean(complPJ.opcao_pelo_simples),
          natureza_juridica: complPJ.natureza_juridica || '',
          matriz_filial: complPJ.matriz_filial || '',
          situacao_cadastral: complPJ.situacao_cadastral || cliente.situacao_cadastral || '',
          cnae_principal: complPJ.cnae_principal || cliente.cnae_principal || '',
        });
      }
    }
  }, [cliente]);

  // =========================================================
  // CONTROLE DOS ACCORDIONS POR TIPO E MODO
  // =========================================================

  useEffect(() => {
    if (tipoCliente === 'PJ') {
      setOpenComplementarPJ(true);
      setOpenEndereco(false);
      setOpenSocios(false);
      return;
    }

    // PF
    if (modoCadastro === 'COMPLETO') {
      setOpenEndereco(true);
    } else {
      setOpenEndereco(false);
    }
  }, [modoCadastro, tipoCliente]);

  // =========================================================
  // LIMPAR DADOS AO TROCAR PF/PJ
  // =========================================================

  const trocarTipoCliente = (novoTipo: 'PF' | 'PJ') => {
    setTipoCliente(novoTipo);
    setCpfCnpj('');
    setNomeRazaoSocial('');
    setNomeFantasia('');
    setErroCPF(false);
    setMensagemErro('');
    setStatusConsultaCNPJ('idle');

    setDadosReceita({
      data_abertura: '', porte: '', capital_social: '', opcao_pelo_mei: false,
      opcao_pelo_simples: false, natureza_juridica: '', matriz_filial: '',
      situacao_cadastral: '', cnae_principal: '',
    });

    setCep(''); setLogradouro(''); setNumero(''); setBairro('');
    setMunicipio(''); setUf(''); setComplemento('');

    setSocios([]);
    setContatos([
      {
        id: crypto.randomUUID(),
        nome: '',
        cargo_parentesco: '',
        telefone: '',
        email: '',
        cpf: '',
        rg: '',
        rg_numero: '',
        rg_orgao: '',
        data_emissao_rg: '',
        data_emissao_doc: '',
        data_nascimento: '',
        sexo: '',
        estado_civil: '',
        naturalidade: '',
        ocupacao: '',
        principal: true,
        usar_endereco_principal: true,
        mostrarDocs: false,
        mostrarEndereco: false,
        endereco: {
          cep: '',
          logradouro: '',
          numero: '',
          bairro: '',
          municipio: '',
          uf: '',
          complemento: ''
        }
      }
    ]);
  };

  // =========================================================
  // MUDANÇA DE NOME INTELIGENTE
  // =========================================================

  const handleNomeRazaoSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novoNome = e.target.value;
    setNomeRazaoSocial(novoNome);

    if (tipoCliente === 'PF' && contatos.length === 1) {
      setContatos((prev) => {
        const novosContatos = [...prev];
        if (novosContatos[0].nome === nomeRazaoSocial || novosContatos[0].nome === '') {
          novosContatos[0].nome = novoNome;
        }
        return novosContatos;
      });
    }
  };

  // =========================================================
  // CONSULTA CNPJ
  // =========================================================

  const handleConsultarCNPJ = async () => {
    const cnpjLimpo = cpfCnpj.replace(/\D/g, '');
    setMensagemErro('');

    if (cnpjLimpo.length !== 14) {
      setMensagemErro('Informe um CNPJ válido com 14 dígitos.');
      setStatusConsultaCNPJ('erro');
      return;
    }

    setStatusConsultaCNPJ('loading');

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (!response.ok) throw new Error('Erro ao consultar CNPJ na API');
      
      const data = await response.json();
      if (!data || !data.razao_social) throw new Error('Dados insuficientes retornados pela API');

      setNomeRazaoSocial(data.razao_social || '');
      setNomeFantasia(data.nome_fantasia || '');

      setDadosReceita({
        data_abertura: data.data_inicio_atividade || '',
        porte: data.porte || '',
        capital_social: data.capital_social
          ? `R$ ${Number(data.capital_social).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          : '',
        opcao_pelo_mei: Boolean(data.opcao_pelo_mei),
        opcao_pelo_simples: Boolean(data.opcao_pelo_simples),
        natureza_juridica: data.natureza_juridica || '',
        matriz_filial: data.descricao_matriz_filial || '',
        situacao_cadastral: data.descricao_situacao_cadastral || '',
        cnae_principal: data.cnae_fiscal ? `${data.cnae_fiscal} - ${data.cnae_fiscal_descricao || ''}` : '',
      });

      setCep(data.cep ? maskCEP(data.cep) : '');
      setLogradouro(data.logradouro || '');
      setNumero(data.numero || '');
      setBairro(data.bairro || '');
      setMunicipio(data.municipio || '');
      setUf(data.uf || '');
      setComplemento(data.complemento || '');

      const qsaList = Array.isArray(data.qsa) ? data.qsa : [];
      const sociosMapeados = qsaList.map((socio: any) => ({
        nome: socio.nome_socio || socio.nome_socio_razao_social || socio.nome || socio.nome_empresarial || '',
        cpf_cnpj: socio.cnpj_cpf_do_socio || socio.cpf_cnpj || '',
        qualificacao: socio.qualificacao_socio || socio.qualificacao || socio.descricao_qualificacao_socio || 'Sócio',
        faixa_etaria: socio.faixa_etaria || 'Não informada',
      }));

      setSocios(sociosMapeados);

      if (sociosMapeados.length > 0) {
        setContatos(
          sociosMapeados.map((socio: any, idx: number) => ({
            id: crypto.randomUUID(),
            nome: socio.nome,
            cargo_parentesco: socio.qualificacao || 'Sócio',
            telefone: '',
            email: '',
            cpf: socio.cpf_cnpj || '',
            rg: '',
            rg_numero: '',
            rg_orgao: '',
            data_emissao_rg: '',
            data_emissao_doc: '',
            data_nascimento: '',
            sexo: '',
            estado_civil: '',
            naturalidade: '',
            ocupacao: '',
            principal: idx === 0,
            usar_endereco_principal: true,
            mostrarDocs: false,
            mostrarEndereco: false,
            endereco: {
              cep: data.cep ? maskCEP(data.cep) : '',
              logradouro: data.logradouro || '',
              numero: data.numero || '',
              bairro: data.bairro || '',
              municipio: data.municipio || '',
              uf: data.uf || '',
              complemento: data.complemento || ''
            }
          }))
        );
      } else {
        setContatos([{
          id: crypto.randomUUID(),
          nome: '',
          cargo_parentesco: '',
          telefone: '',
          email: '',
          cpf: '',
          rg: '',
          rg_numero: '',
          rg_orgao: '',
          data_emissao_rg: '',
          data_emissao_doc: '',
          data_nascimento: '',
          sexo: '',
          estado_civil: '',
          naturalidade: '',
          ocupacao: '',
          principal: true,
          usar_endereco_principal: true,
          mostrarDocs: false,
          mostrarEndereco: false,
          endereco: { cep: '', logradouro: '', numero: '', bairro: '', municipio: '', uf: '', complemento: '' }
        }]);
      }

      setStatusConsultaCNPJ('sucesso');
      setOpenComplementarPJ(true);
      setOpenEndereco(false);
      setOpenSocios(false);

    } catch (error) {
      console.error('Erro na consulta do CNPJ:', error);
      setStatusConsultaCNPJ('erro');
      setMensagemErro('Não foi possível consultar o CNPJ automaticamente. Você pode preencher os dados manualmente para continuar.');
      setOpenComplementarPJ(true);
      setOpenEndereco(true);
      setOpenSocios(true);
    }
  };

  // =========================================================
  // HANDLERS (Contatos, CPF, CNPJ, CEP)
  // =========================================================

  const handleAddContato = () => setContatos((prev) => [
    ...prev,
    {
      id: crypto.randomUUID(),
      nome: '',
      cargo_parentesco: '',
      telefone: '',
      email: '',
      cpf: '',
      rg: '',
      rg_numero: '',
      rg_orgao: '',
      data_emissao_rg: '',
      data_emissao_doc: '',
      data_nascimento: '',
      sexo: '',
      estado_civil: '',
      naturalidade: '',
      ocupacao: '',
      principal: false,
      usar_endereco_principal: true,
      mostrarDocs: false,
      mostrarEndereco: false,
      endereco: { cep: '', logradouro: '', numero: '', bairro: '', municipio: '', uf: '', complemento: '' }
    }
  ]);
  
  const handleRemoveContato = (idOrIndex: string) => {
    if (contatos.length <= 1) return;
    
    setContatos((prev) =>
      prev.filter((c, index) => {
        const currentKey = c.id || String(index);
        return currentKey !== idOrIndex;
      })
    );
  };

  const handleUpdateContato = (id: string, field: string, value: any) => {
    setContatos((prev) =>
      prev.map((c, index) => {
        const matches = c.id ? c.id === id : String(index) === String(id);
        if (!matches) return c;

        // Suporte para atualização de campos aninhados (ex: 'endereco.cep')
        if (field.includes('.')) {
          const [parent, child] = field.split('.');
          return {
            ...c,
            [parent]: {
              ...c[parent],
              [child]: value
            }
          };
        }

        return { ...c, [field]: value };
      })
    );

    setMensagemErro('');
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const cepFormatado = maskCEP(e.target.value);
    setCep(cepFormatado);
    const cepLimpo = cepFormatado.replace(/\D/g, '');

    if (cepLimpo.length === 8) {
      try {
        setLoadingCEP(true);
        const data = await buscarCEP(cepLimpo);
        setLogradouro(data.street || data.logradouro || '');
        setBairro(data.neighborhood || data.bairro || '');
        setMunicipio(data.city || data.localidade || '');
        setUf(data.state || data.uf || '');
        setOpenEndereco(true);
      } catch (err) {
        console.error('Erro ao buscar CEP:', err);
      } finally {
        setLoadingCEP(false);
      }
    }
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = maskCPF(e.target.value);
    setCpfCnpj(valorFormatado);
    const apenasNumeros = valorFormatado.replace(/\D/g, '');
    setErroCPF(apenasNumeros.length === 11 ? !validarCPF(apenasNumeros) : false);
    setMensagemErro('');

    // Atualiza o CPF do contato principal no caso de Pessoa Física
    if (tipoCliente === 'PF' && contatos.length > 0) {
      handleUpdateContato(contatos[0].id, 'cpf', valorFormatado);
    }
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpfCnpj(maskCNPJ(e.target.value));
    setStatusConsultaCNPJ('idle');
    setMensagemErro('');
  };

  // =========================================================
  // VALIDAÇÕES E SUBMIT
  // =========================================================

  const validarCadastro = (): string[] => {
    const erros: string[] = [];

    if (!nomeRazaoSocial.trim()) {
      erros.push(tipoCliente === 'PJ' ? 'Razão Social é obrigatória.' : 'Nome completo é obrigatório.');
    }

    if (tipoCliente === 'PJ') {
      const cnpjLimpo = cpfCnpj.replace(/\D/g, '');
      if (cnpjLimpo.length !== 14) erros.push('Informe um CNPJ válido com 14 dígitos.');
      if (statusConsultaCNPJ === 'erro' && !nomeRazaoSocial.trim()) erros.push('Informe a Razão Social para continuar.');
    }

    if (tipoCliente === 'PF') {
      const cpfLimpo = cpfCnpj.replace(/\D/g, '');
      if (modoCadastro === 'COMPLETO' && cpfLimpo.length !== 11) erros.push('CPF é obrigatório no Cadastro Completo.');
      if (cpfLimpo.length > 0 && cpfLimpo.length !== 11) erros.push('O CPF informado está incompleto.');
      if (erroCPF) erros.push('O CPF informado é inválido.');
    }

    const temContato = contatos.some(c => (c.telefone?.replace(/\D/g, '') || '').length >= 10 || (c.email?.trim() || '').length > 0);
    if (!temContato) erros.push('Informe pelo menos um telefone/WhatsApp ou e-mail nos contatos.');

    return erros;
  };

  // =========================================================
  // SUBMIT E AÇÕES COMERCIAIS
  // =========================================================

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || isLoading) return;

    setMensagemErro('');
    const erros = validarCadastro();
    if (erros.length > 0) {
      setMensagemErro(erros[0]);
      return;
    }

    // Pega a corretora do usuário logado
    const corretoraId = usuarioLogado?.corretora_id || usuarioLogado?.id;
    
    // CORREÇÃO AQUI: Se não selecionou um dono/corretor específico, assume o usuário logado / corretora
    const donoFinal = donoId || usuarioLogado?.id || corretoraId;

    const payloadCliente = {
      corretora_id: corretoraId,
      tipo_cliente: tipoCliente,
      modoCadastro,
      cpf_cnpj: cpfCnpj,
      nome_razao_social: nomeRazaoSocial,
      nome_fantasia: nomeFantasia,
      dados_pj: tipoCliente === 'PJ' ? dadosReceita : null,
      dono_id: donoFinal,
      corretor_id: donoFinal,
      cep, logradouro, numero, bairro, municipio, uf, complemento,
      socios,
      contatos,
    };

    handleSubmit(payloadCliente);
  };

  const handleAbrirAcaoComercial = () => {
    const erros = validarCadastro();
    if (erros.length > 0) {
      setMensagemErro(erros[0]);
      return;
    }

    // Pega a corretora do usuário logado
    const corretoraId = usuarioLogado?.corretora_id || usuarioLogado?.id;

    handleSubmit(
      {
        corretora_id: corretoraId,
        tipo_cliente: tipoCliente,
        modoCadastro,
        cpf_cnpj: cpfCnpj,
        nome_razao_social: nomeRazaoSocial,
        nome_fantasia: nomeFantasia || '',
        dono_id: donoId,
        corretor_id: donoId,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        municipio,
        uf,
        contatos,
        socios: socios || [],
        dados_pj: tipoCliente === 'PJ' ? dadosReceita : null,
      },
      true
    );
  };

  return (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">

        {/* HEADER */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              {tipoCliente === 'PJ' ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold">Novo Cliente / Prospect</h2>
              <p className="text-xs text-slate-400">Cadastre o cliente e inicie seu relacionamento comercial</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTROLES DE TOPO */}
        <div className="px-6 py-3 bg-slate-50 border-b border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* TOGGLE PF/PJ */}
            <div className="flex bg-gray-200 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => trocarTipoCliente('PF')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                  tipoCliente === 'PF' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User className="w-4 h-4" /> Pessoa Física
              </button>
              <button
                type="button"
                onClick={() => trocarTipoCliente('PJ')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                  tipoCliente === 'PJ' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Building2 className="w-4 h-4" /> Pessoa Jurídica
              </button>
            </div>

            {/* TOGGLE MODO CADASTRO */}
            {tipoCliente === 'PF' ? (
              <div className="flex bg-gray-200 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setModoCadastro('RAPIDO')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                    modoCadastro === 'RAPIDO' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Zap className="w-4 h-4" /> Cadastro Rápido
                </button>
                <button
                  type="button"
                  onClick={() => setModoCadastro('COMPLETO')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                    modoCadastro === 'COMPLETO' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-4 h-4" /> Cadastro Completo
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> Cadastro PJ via CNPJ
              </div>
            )}
          </div>
          
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px]">
            <span className="font-semibold text-slate-600">Preenchimento:</span>
            <span className="text-red-600 font-semibold">🔴 Obrigatório</span>
            <span className="text-gray-500 font-semibold">⚪ Opcional</span>
            <span className="text-blue-600 font-semibold">🔵 Automático</span>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ================================================= */}
          {/* RESPONSÁVEL (DONO DO CADASTRO)                    */}
          {/* ================================================= */}
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-indigo-900">Responsável pelo Cliente</h3>
                <p className="text-xs text-indigo-700 mt-0.5">Define quem terá a posse deste cadastro no sistema.</p>
              </div>
            </div>

            <div className="min-w-[250px]">
              {usuarioLogado?.tipo_usuario === 'CORRETORA' ? (
                <select
                  value={donoId}
                  onChange={(e) => setDonoId(e.target.value)}
                  className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-indigo-900 font-semibold shadow-sm"
                >
                  <option value={usuarioLogado.id}>🏢 Atendimento Direto (Nossa Corretora)</option>
                  {corretoresDisponiveis.map((corretor: any) => (
                    <option key={corretor.id} value={corretor.id}>
                      👤 {corretor.nome}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-4 py-2 bg-white border border-indigo-200 rounded-lg shadow-sm">
                  <span className="text-xs text-indigo-500 block">Atribuído a:</span>
                  <span className="text-sm font-bold text-indigo-900">{usuarioLogado?.nome || 'Você'}</span>
                </div>
              )}
            </div>
          </div>

          {/* ================================================= */}
          {/* PESSOA JURÍDICA                                   */}
          {/* ================================================= */}
          {tipoCliente === 'PJ' && (
            <>
              {/* BUSCA CNPJ */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" /> Identificação da Empresa
                  </h3>
                  {statusConsultaCNPJ === 'sucesso' && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Consultou CNPJ com sucesso
                    </span>
                  )}
                </div>

                <div className="max-w-md">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    CNPJ <span className="text-red-600 ml-1">🔴</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cpfCnpj}
                      onChange={handleCnpjChange}
                      placeholder="00.000.000/0001-00"
                      maxLength={18}
                      className="w-full px-4 py-2.5 pr-12 border rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 shadow-sm bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleConsultarCNPJ}
                      disabled={statusConsultaCNPJ === 'loading' || cpfCnpj.replace(/\D/g, '').length !== 14}
                      className="absolute right-1 top-1 bottom-1 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                      title="Buscar dados do CNPJ"
                    >
                      {statusConsultaCNPJ === 'loading' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Informe o CNPJ e clique na lupa para buscar os dados automaticamente.
                  </p>
                </div>

                {statusConsultaCNPJ === 'erro' && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg max-w-md">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-800">Consulta indisponível</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        {mensagemErro || 'Preencha os dados abaixo manualmente.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* DADOS CADASTRAIS PJ */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setOpenComplementarPJ(!openComplementarPJ)}
                  className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 flex items-center justify-between text-xs font-bold text-slate-700 transition"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-slate-500" />
                    Dados Cadastrais da Empresa
                    {statusConsultaCNPJ === 'sucesso' && <span className="text-blue-600">🔵</span>}
                  </span>
                  {openComplementarPJ ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {openComplementarPJ && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50/50">
                    <div className="md:col-span-2 mb-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Razão Social <span className="text-red-600">🔴</span>
                        {statusConsultaCNPJ === 'sucesso' && <span className="text-blue-600 ml-1">🔵</span>}
                      </label>
                      <input
                        type="text"
                        required
                        readOnly={statusConsultaCNPJ === 'sucesso'}
                        value={nomeRazaoSocial}
                        onChange={(e) => setNomeRazaoSocial(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                          statusConsultaCNPJ === 'sucesso' ? 'bg-gray-100 text-gray-700' : 'bg-white'
                        }`}
                      />
                    </div>
                    
                    <div className="md:col-span-1 mb-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Nome Fantasia <span className="text-gray-400">⚪</span>
                        {statusConsultaCNPJ === 'sucesso' && <span className="text-blue-600 ml-1">🔵</span>}
                      </label>
                      <input
                        type="text"
                        readOnly={statusConsultaCNPJ === 'sucesso'}
                        value={nomeFantasia}
                        onChange={(e) => setNomeFantasia(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                          statusConsultaCNPJ === 'sucesso' ? 'bg-gray-100 text-gray-700' : 'bg-white'
                        }`}
                      />
                    </div>

                    {[
                      ['Data de Abertura', 'data_abertura'],
                      ['Porte', 'porte'],
                      ['Capital Social', 'capital_social'],
                      ['Opção pelo MEI', 'opcao_pelo_mei'],
                      ['Opção pelo Simples', 'opcao_pelo_simples'],
                      ['Situação Cadastral', 'situacao_cadastral'],
                      ['Matriz / Filial', 'matriz_filial'],
                      ['Natureza Jurídica', 'natureza_juridica'],
                      ['CNAE Principal', 'cnae_principal']
                    ].map(([label, key]) => (
                      <div key={key} className={key === 'natureza_juridica' ? 'md:col-span-2' : key === 'cnae_principal' ? 'md:col-span-3' : ''}>
                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                          {label}
                          {statusConsultaCNPJ === 'sucesso' && <span className="text-blue-600 ml-1">🔵</span>}
                        </label>
                        <input
                          type="text"
                          readOnly={statusConsultaCNPJ === 'sucesso'}
                          value={
                            key === 'opcao_pelo_mei' ? (dadosReceita.opcao_pelo_mei ? 'Sim' : 'Não')
                            : key === 'opcao_pelo_simples' ? (dadosReceita.opcao_pelo_simples ? 'Sim' : 'Não')
                            : (dadosReceita as any)[key] || ''
                          }
                          onChange={(e) => {
                            if (statusConsultaCNPJ === 'sucesso') return;
                            setDadosReceita((prev) => ({ ...prev, [key]: e.target.value }));
                          }}
                          className={`w-full px-2.5 py-1.5 border rounded-md text-xs outline-none ${
                            statusConsultaCNPJ === 'sucesso' ? 'bg-gray-100 text-gray-700' : 'bg-white focus:ring-2 focus:ring-blue-500'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ENDEREÇO EMPRESARIAL PJ */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setOpenEndereco(!openEndereco)}
                  className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 flex items-center justify-between text-xs font-bold text-slate-700 transition"
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    Endereço da Empresa
                    {statusConsultaCNPJ === 'sucesso' && <span className="text-blue-600">🔵</span>}
                  </span>
                  {openEndereco ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {openEndereco && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50/50">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1 flex items-center justify-between">
                        CEP
                        {loadingCEP && <span className="text-blue-600 text-[10px] animate-pulse">Buscando...</span>}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={cep}
                          onChange={handleCepChange}
                          placeholder="00000-00"
                          disabled={loadingCEP}
                          className="w-full px-2.5 py-1.5 pr-8 border rounded-md text-xs outline-none bg-white focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-gray-400"
                        />
                        {loadingCEP && (
                          <div className="absolute right-2 top-2">
                            <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">Logradouro</label>
                      <input
                        type="text"
                        value={logradouro}
                        onChange={(e) => setLogradouro(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-md text-xs outline-none bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">Número</label>
                      <input
                        type="text"
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-md text-xs outline-none bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">Bairro</label>
                      <input
                        type="text"
                        value={bairro}
                        onChange={(e) => setBairro(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-md text-xs outline-none bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">Município</label>
                      <input
                        type="text"
                        value={municipio}
                        onChange={(e) => setMunicipio(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-md text-xs outline-none bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">UF</label>
                      <input
                        type="text"
                        value={uf}
                        onChange={(e) => setUf(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-md text-xs outline-none bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">Complemento</label>
                      <input
                        type="text"
                        value={complemento}
                        onChange={(e) => setComplemento(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-md text-xs outline-none bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SÓCIOS E QUADRO SOCIETÁRIO (QSA) */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setOpenSocios(!openSocios)}
                  className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 flex items-center justify-between text-xs font-bold text-slate-700 transition"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500" />
                    Quadro Societário (QSA) ({socios.length})
                    {statusConsultaCNPJ === 'sucesso' && <span className="text-blue-600">🔵</span>}
                  </span>
                  {openSocios ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {openSocios && (
                  <div className="p-4 space-y-2 bg-slate-50/50">
                    {socios.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">Nenhum sócio mapeado para este CNPJ.</p>
                    ) : (
                      socios.map((socio, idx) => (
                        <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs grid grid-cols-1 md:grid-cols-3 gap-2 shadow-sm">
                          <div>
                            <span className="text-gray-400 block text-[10px]">Nome do Sócio</span>
                            <span className="font-semibold text-gray-800">{socio.nome || '-'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px]">Qualificação</span>
                            <span className="text-gray-700">{socio.qualificacao || '-'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px]">Faixa Etária / Documento</span>
                            <span className="text-gray-700">{socio.faixa_etaria || socio.cpf_cnpj || '-'}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ================================================= */}
          {/* PESSOA FÍSICA                                     */}
          {/* ================================================= */}
          {tipoCliente === 'PF' && (
            <>
              {/* DADOS BÁSICOS / IDENTIFICAÇÃO PF */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" /> Identificação do Cliente
                  </h3>
                  {erroCPF && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600">
                      <AlertCircle className="w-3.5 h-3.5" /> CPF Inválido
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={modoCadastro === 'RAPIDO' ? 'md:col-span-3' : 'md:col-span-2'}>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Nome Completo <span className="text-red-600 ml-1">🔴</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={nomeRazaoSocial}
                      onChange={handleNomeRazaoSocialChange}
                      placeholder="Nome completo do cliente"
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm"
                    />
                  </div>

                  {modoCadastro === 'COMPLETO' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Data de Nascimento <span className="text-gray-400 ml-1">⚪</span>
                        </label>
                        <input
                          type="date"
                          value={dataNascimento}
                          onChange={(e) => setDataNascimento(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Sexo <span className="text-gray-400 ml-1">⚪</span>
                        </label>
                        <select
                          value={sexo}
                          onChange={(e) => setSexo(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm"
                        >
                          <option value="">Selecione...</option>
                          <option value="M">Masculino</option>
                          <option value="F">Feminino</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Naturalidade <span className="text-gray-400 ml-1">⚪</span>
                        </label>
                        <input
                          type="text"
                          value={naturalidade}
                          onChange={(e) => setNaturalidade(e.target.value)}
                          placeholder="Cidade onde nasceu"
                          className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Ocupação / Profissão <span className="text-gray-400 ml-1">⚪</span>
                        </label>
                        <input
                          type="text"
                          value={ocupacao}
                          onChange={(e) => setOcupacao(e.target.value)}
                          placeholder="Ex: Engenheiro"
                          className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {modoCadastro === 'COMPLETO' && (
                <>
                  {/* DOCUMENTOS PF */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => setOpenDocsPF(!openDocsPF)}
                      className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 flex items-center justify-between text-xs font-bold text-slate-700 transition"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500" />
                        Documentos de Identificação
                      </span>
                      {openDocsPF ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {openDocsPF && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50/50">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                            CPF <span className="text-red-600 ml-1">🔴</span>
                          </label>
                          <input
                            type="text"
                            value={cpfCnpj}
                            onChange={handleCpfChange}
                            placeholder="000.000.000-00"
                            maxLength={14}
                            className={`w-full px-2.5 py-1.5 border rounded-md text-xs font-mono outline-none bg-white focus:ring-2 transition ${
                              erroCPF ? 'border-red-500 focus:ring-red-500 text-red-600' : 'focus:ring-blue-500'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Número do RG</label>
                          <input
                            type="text"
                            value={rgNumero}
                            onChange={(e) => setRgNumero(e.target.value)}
                            placeholder="Ex: 00.000.000-0"
                            className="w-full px-2.5 py-1.5 border rounded-md text-xs outline-none bg-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Órgão Emissor</label>
                          <input
                            type="text"
                            value={rgOrgao}
                            onChange={(e) => setRgOrgao(e.target.value)}
                            placeholder="SSP/UF"
                            className="w-full px-2.5 py-1.5 border rounded-md text-xs outline-none bg-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Data de Emissão</label>
                          <input
                            type="date"
                            value={dataEmissaoRG}
                            onChange={(e) => setDataEmissaoRG(e.target.value)}
                            className="w-full px-2.5 py-1.5 border rounded-md text-xs outline-none bg-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ENDEREÇO RESIDENCIAL PF */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => setOpenEndereco(!openEndereco)}
                      className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 flex items-center justify-between text-xs font-bold text-slate-700 transition"
                    >
                      <span className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        Endereço Residencial
                      </span>
                      {openEndereco ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {openEndereco && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50/50">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1 flex items-center justify-between">
                            <span>CEP</span>
                            {loadingCEP && <span className="text-blue-600 text-[10px] animate-pulse">Buscando...</span>}
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={cep}
                              onChange={handleCepChange}
                              placeholder="00000-00"
                              maxLength={9}
                              disabled={loadingCEP}
                              className="w-full px-2.5 py-1.5 pr-8 border rounded-md text-xs font-mono outline-none bg-white focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-gray-400"
                            />
                            {loadingCEP && (
                              <div className="absolute right-2 top-2">
                                <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Logradouro</label>
                          <input
                            type="text"
                            value={logradouro}
                            onChange={(e) => setLogradouro(e.target.value)}
                            className="w-full px-2.5 py-1.5 border rounded-md text-xs outline-none bg-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Número</label>
                          <input
                            type="text"
                            value={numero}
                            onChange={(e) => setNumero(e.target.value)}
                            className="w-full px-2.5 py-1.5 border rounded-md text-xs outline-none bg-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Bairro</label>
                          <input
                            type="text"
                            value={bairro}
                            onChange={(e) => setBairro(e.target.value)}
                            className="w-full px-2.5 py-1.5 border rounded-md text-xs outline-none bg-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Município</label>
                          <input
                            type="text"
                            value={municipio}
                            onChange={(e) => setMunicipio(e.target.value)}
                            className="w-full px-2.5 py-1.5 border rounded-md text-xs outline-none bg-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1">UF</label>
                          <input
                            type="text"
                            value={uf}
                            onChange={(e) => setUf(e.target.value)}
                            maxLength={2}
                            className="w-full px-2.5 py-1.5 border rounded-md text-xs uppercase outline-none bg-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Complemento</label>
                          <input
                            type="text"
                            value={complemento}
                            onChange={(e) => setComplemento(e.target.value)}
                            placeholder="Apt, Bloco, etc."
                            className="w-full px-2.5 py-1.5 border rounded-md text-xs outline-none bg-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* ================================================= */}
          {/* CONTATOS                                          */}
          {/* ================================================= */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3">
            {/* CABEÇALHO DA SEÇÃO */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-500 dark:text-zinc-400 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-600" /> Contatos Telefônicos e Digitais
                  <span className="text-red-600 text-[11px]">🔴</span>
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Informe pelo menos um telefone/WhatsApp ou e-mail.</p>
              </div>
              <button
                type="button"
                onClick={handleAddContato}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Contato
              </button>
            </div>

            {/* LISTA DE CONTATOS */}
            {contatos.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {contatos.map((contato, index) => {
                  const itemKey = contato.id || String(index);

                  return (
                    <div
                      key={itemKey}
                      className="p-3.5 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-200 dark:border-zinc-800 relative space-y-3"
                    >
                      {/* BARRA SUPERIOR DO CARD (PRINCIPAL E REMOVER) */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-zinc-700 pb-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateContato(itemKey, 'principal', !contato.principal)}
                          className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                            contato.principal
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                              : 'bg-slate-200 text-slate-600 dark:bg-zinc-700 dark:text-zinc-400'
                          }`}
                        >
                          <Star className={`w-3 h-3 ${contato.principal ? 'fill-amber-500 text-amber-500' : ''}`} />
                          {contato.principal ? 'Principal' : 'Marcar como Principal'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveContato(itemKey)}
                          disabled={contatos.length === 1}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-30 transition-colors"
                          title="Remover contato"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* 1. CAMPOS PRINCIPAIS */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        <div className="md:col-span-2">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                            Nome Completo
                          </label>
                          <input
                            type="text"
                            placeholder="Nome do contato"
                            value={contato.nome || ''}
                            onChange={(e) => handleUpdateContato(itemKey, 'nome', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs font-bold bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                            {tipoCliente === 'PJ' ? 'Cargo (Qualificação)' : 'Vínculo / Parentesco'}
                          </label>
                          <input
                            type="text"
                            placeholder={tipoCliente === 'PJ' ? 'Ex: Sócio / Diretor' : 'Ex: Próprio / Esposa'}
                            value={contato.cargo_parentesco || ''}
                            onChange={(e) => handleUpdateContato(itemKey, 'cargo_parentesco', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                            Telefone / WhatsApp
                          </label>
                          <input
                            type="text"
                            placeholder="(00) 00000-0000"
                            maxLength={15}
                            value={contato.telefone || ''}
                            onChange={(e) => handleUpdateContato(itemKey, 'telefone', maskPhone(e.target.value))}
                            className="w-full p-1.5 border rounded text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                            E-mail
                          </label>
                          <input
                            type="email"
                            placeholder="email@exemplo.com"
                            value={contato.email || ''}
                            onChange={(e) => handleUpdateContato(itemKey, 'email', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                              Sexo
                            </label>
                            <select
                              value={contato.sexo || ''}
                              onChange={(e) => handleUpdateContato(itemKey, 'sexo', e.target.value)}
                              className="w-full p-1.5 border rounded text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 font-medium outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Selecione...</option>
                              <option value="M">Masculino</option>
                              <option value="F">Feminino</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                              D. Nascimento
                            </label>
                            <input
                              type="date"
                              value={contato.data_nascimento || ''}
                              onChange={(e) => handleUpdateContato(itemKey, 'data_nascimento', e.target.value)}
                              className="w-full p-1 border rounded text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* BOTÕES DE EXPANSÃO / AÇÕES EXTRAS */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200 dark:border-zinc-700/80">
                        <button
                          type="button"
                          onClick={() => handleUpdateContato(itemKey, 'mostrarEndereco', !contato.mostrarEndereco)}
                          className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded border transition-colors ${
                            contato.mostrarEndereco || contato.cep || contato.logradouro
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                              : 'bg-white text-slate-600 border-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700'
                          }`}
                        >
                          <MapPin className="w-3 h-3" />
                          {contato.mostrarEndereco ? 'Ocultar Endereço' : '+ Endereço'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateContato(itemKey, 'mostrarDocs', !contato.mostrarDocs)}
                          className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded border transition-colors ${
                            contato.mostrarDocs || contato.cpf || contato.rg
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                              : 'bg-white text-slate-600 border-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700'
                          }`}
                        >
                          <FileText className="w-3 h-3" />
                          {contato.mostrarDocs ? 'Ocultar Documentos' : '+ Documentos / Outros'}
                        </button>
                      </div>

                      {/* 2. SUBSEÇÃO: ENDEREÇO DA PESSOA */}
                      {(contato.mostrarEndereco || contato.cep || contato.logradouro) && (
                        <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-blue-100 dark:border-blue-900/30 space-y-2">
                          <p className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Endereço do Contato
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">CEP</label>
                              <input
                                type="text"
                                placeholder="00000-000"
                                value={contato.cep || ''}
                                onChange={(e) => handleUpdateContato(itemKey, 'cep', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">UF</label>
                              <input
                                type="text"
                                maxLength={2}
                                placeholder="UF"
                                value={contato.uf || ''}
                                onChange={(e) => handleUpdateContato(itemKey, 'uf', e.target.value.toUpperCase())}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800 uppercase border-slate-200 dark:border-zinc-700"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Município</label>
                              <input
                                type="text"
                                placeholder="Cidade"
                                value={contato.municipio || ''}
                                onChange={(e) => handleUpdateContato(itemKey, 'municipio', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Bairro</label>
                              <input
                                type="text"
                                placeholder="Bairro"
                                value={contato.bairro || ''}
                                onChange={(e) => handleUpdateContato(itemKey, 'bairro', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Logradouro</label>
                              <input
                                type="text"
                                placeholder="Rua, Av..."
                                value={contato.logradouro || ''}
                                onChange={(e) => handleUpdateContato(itemKey, 'logradouro', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Número</label>
                              <input
                                type="text"
                                placeholder="Nº"
                                value={contato.numero || ''}
                                onChange={(e) => handleUpdateContato(itemKey, 'numero', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                              />
                            </div>
                            <div className="col-span-2 md:col-span-4">
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Complemento</label>
                              <input
                                type="text"
                                placeholder="Apto, Bloco, etc."
                                value={contato.complemento || ''}
                                onChange={(e) => handleUpdateContato(itemKey, 'complemento', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3. SUBSEÇÃO: DOCUMENTOS E OUTROS DADOS PF */}
                      {(contato.mostrarDocs || contato.cpf || contato.rg) && (
                        <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-indigo-100 dark:border-indigo-900/30 space-y-2">
                          <p className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Documentos e Dados Pessoais
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">CPF</label>
                              <input
                                type="text"
                                placeholder="000.000.000-00"
                                value={contato.cpf || ''}
                                onChange={(e) => handleUpdateContato(itemKey, 'cpf', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">RG</label>
                              <input
                                type="text"
                                placeholder="Número do RG"
                                value={contato.rg || ''}
                                onChange={(e) => handleUpdateContato(itemKey, 'rg', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Órgão Emissor</label>
                              <input
                                type="text"
                                placeholder="Ex: SSP/SP"
                                value={contato.rg_orgao || ''}
                                onChange={(e) => handleUpdateContato(itemKey, 'rg_orgao', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Data Emissão</label>
                              <input
                                type="date"
                                value={contato.data_emissao_rg || ''}
                                onChange={(e) => handleUpdateContato(itemKey, 'data_emissao_rg', e.target.value)}
                                className="w-full p-1 border rounded text-xs bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Estado Civil</label>
                              <select
                                value={contato.estado_civil || ''}
                                onChange={(e) => handleUpdateContato(itemKey, 'estado_civil', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 font-medium"
                              >
                                <option value="">Selecione...</option>
                                <option value="SOLTEIRO">Solteiro(a)</option>
                                <option value="CASADO">Casado(a)</option>
                                <option value="DIVORCIADO">Divorciado(a)</option>
                                <option value="VIUVO">Viúvo(a)</option>
                                <option value="UNIAO_ESTAVEL">União Estável</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Naturalidade</label>
                              <input
                                type="text"
                                placeholder="Cidade/UF"
                                value={contato.naturalidade || ''}
                                onChange={(e) => handleUpdateContato(itemKey, 'naturalidade', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Ocupação / Profissão</label>
                              <input
                                type="text"
                                placeholder="Ex: Engenheiro, Empresário"
                                value={contato.ocupacao || ''}
                                onChange={(e) => handleUpdateContato(itemKey, 'ocupacao', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                              />
                            </div>
                            <div className="col-span-2 md:col-span-4">
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Outras Observações</label>
                              <input
                                type="text"
                                placeholder="Informações adicionais..."
                                value={contato.outros || ''}
                                onChange={(e) => handleUpdateContato(itemKey, 'outros', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 italic text-[11px]">Nenhum contato registrado.</p>
            )}
          </div>

          {/* ================================================= */}
          {/* MENSAGEM DE ERRO                                  */}
          {/* ================================================= */}
          {mensagemErro && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Ops! Verifique as informações</p>
                <p className="text-sm mt-1">{mensagemErro}</p>
              </div>
            </div>
          )}

        </form>

        {/* ================================================= */}
        {/* FOOTER                                            */}
        {/* ================================================= */}
        <div className="px-6 py-4 bg-slate-50 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={saving || isLoading}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          
          <div className="flex items-center gap-3">
            
            {/* LÓGICA APLICADA AQUI: Só renderiza se NÃO existir um 'cliente' já cadastrado */}
            {!cliente && (
              <button
                type="button"
                onClick={handleAbrirAcaoComercial}
                disabled={saving || isLoading}
                className="px-6 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-100 shadow-sm transition disabled:opacity-50 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" /> Cadastrar e Criar Oportunidade
              </button>
            )}

            <button
              type="submit"
              onClick={handleFormSubmit}
              disabled={saving || isLoading}
              className="px-8 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition disabled:opacity-50"
            >
              Salvar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};