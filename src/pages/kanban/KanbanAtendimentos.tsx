import React, { useState, useEffect } from 'react';
import {
  DndContext,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable';
import { supabase } from '../../lib/supabaseClient';
import {
  MessageCircle,
  FileText,
  Eraser,
  UserSearch,
  AlertOctagon
} from 'lucide-react';
import { SortableCard } from '../../components/kanban/SortableCard';
import { BuscaGlobal } from '../../components/BuscaGlobal';
import { ModalFechamento } from '../../components/propostas/ModalFechamento';
import { maskCurrency, parseCurrencyToNumber } from '../../utils/masks';
import { toast } from 'react-hot-toast';
import { useKanbanConfig } from './useKanbanConfig';
import { MenuConfigColuna } from './MenuConfigColuna';

interface Cliente {
  id: string;
  corretora_id: string;
  corretor_id?: string;
  tipo_cliente: 'PF' | 'PJ';
  origem: string;
  cpf_cnpj?: string;
  nome_razao_social: string;
  nome_fantasia?: string;
  cep?: string;
  uf?: string;
  municipio?: string;
  bairro?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  cnae_principal?: string;
  situacao_cadastral?: string;
  fase_atendimento?: string;
  temperatura?: string;
  data_retorno?: string;
  horario_retorno?: string;
  contatos?: any[];
  socios?: any[];
  qtde_socios?: number;
  dados_complementares_pf?: Record<string, any>;
  dados_complementares_pj?: Record<string, any>;
  criado_em?: string;
  atualizado_em?: string;
  status_kanban: 'novo' | 'vendido' | 'perdido' | 'lead';
  fase_kanban: string;
  posicao_kanban: number;
  tab_propostas?: any[];
  tab_interacoes?: any[];
  usuarios_perfis?: { nome: string };
}

interface CorretorOpcao {
  id: string;
  nome: string;
  tipo_usuario: string;
}

export default function KanbanAtendimentos() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeCliente, setActiveCliente] = useState<Cliente | null>(null);
  const { colunas, loading: loadingConfig, refresh } = useKanbanConfig('atendimento');

  const [termoBusca, setTermoBusca] = useState('');
  const [corretoresLista, setCorretoresLista] = useState<CorretorOpcao[]>([]);
  const [corretorSelecionado, setCorretorSelecionado] = useState<string | null>(null);
  const [perfilUsuario, setPerfilUsuario] = useState<{ id: string; tipo_usuario: string; corretora_id: string } | null>(null);

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');

  const [modalImpedimento, setModalImpedimento] = useState({
    isOpen: false,
    mensagem: ''
  });

  const [modalFechamento, setModalFechamento] = useState<{
    isOpen: boolean;
    tipo: 'VENDIDO' | 'PERDIDO' | null;
    propostas: any[];
  }>({
    isOpen: false,
    tipo: null,
    propostas: []
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // 1. Carrega dados do perfil e a lista de corretores disponíveis
  useEffect(() => {
    carregarPerfilECorretores();
  }, []);

  async function carregarPerfilECorretores() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfil } = await supabase
        .from('usuarios_perfis')
        .select('id, tipo_usuario, corretora_id, nome')
        .eq('id', user.id)
        .single();

      if (!perfil) return;
      setPerfilUsuario(perfil);

      if (perfil.tipo_usuario === 'CORRETORA') {
        // Busca todos os corretores vinculados a esta corretora + a própria corretora
        const { data: corretores } = await supabase
          .from('usuarios_perfis')
          .select('id, nome, tipo_usuario')
          .or(`id.eq.${user.id},corretora_id.eq.${user.id}`)
          .eq('ativo', true)
          .order('nome', { ascending: true });

        if (corretores) {
          setCorretoresLista(corretores);
        }
        // Define como PADRÃO o filtro no ID da Corretora (Atendimento Direto)
        setCorretorSelecionado(user.id);
      } else {
        // Se for CORRETOR, trava no próprio ID
        setCorretorSelecionado(user.id);
      }
    } catch (err) {
      console.error('Erro ao carregar perfil/corretores:', err);
    }
  }

  // 2. Dispara a busca quando qualquer filtro alterar
  useEffect(() => {
    if (perfilUsuario) {
      fetchClientes();
    }
  }, [termoBusca, corretorSelecionado, dataInicio, dataFim, valorMin, valorMax, perfilUsuario]);

  async function fetchClientes() {
    try {
      // SE O FILTRO DE CORRETOR AINDA NÃO FOI DEFINIDO, ABORTA A BUSCA
      if (!perfilUsuario || corretorSelecionado === null) return;

      let query = supabase
        .from('tab_clientes')
        .select('*, tab_interacoes(id)')
        .eq('status_kanban', 'lead')
        .eq('corretora_id', perfilUsuario.corretora_id);

      // FILTRO DE CORRETOR:
      if (perfilUsuario.tipo_usuario === 'CORRETOR') {
        query = query.eq('corretor_id', perfilUsuario.id);
      } else if (corretorSelecionado !== 'TODOS') {
        query = query.eq('corretor_id', corretorSelecionado);
      }

      if (termoBusca) {
        query = query.or(
          `nome_razao_social.ilike.%${termoBusca}%,nome_fantasia.ilike.%${termoBusca}%,cpf_cnpj.ilike.%${termoBusca}%`
        );
      }

      if (dataInicio) query = query.gte('data_retorno', dataInicio);
      if (dataFim) query = query.lte('data_retorno', dataFim);

      const { data: rawClientes, error } = await query.order('posicao_kanban', {
        ascending: true
      });

      if (error) throw error;

      const clientesList = (rawClientes || []) as Cliente[];
      const clienteIds = clientesList.map(cliente => cliente.id);

      const propostasMap: Record<string, any[]> = {};

      if (clienteIds.length) {
        const { data: propostasData, error: propostasError } = await supabase
          .from('tab_propostas')
          .select('id, status, valor_total_proposta, cliente_id')
          .in('cliente_id', clienteIds);

        if (propostasError) throw propostasError;

        propostasData?.forEach(proposta => {
          if (!propostasMap[proposta.cliente_id]) {
            propostasMap[proposta.cliente_id] = [];
          }
          propostasMap[proposta.cliente_id].push(proposta);
        });
      }

      const corretorIds = Array.from(
        new Set(clientesList.map(cliente => cliente.corretor_id).filter(Boolean))
      ) as string[];

      const corretoresMap: Record<string, string> = {};

      if (corretorIds.length) {
        const { data: corretoresData, error: corretoresError } = await supabase
          .from('usuarios_perfis')
          .select('id, nome')
          .in('id', corretorIds);

        if (corretoresError) throw corretoresError;

        corretoresData?.forEach(corretor => {
          corretoresMap[corretor.id] = corretor.nome;
        });
      }

      const vMin = valorMin ? parseCurrencyToNumber(valorMin) : 0;
      const vMax = valorMax ? parseCurrencyToNumber(valorMax) : Infinity;

      const clientesTratados = clientesList
        .map(cliente => {
          const propostas = propostasMap[cliente.id] || [];
          const temInteracao = (cliente.tab_interacoes?.length || 0) > 0;
          const temNegociacao = propostas.some(proposta => proposta.status === 'Em Negociação');

          let novaFase = cliente.fase_kanban;

          if (temNegociacao) novaFase = 'negociacao_lead';
          else if (temInteracao) novaFase = 'contato_realizado';
          else novaFase = 'nao_contatado';

          // CORREÇÃO: Atualizamos Apenas a fase_kanban no banco de dados
          if (novaFase !== cliente.fase_kanban) {
            supabase
              .from('tab_clientes')
              .update({ fase_kanban: novaFase })
              .eq('id', cliente.id)
              .then(({ error }) => error && console.error(error));
          }

          return {
            ...cliente,
            fase_kanban: novaFase,
            tab_propostas: propostas,
            usuarios_perfis: {
              nome: corretoresMap[cliente.corretor_id || ''] || 'Atendimento Direto'
            }
          };
        })
        .filter(cliente => {
          if (!valorMin && !valorMax) return true;

          return cliente.tab_propostas?.some(proposta => {
            const valor = proposta.valor_total_proposta || 0;
            return valor >= vMin && valor <= vMax;
          });
        });

      setClientes(clientesTratados);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  }

  const getClientesDaColuna = (colunaId: string) =>
    clientes
      .filter(cliente =>
        (cliente.fase_kanban || '').toLowerCase().trim() ===
        (colunaId || '').toLowerCase().trim()
      )
      .sort((a, b) => (a.posicao_kanban || 0) - (b.posicao_kanban || 0));

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    setActiveId(id);
    setActiveCliente(clientes.find(cliente => cliente.id === id) || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveId(null);
    setActiveCliente(null);

    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;
    const clienteAtivo = clientes.find(cliente => cliente.id === activeIdStr);

    if (!clienteAtivo) return;

    const colunasValidas = colunas.map(coluna => coluna.id);

    let colDestino = overIdStr;

    if (!colunasValidas.includes(overIdStr)) {
      const clienteOver = clientes.find(cliente => cliente.id === overIdStr);
      colDestino = clienteOver?.fase_kanban || clienteAtivo.fase_kanban;
    }

    const colOrigem = clienteAtivo.fase_kanban;

    if (colOrigem === colDestino) {
      if (activeIdStr === overIdStr) return;

      const items = getClientesDaColuna(colOrigem);
      const oldIndex = items.findIndex(cliente => cliente.id === activeIdStr);
      const newIndex = items.findIndex(cliente => cliente.id === overIdStr);

      if (oldIndex < 0 || newIndex < 0) return;

      const novaLista = arrayMove(items, oldIndex, newIndex);

      setClientes(prev =>
        prev.map(cliente => {
          const index = novaLista.findIndex(item => item.id === cliente.id);
          return index >= 0 ? { ...cliente, posicao_kanban: index } : cliente;
        })
      );

      const updates = novaLista.map((cliente, index) =>
        supabase
          .from('tab_clientes')
          .update({ posicao_kanban: index })
          .eq('id', cliente.id)
      );

      await Promise.all(updates);
      return;
    }

    const temInteracao = (clienteAtivo.tab_interacoes?.length || 0) > 0;
    const temNegociacao = clienteAtivo.tab_propostas?.some(
      proposta => proposta.status === 'Em Negociação'
    );

    if (colDestino === 'contato_realizado' && !temInteracao) {
      setModalImpedimento({
        isOpen: true,
        mensagem: 'É necessário realizar ao menos 1 interação para mover para Contato Realizado.'
      });
      return;
    }

    if (colDestino === 'negociacao_lead' && !temNegociacao) {
      setModalImpedimento({
        isOpen: true,
        mensagem: 'É necessário ter uma proposta com status Em Negociação para mover para Negociação.'
      });
      return;
    }

    try {
      // CORREÇÃO: Removemos a alteração da fase_atendimento no estado local
      setClientes(prev =>
        prev.map(cliente =>
          cliente.id === activeIdStr
            ? { ...cliente, fase_kanban: colDestino, posicao_kanban: 0 }
            : cliente
        )
      );

      // CORREÇÃO: Removemos a alteração da fase_atendimento na atualização do Supabase
      const { error } = await supabase
        .from('tab_clientes')
        .update({
          fase_kanban: colDestino,
          posicao_kanban: 0
        })
        .eq('id', activeIdStr);

      if (error) throw error;

      toast.success('Movimentação realizada!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar');
      fetchClientes();
    }
  }

  const limparFiltros = () => {
    setDataInicio('');
    setDataFim('');
    setValorMin('');
    setValorMax('');
    setTermoBusca('');
    if (perfilUsuario?.tipo_usuario === 'CORRETORA') {
      setCorretorSelecionado(perfilUsuario.id);
    }
  };

  return (
    <div className="px-4 py-8 bg-[#F8FAFC] dark:bg-[#09090B] min-h-screen w-full">
      <div className="mb-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-slate-800 dark:text-white">
            Ciclo de Vendas para Novos Clientes (Leads)
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            Gerencie o progresso comercial em tempo real
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-4 bg-white dark:bg-zinc-900 p-6 rounded-[24px] border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">
              Pesquisa Rápida
            </label>
            <BuscaGlobal onSearch={setTermoBusca} />
          </div>

          {/* FILTRO DE CORRETOR (EXIBIDO SE FOR PERFIL CORRETORA) */}
          {perfilUsuario?.tipo_usuario === 'CORRETORA' && (
            <div className="w-64">
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">
                Filtrar Responsável
              </label>
              <div className="relative">
                <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                <select
                  value={corretorSelecionado || ''}
                  onChange={e => setCorretorSelecionado(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer appearance-none"
                >
                  {corretoresLista.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.id === perfilUsuario.id
                        ? `Atendimento Direto (${item.nome})`
                        : item.nome}
                    </option>
                  ))}
                  <option value="TODOS">Todos os Corretores</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 text-center">
            <label className="block text-[10px] font-black uppercase text-slate-400 ml-1">
              Data Retorno
            </label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 h-12 px-4 rounded-2xl">
              <input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                className="bg-transparent border-none text-xs font-bold outline-none text-slate-600 dark:text-slate-300"
              />
              <span className="text-slate-300 text-[10px] font-black italic">ATÉ</span>
              <input
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                className="bg-transparent border-none text-xs font-bold outline-none text-slate-600 dark:text-slate-300"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 text-center">
            <label className="block text-[10px] font-black uppercase text-slate-400 ml-1">
              Valor Proposta (R$)
            </label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 h-12 px-4 rounded-2xl">
              <input
                type="text"
                placeholder="Mín"
                value={valorMin}
                onChange={e => setValorMin(maskCurrency(e.target.value))}
                className="w-24 bg-transparent border-none text-xs font-bold outline-none text-emerald-600"
              />
              <span className="text-slate-300 text-[10px] font-black italic">ATÉ</span>
              <input
                type="text"
                placeholder="Máx"
                value={valorMax}
                onChange={e => setValorMax(maskCurrency(e.target.value))}
                className="w-24 bg-transparent border-none text-xs font-bold outline-none text-emerald-600"
              />
            </div>
          </div>

          <button
            onClick={limparFiltros}
            className="h-12 w-12 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 rounded-2xl transition-all shadow-sm group"
            title="Limpar Filtros"
          >
            <Eraser size={18} className="group-hover:rotate-12 transition-transform" />
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-10 items-stretch">
          {!loadingConfig && colunas.map(col => {
            const clientesColuna = getClientesDaColuna(col.id);

            return (
              <div key={col.id} className="flex-1 min-w-[380px] max-w-[480px] flex flex-col">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-white"
                      style={{ backgroundColor: col.colorHex }}
                    >
                      {col.title}
                    </span>
                    <span className="text-slate-400 text-sm font-bold bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                      {clientesColuna.length}
                    </span>
                  </div>

                  <div className="relative">
                    <MenuConfigColuna
                      fase={col}
                      grupo="atendimento"
                      onUpdate={refresh}
                    />
                  </div>
                </div>

                <KanbanColumn id={col.id}>
                  <SortableContext
                    items={clientesColuna.map(cliente => cliente.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {clientesColuna.map(cliente => (
                      <SortableCard
                        key={cliente.id}
                        id={cliente.id}
                        cliente={cliente}
                        columnId={col.id}
                        onUpdate={fetchClientes}
                      />
                    ))}
                  </SortableContext>
                </KanbanColumn>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeId && activeCliente ? (
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-2xl border-2 border-blue-500 cursor-grabbing w-[350px] rotate-2 opacity-90 scale-105 transition-transform">
              <p className="text-sm font-bold uppercase truncate">
                {activeCliente.nome_fantasia || activeCliente.nome_razao_social}
              </p>
              <div className="flex gap-2 mt-2 opacity-40">
                <MessageCircle size={14} />
                <FileText size={14} />
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {modalImpedimento.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] max-w-md w-full shadow-2xl border border-red-100 dark:border-red-900/20 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertOctagon className="text-red-600" size={32} />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-2">
              Movimentação Bloqueada
            </h2>
            <p className="text-slate-600 dark:text-slate-400 font-medium mb-6">
              {modalImpedimento.mensagem}
            </p>
            <button
              onClick={() => setModalImpedimento({ isOpen: false, mensagem: '' })}
              className="w-full h-14 bg-slate-900 dark:bg-white dark:text-black text-white rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
            >
              Entendi e vou corrigir
            </button>
          </div>
        </div>
      )}

      {modalFechamento.isOpen && (
        <ModalFechamento
          isOpen={modalFechamento.isOpen}
          tipo={modalFechamento.tipo!}
          proposta={modalFechamento.propostas}
          onClose={() => setModalFechamento({
            isOpen: false,
            tipo: null,
            propostas: []
          })}
          onSuccess={() => {
            setModalFechamento({
              isOpen: false,
              tipo: null,
              propostas: []
            });
            fetchClientes();
          }}
        />
      )}
    </div>
  );
}

function KanbanColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`p-3 rounded-[24px] min-h-[75vh] flex-1 flex flex-col border transition-all duration-200 ${
        isOver
          ? 'bg-slate-300/70 dark:bg-zinc-900 border-blue-400/50'
          : 'bg-slate-200/60 dark:bg-zinc-950 border-slate-300/50 dark:border-zinc-800/80'
      }`}
    >
      <div className="flex flex-col gap-3 flex-1 h-full">
        {children}
      </div>
    </div>
  );
}