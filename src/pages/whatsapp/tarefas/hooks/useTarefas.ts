import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../../../../auth/AuthContext'
import { usePermissoes } from '../../hooks/usePermissoes'
import * as service from '../services/tarefasService'
import { supabase } from '../../../../lib/supabaseClient'
import { resumoTarefas, type EscopoTarefa, type Tarefa, type TarefaInput } from '../types/tarefas'

export function useTarefas() {
  const { userProfile } = useAuth()
  const { escopo, loading: carregandoPermissoes } = usePermissoes()
  const usuarioId = userProfile?.id ?? null
  const corretoraId = userProfile?.corretora_id ?? (userProfile?.tipo_usuario === 'CORRETORA' ? usuarioId : null)
  const estrutural = userProfile?.tipo_usuario === 'CORRETORA' || userProfile?.tipo_usuario === 'ADMIN'
  const autorizado = useCallback((acao: 'read' | 'create' | 'update' | 'delete'): EscopoTarefa => {
    if (carregandoPermissoes) return 'none'
    if (estrutural) return 'tenant'
    const valor = escopo('atendimento.tarefas', acao)
    return valor === 'tenant' || valor === 'own' ? valor : 'none'
  }, [carregandoPermissoes, estrutural, escopo])

  const leitura = autorizado('read')
  const criacao = autorizado('create')
  const edicao = autorizado('update')
  const exclusao = autorizado('delete')
  const podeVisualizar = leitura !== 'none' && !carregandoPermissoes
  const podeCriar = criacao !== 'none' && !carregandoPermissoes
  const permiteEditar = useCallback((tarefa: Tarefa) => podeVisualizar && edicao !== 'none' && (edicao === 'tenant' || tarefa.responsavel_id === usuarioId), [podeVisualizar, edicao, usuarioId])
  const permiteExcluir = useCallback((tarefa: Tarefa) => podeVisualizar && exclusao !== 'none' && (exclusao === 'tenant' || tarefa.responsavel_id === usuarioId), [podeVisualizar, exclusao, usuarioId])

  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [carregando, setCarregando] = useState(false)
  const [operando, setOperando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const atualizar = useCallback(async () => {
    if (!corretoraId || !podeVisualizar) { setTarefas([]); return }
    setCarregando(true)
    setErro(null)
    try {
      // A RLS filtra: 'own' lê tarefas atribuídas ao usuário e as criadas por ele.
      const data = await service.listarTarefas(corretoraId)
      setTarefas(data)
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'Falha ao carregar tarefas.'
      setErro(mensagem)
      setTarefas([])
    } finally { setCarregando(false) }
  }, [corretoraId, podeVisualizar, leitura, usuarioId])

  useEffect(() => { void atualizar() }, [atualizar])

  /**
   * Sincronização em duas camadas:
   * 1) evento local após escrita confirmada (página/ContactPanel -> sino);
   * 2) Supabase Realtime para alterações feitas em outra sessão/dispositivo.
   * O intervalo de 60 segundos existente no sino permanece como contingência.
   */
  useEffect(() => {
    if (!corretoraId || !podeVisualizar) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const agendarAtualizacao = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { void atualizar() }, 200)
    }
    window.addEventListener(service.EVENTO_TAREFAS_ALTERADAS, agendarAtualizacao)
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') agendarAtualizacao()
    }
    document.addEventListener('visibilitychange', aoVoltar)

    // Uma assinatura para cada instância do hook; o filtro é sempre por corretora.
    // A RLS continua sendo a camada que restringe o acesso aos registros.
    const canal = supabase
      .channel(`tarefas-${corretoraId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_tarefas',
        filter: `corretora_id=eq.${corretoraId}`,
      }, agendarAtualizacao)
      .subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener(service.EVENTO_TAREFAS_ALTERADAS, agendarAtualizacao)
      document.removeEventListener('visibilitychange', aoVoltar)
      void supabase.removeChannel(canal)
    }
  }, [corretoraId, podeVisualizar, atualizar])

  const executar = useCallback(async (operacao: () => Promise<unknown>, sucesso: string) => {
    if (operando) return false
    setOperando(true)
    try { await operacao(); await atualizar(); toast.success(sucesso); return true }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Operação não realizada.'); return false }
    finally { setOperando(false) }
  }, [operando, atualizar])

  const criar = useCallback(async (input: TarefaInput) => {
    if (!usuarioId || !corretoraId || !podeCriar) { toast.error('Sem permissão para criar tarefas.'); return false }
    if (!input.responsavel_id) { toast.error('Selecione um responsável.'); return false }
    return executar(() => service.criarTarefa(corretoraId, usuarioId, input), input.responsavel_id !== usuarioId ? 'Tarefa delegada com sucesso.' : 'Tarefa criada.')
  }, [usuarioId, corretoraId, podeCriar, executar])

  const editar = useCallback(async (tarefa: Tarefa, input: TarefaInput) => {
    if (!permiteEditar(tarefa)) { toast.error('Sem permissão para editar.'); return false }
    if (edicao === 'own' && input.responsavel_id !== usuarioId) { toast.error('Não é possível transferir uma tarefa com escopo Próprios.'); return false }
    return executar(() => service.editarTarefa(tarefa.id, input), 'Tarefa atualizada.')
  }, [permiteEditar, edicao, usuarioId, executar])

  const concluir = useCallback(async (tarefa: Tarefa, concluida = true) => {
    if (!permiteEditar(tarefa)) { toast.error('Sem permissão para concluir tarefas.'); return false }
    return executar(() => service.alterarStatusTarefa(tarefa.id, concluida), concluida ? 'Tarefa concluída.' : 'Tarefa reaberta.')
  }, [permiteEditar, executar])

  const reagendar = useCallback(async (tarefa: Tarefa, vencimento: string | null) => {
    if (!permiteEditar(tarefa)) { toast.error('Sem permissão para reagendar.'); return false }
    return executar(() => service.reagendarTarefa(tarefa.id, vencimento), 'Tarefa reagendada.')
  }, [permiteEditar, executar])

  const excluir = useCallback(async (tarefa: Tarefa) => {
    if (!permiteExcluir(tarefa)) { toast.error('Sem permissão para excluir.'); return false }
    return executar(() => service.excluirTarefa(tarefa.id), 'Tarefa excluída.')
  }, [permiteExcluir, executar])

  return {
    tarefas, resumo: useMemo(() => resumoTarefas(tarefas), [tarefas]),
    carregando, carregandoPermissoes, operando, erro, atualizar,
    usuarioId, corretoraId, leitura, criacao, edicao, exclusao,
    podeVisualizar, podeCriar, permiteEditar, permiteExcluir,
    criar, editar, concluir, reagendar, excluir,
  }
}
