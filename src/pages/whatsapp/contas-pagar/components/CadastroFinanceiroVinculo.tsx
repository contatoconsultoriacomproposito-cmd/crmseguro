import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import CadastroFinanceiroModal, { type CadastroFinanceiro } from './CadastroFinanceiroModal';

interface Props { tipoConta: 'PAGAR' | 'RECEBER'; lancamentoId: string; podeEditar: boolean; }
/** Mantém o cadastro do lançamento como fonte do vínculo herdado pela baixa. */
export default function CadastroFinanceiroVinculo({ tipoConta, lancamentoId, podeEditar }: Props) {
  const [modalAberto, setModalAberto] = useState(false);
  const [cadastroId, setCadastroId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [nomeLivre, setNomeLivre] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const tabela = tipoConta === 'PAGAR' ? 'crm_contas_pagar_lancamentos' : 'crm_contas_receber_lancamentos';
  const colunaNome = tipoConta === 'PAGAR' ? 'favorecido' : 'pagador';

  const carregar = useCallback(async () => {
    const { data: lancamento, error } = await supabase.from(tabela)
      .select(`cadastro_id,${colunaNome}`).eq('id', lancamentoId).single();
    if (error) throw new Error(error.message);
    const id = lancamento?.cadastro_id ?? null;
    setCadastroId(id);
    const nomeLancamento = lancamento
      ? ('favorecido' in lancamento ? lancamento.favorecido : lancamento.pagador)
      : null;
    setNomeLivre(String(nomeLancamento ?? ''));
    if (!id) { setNome(''); return; }
    const { data: cadastro, error: erroCadastro } = await supabase.from('crm_cadastro')
      .select('nome').eq('id', id).maybeSingle();
    if (erroCadastro) throw new Error(erroCadastro.message);
    setNome(cadastro?.nome ?? 'Cadastro vinculado');
  }, [tabela, colunaNome, lancamentoId]);

  useEffect(() => {
    let ativo = true;
    void carregar().catch(e => { if (ativo) setErro(e instanceof Error ? e.message : 'Falha ao carregar favorecido.'); });
    return () => { ativo = false; };
  }, [carregar]);

  async function selecionar(cadastro: CadastroFinanceiro) {
    if (!podeEditar) throw new Error('Sem permissão para vincular cadastro.');
    setSalvando(true); setErro('');
    try {
      const { error } = await supabase.from(tabela)
        .update({ cadastro_id: cadastro.id, [colunaNome]: cadastro.nome })
        .eq('id', lancamentoId);
      if (error) throw new Error(error.message);
      await carregar();
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : 'Falha ao vincular cadastro.';
      setErro(mensagem);
      throw new Error(mensagem);
    } finally { setSalvando(false); }
  }

  return <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
    <h3 className="text-sm font-semibold">{tipoConta === 'PAGAR' ? 'Favorecido / fornecedor' : 'Pagador'} — cadastro opcional</h3>
    <p className="mt-1 text-xs text-slate-500">O cadastro vinculado ao lançamento será utilizado como sugestão na baixa.</p>
    <div className="mt-3 flex items-center gap-2">
      <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900">
        {nome || (nomeLivre ? `${nomeLivre} (texto livre, sem vínculo)` : 'Nenhum cadastro vinculado')}
      </div>
      {podeEditar && <button type="button" disabled={salvando} onClick={() => setModalAberto(true)} title="Buscar ou cadastrar favorecido" aria-label="Buscar ou cadastrar favorecido" className="flex h-10 w-11 items-center justify-center rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50 dark:border-slate-700"><Search size={18}/></button>}
    </div>
    {erro && <p role="alert" className="mt-2 text-xs text-red-600">{erro}</p>}
    <CadastroFinanceiroModal aberto={modalAberto} tipoConta={tipoConta} selecionadoId={cadastroId}
      nomeSugerido={nome || nomeLivre} onFechar={() => setModalAberto(false)} onSelecionar={selecionar}/>
  </section>;
}
