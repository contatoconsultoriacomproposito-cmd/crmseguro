import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { Plus, X, Trash2, UserPlus, CalendarPlus, Clock, Calendar, Building, User, Mail, Phone } from 'lucide-react';

const LISTA_PRODUTOS_GERAIS = [
  'Auto', 'Frota', 'Saúde', 'Odontológico', 'Vida Coletivo', 
  'Vida Individual', 'Equipamento', 'Previdência', 'Condomínio', 
  'Viagem', 'Empresarial', 'Residencial', 'Responsabilidade Civil'
];

const aplicarMascaraTelefone = (value: string) => {
  let v = value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 10) return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  if (v.length > 5) return v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  if (v.length > 2) return v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  return v;
};

interface Vencimento {
  id: string | null;
  produto_interesse: string;
  data_retorno: string;
  horario_retorno: string;
  breve_descricao: string;
}

interface AgendaCorretorAvulsoProps {
  evento?: any;
  onSuccess: () => void;
  isNovo?: boolean;
  onClose?: () => void;
}

export const AgendaCorretorAvulso: React.FC<AgendaCorretorAvulsoProps> = ({ evento, onSuccess, isNovo = false }) => {
  // LOG 1: Verifica se o componente está renderizando e quais props está recebendo
  

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [tipoCliente, setTipoCliente] = useState<'PF' | 'PJ'>('PF');
  const [nomeCliente, setNomeCliente] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [produtosGerais, setProdutosGerais] = useState<string[]>([]);
  const [vencimentos, setVencimentos] = useState<Vencimento[]>([]);

  useEffect(() => {
    if (!isNovo && evento) {
        setIsModalOpen(true);
    }
    }, [isNovo, evento]);

  // LOG 2: Monitora alteração do estado do modal
  useEffect(() => {

  if (isModalOpen) {
      if (!isNovo && evento) {
        const ext = evento.extendedProps || evento;
        setTipoCliente(ext.tipo_cliente || 'PF');
        setNomeCliente(ext.nome_cliente || evento.nome || evento.title || '');
        setRazaoSocial(ext.razao_social || '');
        setNomeFantasia(ext.nome_fantasia || '');
        setTelefone(ext.tel_cliente || ext.telefone || '');
        setEmail(ext.email_cliente || ext.email || '');
        
        const prods = typeof ext.produtos_gerais === 'string'
            ? ext.produtos_gerais.split(', ').filter(Boolean)
            : Array.isArray(ext.produtos_gerais)
                ? ext.produtos_gerais
                : [];

            setProdutosGerais(prods);

        const idLimpo = typeof evento.id === 'string' ? evento.id.replace('_frio', '') : (evento.id || null);
        const dataFallback = evento?.start 
            ? (typeof evento.start === 'string' 
                ? evento.start.split('T')[0] 
                : new Date(evento.start).toISOString().split('T')[0]) 
            : new Date().toISOString().split('T')[0];

        setVencimentos([{
          id: idLimpo,
          produto_interesse: ext.produto_interesse || 'Auto',
          data_retorno: ext.data_retorno || dataFallback,
          horario_retorno: ext.horario_retorno || '09:00',
          breve_descricao: ext.breve_descricao || ''
        }]);
      } else {
        setTipoCliente('PF');
        setNomeCliente('');
        setRazaoSocial('');
        setNomeFantasia('');
        setTelefone('');
        setEmail('');
        setProdutosGerais([]);
        setVencimentos([{
          id: null,
          produto_interesse: 'Auto',
          data_retorno: new Date().toISOString().split('T')[0],
          horario_retorno: '09:00',
          breve_descricao: ''
        }]);
      }
    }
  }, [isModalOpen, isNovo, evento]);

  const toggleProdutoGeral = (prod: string) => {
    setProdutosGerais(prev => 
      prev.includes(prod) ? prev.filter(p => p !== prod) : [...prev, prod]
    );
  };

  const adicionarVencimento = () => {
    setVencimentos(prev => [...prev, {
      id: null,
      produto_interesse: 'Auto',
      data_retorno: new Date().toISOString().split('T')[0],
      horario_retorno: '09:00',
      breve_descricao: ''
    }]);
  };

  const atualizarVencimento = (index: number, campo: keyof Vencimento, valor: any) => {
    const novos = [...vencimentos];
    novos[index] = { ...novos[index], [campo]: valor };
    setVencimentos(novos);
  };

  const removerVencimento = async (index: number) => {
    const venc = vencimentos[index];
    if (venc.id) {
      if (!confirm('Deseja excluir este agendamento permanentemente?')) return;
      setLoading(true);
      try {
        const { error } = await supabase.from('tab_clientes_agenda').delete().eq('id', venc.id);
        if (error) throw error;
        toast.success('Agendamento excluído!');
        const novos = vencimentos.filter((_, i) => i !== index);
        if (novos.length === 0) {
          setIsModalOpen(false);
          onSuccess();
        } else {
          setVencimentos(novos);
        }
      } catch (error) {
        console.error("Erro ao excluir", error);
        toast.error('Erro ao excluir do banco.');
      } finally {
        setLoading(false);
      }
    } else {
      if (vencimentos.length > 1) {
        setVencimentos(prev => prev.filter((_, i) => i !== index));
      } else {
        toast.error('É necessário ter ao menos um agendamento.');
      }
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (vencimentos.length === 0) {
      toast.error('Adicione ao menos um vencimento/retorno.');
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: perfil } = await supabase
        .from("usuarios_perfis")
        .select("id, corretora_id")
        .eq("id", user.id)
        .single();

      if (!perfil) throw new Error("Perfil não encontrado");

      const basePayload = {
        corretora_id: perfil.corretora_id,
        corretor_id: perfil.id,
        nome_cliente: tipoCliente === 'PF' ? nomeCliente : razaoSocial,
        tel_cliente: telefone,
        email_cliente: email,
        tipo_cliente: tipoCliente,
        razao_social: tipoCliente === 'PJ' ? razaoSocial : null,
        nome_fantasia: tipoCliente === 'PJ' ? nomeFantasia : null,
        produtos_gerais: produtosGerais.join(', ')
      };

      const promessas = vencimentos.map(v => {
        const payloadFinal = {
          ...basePayload,
          produto_interesse: v.produto_interesse,
          data_retorno: v.data_retorno,
          horario_retorno: v.horario_retorno,
          breve_descricao: v.breve_descricao
        };

        if (v.id) {
          return supabase.from('tab_clientes_agenda').update(payloadFinal).eq('id', v.id);
        } else {
          return supabase.from('tab_clientes_agenda').insert([payloadFinal]);
        }
      });

      await Promise.all(promessas);
      toast.success(isNovo ? 'Contatos registrados com sucesso!' : 'Alterações salvas com sucesso!');
      setIsModalOpen(false);
      onSuccess();
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao salvar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {isNovo ? (
        <button
            onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();

            setIsModalOpen(true);
            }}
          className="flex items-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-95 cursor-pointer relative z-50 pointer-events-auto"
        >
          <UserPlus size={18} />
          <span>Novo Contato (Avulso)</span>
        </button>
      ) : (
        <div
            onClickCapture={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsModalOpen(true);
            }}
          className="relative z-50 pointer-events-auto cursor-pointer p-1 px-2 rounded-lg bg-indigo-50 border-l-4 border-indigo-500 shadow-sm hover:shadow-md transition-shadow truncate w-full"
        >
          <div className="text-[10px] font-bold text-indigo-700 tracking-wider mb-0.5">CONTATO AVULSO</div>
          <div className="text-xs text-indigo-900 truncate">
             {evento?.nome || evento?.title || 'Cliente'}
          </div>
        </div>
      )}

      {isModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="text-indigo-600" size={22} />
                  {isNovo ? 'Agendar Novo Cliente Avulso' : 'Gerenciar Cliente Avulso'}
                </h3>
                <p className="text-xs text-zinc-500 mt-1">Cadastre os dados de contato e vincule um ou mais agendamentos.</p>
              </div>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                }} 
                className="p-2 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="mt-5 space-y-6">
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-fit">
                  <button
                    type="button"
                    onClick={() => setTipoCliente('PF')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      tipoCliente === 'PF' 
                        ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    Pessoa Física (PF)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoCliente('PJ')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      tipoCliente === 'PJ' 
                        ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    Pessoa Jurídica (PJ)
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tipoCliente === 'PF' ? (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Nome Completo do Cliente *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 text-zinc-400" size={16} />
                        <input
                          type="text"
                          required
                          value={nomeCliente}
                          onChange={(e) => setNomeCliente(e.target.value)}
                          placeholder="Ex: João da Silva"
                          className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Razão Social *</label>
                        <div className="relative">
                          <Building className="absolute left-3 top-3 text-zinc-400" size={16} />
                          <input
                            type="text"
                            required
                            value={razaoSocial}
                            onChange={(e) => setRazaoSocial(e.target.value)}
                            placeholder="Ex: Empresa Exemplo Ltda"
                            className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Nome Fantasia</label>
                        <input
                          type="text"
                          value={nomeFantasia}
                          onChange={(e) => setNomeFantasia(e.target.value)}
                          placeholder="Ex: Exemplo Seguros"
                          className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Telefone / WhatsApp</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 text-zinc-400" size={16} />
                      <input
                        type="text"
                        value={telefone}
                        onChange={(e) => setTelefone(aplicarMascaraTelefone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-zinc-400" size={16} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="cliente@email.com"
                        className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Produtos Gerais de Interesse */}
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Produtos de Interesse Geral</label>
                <div className="flex flex-wrap gap-2">
                  {LISTA_PRODUTOS_GERAIS.map((prod) => {
                    const selecionado = produtosGerais.includes(prod);
                    return (
                      <button
                        key={prod}
                        type="button"
                        onClick={() => toggleProdutoGeral(prod)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selecionado
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {prod}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seção de Vencimentos / Agendamentos */}
              <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <CalendarPlus size={16} className="text-indigo-600" />
                    Agendamentos e Retornos ({vencimentos.length})
                  </h4>
                  <button
                    type="button"
                    onClick={adicionarVencimento}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold transition-all"
                  >
                    <Plus size={14} />
                    <span>Adicionar Outro Retorno</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {vencimentos.map((venc, index) => (
                    <div key={index} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 relative space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Retorno #{index + 1}</span>
                        {vencimentos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removerVencimento(index)}
                            className="text-red-500 hover:text-red-700 p-1 rounded-md transition-colors"
                            title="Remover agendamento"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Produto Foco</label>
                          <select
                            value={venc.produto_interesse}
                            onChange={(e) => atualizarVencimento(index, 'produto_interesse', e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {LISTA_PRODUTOS_GERAIS.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Data do Retorno</label>
                          <div className="relative">
                            <Calendar className="absolute left-2.5 top-2.5 text-zinc-400" size={14} />
                            <input
                              type="date"
                              required
                              value={venc.data_retorno}
                              onChange={(e) => atualizarVencimento(index, 'data_retorno', e.target.value)}
                              className="w-full pl-8 pr-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Horário</label>
                          <div className="relative">
                            <Clock className="absolute left-2.5 top-2.5 text-zinc-400" size={14} />
                            <input
                              type="time"
                              required
                              value={venc.horario_retorno}
                              onChange={(e) => atualizarVencimento(index, 'horario_retorno', e.target.value)}
                              className="w-full pl-8 pr-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Breve Descrição / Assunto</label>
                        <input
                          type="text"
                          value={venc.breve_descricao}
                          onChange={(e) => atualizarVencimento(index, 'breve_descricao', e.target.value)}
                          placeholder="Ex: Ligar para confirmar proposta enviada..."
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar Agendamentos'}
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};