import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { ModalCadastroCliente } from './ModalCadastroCliente';
import { ModalAcoesComerciais } from './ModalAcoesComerciais';
import { toast } from 'react-hot-toast';

export default function ClientesCadastroV2() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  // Estados dos Modais
  const [modalOpen, setModalOpen] = useState(true);
  const [modalAcaoOpen, setModalAcaoOpen] = useState(false);
  const [clienteSalvo, setClienteSalvo] = useState<any>(null);
  const [salvandoCliente, setSalvandoCliente] = useState(false);

  // Estado para armazenar a lista de corretores
  const [corretoresDisponiveis, setCorretoresDisponiveis] = useState<any[]>([]);

  // Busca os corretores da corretora logada
  useEffect(() => {
    async function carregarCorretores() {
      if (userProfile?.tipo_usuario === 'CORRETORA' && userProfile?.corretora_id) {
        const { data, error } = await supabase
          .from('usuarios_perfis')
          .select('id, nome')
          .eq('corretora_id', userProfile.corretora_id)
          .eq('tipo_usuario', 'CORRETOR')
          .eq('ativo', true);

        if (!error && data) {
          setCorretoresDisponiveis(data);
        }
      }
    }
    carregarCorretores();
  }, [userProfile]);

  // Função para salvar o cliente na tab_clientes_v2 no Supabase
  const salvarClienteNoBanco = async (payload: any) => {
  // 1. Desencapsula o payload caso venha envolvido no objeto { cliente: ... }
  const dadosForm = payload.cliente || payload;

  const {
    // Captura TODAS as possíveis variações onde o ID do corretor possa estar
    dono_id,
    donoId,
    corretorId,
    corretor_id,
    corretor,
    dono,
    corretorResponsavel,
    corretor_responsavel,

    // Identificação e Controle
    cpfCnpj,
    cpf_cnpj,
    nomeRazaoSocial,
    nome_razao_social,
    nomeFantasia,
    nome_fantasia,
    tipoCliente,
    tipo_cliente,
    cnaePrincipal,
    cnae_principal,
    situacaoCadastral,
    situacao_cadastral,
    faseAtendimento,
    fase_atendimento,
    origem,
    temperatura,

    // Endereço
    cep,
    uf,
    municipio,
    bairro,
    logradouro,
    numero,
    complemento,

    // Listas
    contatos,
    socios,

    // JSONB
    dadosComplementares,
    dados_complementares,
    dadosReceita,
    dataNascimento,
    data_nascimento,
    rgNumero,
    rg_numero,
    rgOrgao,
    rg_orgao,
    estadoCivil,
    estado_civil,
    ocupacao,
    sexo,
    modoCadastro,
  } = dadosForm;

  // Resgata com busca exaustiva por qualquer campo contendo o ID do corretor
  const idExtraidoObjeto =
    typeof corretor === 'object' ? corretor?.id : corretor;

  const idExtraidoDono =
    typeof dono === 'object' ? dono?.id : dono;

  const idSelecionadoNoForm =
    dono_id ||
    donoId ||
    corretor_id ||
    corretorId ||
    corretorResponsavel ||
    corretor_responsavel ||
    idExtraidoObjeto ||
    idExtraidoDono;

  // Se for perfil CORRETOR, força o ID do usuário logado.
  // Se for CORRETORA, utiliza estritamente o selecionado no select do modal.
  const corretorResponsavelId =
    userProfile?.tipo_usuario === 'CORRETOR'
      ? userProfile?.id
      : idSelecionadoNoForm || userProfile?.id;

  // Define o tipo de cliente final (PF ou PJ)
  const tipoClienteFinal = (tipoCliente || tipo_cliente || 'PJ').toUpperCase() as 'PF' | 'PJ';
  const isPJ = tipoClienteFinal === 'PJ';

  // 2. Consolidação dos campos extras para a estrutura JSONB
  const jsonbComplementar = {
    ...(dados_complementares || dadosComplementares || {}),
    ...(dadosReceita || {}),
    modo_cadastro: modoCadastro || null,
    data_nascimento: dataNascimento || data_nascimento || null,
    rg_numero: rgNumero || rg_numero || null,
    rg_orgao: rgOrgao || rg_orgao || null,
    estado_civil: estadoCivil || estado_civil || null,
    ocupacao: ocupacao || null,
    sexo: sexo || null,
  };

  // 3. Payload final alinhado estritamente com o schema public.tab_clientes_v2
  const payloadFinal = {
    corretora_id: userProfile?.corretora_id,
    corretor_id: corretorResponsavelId,
    tipo_cliente: tipoClienteFinal,
    cpf_cnpj:
      cpfCnpj?.replace(/\D/g, '') ||
      cpf_cnpj?.replace(/\D/g, '') ||
      null,
    nome_razao_social: nomeRazaoSocial || nome_razao_social,
    nome_fantasia: nomeFantasia || nome_fantasia || null,

    origem: origem || 'MANUAL',
    fase_atendimento:
      faseAtendimento || fase_atendimento || 'nao_contatado',
    temperatura: temperatura || 'frio',

    cnae_principal:
      cnaePrincipal ||
      cnae_principal ||
      dadosReceita?.cnae_principal ||
      null,
    situacao_cadastral:
      situacaoCadastral ||
      situacao_cadastral ||
      dadosReceita?.situacao_cadastral ||
      null,

    // Endereço
    cep: cep || null,
    uf: uf || null,
    municipio: municipio || null,
    bairro: bairro || null,
    logradouro: logradouro || null,
    numero: numero || null,
    complemento: complemento || null,

    // Listas JSONB
    contatos:
      Array.isArray(contatos) && contatos.length > 0
        ? contatos
        : [],
    socios:
      Array.isArray(socios) && socios.length > 0
        ? socios
        : [],

    // Direcionamento dinâmico do JSONB de acordo com o tipo do cliente
    dados_complementares_pf: isPJ ? {} : jsonbComplementar,
    dados_complementares_pj: isPJ ? jsonbComplementar : {},
  };

  const { data, error } = await supabase
    .from('tab_clientes_v2')
    .insert([payloadFinal])
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar no Supabase:', error);
    toast.error(`Erro ao cadastrar cliente: ${error.message}`);
    throw error;
  }

  return data;
};

  // Clique no botão "Salvar Cliente"
  const handleSaveCliente = async (payload: any) => {
    try {
      setSalvandoCliente(true);
      await salvarClienteNoBanco(payload);
      toast.success('Cliente cadastrado com sucesso!');
      navigate('/clientes/lista');
    } catch (err) {
      console.error(err);
    } finally {
      setSalvandoCliente(false);
    }
  };

  // Clique no botão "Registrar Ação Comercial" / "Cadastrar e Criar Oportunidade"
  const handleOpenAcaoComercial = async (dadosClienteForm: any) => {
    try {
      setSalvandoCliente(true);

      let clienteAtual = clienteSalvo;

      // Se ainda não salvou o cliente no banco, realiza o cadastro primeiro
      if (!clienteAtual || !clienteAtual.id) {
        clienteAtual = await salvarClienteNoBanco(dadosClienteForm);
        setClienteSalvo(clienteAtual);
      }

      setModalAcaoOpen(true);
    } catch (err) {
      console.error(
        'Não foi possível salvar o cliente para registrar a ação:',
        err
      );
    } finally {
      setSalvandoCliente(false);
    }
  };

  // Salvamento da Ação Comercial na tab_interacoes_v2
  const handleSaveAcaoComercial = async (dadosAcao: any) => {
    const clienteIdReal =
      clienteSalvo?.id || dadosAcao.cliente_id || dadosAcao.lead_id;

    if (!clienteIdReal || clienteIdReal === 'temp-id') {
      toast.error('Não foi possível identificar o cliente. Tente novamente.');
      return;
    }

    // Lê obrigatoriamente o corretor_id que foi gravado com sucesso no cliente
    const corretorResponsavelId =
      clienteSalvo?.corretor_id ||
      (userProfile?.tipo_usuario === 'CORRETOR'
        ? userProfile?.id
        : null) ||
      userProfile?.id;

    try {
      // 1. Extrai a lista de agendamentos enviados pelo Modal
      const listaAgendamentos = Array.isArray(dadosAcao.agendamentos) && dadosAcao.agendamentos.length > 0
        ? dadosAcao.agendamentos
        : Array.isArray(dadosAcao.proximas_acoes) && dadosAcao.proximas_acoes.length > 0
        ? dadosAcao.proximas_acoes
        : null;

      // Dados base comuns a todas as interações (sem o produtos_interesse fixo)
      const dadosBaseInteracao = {
        cliente_id: clienteIdReal,
        tipo_acao:
          dadosAcao.tipo_acao || dadosAcao.acao_realizada?.tipo,
        resultado_acao:
          dadosAcao.resultado_acao ||
          dadosAcao.acao_realizada?.resultado,
        objetivo_acao:
          dadosAcao.objetivo_acao ||
          dadosAcao.acao_realizada?.objetivo,
        relato:
          dadosAcao.relato ||
          dadosAcao.acao_realizada?.resultado ||
          'Ação comercial registrada',
        corretora_id: userProfile?.corretora_id,
        corretor_id: corretorResponsavelId,
      };

      let payloadsParaInserir: any[] = [];

      if (listaAgendamentos) {
        // Se houver array de agendamentos, cria um registro na tab_interacoes_v2 para CADA UM deles
        payloadsParaInserir = listaAgendamentos.map((ag: any) => {
          const dataRet = ag.data_retorno || ag.data || null;
          const horaRet = ag.horario_retorno || ag.horario || null;

          // Extrai o produto individual do agendamento; se não houver, utiliza o array geral como fallback
          const produtosAgendamento = 
            (Array.isArray(ag.produtos_interesse) && ag.produtos_interesse.length > 0)
              ? ag.produtos_interesse
              : ag.produto_interesse
              ? [ag.produto_interesse]
              : dadosAcao.produtos_interesse || [];

          return {
            ...dadosBaseInteracao,
            produtos_interesse: produtosAgendamento,
            proxima_acao: ag.proxima_acao || ag.tipo || dadosAcao.proxima_acao_tipo || null,
            data_retorno: dataRet,
            horario_retorno: horaRet,
            relato_proxima_acao: ag.relato_proxima_acao || ag.relato || null,
            status_agendamento: dataRet ? 'PENDENTE' : null,
          };
        });
      } else {
        // Fallback caso venha apenas um agendamento único nos campos legados
        const dataRetornoFinal =
          dadosAcao.data_retorno ||
          dadosAcao.proxima_acao?.data_retorno ||
          null;

        const horarioRetornoFinal =
          dadosAcao.horario_retorno ||
          dadosAcao.proxima_acao?.horario_retorno ||
          null;

        payloadsParaInserir.push({
          ...dadosBaseInteracao,
          produtos_interesse: dadosAcao.produtos_interesse || [],
          proxima_acao:
            dadosAcao.proxima_acao?.tipo ||
            dadosAcao.proxima_acao_tipo ||
            null,
          data_retorno: dataRetornoFinal,
          horario_retorno: horarioRetornoFinal,
          relato_proxima_acao:
            dadosAcao.relato_proxima_acao ||
            dadosAcao.proxima_acao?.relato ||
            null,
          status_agendamento: dataRetornoFinal ? 'PENDENTE' : null,
        });
      }

      // 2. Insere todas as interações no Supabase em lote
      const { error } = await supabase
        .from('tab_interacoes_v2')
        .insert(payloadsParaInserir);

      if (error) {
        console.error('Erro ao salvar Ação Comercial:', error);
        toast.error(`Erro ao salvar ação: ${error.message}`);
        return;
      }

      // 3. Atualiza o cliente: altera a fase_atendimento para 'LEAD' e grava o primeiro agendamento como referência
      const primeiroAgendamento = payloadsParaInserir[0];
      const updateClientePayload: any = {
        fase_atendimento: 'LEAD',
      };

      if (dadosAcao.contatos && dadosAcao.contatos.length > 0) {
        updateClientePayload.contatos = dadosAcao.contatos;
      }

      if (primeiroAgendamento?.data_retorno) {
        updateClientePayload.data_retorno = primeiroAgendamento.data_retorno;
        updateClientePayload.horario_retorno = primeiroAgendamento.horario_retorno;
      }

      await supabase
        .from('tab_clientes_v2')
        .update(updateClientePayload)
        .eq('id', clienteIdReal);

      toast.success('Cliente e agendamentos salvos com sucesso! 🎉');
      setModalAcaoOpen(false);
      setModalOpen(false);
      navigate('/clientes/lista');
    } catch (err) {
      console.error('Falha na requisição:', err);
    }
  };

  const handleClose = () => {
    setModalOpen(false);
    navigate('/clientes/lista');
  };

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center p-4">
      <ModalCadastroCliente
        isOpen={modalOpen}
        isLoading={salvandoCliente}
        saving={salvandoCliente}
        onClose={handleClose}
        handleSubmit={handleSaveCliente}
        corretoraId={userProfile?.corretora_id}
        corretorId={userProfile?.id}
        onOpenAcaoComercialModal={handleOpenAcaoComercial}
        usuarioLogado={userProfile}
        corretoresDisponiveis={corretoresDisponiveis}
      />

      {modalAcaoOpen && (
        <div className="relative z-[60]">
          <ModalAcoesComerciais
            isOpen={modalAcaoOpen}
            onClose={() => setModalAcaoOpen(false)}
            clienteContexto={clienteSalvo}
            onSave={handleSaveAcaoComercial}
          />
        </div>
      )}
    </div>
  );
}