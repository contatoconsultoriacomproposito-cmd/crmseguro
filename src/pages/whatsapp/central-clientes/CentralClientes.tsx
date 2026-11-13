import { useAcessoClientes, podeCliente, exigirCliente } from './hooks/useAcessoClientes'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import ModalCadastroWhatsApp from '../automation/components/ModalCadastroWhatsApp'
import CentralClientesHeader from './components/CentralClientesHeader'
import CentralClientesResumo from './components/CentralClientesResumo'
import CentralClientesFiltros from './components/CentralClientesFiltros'
import ClientesLista from './components/lista/ClientesLista'
import ClientesKanban from './components/kanban/ClientesKanban'
import Cliente360Modal from './components/cliente360/Cliente360Modal'
import { useCentralClientes } from './hooks/useCentralClientes'
import type {
  ClienteCentral,
  ClienteKanbanStage,
} from './types/centralClientes'

export default function CentralClientes() {
  const navigate = useNavigate()
  const { acesso, loading: carregandoPermissoes, error: erroPermissoes } = useAcessoClientes()
  const central = useCentralClientes(carregandoPermissoes ? null : acesso)
    console.log('PERMISSÃO CLIENTES:', {
    usuarioId: acesso?.usuarioId,
    read: acesso?.escopos.read,
    tipo: 'CORRETOR',
  })
  const permitido = (acao: Parameters<typeof podeCliente>[1], cliente?: ClienteCentral) =>
    podeCliente(acesso, acao, cliente)
  const abrirCliente = (cliente: ClienteCentral) => {
    if (permitido('open', cliente)) setClienteSelecionado(cliente)
    else toast.error('Sem permissão para abrir este cliente.')
  }

  const [clienteSelecionado, setClienteSelecionado] =
    useState<ClienteCentral | null>(null)

  const [novoClienteAberto, setNovoClienteAberto] =
    useState(false)

  const abrirWhatsApp = (
    cliente: ClienteCentral
  ) => {
    try { exigirCliente(acesso, 'whatsapp', cliente) } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : 'Sem permissão.'); return
    }
    if (cliente.whatsappConversationId) {
      navigate('/whatsapp', {
        state: {
          conversationId:
            cliente.whatsappConversationId,
        },
      })
      return
    }

    if (cliente.possuiWhatsApp) {
      navigate('/whatsapp')
      return
    }

    toast.info(
      'Este cliente não possui WhatsApp vinculado.'
    )
  }

  const tornarLead = async (
    cliente: ClienteCentral
  ) => {
    try {
      exigirCliente(acesso, 'make_lead', cliente)
      await central.tornarLead(cliente)
      toast.success('Cliente classificado como Lead.')
    } catch (error: any) {
      toast.error(
        error?.message ||
          'Não foi possível tornar o cliente Lead.'
      )
      throw error
    }
  }

  const alterarEtapa = async (
    cliente: ClienteCentral,
    etapa: ClienteKanbanStage
  ) => {
    try {
      exigirCliente(acesso, 'update', cliente)
      const posicao =
        cliente.posicaoKanban ?? 0

      await central.moverKanban(
        cliente,
        etapa,
        posicao
      )
    } catch (error: any) {
      toast.error(
        error?.message ||
          'Não foi possível alterar a etapa.'
      )
      throw error
    }
  }

  const excluir = async (
    cliente: ClienteCentral
  ) => {
    if (!permitido('delete', cliente)) {
      toast.error('Sem permissão para excluir este cliente.'); return
    }
    const confirmar = window.confirm(
      `Excluir ${cliente.nome}? Esta ação respeitará as regras e vínculos do novo núcleo.`
    )

    if (!confirmar) return

    try {
      await central.excluir(cliente)
      toast.success('Cliente excluído.')
      if (
        clienteSelecionado?.id === cliente.id &&
        clienteSelecionado.tipo === cliente.tipo
      ) {
        setClienteSelecionado(null)
      }
    } catch (error: any) {
      toast.error(
        error?.message ||
          'Não foi possível excluir o cliente.'
      )
    }
  }

  if (carregandoPermissoes) return (
    <div className="flex h-full items-center justify-center p-8 text-sm text-slate-500">Verificando permissões de Clientes...</div>
  )
  if (erroPermissoes) return (
    <div className="p-8 text-center text-sm text-rose-600">{erroPermissoes}</div>
  )
  if (!permitido('read') && !permitido('create')) return (
    <div className="p-8 text-center text-sm text-slate-600">Você não possui acesso à Central de Clientes.</div>
  )

  return (
    <>
      <div className="absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-slate-100 pt-[72px] md:p-3 lg:p-4">
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm">
          <CentralClientesHeader
            visualizacao={central.visualizacao}
            onVisualizacaoChange={
              central.setVisualizacao
            }
            podeCriar={permitido('create')}
            podeVisualizar={permitido('read')}
            onNovoCliente={() => {
              if (permitido('create')) setNovoClienteAberto(true)
            }}
          />

          {permitido('read') && <div className="shrink-0 space-y-3 border-b border-slate-200 bg-slate-50/70 p-3 md:p-4">
            <CentralClientesResumo
              resumo={central.resumo}
            />

            {central.visualizacao === 'LISTA' && (
              <CentralClientesFiltros
                filtros={central.filtros}
                responsaveis={central.responsaveis}
                buscaValida={central.buscaValida}
                onChange={central.atualizarFiltros}
                onReset={central.limparFiltros}
              />
            )}
          </div>}

          {permitido('read') ? <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-slate-100/60 p-3 md:p-4">
            {central.error ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700">
                {central.error.message}
              </div>
            ) : central.visualizacao === 'LISTA' ? (
              <ClientesLista
                clientes={central.clientes}
                paginacao={central.paginacao}
                loading={central.loading}
                onPaginaChange={central.setPagina}
                onOpen={abrirCliente}
                podeAbrir={cliente => permitido('open', cliente)}
                podeWhatsApp={cliente => permitido('whatsapp', cliente)}
                podeTornarLead={cliente => permitido('make_lead', cliente)}
                podeExcluir={cliente => permitido('delete', cliente)}
                onWhatsApp={abrirWhatsApp}
                onTornarLead={cliente =>
                  void tornarLead(cliente)
                }
                onExcluir={cliente =>
                  void excluir(cliente)
                }
              />
            ) : (
              <ClientesKanban
                clientes={central.clientesKanban}
                loading={central.loadingKanban}
                onOpen={abrirCliente}
                podeAbrir={cliente => permitido('open', cliente)}
                podeMover={cliente => permitido('update', cliente)}
                onMove={central.moverKanban}
              />
            )}
          </main> : <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">Sem permissão para visualizar a lista de clientes.</div>}
        </div>
      </div>

      {clienteSelecionado && permitido('open', clienteSelecionado) && (
        <Cliente360Modal
          clienteInicial={clienteSelecionado}
          acesso={acesso}
          responsaveis={central.responsaveis}
          onClose={() =>
            setClienteSelecionado(null)
          }
          onWhatsApp={abrirWhatsApp}
          onTornarLead={tornarLead}
          onAlterarEtapa={alterarEtapa}
          onTransferir={async (cliente, responsavelId) => {
            await central.transferir(cliente, responsavelId)
            if (acesso?.escopos.open === 'own' && responsavelId !== acesso.usuarioId) {
              setClienteSelecionado(null)
            }
          }}
          onUpdated={central.recarregar}
        />
      )}

      <ModalCadastroWhatsApp
        open={novoClienteAberto && permitido('create')}
        conversation={undefined}
        onClose={() =>
          setNovoClienteAberto(false)
        }
        onSuccess={() => {
          setNovoClienteAberto(false)
          void central.recarregar()
        }}
      />
    </>
  )
}
