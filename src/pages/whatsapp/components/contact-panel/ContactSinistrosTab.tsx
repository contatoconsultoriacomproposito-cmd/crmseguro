import {
  AlertTriangle,
  ChevronRight,
  Loader2,
  Plus,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import {
  buscarSinistrosDoRelacionamentoWhatsApp,
  type CrmSinistro,
} from '../../services/crmSinistroService'

import ModalNovoSinistro from '../../pages/sinistros/components/ModalNovoSinistro'

type TipoCliente = 'PF' | 'PJ'

interface Props {
  contatoId: string
  clienteId: string
  tipoCliente: TipoCliente
}

const formatarData = (
  valor?: string | null
) => {
  if (!valor) return '—'

  const partes =
    valor
      .substring(0, 10)
      .split('-')

  if (partes.length !== 3) {
    return valor
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

export default function ContactSinistrosTab({
  contatoId,
  clienteId,
  tipoCliente,
}: Props) {
  const navigate = useNavigate()

  const [itens, setItens] =
    useState<CrmSinistro[]>([])

  const [loading, setLoading] =
    useState(true)

  const [
    modalAberto,
    setModalAberto,
  ] = useState(false)

  const carregar =
  useCallback(async () => {
    setLoading(true)

    try {
      const resultado =
        await buscarSinistrosDoRelacionamentoWhatsApp({
          contato_id:
            contatoId,

          crm_pessoa_id:
            tipoCliente === 'PF'
              ? clienteId
              : null,

          crm_empresa_id:
            tipoCliente === 'PJ'
              ? clienteId
              : null,
        })

      setItens(resultado)
    } catch (error: any) {
      setItens([])

      toast.error(
        error?.message ||
          'Não foi possível carregar os sinistros.'
      )
    } finally {
      setLoading(false)
    }
  }, [
    contatoId,
    clienteId,
    tipoCliente,
  ])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const clienteInicial = {
    id: clienteId,
    tipo: tipoCliente,
  } as const

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
        <Loader2
          size={16}
          className="animate-spin"
        />
        Carregando sinistros...
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-700">
              Sinistros
            </p>

            <p className="mt-0.5 text-[11px] text-slate-400">
              Histórico de sinistros
              deste cliente.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setModalAberto(true)
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700"
          >
            <Plus size={14} />
            Novo sinistro
          </button>
        </div>

        {!itens.length ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
            <AlertTriangle
              size={22}
              className="mx-auto text-slate-300"
            />

            <p className="mt-2 text-xs font-medium text-slate-600">
              Nenhum sinistro registrado
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {itens.map(
              sinistro => (
                <button
                  key={
                    sinistro.id
                  }
                  type="button"
                  onClick={() =>
                    navigate(
                      `/whatsapp/sinistro/${sinistro.id}`
                    )
                  }
                  className="group w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-red-200 hover:bg-red-50/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <AlertTriangle
                          size={14}
                          className="text-red-500"
                        />

                        <p className="truncate text-xs font-semibold text-slate-800">
                          {sinistro.tipo_sinistro
                            ?.replaceAll(
                              '_',
                              ' '
                            ) ||
                            'Sinistro'}
                        </p>
                      </div>

                      <p className="mt-1 text-[11px] text-slate-500">
                        {sinistro.numero_sinistro
                          ? `Sinistro nº ${sinistro.numero_sinistro}`
                          : 'Número ainda não informado'}
                      </p>
                    </div>

                    <ChevronRight
                      size={16}
                      className="text-slate-300 group-hover:text-red-500"
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                    <Info
                      label="Evento"
                      value={formatarData(
                        sinistro.data_evento
                      )}
                    />

                    <Info
                      label="Status"
                      value={
                        sinistro.status?.replaceAll(
                          '_',
                          ' '
                        ) || '—'
                      }
                    />

                    <Info
                      label="Etapa"
                      value={
                        sinistro.etapa_atual?.replaceAll(
                          '_',
                          ' '
                        ) || '—'
                      }
                    />

                    <Info
                      label="Prioridade"
                      value={
                        sinistro.prioridade ||
                        'Normal'
                      }
                    />
                  </div>
                </button>
              )
            )}
          </div>
        )}
      </div>

      <ModalNovoSinistro
        open={modalAberto}
        contatoId={contatoId}
        clienteInicial={
          clienteInicial
        }
        onClose={() =>
          setModalAberto(false)
        }
        onCreated={() => {
          setModalAberto(false)
          void carregar()
        }}
      />
    </>
  )
}

function Info({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-0.5 truncate text-[11px] font-medium text-slate-600">
        {value}
      </p>
    </div>
  )
}