import {
  FileCheck2,
  Loader2,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { toast } from 'sonner'
import { supabase } from '../../../../../../lib/supabaseClient'
import type { ClienteCentral } from '../../../types/centralClientes'

interface ContratoRow {
  id: string
  produto_id: string
  seguradora_id: string | null
  numero_apolice: string | null
  inicio_vigencia: string | null
  fim_vigencia: string | null
  status: string
  valor_atual: number | null
  produtoNome?: string
  seguradoraNome?: string
}

export default function ClienteContratosTab({
  cliente,
}: {
  cliente: ClienteCentral
}) {
  const [itens, setItens] = useState<ContratoRow[]>([])
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const coluna =
        cliente.tipo === 'PF'
          ? 'crm_pessoa_id'
          : 'crm_empresa_id'

      const { data, error } = await supabase
        .from('crm_contratos')
        .select(`
          id,
          produto_id,
          seguradora_id,
          numero_apolice,
          inicio_vigencia,
          fim_vigencia,
          status,
          valor_atual
        `)
        .eq(coluna, cliente.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const contratos = (data || []) as ContratoRow[]
      const produtoIds = [
        ...new Set(
          contratos.map(item => item.produto_id).filter(Boolean)
        ),
      ]
      const seguradoraIds = [
        ...new Set(
          contratos
            .map(item => item.seguradora_id)
            .filter((id): id is string => Boolean(id))
        ),
      ]

      const [produtos, seguradoras] = await Promise.all([
        produtoIds.length
          ? supabase
              .from('base_produtos')
              .select('id, nome')
              .in('id', produtoIds)
          : Promise.resolve({ data: [], error: null }),
        seguradoraIds.length
          ? supabase
              .from('base_seguradoras')
              .select('id, nome')
              .in('id', seguradoraIds)
          : Promise.resolve({ data: [], error: null }),
      ])

      if (produtos.error) throw produtos.error
      if (seguradoras.error) throw seguradoras.error

      const produtosMap = new Map(
        (produtos.data || []).map((item: any) => [
          item.id,
          item.nome,
        ])
      )
      const seguradorasMap = new Map(
        (seguradoras.data || []).map((item: any) => [
          item.id,
          item.nome,
        ])
      )

      setItens(
        contratos.map(item => ({
          ...item,
          produtoNome:
            produtosMap.get(item.produto_id) || 'Produto',
          seguradoraNome: item.seguradora_id
            ? seguradorasMap.get(item.seguradora_id) ||
              'Seguradora'
            : undefined,
        }))
      )
    } catch (error: any) {
      toast.error(
        error?.message ||
          'Não foi possível carregar os contratos.'
      )
    } finally {
      setLoading(false)
    }
  }, [cliente.id, cliente.tipo])

  useEffect(() => {
    void carregar()
  }, [carregar])

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2
          size={22}
          className="animate-spin text-blue-600"
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-slate-800">
          Contratos
        </h3>
        <p className="mt-0.5 text-xs text-slate-400">
          Produtos efetivamente contratados.
        </p>
      </div>

      {itens.length === 0 ? (
        <Empty />
      ) : (
        itens.map(item => (
          <article
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <FileCheck2 size={15} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">
                    {item.produtoNome}
                  </h4>
                  <p className="mt-1 text-xs text-slate-400">
                    {item.seguradoraNome || 'Sem seguradora'}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Apólice:{' '}
                    {item.numero_apolice || 'Aguardando emissão'}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {item.inicio_vigencia || '—'} →{' '}
                    {item.fim_vigencia || '—'}
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase text-slate-500">
                {item.status}
              </span>
            </div>
          </article>
        ))
      )}
    </div>
  )
}

function Empty() {
  return (
    <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400">
      Nenhum contrato encontrado.
    </div>
  )
}
