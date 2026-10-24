import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  buscarCliente360Cabecalho,
  buscarContadoresCliente360,
} from '../services/cliente360Service'
import type {
  Cliente360Contadores,
  ClienteCentral,
} from '../types/centralClientes'

const CONTADORES_INICIAIS: Cliente360Contadores = {
  agenda: 0,
  propostas: 0,
  contratos: 0,
  sinistros: 0,
  assistencias: 0,
  financeiro: 0,
  arquivos: 0,
}

export function useCliente360(
  clienteInicial: ClienteCentral | null
) {
  const [cliente, setCliente] =
    useState<ClienteCentral | null>(clienteInicial)
  const [contadores, setContadores] =
    useState<Cliente360Contadores>(
      CONTADORES_INICIAIS
    )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const carregar = useCallback(async () => {
    if (!clienteInicial) {
      setCliente(null)
      setContadores(CONTADORES_INICIAIS)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [cabecalho, novosContadores] =
        await Promise.all([
          buscarCliente360Cabecalho(
            clienteInicial.tipo,
            clienteInicial.id
          ),
          buscarContadoresCliente360(clienteInicial),
        ])

      setCliente(cabecalho)
      setContadores(novosContadores)
    } catch (erro) {
      setError(
        erro instanceof Error
          ? erro
          : new Error(
              'Não foi possível carregar o cliente.'
            )
      )
    } finally {
      setLoading(false)
    }
  }, [clienteInicial])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return {
    cliente,
    setCliente,
    contadores,
    loading,
    error,
    recarregar: carregar,
  }
}
