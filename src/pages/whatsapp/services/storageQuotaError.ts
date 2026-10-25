export type StorageErrorCode =
  | 'STORAGE_LIMIT_EXCEEDED'
  | 'FILE_TOO_LARGE'
  | 'STORAGE_VALIDATION_ERROR'

export class StorageQuotaError extends Error {
  code: StorageErrorCode
  status?: number

  constructor(
    message: string,
    code: StorageErrorCode,
    status?: number,
  ) {
    super(message)
    this.name = 'StorageQuotaError'
    this.code = code
    this.status = status
  }
}

function detectarCodigoStorage(
  code?: unknown,
  message?: unknown,
): StorageErrorCode | null {
  const codigo =
    typeof code === 'string'
      ? code.trim().toUpperCase()
      : ''

  const mensagem =
    typeof message === 'string'
      ? message.toLowerCase()
      : ''

  if (
    codigo === 'STORAGE_LIMIT_EXCEEDED' ||
    mensagem.includes(
      'espaço de armazenamento insuficiente',
    )
  ) {
    return 'STORAGE_LIMIT_EXCEEDED'
  }

  if (
    codigo === 'FILE_TOO_LARGE' ||
    mensagem.includes(
      'tamanho máximo permitido',
    )
  ) {
    return 'FILE_TOO_LARGE'
  }

  if (
    codigo === 'STORAGE_VALIDATION_ERROR'
  ) {
    return 'STORAGE_VALIDATION_ERROR'
  }

  return null
}

export async function extrairStorageQuotaError(
  error: unknown,
): Promise<StorageQuotaError | null> {
  const erro = error as {
    message?: string
    context?: Response
  }

  let body:
    | {
        error?: string
        message?: string
        code?: string
      }
    | null = null

  let status:
    | number
    | undefined

  if (
    erro?.context instanceof Response
  ) {
    status =
      erro.context.status

    try {
      body =
        await erro.context
          .clone()
          .json()
    } catch {
      try {
        const text =
          await erro.context
            .clone()
            .text()

        body = {
          error: text,
        }
      } catch {
        body = null
      }
    }
  }

  const message =
    body?.error ||
    body?.message ||
    erro?.message ||
    'Não foi possível validar o armazenamento.'

  const code =
    detectarCodigoStorage(
      body?.code,
      message,
    )

  if (!code) {
    return null
  }

  return new StorageQuotaError(
    message,
    code,
    status,
  )
}

export function isStorageLimitError(
  error: unknown,
): error is StorageQuotaError {
  return (
    error instanceof StorageQuotaError &&
    error.code ===
      'STORAGE_LIMIT_EXCEEDED'
  )
}