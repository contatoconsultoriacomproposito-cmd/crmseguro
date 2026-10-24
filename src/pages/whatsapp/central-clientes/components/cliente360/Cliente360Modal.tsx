import {
  useEffect,
  useState,
} from 'react'
import { Loader2 } from 'lucide-react'
import type {
  Cliente360Tab,
  ClienteCentral,
  ClienteKanbanStage,
  ResponsavelCentral,
} from '../../types/centralClientes'
import { useCliente360 } from '../../hooks/useCliente360'
import Cliente360Header from './Cliente360Header'
import Cliente360Tabs from './Cliente360Tabs'
import ClienteCadastroTab from './tabs/ClienteCadastroTab'
import ClienteAgendaTab from './tabs/ClienteAgendaTab'
import ClientePropostasTab from './tabs/ClientePropostasTab'
import ClienteContratosTab from './tabs/ClienteContratosTab'
import ClienteSinistrosTab from './tabs/ClienteSinistrosTab'
import ClienteAssistenciasTab from './tabs/ClienteAssistenciasTab'
import ClienteFinanceiroTab from './tabs/ClienteFinanceiroTab'
import ClienteArquivosTab from './tabs/ClienteArquivosTab'
import ClienteComissoesTab from './tabs/ClienteComissoesTab'

interface Props {
  clienteInicial: ClienteCentral
  responsaveis: ResponsavelCentral[]
  onClose: () => void
  onWhatsApp: (cliente: ClienteCentral) => void
  onTornarLead: (cliente: ClienteCentral) => Promise<void>
  onAlterarEtapa: (
    cliente: ClienteCentral,
    etapa: ClienteKanbanStage
  ) => Promise<void>
  onTransferir: (
    cliente: ClienteCentral,
    responsavelId: string
  ) => Promise<void>
  onUpdated: () => Promise<void>
}

export default function Cliente360Modal({
  clienteInicial,
  responsaveis,
  onClose,
  onWhatsApp,
  onTornarLead,
  onAlterarEtapa,
  onTransferir,
  onUpdated,
}: Props) {
  const [activeTab, setActiveTab] =
    useState<Cliente360Tab>('cadastro')
  const [salvando, setSalvando] = useState(false)
  const {
    cliente,
    contadores,
    loading,
    error,
    recarregar,
  } = useCliente360(clienteInicial)

  useEffect(() => {
    setActiveTab('cadastro')
  }, [clienteInicial.id, clienteInicial.tipo])

  const atualizarTudo = async () => {
    await Promise.all([
      recarregar(),
      onUpdated(),
    ])
  }

  const tornarLead = async (
    atual: ClienteCentral
  ) => {
    setSalvando(true)
    try {
      await onTornarLead(atual)
      await atualizarTudo()
    } finally {
      setSalvando(false)
    }
  }

  const alterarEtapa = async (
    atual: ClienteCentral,
    etapa: ClienteKanbanStage
  ) => {
    setSalvando(true)
    try {
      await onAlterarEtapa(atual, etapa)
      await atualizarTudo()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:p-4"
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="flex h-full w-full flex-col overflow-hidden bg-slate-50 sm:h-[94vh] sm:max-w-[1500px] sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-2xl">
        {loading && !cliente ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2
              size={26}
              className="animate-spin text-blue-600"
            />
          </div>
        ) : error || !cliente ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-rose-600">
            {error?.message ||
              'Não foi possível carregar o cliente.'}
          </div>
        ) : (
          <>
            <Cliente360Header
              cliente={cliente}
              salvando={salvando}
              onClose={onClose}
              onWhatsApp={onWhatsApp}
              onTornarLead={tornarLead}
              onAlterarEtapa={alterarEtapa}
            />

            <Cliente360Tabs
              active={activeTab}
              contadores={contadores}
              onChange={setActiveTab}
            />

            <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
              {activeTab === 'cadastro' && (
                <ClienteCadastroTab
                  cliente={cliente}
                  responsaveis={responsaveis}
                  onTransferir={onTransferir}
                  onUpdated={atualizarTudo}
                />
              )}

              {activeTab === 'agenda' && (
                <ClienteAgendaTab cliente={cliente} />
              )}

              {activeTab === 'propostas' && (
                <ClientePropostasTab cliente={cliente} />
              )}

              {activeTab === 'contratos' && (
                <ClienteContratosTab cliente={cliente} />
              )}

              {activeTab === 'sinistros' && (
                <ClienteSinistrosTab cliente={cliente} />
              )}

              {activeTab === 'assistencias' && (
                <ClienteAssistenciasTab
                  cliente={cliente}
                />
              )}

              {activeTab === 'financeiro' && (
                <ClienteFinanceiroTab cliente={cliente} />
              )}

              {activeTab === 'comissoes' && (
                <ClienteComissoesTab cliente={cliente} />
              )}

              {activeTab === 'arquivos' && (
                <ClienteArquivosTab cliente={cliente} />
              )}
            </main>
          </>
        )}
      </div>
    </div>
  )
}
