import {
  Eye,
  MapPin,
  UserRound,
} from 'lucide-react'
import {
  useMemo,
  useState,
} from 'react'

import type {
  CrmWhatsAppVinculo,
} from '../../services/crmWhatsAppClienteService'

import ContactCadastroModal from './ContactCadastroModal'

interface Props {
  vinculo: CrmWhatsAppVinculo
  onUpdated?: () =>
    void | Promise<void>
}

const somenteNumeros = (
  valor?: unknown
) =>
  String(
    valor ?? ''
  ).replace(/\D/g, '')

const formatarDocumento = (
  valor: string,
  tipo: 'PF' | 'PJ'
) => {
  const numeros =
    somenteNumeros(valor)

  if (
    tipo === 'PF' &&
    numeros.length === 11
  ) {
    return numeros.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      '$1.$2.$3-$4'
    )
  }

  if (
    tipo === 'PJ' &&
    numeros.length === 14
  ) {
    return numeros.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5'
    )
  }

  return valor || '—'
}

export default function ContactDadosTab({
  vinculo,
  onUpdated,
}: Props) {
  const [
    modalAberto,
    setModalAberto,
  ] = useState(false)

  const registro =
    vinculo.tipo === 'PF'
      ? vinculo.pessoa
      : vinculo.empresa

  const dados =
    (registro?.dados ||
      {}) as Record<
      string,
      any
    >

  const contexto =
    useMemo(
      () =>
        vinculo.tipo ===
        'PF'
          ? {
              id: vinculo
                .pessoa.id,
              tipo:
                'PF' as const,
            }
          : {
              id: vinculo
                .empresa.id,
              tipo:
                'PJ' as const,
            },
      [vinculo]
    )

  const nome =
    vinculo.tipo === 'PF'
      ? dados.nome
      : dados.nome_fantasia ||
        dados.razao_social

  const documento =
    vinculo.tipo === 'PF'
      ? vinculo.pessoa.cpf
      : vinculo.empresa.cnpj

  const telefones =
    Array.isArray(
      dados.telefones
    )
      ? dados.telefones
      : []

  const emails =
    Array.isArray(
      dados.emails
    )
      ? dados.emails
      : []

  const enderecos =
    Array.isArray(
      dados.enderecos
    )
      ? dados.enderecos
      : []

  const telefone =
    telefones.find(
      (item: any) =>
        item?.principal
    )?.numero ||
    telefones[0]
      ?.numero ||
    dados.telefone ||
    ''

  const email =
    emails.find(
      (item: any) =>
        item?.principal
    )?.email ||
    emails[0]?.email ||
    dados.email ||
    ''

  const endereco =
    enderecos.find(
      (item: any) =>
        item?.principal
    ) ||
    enderecos[0] ||
    dados.endereco ||
    null

  const localizacao =
    endereco
      ? [
          endereco.municipio,
          endereco.uf,
        ]
          .filter(Boolean)
          .join(' - ')
      : ''

  return (
    <>
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <UserRound
                size={16}
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-800">
                {nome ||
                  'Cliente sem nome'}
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                Cliente CRM •{' '}
                {
                  vinculo.tipo
                }
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-3">
            <Info
              label={
                vinculo.tipo ===
                'PF'
                  ? 'CPF'
                  : 'CNPJ'
              }
              value={formatarDocumento(
                String(
                  documento ||
                    ''
                ),
                vinculo.tipo
              )}
            />

            <Info
              label="Telefone"
              value={
                telefone ||
                '—'
              }
            />

            <Info
              label="E-mail"
              value={
                email || '—'
              }
              full
            />

            <Info
              label="Localização"
              value={
                localizacao ||
                '—'
              }
              full
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setModalAberto(
              true
            )
          }
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
        >
          <Eye size={14} />
          Ver cadastro completo
        </button>

        {localizacao && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <MapPin
              size={13}
            />
            {localizacao}
          </div>
        )}
      </div>

      <ContactCadastroModal
        open={
          modalAberto
        }
        clienteId={
          contexto.id
        }
        tipoCliente={
          contexto.tipo
        }
        onClose={() =>
          setModalAberto(
            false
          )
        }
        onUpdated={
          onUpdated
        }
      />
    </>
  )
}

function Info({
  label,
  value,
  full = false,
}: {
  label: string
  value: string
  full?: boolean
}) {
  return (
    <div
      className={
        full
          ? 'col-span-2 min-w-0'
          : 'min-w-0'
      }
    >
      <p className="text-[9px] uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-0.5 truncate text-[11px] font-medium text-slate-600">
        {value}
      </p>
    </div>
  )
}