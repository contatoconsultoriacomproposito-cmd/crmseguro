import { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabaseClient';
import { MessageSquare, Send, X, Bot, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown'; // [NOVO] Importação para tratar links e formatação

export function ConsultorIA() {
  const [isOpen, setIsOpen] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const [historico, setHistorico] = useState<{ tipo: 'user' | 'ia', texto: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [historico]);

const handleEnviar = async () => {
  if (!mensagem.trim() || loading) return;

  const pergunta = mensagem.trim();
  setMensagem('');
  setHistorico(prev => [...prev, { tipo: 'user', texto: pergunta }]);
  setLoading(true);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Sessão expirada");

    const { data: perfil } = await supabase
      .from('usuarios_perfis')
      .select('id, corretora_id')
      .eq('id', session.user.id)
      .single();

    // 1. Chamada para a IA entender a intenção (Retorna JSON de consulta ou texto)
    const { data, error } = await supabase.functions.invoke('ia-consultor', {
      body: { prompt: pergunta, userId: perfil?.id, corretoraId: perfil?.corretora_id }
    });

    if (error) throw error;

    let respostaFinal = data.text;

    // 2. Se a resposta for um JSON de consulta, executamos a lógica de banco
    if (respostaFinal.trim().startsWith('{')) {
      try {
        const queryInfo = JSON.parse(respostaFinal);
        let resultadoDados: any = null;

        // --- LÓGICA PARA CLIENTES ---
        if (queryInfo.acao === 'consultar_clientes') {
          let query = supabase.from('tab_clientes').select('*', { count: 'exact' }).eq('corretora_id', perfil?.corretora_id);
          if (queryInfo.filtros?.tipo_cliente && queryInfo.filtros.tipo_cliente !== 'ambos') {
            query = query.eq('tipo_cliente', queryInfo.filtros.tipo_cliente);
          }
          const { count, data: rows } = await query;
          resultadoDados = queryInfo.metricas.includes('contagem') ? count : rows;
        }

        // --- LÓGICA PARA PROPOSTAS / VENDAS / RENOVAÇÕES ---
        else if (queryInfo.acao === 'consultar_propostas') {
          // Se a métrica for financeira ou de itens, consultamos a 'tab_proposta_itens' que é onde estão os valores e vigências
          if (queryInfo.entidade === 'itens' || queryInfo.filtros?.renovacao || queryInfo.metricas.includes('soma')) {
            let query = supabase
              .from('tab_proposta_itens')
              .select(`
                *,
                opcao:tab_proposta_opcoes!inner(
                  proposta:tab_propostas!inner(corretora_id, status)
                )
              `)
              .eq('opcao.proposta.corretora_id', perfil?.corretora_id);

            if (queryInfo.filtros?.status) query = query.eq('opcao.proposta.status', queryInfo.filtros.status);
            if (queryInfo.filtros?.renovacao) query = query.eq('status_renovacao', queryInfo.filtros.renovacao);

            const { data: itens } = await query;
            
            // Cálculos rápidos baseados na métrica solicitada
            if (queryInfo.metricas.includes('soma')) {
              resultadoDados = itens?.reduce((acc, curr) => acc + (curr.valor_premio || 0), 0);
            } else if (queryInfo.metricas.includes('contagem')) {
              resultadoDados = itens?.length;
            } else {
              resultadoDados = itens;
            }
          } else {
            // Consulta simples na tabela de propostas (topo do funil)
            let query = supabase.from('tab_propostas').select('*', { count: 'exact' }).eq('corretora_id', perfil?.corretora_id);
            if (queryInfo.filtros?.status) query = query.eq('status', queryInfo.filtros.status);
            
            const { count, data: rows } = await query;
            resultadoDados = queryInfo.metricas.includes('contagem') ? count : rows;
          }
        }

        // --- LÓGICA PARA INTERAÇÕES (PRODUTIVIDADE) ---
        else if (queryInfo.acao === 'consultar_interacoes') {
          let query = supabase.from('tab_interacoes').select('*', { count: 'exact' }).eq('corretora_id', perfil?.corretora_id);
          // Adicione aqui filtros de data ou tipo de ação se o seu JSON os fornecer
          const { count, data: rows } = await query;
          resultadoDados = queryInfo.metricas.includes('contagem') ? count : rows;
        }

        // 3. Segunda chamada para a IA transformar os DADOS em TEXTO COMERCIAL
        const { data: dataFormatada } = await supabase.functions.invoke('ia-consultor', {
          body: { 
            prompt: `O usuário perguntou: "${pergunta}". O resultado bruto do banco foi: ${JSON.stringify(resultadoDados)}. Traduza isso em uma resposta comercial curta, motivadora e estratégica.`,
            userId: perfil?.id,
            corretoraId: perfil?.corretora_id
          }
        });

        respostaFinal = dataFormatada.text;
      } catch (jsonErr) {
        console.error("Erro no processamento de dados:", jsonErr);
      }
    }

    setHistorico(prev => [...prev, { tipo: 'ia', texto: respostaFinal }]);
  } catch (err: any) {
    console.error(err);
    toast.error("Erro ao processar consulta");
    setHistorico(prev => [...prev, { tipo: 'ia', texto: "Desculpe, não consegui acessar os dados agora. Tente em instantes." }]);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end font-sans">
      {isOpen && (
        <div className="mb-4 w-80 md:w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bot size={24} />
              <span className="font-bold tracking-tight">Estrategista SeguroCRM</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 p-1 rounded transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Mensagens */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
            {historico.length === 0 && (
              <div className="text-center text-gray-500 mt-10 p-6">
                <Bot size={40} className="mx-auto mb-2 opacity-20 text-blue-600" />
                <p className="text-xs font-medium leading-relaxed italic">
                  Olá! Sou sua IA treinada no seu manual operacional. Como posso ajudar hoje?
                </p>
              </div>
            )}
            
            {historico.map((msg, i) => (
              <div key={i} className={`flex ${msg.tipo === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm overflow-hidden break-words whitespace-pre-wrap ${
                  msg.tipo === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                }`}>
                  {/* [CORRIGIDO] Div envolvente para aplicar os estilos de tipografia e evitar erro de prop */}
                    <div className="prose prose-sm max-w-full leading-relaxed dark:prose-invert">
                    <ReactMarkdown 
                        components={{
                        // Garante que links longos quebrem para não estourar a caixa
                        a: ({node, ...props}) => (
                            <a 
                            {...props} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-500 underline break-all font-bold hover:text-blue-700"
                            />
                        ),
                        // Remove margens excessivas de parágrafos para manter o chat compacto
                        p: ({node, ...props}) => <p {...props} className="m-0 mb-2 last:mb-0" />,
                        ul: ({node, ...props}) => <ul {...props} className="ml-4 list-disc mb-2" />,
                        ol: ({node, ...props}) => <ol {...props} className="ml-4 list-decimal mb-2" />,
                        // Garante que negritos e textos importantes respeitem o break-words
                        strong: ({node, ...props}) => <strong {...props} className="font-bold" />
                        }}
                    >
                        {msg.texto}
                    </ReactMarkdown>
                    </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-200">
                  <Loader2 size={18} className="animate-spin text-blue-600" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEnviar()}
              placeholder="Digite sua dúvida..."
              className="flex-1 text-sm border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <button 
              onClick={handleEnviar}
              disabled={loading}
              className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Botão Flutuante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:scale-110 active:scale-90 transition-all flex items-center justify-center group"
      >
        {isOpen ? (
          <X size={28} />
        ) : (
          <div className="relative">
            <MessageSquare size={28} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-blue-600 animate-pulse" />
          </div>
        )}
      </button>
    </div>
  );
}