import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { supabase } from "../../../../lib/supabaseClient";

type Previa = {
  numero_proposta: string;
  contagens: Record<string, number>;
  impedimentos: string[];
  avisos?: string[];
  pode_excluir: boolean;
};

export default function ModalExcluirPropostaCompleta({
  propostaId, numeroProposta, onClose, onDeleted,
}: {
  propostaId: string;
  numeroProposta: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [numeroDigitado, setNumeroDigitado] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [cienteRegularizacao, setCienteRegularizacao] = useState(false);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const { data, error } = await supabase.rpc("crm_previsualizar_exclusao_proposta", { p_proposta_id: propostaId });
        if (error) throw error;
        if (ativo) setPrevia(data as Previa);
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : "Falha na análise das dependências.");
      } finally { if (ativo) setLoading(false); }
    })();
    return () => { ativo = false; };
  }, [propostaId]);

  async function confirmar() {
    if (!previa?.pode_excluir || enviando || numeroDigitado.trim() !== numeroProposta || justificativa.trim().length < 20 || (Boolean(previa.avisos?.length) && !cienteRegularizacao)) return;
    setEnviando(true); setErro("");
    try {
      const { data, error } = await supabase.rpc("crm_excluir_proposta_completa", {
        p_proposta_id: propostaId,
        p_numero_confirmacao: numeroDigitado.trim(),
        p_justificativa: justificativa.trim(),
      });
      if (error) throw error;
      if (!data?.sucesso) throw new Error("A exclusão não foi confirmada pelo banco.");
      onDeleted();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível excluir a proposta.");
    } finally { setEnviando(false); }
  }

  return (
    <div role="presentation" className="fixed inset-0 z-[130] flex items-center justify-center bg-black/65 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="exclusao-titulo" className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3"><AlertTriangle className="text-red-600" size={26} /><h2 id="exclusao-titulo" className="text-lg font-bold text-zinc-900 dark:text-white">Exclusão completa excepcional</h2></div>
          <button type="button" disabled={enviando} onClick={onClose} aria-label="Fechar"><X size={21}/></button>
        </div>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">Essa operação exclui definitivamente os registros exclusivos da proposta <strong>{numeroProposta}</strong>, incluindo contratos, comissões, contas e registros operacionais associados. O histórico será preservado em auditoria restrita.</p>
        {loading ? <div className="my-5 flex items-center gap-2 text-sm"><Loader2 className="animate-spin" size={18}/> Verificando dependências no servidor...</div> : previa && <div className="mt-4 rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-700">
          <h3 className="font-bold">Prévia dos registros associados</h3>
          <div className="mt-2 grid grid-cols-2 gap-2">{Object.entries(previa.contagens).map(([chave, quantidade]) => <div key={chave} className="flex justify-between gap-2"><span className="text-zinc-500">{chave.replaceAll("_", " ")}</span><strong>{quantidade}</strong></div>)}</div>
          {Boolean(previa.avisos?.length) && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><strong>Baixas registradas nesta proposta:</strong><ul className="mt-1 list-disc pl-5">{previa.avisos!.map(item => <li key={item}>{item}</li>)}</ul></div>}
          {previa.impedimentos.length > 0 && <div className="mt-3 rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-950/30 dark:text-red-300"><strong>Exclusão bloqueada:</strong><ul className="mt-1 list-disc pl-5">{previa.impedimentos.map(item => <li key={item}>{item}</li>)}</ul></div>}
        </div>}
        {previa && !previa.pode_excluir && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">Você pode preencher os campos para preparar a solicitação, mas a exclusão permanecerá indisponível até os impedimentos acima serem resolvidos.</p>}
        <label className="mt-4 block text-sm font-semibold">Justificativa obrigatória (mín. 20 caracteres)<textarea value={justificativa} disabled={enviando} onChange={e => setJustificativa(e.target.value)} className="mt-1 min-h-24 w-full rounded-lg border border-zinc-300 bg-transparent p-3 dark:border-zinc-700" placeholder="Descreva por que o registro deve ser eliminado e qual cadastro estava incorreto." /></label>
        <label className="mt-3 block text-sm font-semibold">Digite exatamente {numeroProposta} para confirmar<input value={numeroDigitado} disabled={enviando} onChange={e => setNumeroDigitado(e.target.value)} autoComplete="off" className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent p-3 dark:border-zinc-700" /></label>
        {Boolean(previa?.avisos?.length) && <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-amber-800 dark:text-amber-200"><input type="checkbox" checked={cienteRegularizacao} disabled={enviando} onChange={e => setCienteRegularizacao(e.target.checked)} className="mt-1" /><span>Confirmo que estou corrigindo um lançamento indevido e estou ciente de que excluir os registros no SeguroCRM não realiza estorno ou ajuste bancário externo. Eventuais pagamentos reais serão regularizados fora desta operação.</span></label>}
        {erro && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{erro}</p>}
        <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={enviando} onClick={onClose} className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700">Cancelar</button><button type="button" disabled={loading || !previa?.pode_excluir || numeroDigitado.trim() !== numeroProposta || justificativa.trim().length < 20 || (Boolean(previa?.avisos?.length) && !cienteRegularizacao) || enviando} onClick={() => void confirmar()} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{enviando ? <Loader2 className="animate-spin" size={16}/> : <Trash2 size={16}/>}Excluir definitivamente</button></div>
      </div>
    </div>
  );
}
