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
  const central = useCentralClientes()

  const [clienteSelecionado, setClienteSelecionado] =
    useState<ClienteCentral | null>(null)

  const [novoClienteAberto, setNovoClienteAberto] =
    useState(false)

  const abrirWhatsApp = (
    cliente: ClienteCentral
  ) => {
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

  return (
    <>
      <div className="absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-slate-100 pt-[72px] md:p-3 lg:p-4">
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm">
          <CentralClientesHeader
            visualizacao={central.visualizacao}
            onVisualizacaoChange={
              central.setVisualizacao
            }
            onNovoCliente={() =>
              setNovoClienteAberto(true)
            }
          />

          <div className="shrink-0 space-y-3 border-b border-slate-200 bg-slate-50/70 p-3 md:p-4">
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
          </div>

          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-slate-100/60 p-3 md:p-4">
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
                onOpen={setClienteSelecionado}
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
                onOpen={setClienteSelecionado}
                onMove={central.moverKanban}
              />
            )}
          </main>
        </div>
      </div>

      {clienteSelecionado && (
        <Cliente360Modal
          clienteInicial={clienteSelecionado}
          responsaveis={central.responsaveis}
          onClose={() =>
            setClienteSelecionado(null)
          }
          onWhatsApp={abrirWhatsApp}
          onTornarLead={tornarLead}
          onAlterarEtapa={alterarEtapa}
          onTransferir={central.transferir}
          onUpdated={central.recarregar}
        />
      )}

      <ModalCadastroWhatsApp
        open={novoClienteAberto}
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
