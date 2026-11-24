import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabaseClient';

type Cadastro = { id: string; nome: string; tipo: string };

interface Props {
  tipoConta: 'PAGAR' | 'RECEBER';
  value: string;
  onChange: (id: string, nome: string) => void;
  desabilitado?: boolean;
}

/**
 * Consulta somente cadastros existentes.
 * Novos cadastros são criados exclusivamente no botão "Salvar lançamento",
 * pelo ModalNovoLancamento, usando o nome digitado em Favorecido/Pagador.
 */
export default function CadastroFinanceiroSelecao({
  tipoConta,
  value,
  onChange,
  desabilitado = false,
}: Props) {
  const [cadastros, setCadastros] = useState<Cadastro[]>([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        setCarregando(true);
        const { data, error } = await supabase
          .from('crm_cadastro')
          .select('id,nome,tipo')
          .eq('ativo', true)
          .order('nome', { ascending: true });

        if (!ativo) return;
        if (error) throw new Error(error.message);
        setCadastros((data ?? []) as Cadastro[]);
        setErro('');
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível carregar os cadastros.');
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, []);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3 dark:border-slate-700 dark:bg-slate-900/40">
      <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
        Usar {tipoConta === 'PAGAR' ? 'fornecedor' : 'pagador'} já cadastrado (opcional)
      </label>
      <select
        aria-label="Selecionar cadastro existente"
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        value={value}
        disabled={desabilitado || carregando}
        onChange={(event) => {
          const selecionado = cadastros.find((c) => c.id === event.target.value);
          onChange(event.target.value, selecionado?.nome ?? '');
        }}
      >
        <option value="">{carregando ? 'Carregando cadastros...' : 'Não selecionar cadastro existente'}</option>
        {cadastros.map((cadastro) => (
          <option key={cadastro.id} value={cadastro.id}>
            {cadastro.nome} ({cadastro.tipo})
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
        Selecione um existente para preencher o nome acima, ou digite um novo nome no campo Favorecido/Pagador.
        Não é necessário cadastrar antes de salvar o lançamento.
      </p>
      {erro && <p role="alert" className="mt-2 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
