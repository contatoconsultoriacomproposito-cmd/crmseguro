import { supabase } from "../../../../lib/supabaseClient";
import { SupabaseWhatsAppProvider } from '../../providers/SupabaseWhatsAppProvider';

interface StartRealRoutingParams {
  conversationId: string;
  userProfile: any;
}

function getCorretoraId(userProfile: any): string | null {
  if (!userProfile) return null;
  return userProfile.tipo_usuario === 'CORRETORA'
    ? userProfile.id ?? null
    : userProfile.corretora_id ?? null;
}

function replaceVariables(
  text: string,
  variables: Record<string, string | null | undefined>,
): string {
  if (!text) return '';

  return Object.entries(variables).reduce((result, [key, value]) => {
    return result.replace(
      new RegExp(`\\{${key}\\}`, 'gi'),
      value ?? '',
    );
  }, text);
}

function buildOptionsMessage(
  initialMessage: string,
  options: Array<{
    id: string;
    label: string;
    enabled: boolean;
    order: number;
  }>,
): string {
  const enabledOptions = [...options]
    .filter((option) => option.enabled && option.label?.trim())
    .sort((a, b) => a.order - b.order);

  const optionsText = enabledOptions
    .map((option, index) => `${index + 1}. ${option.label.trim()}`)
    .join('\n');

  return [
    initialMessage.trim(),
    '',
    optionsText,
    '',
    'Responda com o número ou nome da opção.',
  ]
    .filter((line, index, array) => {
      if (line !== '') return true;
      return index > 0 && array[index - 1] !== '';
    })
    .join('\n')
    .trim();
}

export async function startRealRouting({
  conversationId,
  userProfile,
}: StartRealRoutingParams) {
  if (!conversationId) {
    throw new Error('Conversa não informada.');
  }

  if (!userProfile?.id) {
    throw new Error('Usuário não identificado.');
  }

  const corretoraId = getCorretoraId(userProfile);

  if (!corretoraId) {
    throw new Error('Não foi possível identificar a corretora.');
  }

  const { data: conversation, error: conversationError } = await supabase
    .from('whatsapp_conversas')
    .select(`
      id,
      corretora_id,
      contato_id,
      whatsapp_contatos (
        id,
        nome,
        telefone
      )
    `)
    .eq('id', conversationId)
    .eq('corretora_id', corretoraId)
    .single();

  if (conversationError || !conversation) {
    console.error('Erro ao buscar conversa para triagem:', conversationError);
    throw new Error('Conversa não encontrada ou sem permissão de acesso.');
  }

  const { data: configRow, error: configError } = await supabase
    .from('whatsapp_automacoes_config')
    .select('id, ativo, configuracao')
    .eq('corretora_id', corretoraId)
    .eq('tipo', 'routing')
    .maybeSingle();

  if (configError) {
    console.error('Erro ao buscar configuração da triagem:', configError);
    throw new Error('Não foi possível carregar a configuração da triagem.');
  }

  if (!configRow) {
    throw new Error('A triagem ainda não foi configurada.');
  }

  if (!configRow.ativo) {
    throw new Error('A triagem está desativada.');
  }

  const config = configRow.configuracao as {
    enabled?: boolean;
    initialMessage?: string;
    completionMessage?: string;
    options?: Array<{
      id: string;
      label: string;
      enabled: boolean;
      order: number;
    }>;
  };

  if (config.enabled === false) {
    throw new Error('A triagem está desativada.');
  }

  const enabledOptions = [...(config.options ?? [])]
    .filter((option) => option.enabled && option.label?.trim())
    .sort((a, b) => a.order - b.order);

  if (!config.initialMessage?.trim()) {
    throw new Error('A mensagem inicial da triagem não foi configurada.');
  }

  if (enabledOptions.length === 0) {
    throw new Error('A triagem não possui opções de atendimento ativas.');
  }

  const { data: activeSession, error: activeSessionError } = await supabase
    .from('whatsapp_automacoes_sessoes')
    .select('id, tipo, status')
    .eq('corretora_id', corretoraId)
    .eq('conversa_id', conversationId)
    .in('status', ['running', 'awaiting_human'])
    .order('iniciado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeSessionError) {
    console.error('Erro ao verificar sessão ativa:', activeSessionError);
    throw new Error('Não foi possível verificar as automações da conversa.');
  }

  if (activeSession) {
    throw new Error(
      activeSession.tipo === 'routing'
        ? 'Esta conversa já possui uma triagem em andamento.'
        : 'Esta conversa já possui outra automação em andamento.',
    );
  }

  const { data: session, error: sessionError } = await supabase
    .from('whatsapp_automacoes_sessoes')
    .insert({
      corretora_id: corretoraId,
      conversa_id: conversationId,
      tipo: 'routing',
      status: 'running',
      etapa_atual: 1,
      dados: {
        opcao: null,
        opcao_id: null,
      },
      iniciado_por: userProfile.id,
    })
    .select('id')
    .single();

  if (sessionError || !session) {
    console.error('Erro ao criar sessão de triagem:', sessionError);
    throw new Error('Não foi possível iniciar a sessão de triagem.');
  }

  try {
    const contactRelation = (conversation as any).whatsapp_contatos;
    const contact = Array.isArray(contactRelation)
      ? contactRelation[0]
      : contactRelation;

    const variables = {
      nome: contact?.nome ?? '',
      corretora:
        userProfile.tipo_usuario === 'CORRETORA'
          ? userProfile.nome ?? ''
          : '',
      corretor: userProfile.nome ?? '',
    };

    const initialMessage = replaceVariables(
      config.initialMessage,
      variables,
    );

    const message = buildOptionsMessage(
      initialMessage,
      enabledOptions,
    );

    const provider = new SupabaseWhatsAppProvider();

    await provider.sendMessage({
      conversationId,
      type: 'text',
      text: message,
    });

    return {
      sessionId: session.id,
      status: 'running' as const,
      type: 'routing' as const,
      currentStep: 1,
      options: enabledOptions,
    };
  } catch (error) {
    console.error('Erro ao enviar mensagem inicial da triagem:', error);

    const { error: cancelError } = await supabase
      .from('whatsapp_automacoes_sessoes')
      .update({
        status: 'cancelled',
        finalizado_em: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (cancelError) {
      console.error(
        'Erro ao cancelar sessão de triagem após falha no envio:',
        cancelError,
      );
    }

    throw error instanceof Error
      ? error
      : new Error('Não foi possível iniciar a triagem.');
  }
}