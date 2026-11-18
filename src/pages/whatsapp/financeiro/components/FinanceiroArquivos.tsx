import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Download,
  Eye,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import {
  criarUrlLeituraFinanceiroArquivo,
  enviarFinanceiroArquivo,
  excluirFinanceiroArquivo,
  formatarDataFinanceiroArquivo,
  formatarTamanhoFinanceiroArquivo,
  listarFinanceiroArquivos,
  type FinanceiroArquivo,
  type FinanceiroContextoArquivo,
  type FinanceiroTipoOrigem,
} from '../services/financeiroArquivosService';

interface Props {
  tipoOrigem:
    FinanceiroTipoOrigem;

  lancamentoId:
    string;

  contextoFinanceiro:
    FinanceiroContextoArquivo;

  baixaId?:
    string | null;

  titulo?:
    string;

  /*
   * secao:
   * aparece diretamente no modal do lançamento.
   *
   * botao:
   * aparece na coluna Ações da baixa e abre
   * um pequeno modal próprio.
   */
  variante?:
    'secao' | 'botao';

  desabilitado?:
    boolean;
}

export default function FinanceiroArquivos({
  tipoOrigem,
  lancamentoId,
  contextoFinanceiro,
  baixaId = null,
  titulo,
  variante = 'secao',
  desabilitado = false,
}: Props) {
  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [
    arquivos,
    setArquivos,
  ] = useState<
    FinanceiroArquivo[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    enviando,
    setEnviando,
  ] = useState(false);

  const [
    excluindoId,
    setExcluindoId,
  ] = useState<string | null>(
    null
  );

  const [
    abrindoId,
    setAbrindoId,
  ] = useState<string | null>(
    null
  );

  const [
    erro,
    setErro,
  ] = useState('');

  const [
    modalAberto,
    setModalAberto,
  ] = useState(false);

  const tituloFinal =
    titulo ??
    (
      contextoFinanceiro ===
      'BAIXA'
        ? tipoOrigem ===
          'CONTAS_PAGAR'
          ? 'Anexos da baixa'
          : 'Anexos do recebimento'
        : 'Anexos do lançamento'
    );

  /*
   * Se for seção, carrega imediatamente.
   *
   * Se for botão da tabela, só consulta quando
   * o usuário realmente abrir os anexos.
   *
   * Isso evita uma consulta por baixa durante
   * a abertura do modal financeiro.
   */
  useEffect(() => {
    if (
      variante !== 'secao'
    ) {
      return;
    }

    void carregarArquivos();
  }, [
    variante,
    tipoOrigem,
    lancamentoId,
    contextoFinanceiro,
    baixaId,
  ]);

  useEffect(() => {
    if (
      variante !== 'botao' ||
      !modalAberto
    ) {
      return;
    }

    void carregarArquivos();
  }, [
    modalAberto,
  ]);

  async function carregarArquivos() {
    try {
      setLoading(true);
      setErro('');

      const lista =
        await listarFinanceiroArquivos({
          tipoOrigem,
          lancamentoId,
          contextoFinanceiro,
          baixaId,
        });

      setArquivos(
        lista
      );
    } catch (error) {
      console.error(
        '[FinanceiroArquivos] Erro ao carregar:',
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os anexos.'
      );
    } finally {
      setLoading(false);
    }
  }

  function selecionarArquivo() {
    if (
      desabilitado ||
      enviando
    ) {
      return;
    }

    inputRef.current?.click();
  }

  async function handleArquivoSelecionado(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    /*
     * Permite escolher novamente o mesmo arquivo
     * depois de um upload.
     */
    event.target.value =
      '';

    if (!file) {
      return;
    }

    try {
      setEnviando(true);
      setErro('');

      const arquivo =
        await enviarFinanceiroArquivo({
          tipoOrigem,
          lancamentoId,
          contextoFinanceiro,
          baixaId,
          file,
        });

      /*
       * Adiciona imediatamente na tela sem exigir
       * nova consulta.
       */
      setArquivos(
        (atual) => [
          arquivo,
          ...atual.filter(
            (item) =>
              item.id !==
              arquivo.id
          ),
        ]
      );
    } catch (error) {
      console.error(
        '[FinanceiroArquivos] Erro no upload:',
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível enviar o arquivo.'
      );
    } finally {
      setEnviando(false);
    }
  }

  async function abrirArquivo(
    arquivo: FinanceiroArquivo
  ) {
    if (
      abrindoId
    ) {
      return;
    }

    /*
     * Abre a aba imediatamente para reduzir
     * chance de bloqueio de popup pelo navegador.
     */
    const novaAba =
      window.open(
        '',
        '_blank'
      );

    try {
      setAbrindoId(
        arquivo.id
      );

      setErro('');

      const url =
        await criarUrlLeituraFinanceiroArquivo(
          arquivo.storage_path
        );

      if (novaAba) {
        novaAba.location.href =
          url;

        return;
      }

      window.open(
        url,
        '_blank',
        'noopener,noreferrer'
      );
    } catch (error) {
      novaAba?.close();

      console.error(
        '[FinanceiroArquivos] Erro ao abrir arquivo:',
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível abrir o arquivo.'
      );
    } finally {
      setAbrindoId(
        null
      );
    }
  }

  async function baixarArquivo(
    arquivo: FinanceiroArquivo
  ) {
    if (
      abrindoId
    ) {
      return;
    }

    try {
      setAbrindoId(
        arquivo.id
      );

      setErro('');

      const url =
        await criarUrlLeituraFinanceiroArquivo(
          arquivo.storage_path
        );

      /*
       * O URL é assinado pelo B2.
       * Alguns navegadores podem abrir o arquivo
       * quando o provider não envia Content-Disposition.
       */
      const link =
        document.createElement(
          'a'
        );

      link.href =
        url;

      link.target =
        '_blank';

      link.rel =
        'noopener noreferrer';

      link.download =
        arquivo.nome_original;

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );
    } catch (error) {
      console.error(
        '[FinanceiroArquivos] Erro ao baixar arquivo:',
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível baixar o arquivo.'
      );
    } finally {
      setAbrindoId(
        null
      );
    }
  }

  async function removerArquivo(
    arquivo: FinanceiroArquivo
  ) {
    if (
      excluindoId ||
      desabilitado
    ) {
      return;
    }

    const confirmou =
      window.confirm(
        `Deseja excluir o arquivo "${arquivo.nome_original}"?`
      );

    if (!confirmou) {
      return;
    }

    try {
      setExcluindoId(
        arquivo.id
      );

      setErro('');

      await excluirFinanceiroArquivo(
        arquivo.id
      );

      setArquivos(
        (atual) =>
          atual.filter(
            (item) =>
              item.id !==
              arquivo.id
          )
      );
    } catch (error) {
      console.error(
        '[FinanceiroArquivos] Erro ao excluir:',
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir o arquivo.'
      );
    } finally {
      setExcluindoId(
        null
      );
    }
  }

  function fecharModal() {
    if (
      enviando ||
      excluindoId
    ) {
      return;
    }

    setModalAberto(
      false
    );

    setErro('');
  }

  const conteudo = (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={
          handleArquivoSelecionado
        }
      />

      {erro && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {erro}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[100px] items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Loader2
            size={17}
            className="animate-spin"
          />

          Carregando anexos...
        </div>
      ) : arquivos.length === 0 ? (
        <div className="flex min-h-[100px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 px-4 py-5 text-center dark:border-slate-700">
          <Paperclip
            size={21}
            className="mb-2 text-slate-400"
          />

          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Nenhum anexo
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Adicione comprovantes, boletos,
            notas, recibos ou outros documentos.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {arquivos.map(
            (arquivo) => {
              const processando =
                abrindoId ===
                  arquivo.id ||
                excluindoId ===
                  arquivo.id;

              return (
                <div
                  key={
                    arquivo.id
                  }
                  className="flex items-center gap-3 bg-white px-3 py-3 dark:bg-slate-900"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <FileText
                      size={17}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium text-slate-700 dark:text-slate-200"
                      title={
                        arquivo.nome_original
                      }
                    >
                      {
                        arquivo.nome_original
                      }
                    </p>

                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
                      <span>
                        {formatarTamanhoFinanceiroArquivo(
                          arquivo.tamanho_bytes
                        )}
                      </span>

                      <span>
                        •
                      </span>

                      <span>
                        {formatarDataFinanceiroArquivo(
                          arquivo.created_at
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      title="Visualizar"
                      disabled={
                        processando
                      }
                      onClick={() =>
                        void abrirArquivo(
                          arquivo
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-blue-600 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                    >
                      {abrindoId ===
                      arquivo.id ? (
                        <Loader2
                          size={15}
                          className="animate-spin"
                        />
                      ) : (
                        <Eye
                          size={15}
                        />
                      )}
                    </button>

                    <button
                      type="button"
                      title="Baixar"
                      disabled={
                        processando
                      }
                      onClick={() =>
                        void baixarArquivo(
                          arquivo
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-blue-600 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                    >
                      <Download
                        size={15}
                      />
                    </button>

                    {!desabilitado && (
                      <button
                        type="button"
                        title="Excluir"
                        disabled={
                          processando
                        }
                        onClick={() =>
                          void removerArquivo(
                            arquivo
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                      >
                        {excluindoId ===
                        arquivo.id ? (
                          <Loader2
                            size={15}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2
                            size={15}
                          />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </>
  );

  /*
   * =======================================================
   * VARIANTE BOTÃO
   * =======================================================
   *
   * Usada dentro da coluna Ações das baixas.
   */
  if (
    variante === 'botao'
  ) {
    return (
      <>
        <button
          type="button"
          title={tituloFinal}
          disabled={
            desabilitado
          }
          onClick={() =>
            setModalAberto(
              true
            )
          }
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-300"
        >
          <Paperclip
            size={15}
          />
        </button>

        {modalAberto && (
          <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                    <Paperclip
                      size={17}
                    />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                      {tituloFinal}
                    </h3>

                    <p className="mt-0.5 text-xs text-slate-400">
                      {arquivos.length}{' '}
                      arquivo
                      {arquivos.length ===
                      1
                        ? ''
                        : 's'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={
                    enviando ||
                    Boolean(
                      excluindoId
                    )
                  }
                  onClick={
                    fecharModal
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <X
                    size={18}
                  />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {conteudo}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                <span className="text-xs text-slate-400">
                  Os arquivos também ficam disponíveis
                  na Central de Armazenamento.
                </span>

                {!desabilitado && (
                  <button
                    type="button"
                    onClick={
                      selecionarArquivo
                    }
                    disabled={
                      enviando
                    }
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {enviando ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Plus
                        size={16}
                      />
                    )}

                    {enviando
                      ? 'Enviando...'
                      : 'Adicionar arquivo'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  /*
   * =======================================================
   * VARIANTE SEÇÃO
   * =======================================================
   *
   * Usada diretamente no modal do lançamento.
   */
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/50">
        <div className="flex items-center gap-2">
          <Paperclip
            size={16}
            className="text-slate-500 dark:text-slate-400"
          />

          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {tituloFinal}
            </h3>

            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {arquivos.length}{' '}
              arquivo
              {arquivos.length === 1
                ? ''
                : 's'}
            </p>
          </div>
        </div>

        {!desabilitado && (
          <button
            type="button"
            onClick={
              selecionarArquivo
            }
            disabled={
              enviando
            }
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <Plus
                size={16}
              />
            )}

            {enviando
              ? 'Enviando...'
              : 'Adicionar arquivo'}
          </button>
        )}
      </div>

      <div className="p-4">
        {conteudo}
      </div>
    </section>
  );
}