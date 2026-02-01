import { useMemo, useState, useEffect } from 'react';
import { 
  Globe, Clock,
  Building2, PieChart as PieIcon, BarChart as BarIcon,
  Navigation, Hash, Filter, Loader2
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';

import { supabase } from '../../../lib/supabaseClient';

interface ClienteData {
  id: string;
  corretor_id: string | null;
  tipo_cliente: string;
  origem_cliente?: string;
  status_kanban?: string;
  motivo_perda?: string;
  fase_kanban?: string;
  created_at: string;
  sexo?: string;
  data_nascimento?: string;
  data_retorno?: string;
  porte?: string;
  capital_social?: number;
  opcao_pelo_mei?: boolean;
  opcao_pelo_simples?: boolean;
  natureza_juridica?: string;
  descricao_identificador_matriz_filial?: string;
  uf?: string;
  uf_pf?: string;
  municipio?: string;
  municipio_pf?: string;
  bairro?: string;
  bairro_pf?: string;
}

interface VisaoClienteProps {
  corretoresLista: { id: string; nome: string }[];
  corretoraId: string;
}

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

export default function VisaoCliente({ corretoresLista, corretoraId }: VisaoClienteProps) {
  const [loading, setLoading] = useState(true);
  const [clientesLocais, setClientesLocais] = useState<ClienteData[]>([]);
  
  // 1. ESTADOS DE FILTRO
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [corretorLocal, setCorretorLocal] = useState('todos');

  // 2. BUSCAR A DATA DO PRIMEIRO CLIENTE (PARA O INÍCIO DO FILTRO)
  useEffect(() => {
    async function buscarPrimeiraData() {
      if (!corretoraId) return;
      const { data, error } = await supabase
        .from('tab_clientes')
        .select('created_at')
        .eq('corretora_id', corretoraId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (!error && data) {
        setDataInicio(data.created_at.split('T')[0]);
      } else {
        // Fallback: primeiro dia do mês atual
        setDataInicio(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
      }
    }
    buscarPrimeiraData();
  }, [corretoraId]);

  // 3. BUSCA DE DADOS (Trazemos a base para processar os retornos globalmente)
  useEffect(() => {
    async function fetchDados() {
      setLoading(true);
      try {
        // REMOVIDO: Filtros de data na query para permitir cálculo global de retornos
        let query = supabase
          .from('tab_clientes')
          .select('*')
          .eq('corretora_id', corretoraId);

        if (corretorLocal !== 'todos') {
          query = query.eq('corretor_id', corretorLocal);
        }

        const { data, error } = await query;
        if (error) throw error;
        setClientesLocais(data || []);
      } catch (err) {
        console.error("Erro ao carregar Visão Cliente:", err);
      } finally {
        setLoading(false);
      }
    }

    if (corretoraId) fetchDados();
  }, [corretorLocal, corretoraId]);

  // 4. PROCESSAMENTO DE ESTATÍSTICAS
  const { stats, totalFiltrados } = useMemo(() => {
    const acc = {
      tipo: { pf: 0, pj: 0 },
      origem: {} as Record<string, number>,
      porte: {} as Record<string, number>,
      capital: { total: 0, count: 0 },
      mei: { sim: 0, nao: 0 },
      simples: { sim: 0, nao: 0 },
      natureza: {} as Record<string, number>,
      matriz: {} as Record<string, number>,
      uf: {} as Record<string, number>,
      municipio: {} as Record<string, number>,
      bairro: {} as Record<string, number>,
      idades: { '0-18': 0, '19-30': 0, '31-45': 0, '46-60': 0, '60+': 0 },
      status: {} as Record<string, number>,
      motivosPerda: {} as Record<string, number>,
      fases: {} as Record<string, number>,
      sexo: { M: 0, F: 0, Outro: 0 },
      retorno: { 
        atrasado: 0, semana: 0, quinzena: 0, mes: 0, trimestre: 0, longoPrazo: 0 
      }
    };

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let countFiltrados = 0;

    clientesLocais.forEach((c) => {
      // --- LÓGICA DE RETORNOS (IGNORA O FILTRO DE DATA DE CADASTRO) ---
      if (c.data_retorno) {
        const dataRet = new Date(c.data_retorno);
        dataRet.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((dataRet.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) acc.retorno.atrasado++;
        else if (diffDays <= 7) acc.retorno.semana++;
        else if (diffDays <= 15) acc.retorno.quinzena++;
        else if (diffDays <= 30) acc.retorno.mes++;
        else if (diffDays <= 90) acc.retorno.trimestre++;
        else acc.retorno.longoPrazo++;
      }

      // --- LÓGICA DE FILTRAGEM PARA OS DEMAIS GRÁFICOS (BASEADO EM CREATED_AT) ---
      const dataCad = c.created_at.split('T')[0];
      if (dataCad >= dataInicio && dataCad <= dataFim) {
        countFiltrados++;
        
        // Perfil
        const t = String(c.tipo_cliente || '').toUpperCase();
        t === 'PJ' ? acc.tipo.pj++ : acc.tipo.pf++;

        const s = (c.sexo || 'Outro').toUpperCase()[0];
        if (s === 'M') acc.sexo.M++;
        else if (s === 'F') acc.sexo.F++;
        else acc.sexo.Outro++;

        const origemKey = c.origem_cliente || 'Não Informado';
        acc.origem[origemKey] = (acc.origem[origemKey] || 0) + 1;
        
        const faseKey = c.fase_kanban || 'Sem Fase';
        acc.fases[faseKey] = (acc.fases[faseKey] || 0) + 1;

        if (t === 'PJ') {
          if (c.opcao_pelo_mei) acc.mei.sim++;
          if (c.opcao_pelo_simples) acc.simples.sim++;
          if (c.capital_social) {
            acc.capital.total += Number(c.capital_social);
            acc.capital.count++;
          }
          const mKey = (c.descricao_identificador_matriz_filial || 'Matriz').toUpperCase();
          acc.matriz[mKey] = (acc.matriz[mKey] || 0) + 1;
        }

        const muni = t === 'PJ' ? c.municipio : c.municipio_pf;
        const bair = t === 'PJ' ? c.bairro : c.bairro_pf;
        if (muni) acc.municipio[muni.toUpperCase().trim()] = (acc.municipio[muni.toUpperCase().trim()] || 0) + 1;
        if (bair) acc.bairro[bair.toUpperCase().trim()] = (acc.bairro[bair.toUpperCase().trim()] || 0) + 1;

        if (c.data_nascimento) {
          const birthDate = new Date(c.data_nascimento);
          let idade = hoje.getFullYear() - birthDate.getFullYear();
          if (hoje < new Date(hoje.getFullYear(), birthDate.getMonth(), birthDate.getDate())) idade--;
          
          if (idade <= 18) acc.idades['0-18']++;
          else if (idade <= 30) acc.idades['19-30']++;
          else if (idade <= 45) acc.idades['31-45']++;
          else if (idade <= 60) acc.idades['46-60']++;
          else acc.idades['60+']++;
        }
      }
    });

    return { stats: acc, totalFiltrados: countFiltrados };
  }, [clientesLocais, dataInicio, dataFim]);

  // Preparação dos dados para Recharts
  const chartData = {
    sexo: Object.entries(stats.sexo).filter(x => x[1] > 0).map(([name, value]) => ({ name, value })),
    fases: Object.entries(stats.fases).map(([name, value]) => ({ name, value })),
    municipios: Object.entries(stats.municipio).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value).slice(0, 5),
    idades: Object.entries(stats.idades).map(([name, value]) => ({ name, value }))
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
          <Filter size={16} className="text-slate-400" />
          <span className="text-[10px] font-black uppercase text-slate-500">Analítico de Leads:</span>
        </div>
        
        <div className="flex items-center gap-2">
          <input 
            type="date" 
            value={dataInicio} 
            onChange={(e) => setDataInicio(e.target.value)}
            className="bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-600 p-2"
          />
          <span className="text-slate-300 font-bold text-[10px] uppercase">até</span>
          <input 
            type="date" 
            value={dataFim} 
            onChange={(e) => setDataFim(e.target.value)}
            className="bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-600 p-2"
          />
          
          <span className="ml-2 text-[9px] font-black text-indigo-400 uppercase bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
            📊 Gráficos por Cadastro | 📅 Agenda: Base Total
          </span>
        </div>

        <select 
          value={corretorLocal} 
          onChange={(e) => setCorretorLocal(e.target.value)}
          className="ml-auto bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600 p-2 min-w-[200px]"
        >
          <option value="todos">Todos os Corretores</option>
          {(corretoresLista || []).map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>

        {loading && (
          <div className="flex items-center gap-2 ml-2 animate-pulse">
            <Loader2 size={16} className="text-indigo-500 animate-spin" />
            <span className="text-[10px] font-bold text-indigo-500 uppercase">Sincronizando...</span>
          </div>
        )}
      </div>

      {/* 1. RETORNOS (CRONOGRAMA INDEPENDENTE DO FILTRO DE DATA) */}
      <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[32px] shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Clock className="text-indigo-600" size={24} />
            <h3 className="text-lg font-black text-indigo-900 uppercase tracking-tight">Cronograma de Retornos (Base Total)</h3>
          </div>
          {stats.retorno.atrasado > 0 && (
            <span className="px-4 py-1 bg-rose-500 text-white text-[11px] font-black rounded-full animate-pulse">
              {stats.retorno.atrasado} AGENDAMENTOS ATRASADOS
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 shadow-sm text-center">
            <p className="text-3xl font-black text-rose-600 leading-none">{stats.retorno.atrasado}</p>
            <p className="text-[10px] font-black text-rose-400 uppercase mt-2 italic">Atrasados</p>
          </div>
          {[
            { label: '0 a 7 dias', val: stats.retorno.semana },
            { label: '8 a 15 dias', val: stats.retorno.quinzena },
            { label: '16 a 30 dias', val: stats.retorno.mes },
            { label: '31 a 90 dias', val: stats.retorno.trimestre },
            { label: '+ 90 dias', val: stats.retorno.longoPrazo }
          ].map((item, idx) => (
            <div key={idx} className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm text-center">
              <p className="text-3xl font-black text-indigo-600 leading-none">{item.val}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase mt-2 italic">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RESTANTE DO DASHBOARD (Gráficos que respeitam o filtro de data) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-100 p-6 rounded-[24px] flex items-center justify-between">
            <div>
              <p className="text-[12px] font-black text-amber-600 uppercase mb-2">Perfil Filtrado</p>
              <p className="text-lg font-black text-slate-700 leading-none">PF: {stats.tipo.pf}</p>
              <p className="text-lg font-black text-slate-700 mt-1">PJ: {stats.tipo.pj}</p>
            </div>
            <div className="h-20 w-20">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{v: stats.tipo.pf}, {v: stats.tipo.pj}]} innerRadius={20} outerRadius={35} dataKey="v">
                    <Cell fill="#6366f1" /><Cell fill="#f59e0b" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[24px]">
          <p className="text-[12px] font-black text-emerald-600 uppercase mb-3">Tributação PJ (Período)</p>
          <div className="flex gap-6">
            <div><p className="text-2xl font-black text-emerald-900">{stats.simples.sim}</p><p className="text-[10px] font-black uppercase text-emerald-500">Simples</p></div>
            <div className="border-l border-emerald-200 pl-6"><p className="text-2xl font-black text-emerald-900">{stats.mei.sim}</p><p className="text-[10px] font-black uppercase text-emerald-500">MEI</p></div>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-[24px]">
          <p className="text-[12px] font-black text-slate-400 uppercase mb-2">Cap. Social Médio (Período)</p>
          <p className="text-xl font-black text-slate-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.capital.total / (stats.capital.count || 1))}
          </p>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase italic">Base: {stats.capital.count} PJs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black uppercase text-slate-500 mb-6 flex items-center gap-2"><PieIcon size={18} className="text-indigo-500" /> Gênero e Idades</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData.sexo} innerRadius={50} outerRadius={80} dataKey="value" nameKey="name">
                  {chartData.sexo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-5 gap-1 mt-4">
             {chartData.idades.map(id => (
               <div key={id.name} className="text-center bg-slate-50 p-2 rounded-xl">
                 <p className="text-xs font-black text-indigo-600">{id.value}</p>
                 <p className="text-[9px] font-black text-slate-400 uppercase">{id.name}</p>
               </div>
             ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black uppercase text-slate-500 mb-6 flex items-center gap-2"><BarIcon size={18} className="text-emerald-500" /> Fase no Kanban</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.fases}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: 900, fill: '#64748b'}} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black uppercase text-slate-500 mb-6 flex items-center gap-2"><Globe size={18} className="text-amber-500" /> Top Origens</h3>
          <div className="space-y-4">
            {Object.entries(stats.origem).sort((a,b)=>b[1]-a[1]).slice(0, 5).map(([label, val]) => (
              <div key={label}>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-black text-slate-600 uppercase truncate max-w-[180px]">{label}</span>
                  <span className="text-xs font-black text-indigo-600">{val}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full transition-all duration-1000" 
                    style={{ width: `${(val / (totalFiltrados || 1)) * 100}%` }} 
                  />
                </div>
              </div>
            ))}
            {totalFiltrados === 0 && !loading && <p className="text-center py-10 text-xs font-bold text-slate-300 uppercase italic">Sem dados no período</p>}
          </div>
        </div>
      </div>

      {/* GEOLOCALIZAÇÃO E UNIDADES */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black uppercase text-slate-500 mb-8 flex items-center gap-2"><Navigation size={18} className="text-rose-500" /> Geolocalização (Período)</h3>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <p className="text-[11px] font-black text-rose-500 uppercase tracking-widest mb-2 border-b border-rose-100 pb-1">Municípios</p>
              {chartData.municipios.map((m) => (
                <div key={m.name} className="flex justify-between p-3 bg-rose-50/30 border border-rose-100 rounded-xl">
                  <span className="text-xs font-black text-slate-700 uppercase truncate">{m.name}</span>
                  <span className="text-xs font-black text-rose-600">{m.value}</span>
                </div>
              ))}
              {chartData.municipios.length === 0 && <p className="text-[10px] text-slate-400 italic">Nenhum dado</p>}
            </div>
            <div className="space-y-3">
              <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-2 border-b border-indigo-100 pb-1">Bairros</p>
              {Object.entries(stats.bairro).sort((a,b)=>b[1]-a[1]).slice(0, 5).map(([name, val]) => (
                <div key={name} className="flex justify-between p-3 bg-indigo-50/30 border border-indigo-100 rounded-xl">
                  <span className="text-xs font-black text-slate-700 uppercase truncate">{name}</span>
                  <span className="text-xs font-black text-indigo-600">{val}</span>
                </div>
              ))}
              {Object.entries(stats.bairro).length === 0 && <p className="text-[10px] text-slate-400 italic">Nenhum dado</p>}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-8 rounded-[32px] shadow-inner flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200">
              <Building2 size={20} className="text-slate-600" />
            </div>
            <h3 className="text-sm font-black uppercase text-slate-500 tracking-tight">Estrutura de Unidades (Período)</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(stats.matriz).length > 0 ? Object.entries(stats.matriz).map(([name, val]) => (
              <div key={name} className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
                  <Hash size={16} className="text-indigo-500" />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-800 leading-none">{val}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{name}</p>
                </div>
              </div>
            )) : (
              <div className="col-span-2 py-10 text-center border-2 border-dashed border-slate-200 rounded-[24px]">
                <p className="text-slate-400 font-bold text-sm">Nenhum dado de unidade no período</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}