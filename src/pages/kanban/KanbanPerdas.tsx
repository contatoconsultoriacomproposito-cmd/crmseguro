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
import { maskCurrency, parseCurrencyToNumber } from '../../utils/masks';
import { toast } from 'react-hot-toast';
import { useKanbanConfig } from './useKanbanConfig';
import { MenuConfigColuna } from './MenuConfigColuna';

interface Cliente {
  id: string;
  nome?: string;
  razao_social?: string;
  nome_razao_social?: string;
  tipo_cliente: 'PF' | 'PJ';
  status_kanban: string;
  fase_kanban: string;
  posicao_kanban: number;
  data_retorno?: string;
  horario_retorno?: string;
  corretor_id?: string;
  tab_propostas?: any[];
  tab_interacoes?: any[];
  usuarios_perfis?: { nome: string };
}

interface Corretor {
  id: string;
  nome: string;
}

interface PerfilUsuario {
  id: string;
  tipo_usuario: string;
  corretora_id: string;
  nome: string;
}

export default function KanbanPerdas() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeCliente, setActiveCliente] = useState<Cliente | null>(null);

  const { colunas, loading: loadingConfig, refresh } = useKanbanConfig('perdas');

  // Controle do usuário e corretores
  const [perfilUsuario, setPerfilUsuario] = useState<PerfilUsuario | null>(null);
  const [corretoresLista, setCorretoresLista] = useState<Corretor[]>([]);
  const [corretorSelecionado, setCorretorSelecionado] = useState<string | null>(null);

  const [termoBusca, setTermoBusca] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');

  const [modalImpedimento, setModalImpedimento] = useState({
    isOpen: false,
    mensagem: ''
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // 1. Carrega Perfil e Corretores ao montar o componente
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

      // Define o valor padrão selecionado no filtro
      setCorretorSelecionado(perfil.id);

      // Busca a lista de corretores da mesma corretora
      const { data: corretores } = await supabase
        .from('usuarios_perfis')
        .select('id, nome')
        .eq('corretora_id', perfil.corretora_id);

      if (corretores) {
        setCorretoresLista(corretores);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil e corretores:', error);
    }
  }

  // 2. Dispara a busca quando os filtros mudam
  useEffect(() => {
    fetchClientes();
  }, [termoBusca, dataInicio, dataFim, valorMin, valorMax, corretorSelecionado]);

  async function fetchClientes() {
    try {
      // TRAVA DE SEGURANÇA: Cancela a execução se o perfil/filtro ainda não carregou
      if (!perfilUsuario || corretorSelecionado === null) return;

      let query = supabase
        .from('tab_clientes')
        .select('*, tab_interacoes(id, status_agendamento)')
        .eq('status_kanban', 'perdido')
        .eq('corretora_id', perfilUsuario.corretora_id);

      // Aplica regra de permissão / filtro de responsável
      if (perfilUsuario.tipo_usuario === 'CORRETOR') {
        query = query.eq('corretor_id', perfilUsuario.id);
      } else if (corretorSelecionado !== 'TODOS') {
        query = query.eq('corretor_id', corretorSelecionado);
      }

      if (termoBusca) {
        query = query.or(`nome_razao_social.ilike.%${termoBusca}%,cpf.ilike.%${termoBusca}%,cnpj.ilike.%${termoBusca}%,email.ilike.%${termoBusca}%,telefone_whats.ilike.%${termoBusca}%`);
      }

      if (dataInicio) query = query.gte('data_retorno', dataInicio);
      if (dataFim) query = query.lte('data_retorno', dataFim);

      const { data, error } = await query.order('posicao_kanban', { ascending: true });
      if (error) throw error;

      const rawClientes = (data || []) as Cliente[];
      const clienteIds = rawClientes.map(c => c.id);

      const propostasMap: Record<string, any[]> = {};

      if (clienteIds.length) {
        const { data: propostasData } = await supabase
          .from('tab_propostas')
          .select('id, status, valor_total_proposta, cliente_id')
          .in('cliente_id', clienteIds);

        propostasData?.forEach(p => {
          if (!propostasMap[p.cliente_id]) propostasMap[p.cliente_id] = [];
          propostasMap[p.cliente_id].push(p);
        });
      }

      const corretorIds = Array.from(
        new Set(rawClientes.map(c => c.corretor_id).filter(Boolean))
      ) as string[];

      const corretoresMap: Record<string, string> = {};

      if (corretorIds.length) {
        const { data: corretoresData } = await supabase
          .from('usuarios_perfis')
          .select('id, nome')
          .in('id', corretorIds);

        corretoresData?.forEach(c => {
          corretoresMap[c.id] = c.nome;
        });
      }

      const vMin = valorMin ? parseCurrencyToNumber(valorMin) : 0;
      const vMax = valorMax ? parseCurrencyToNumber(valorMax) : Infinity;

      const clientesTratados = rawClientes
        .map(cliente => {
          const propostas = propostasMap[cliente.id] || [];
          const interacoes = cliente.tab_interacoes || [];

          const temVendido = propostas.some(p => p.status === 'Vendido');
          const temPerdido = propostas.some(p => p.status === 'Perdido');
          const temNegociacao = propostas.some(p => p.status === 'Em Negociação');
          const temPendente = interacoes.some(i => i.status_agendamento === 'PENDENTE');
          const somenteConcluido = interacoes.length > 0 && interacoes.every(i => i.status_agendamento === 'CONCLUIDO');

          let novaFase = cliente.fase_kanban;

          if (!temVendido && temNegociacao && temPerdido) {
            novaFase = 'negociacao_perdido';
          } else if (temPerdido && temPendente) {
            novaFase = 'contato_realizado_perdido';
          } else if (temPerdido && somenteConcluido) {
            novaFase = 'recuperacao';
          }

          if (novaFase !== cliente.fase_kanban) {
            supabase
              .from('tab_clientes')
              .update({ fase_kanban: novaFase })
              .eq('id', cliente.id);

            cliente.fase_kanban = novaFase;
          }

          return {
            ...cliente,
            tab_propostas: propostas,
            usuarios_perfis: {
              nome: corretoresMap[cliente.corretor_id || ''] || 'Não atribuído'
            }
          };
        })
        .filter(cliente => {
          if (!valorMin && !valorMax) return true;

          return cliente.tab_propostas?.some(p => {
            const valor = p.valor_total_proposta || 0;
            return valor >= vMin && valor <= vMax;
          });
        });

      setClientes(clientesTratados);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  }

  const getClientesDaColuna = (fase: string) =>
    clientes
      .filter(c => c.fase_kanban === fase)
      .sort((a, b) => (a.posicao_kanban || 0) - (b.posicao_kanban || 0));

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
    setActiveCliente(clientes.find(c => c.id === event.active.id) || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveId(null);
    setActiveCliente(null);

    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;
    const clienteAtivo = clientes.find(c => c.id === activeIdStr);

    if (!clienteAtivo) return;

    let colDestino = overIdStr;
    const colunasValidas = colunas.map(c => c.id);

    if (!colunasValidas.includes(overIdStr)) {
      colDestino = clientes.find(c => c.id === overIdStr)?.fase_kanban || clienteAtivo.fase_kanban;
    }

    const colOrigem = clienteAtivo.fase_kanban;

    if (colOrigem === colDestino) {
      if (activeIdStr === overIdStr) return;

      const items = getClientesDaColuna(colOrigem);
      const oldIndex = items.findIndex(c => c.id === activeIdStr);
      const newIndex = items.findIndex(c => c.id === overIdStr);

      if (oldIndex < 0 || newIndex < 0) return;

      const novaLista = arrayMove(items, oldIndex, newIndex);

      setClientes(prev =>
        prev.map(c => {
          const index = novaLista.findIndex(item => item.id === c.id);
          return index >= 0 ? { ...c, posicao_kanban: index } : c;
        })
      );

      await Promise.all(
        novaLista.map((item, index) =>
          supabase
            .from('tab_clientes')
            .update({ posicao_kanban: index })
            .eq('id', item.id)
        )
      );

      return;
    }

    const propostas = clienteAtivo.tab_propostas || [];
    const interacoes = clienteAtivo.tab_interacoes || [];

    const temVendido = propostas.some(p => p.status === 'Vendido');
    const temPerdido = propostas.some(p => p.status === 'Perdido');
    const temNegociacao = propostas.some(p => p.status === 'Em Negociação');
    const temPendente = interacoes.some(i => i.status_agendamento === 'PENDENTE');
    const somenteConcluido = interacoes.length > 0 && interacoes.every(i => i.status_agendamento === 'CONCLUIDO');

    if (colDestino === 'recuperacao' && (!temPerdido || !somenteConcluido)) {
      setModalImpedimento({
        isOpen: true,
        mensagem: 'O cliente precisa possuir apenas interações concluídas e propostas perdidas.'
      });
      return;
    }

    if (colDestino === 'contato_realizado_perdido' && (!temPerdido || !temPendente)) {
      setModalImpedimento({
        isOpen: true,
        mensagem: 'O cliente precisa possuir proposta perdida e pelo menos um agendamento pendente.'
      });
      return;
    }

    if (colDestino === 'negociacao_perdido' && (temVendido || !temPerdido || !temNegociacao)) {
      setModalImpedimento({
        isOpen: true,
        mensagem: 'O cliente não pode possuir venda e precisa ter proposta perdida e proposta em negociação.'
      });
      return;
    }

    try {
      setClientes(prev =>
        prev.map(c =>
          c.id === activeIdStr
            ? { ...c, fase_kanban: colDestino, posicao_kanban: 0 }
            : c
        )
      );

      const { error } = await supabase
        .from('tab_clientes')
        .update({ fase_kanban: colDestino, posicao_kanban: 0 })
        .eq('id', activeIdStr);

      if (error) throw error;

      toast.success('Fase atualizada!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar');
      fetchClientes();
    }
  }

  return (
    <div className="px-4 py-8 bg-[#F8FAFC] dark:bg-[#09090B] min-h-screen w-full">
      <div className="mb-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-slate-800 dark:text-white">
            Gestão de Clientes Perdidos
          </h1>
          <p className="text-slate-500 text-sm font-medium">Fluxo de recuperação de oportunidades perdidas</p>
        </div>

        <div className="flex flex-wrap items-end gap-4 bg-white dark:bg-zinc-900 p-6 rounded-[24px] border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Pesquisa Rápida</label>
            <BuscaGlobal onSearch={setTermoBusca} />
          </div>

          <div className="w-64">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Filtrar Responsável</label>
            <div className="relative">
              <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <select
                value={corretorSelecionado || ''}
                onChange={e => setCorretorSelecionado(e.target.value)}
                className="w-full h-12 pl-10 pr-4 bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer appearance-none"
              >
                {corretoresLista.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.id === perfilUsuario?.id
                      ? `Atendimento Direto (${item.nome})`
                      : item.nome}
                  </option>
                ))}
                <option value="TODOS">Todos os Corretores</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="block text-[10px] font-black uppercase text-slate-400 text-center">Data Retorno</label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 h-12 px-4 rounded-2xl">
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-transparent border-none text-xs font-bold outline-none" />
              <span className="text-slate-300 text-[10px] font-black">ATÉ</span>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-transparent border-none text-xs font-bold outline-none" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="block text-[10px] font-black uppercase text-slate-400 text-center">Valor Proposta</label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 h-12 px-4 rounded-2xl">
              <input type="text" placeholder="Mín" value={valorMin} onChange={e => setValorMin(maskCurrency(e.target.value))} className="w-24 bg-transparent border-none text-xs font-bold outline-none text-emerald-600" />
              <span className="text-slate-300 text-[10px] font-black">ATÉ</span>
              <input type="text" placeholder="Máx" value={valorMax} onChange={e => setValorMax(maskCurrency(e.target.value))} className="w-24 bg-transparent border-none text-xs font-bold outline-none text-emerald-600" />
            </div>
          </div>

          <button
            onClick={() => {
              setDataInicio('');
              setDataFim('');
              setValorMin('');
              setValorMax('');
              setTermoBusca('');
              if (perfilUsuario) setCorretorSelecionado(perfilUsuario.id);
            }}
            className="h-12 w-12 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 rounded-2xl"
          >
            <Eraser size={18} />
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
          {!loadingConfig && colunas.map(col => (
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
                    {getClientesDaColuna(col.id).length}
                  </span>
                </div>

                <MenuConfigColuna
                  fase={col}
                  grupo="perdas"
                  onUpdate={refresh}
                />
              </div>

              <KanbanColumn id={col.id}>
                <SortableContext
                  items={getClientesDaColuna(col.id).map(c => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {getClientesDaColuna(col.id).map(cliente => (
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
          ))}
        </div>

        <DragOverlay>
          {activeId && activeCliente && (
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-2xl border-2 border-blue-500 cursor-grabbing w-[350px] rotate-2 opacity-90">
              <p className="text-sm font-bold uppercase truncate">
                {activeCliente.tipo_cliente === 'PJ'
                  ? activeCliente.razao_social
                  : activeCliente.nome_razao_social || activeCliente.nome}
              </p>
              <div className="flex gap-2 mt-2 opacity-40">
                <MessageCircle size={14} />
                <FileText size={14} />
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {modalImpedimento.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] max-w-md w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertOctagon className="text-red-600" size={32} />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase mb-2">
              Ação Requerida
            </h2>
            <p className="text-slate-600 dark:text-slate-400 font-medium mb-6">
              {modalImpedimento.mensagem}
            </p>
            <button
              onClick={() => setModalImpedimento({ isOpen: false, mensagem: '' })}
              className="w-full h-14 bg-slate-900 dark:bg-white dark:text-black text-white rounded-2xl font-black uppercase"
            >
              Entendido
            </button>
          </div>
        </div>
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