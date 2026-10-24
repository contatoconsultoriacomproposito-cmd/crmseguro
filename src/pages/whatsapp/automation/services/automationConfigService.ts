import { supabase } from '../../../../lib/supabaseClient'
import type {
  AutomationType,
  PreQualificationConfig,
  RoutingConfig,
} from '../types/automationTypes'

interface AutomationConfigRow {
  id: string
  corretora_id: string
  tipo: AutomationType
  ativo: boolean
  configuracao: Record<string, unknown>
  created_at: string
  updated_at: string
}

function getEffectiveCorretoraId(userProfile: any): string {
  if (!userProfile?.id) {
    throw new Error('Perfil do usuário não encontrado.')
  }

  if (userProfile.tipo_usuario === 'CORRETORA') {
    return userProfile.id
  }

  if (!userProfile.corretora_id) {
    throw new Error('Corretora do usuário não encontrada.')
  }

  return userProfile.corretora_id
}

export async function buscarConfiguracoesAutomacao(userProfile: any) {
  const corretoraId = getEffectiveCorretoraId(userProfile)

  const { data, error } = await supabase
    .from('whatsapp_automacoes_config')
    .select('*')
    .eq('corretora_id', corretoraId)

  if (error) {
    console.error('Erro ao buscar configurações de automação:', error)
    throw new Error('Não foi possível carregar as configurações de automação.')
  }

  return (data ?? []) as AutomationConfigRow[]
}

export async function salvarPreQualificationConfig(
  userProfile: any,
  config: PreQualificationConfig,
) {
  const corretoraId = getEffectiveCorretoraId(userProfile)
  const { enabled, ...configuracao } = config

  const { data, error } = await supabase
    .from('whatsapp_automacoes_config')
    .upsert(
      {
        corretora_id: corretoraId,
        tipo: 'pre_qualification',
        ativo: enabled,
        configuracao,
      },
      {
        onConflict: 'corretora_id,tipo',
      },
    )
    .select()
    .single()

  if (error) {
    console.error('Erro ao salvar pré-qualificação:', error)
    throw new Error('Não foi possível salvar a configuração de pré-qualificação.')
  }

  return data as AutomationConfigRow
}

export async function salvarRoutingConfig(
  userProfile: any,
  config: RoutingConfig,
) {
  const corretoraId = getEffectiveCorretoraId(userProfile)
  const { enabled, ...configuracao } = config

  const { data, error } = await supabase
    .from('whatsapp_automacoes_config')
    .upsert(
      {
        corretora_id: corretoraId,
        tipo: 'routing',
        ativo: enabled,
        configuracao,
      },
      {
        onConflict: 'corretora_id,tipo',
      },
    )
    .select()
    .single()

  if (error) {
    console.error('Erro ao salvar triagem:', error)
    throw new Error('Não foi possível salvar a configuração de triagem.')
  }

  return data as AutomationConfigRow
}