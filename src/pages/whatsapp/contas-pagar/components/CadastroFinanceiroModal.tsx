import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Search, X } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';

export type TipoCadastroFinanceiro = 'FORNECEDOR' | 'INDICADOR' | 'PARCEIRO' | 'CLIENTE' | 'OUTRO';
export interface CadastroFinanceiro { id: string; nome: string; tipo: TipoCadastroFinanceiro; documento: string | null; }
const TIPOS: TipoCadastroFinanceiro[] = ['FORNECEDOR', 'INDICADOR', 'PARCEIRO', 'CLIENTE', 'OUTRO'];
const campo = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

interface Props {
  aberto: boolean;
  tipoConta: 'PAGAR' | 'RECEBER';
  nomeSugerido?: string;
  selecionadoId?: string | null;
  onSelecionar: (cadastro: CadastroFinanceiro) => void | Promise<void>;
  onFechar: () => void;
}

/** Modal reutilizável: pesquisar existentes ou criar novo e selecionar na mesma operação. */
export default function CadastroFinanceiroModal({ aberto, tipoConta, nomeSugerido = '', selecionadoId, onSelecionar, onFechar }: Props) {
  const [lista, setLista] = useState<CadastroFinanceiro[]>([]);
  const [pesquisa, setPesquisa] = useState('');
  const [novo, setNovo] = useState(false);
  const [nomeNovo, setNomeNovo] = useState('');
  const [tipoNovo, setTipoNovo] = useState<TipoCadastroFinanceiro>('FORNECEDOR');
  const [documento, setDocumento] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [corretoraId, setCorretoraId] = useState('');

  useEffect(() => {
    if (!aberto) return;
    let ativo = true;
    setPesquisa(nomeSugerido);
    setNomeNovo(nomeSugerido);
    setNovo(false);
    setTipoNovo(tipoConta === 'PAGAR' ? 'FORNECEDOR' : 'CLIENTE');
    setDocumento('');
    setErro('');
    void (async () => {
      setCarregando(true);
      try {
        const { data: auth, error: authErr } = await supabase.auth.getUser();
        if (authErr || !auth.user) throw new Error('Usuário não autenticado.');
        const { data: perfil, error: perfilErr } = await supabase.from('usuarios_perfis')
          .select('id,corretora_id,tipo_usuario,ativo').eq('id', auth.user.id).single();
        if (perfilErr || !perfil || !perfil.ativo) throw new Error('Perfil indisponível.');
        const tenant = perfil.tipo_usuario === 'CORRETORA' ? perfil.id : perfil.corretora_id;
        if (!tenant) throw new Error('Corretora não identificada.');
        const { data, error } = await supabase.from('crm_cadastro')
          .select('id,nome,tipo,documento').eq('corretora_id', tenant).eq('ativo', true)
          .order('nome', { ascending: true });
        if (error) throw new Error(error.message);
        if (!ativo) return;
        setCorretoraId(tenant);
        setLista((data ?? []) as CadastroFinanceiro[]);
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : 'Erro ao carregar cadastros.');
      } finally { if (ativo) setCarregando(false); }
    })();
    return () => { ativo = false; };
  }, [aberto, nomeSugerido, tipoConta]);

  const encontrados = useMemo(() => {
    const q = pesquisa.trim().toLocaleLowerCase('pt-BR');
    return lista.filter(c => !q || `${c.nome} ${c.documento ?? ''} ${c.tipo}`.toLocaleLowerCase('pt-BR').includes(q));
  }, [lista, pesquisa]);

  async function selecionar(cadastro: CadastroFinanceiro) {
    if (salvando) return;
    setSalvando(true); setErro('');
    try { await onSelecionar(cadastro); onFechar(); }
    catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao vincular cadastro.'); }
    finally { setSalvando(false); }
  }

  async function criar() {
    const nome = nomeNovo.trim();
    if (!nome || !corretoraId || salvando) return;
    setSalvando(true); setErro('');
    try {
      // Evita duplicação acidental por nome e tipo dentro da mesma corretora.
      const existente = lista.find(c => c.tipo === tipoNovo && c.nome.trim().toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR'));
      if (existente) { await onSelecionar(existente); onFechar(); return; }
      const { data, error } = await supabase.from('crm_cadastro')
        .insert({ corretora_id: corretoraId, tipo: tipoNovo, nome, documento: documento.trim() || null })
        .select('id,nome,tipo,documento').single();
      if (error || !data) throw new Error(error?.message ?? 'Falha ao criar cadastro.');
      const cadastro = data as CadastroFinanceiro;
      setLista(atual => [...atual, cadastro]);
      await onSelecionar(cadastro);
      onFechar();
    } catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao cadastrar.'); }
    finally { setSalvando(false); }
  }

  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/65 p-3 sm:p-5" onMouseDown={e => { if (e.target === e.currentTarget && !salvando) onFechar(); }}>
      <div role="dialog" aria-modal="true" aria-label="Localizar ou cadastrar favorecido" className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <header className="flex items-center justify-between border-b px-5 py-4 dark:border-slate-800">
          <div><h2 className="font-semibold text-slate-900 dark:text-white">{tipoConta === 'PAGAR' ? 'Selecionar favorecido' : 'Selecionar pagador'}</h2><p className="text-xs text-slate-500">Escolha um cadastro existente ou cadastre um novo.</p></div>
          <button type="button" title="Fechar" onClick={onFechar} disabled={salvando} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18}/></button>
        </header>
        <div className="min-h-0 overflow-y-auto p-5">
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setNovo(false)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${!novo ? 'bg-blue-600 text-white' : 'border dark:border-slate-700'}`}>Cadastros existentes</button>
            <button type="button" onClick={() => setNovo(true)} className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold ${novo ? 'bg-blue-600 text-white' : 'border dark:border-slate-700'}`}><Plus size={15}/> Novo cadastro</button>
          </div>
          {erro && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30">{erro}</p>}
          {!novo ? <>
            <div className="relative"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input autoFocus className={`${campo} pl-9`} value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Buscar por nome, documento ou tipo"/></div>
            {carregando ? <p className="mt-5 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={15} className="animate-spin"/>Carregando...</p> : (
              <div className="mt-3 max-h-[42vh] space-y-1 overflow-y-auto">
                {encontrados.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Nenhum cadastro encontrado. Use “Novo cadastro” para incluir.</p>}
                {encontrados.map(c => <button key={c.id} type="button" disabled={salvando} onClick={() => void selecionar(c)} className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left text-sm hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-slate-800 ${c.id === selecionadoId ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : ''}`}>
                  <span><strong className="block text-slate-800 dark:text-slate-100">{c.nome}</strong><span className="text-xs text-slate-500">{c.tipo}{c.documento ? ` · ${c.documento}` : ''}</span></span>
                  {c.id === selecionadoId && <span className="text-xs font-semibold text-blue-600">Vinculado</span>}
                </button>)}
              </div>
            )}
          </> : <div className="space-y-3">
            <label className="block text-xs font-semibold">Nome / razão social<input className={`mt-1 ${campo}`} value={nomeNovo} onChange={e => setNomeNovo(e.target.value)} placeholder="Nome do novo cadastro"/></label>
            <label className="block text-xs font-semibold">Tipo<select className={`mt-1 ${campo}`} value={tipoNovo} onChange={e => setTipoNovo(e.target.value as TipoCadastroFinanceiro)}>{TIPOS.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
            <label className="block text-xs font-semibold">CPF / CNPJ (opcional)<input className={`mt-1 ${campo}`} value={documento} onChange={e => setDocumento(e.target.value)} placeholder="Documento"/></label>
            <button type="button" onClick={() => void criar()} disabled={salvando || carregando || !corretoraId || !nomeNovo.trim()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{salvando && <Loader2 size={15} className="animate-spin"/>}Cadastrar e selecionar</button>
          </div>}
        </div>
      </div>
    </div>
  );
}
