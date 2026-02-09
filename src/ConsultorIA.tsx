import { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabaseClient'; // Ajuste o caminho conforme seu projeto
import { MessageSquare, Send, X, Bot, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function ConsultorIA() {
  const [isOpen, setIsOpen] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const [historico, setHistorico] = useState<{ tipo: 'user' | 'ia', texto: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll automático para a última mensagem
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

      // Buscamos o perfil para passar o corretora_id e user_id
      const { data: perfil } = await supabase
        .from('usuarios_perfis')
        .select('id, corretora_id')
        .eq('id', session.user.id)
        .single();

      // Chamada para a Edge Function que configuramos
      const { data, error } = await supabase.functions.invoke('ia-consultor', {
        body: { 
          prompt: pergunta,
          userId: perfil?.id,
          corretoraId: perfil?.corretora_id
        }
      });

      if (error) throw error;

      setHistorico(prev => [...prev, { tipo: 'ia', texto: data.text }]);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao consultar a IA");
      setHistorico(prev => [...prev, { tipo: 'ia', texto: "Desculpe, tive um problema ao processar sua consulta. Verifique sua conexão." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      {/* Janela do Chat */}
      {isOpen && (
        <div className="mb-4 w-80 md:w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bot size={24} />
              <span className="font-bold">Estrategista SeguroCRM</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 p-1 rounded">
              <X size={20} />
            </button>
          </div>

          {/* Mensagens */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {historico.length === 0 && (
              <div className="text-center text-gray-500 mt-10">
                <Bot size={40} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Olá! Sou sua IA treinada no seu manual operacional. Como posso ajudar hoje?</p>
              </div>
            )}
            {historico.map((msg, i) => (
              <div key={i} className={`flex ${msg.tipo === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.tipo === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none shadow-sm'
                }`}>
                  {msg.texto}
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
              placeholder="Pergunte sobre clientes ou comissões..."
              className="flex-1 text-sm border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              onClick={handleEnviar}
              disabled={loading}
              className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Botão Flutuante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
      >
        {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
      </button>
    </div>
  );
}