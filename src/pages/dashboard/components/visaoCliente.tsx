import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';

interface VisaoClienteProps {
  corretoraId?: string;
  corretoresLista?: { id: string; nome: string }[];
  userLevel?: string;
  userId?: string;
}

type TabType = 'carteira' | 'importados' | 'avulsos';

export const VisaoCliente: React.FC<VisaoClienteProps> = ({
  corretoraId,
  corretoresLista = [],
  userLevel,
  userId
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('carteira');
  const [loading, setLoading] = useState(false);

  // Estados dos dados em memória
  const [clientesCarteira, setClientesCarteira] = useState<any[] | null>(null);
  const [clientesAgenda, setClientesAgenda] = useState<any[] | null>(null);
  const [metricasFrios, setMetricasFrios] = useState<any>(null);

  // Lazy loading com chamada RPC ultra rápida para 'importados'
  useEffect(() => {
    if (!corretoraId) return;

    let isMounted = true;

    async function fetchTabData() {
      setLoading(true);
      try {
        if (activeTab === 'carteira' && clientesCarteira === null) {
          const data = await fetchAllRows('tab_clientes', `
            id, corretor_id, tipo_cliente, opcao_pelo_simples, opcao_pelo_mei,
            municipio, bairro, municipio_pf, bairro_pf, data_nascimento,
            nome, razao_social, nome_fantasia, status_kanban, fase_kanban, sexo, data_retorno
          `);
          if (isMounted) setClientesCarteira(data);

        } else if (activeTab === 'importados' && metricasFrios === null) {
          // CHAMADA RPC VIA SUPABASE (executa em ~0.2 segundos direto no banco)
          const { data, error } = await supabase.rpc('get_metricas_clientes_frios', {
            p_corretora_id: corretoraId,
            p_user_level: userLevel,
            p_user_id: userId
          });

          if (error) throw error;
          if (isMounted) setMetricasFrios(data);

        } else if (activeTab === 'avulsos' && clientesAgenda === null) {
          const data = await fetchAllRows('tab_clientes_agenda', `
            id, nome_cliente, tel_cliente, email_cliente, data_retorno,
            horario_retorno, breve_descricao
          `);
          if (isMounted) setClientesAgenda(data);
        }
      } catch (err) {
        console.error(`Erro ao carregar dados da aba ${activeTab}:`, err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    // Função auxiliar mantida apenas para as abas menores (carteira e avulsos)
    async function fetchAllRows(tableName: string, selectFields: string) {
      let allRows: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from(tableName)
          .select(selectFields)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (corretoraId) query = query.eq('corretora_id', corretoraId);
        if (userLevel === 'CORRETOR' && userId) query = query.eq('corretor_id', userId);

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          allRows = allRows.concat(data);
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      return allRows;
    }

    if (
      (activeTab === 'carteira' && clientesCarteira === null) ||
      (activeTab === 'importados' && metricasFrios === null) ||
      (activeTab === 'avulsos' && clientesAgenda === null)
    ) {
      fetchTabData();
    }

    return () => {
      isMounted = false;
    };
  }, [activeTab, corretoraId, userLevel, userId, clientesCarteira, metricasFrios, clientesAgenda]);

  const mapaCorretores = useMemo(() => {
    const map = new Map<string, string>();
    corretoresLista.forEach((c) => map.set(c.id, c.nome));
    return map;
  }, [corretoresLista]);

  // Helper para parsing de datas sem fuso horário
  const parseDataSemTimezone = (val: any): Date | null => {
    if (!val) return null;
    const str = String(val).trim();
    if (!str) return null;

    const matchIso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matchIso) {
      return new Date(parseInt(matchIso[1], 10), parseInt(matchIso[2], 10) - 1, parseInt(matchIso[3], 10), 0, 0, 0, 0);
    }

    const matchBr = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (matchBr) {
      return new Date(parseInt(matchBr[3], 10), parseInt(matchBr[2], 10) - 1, parseInt(matchBr[1], 10), 0, 0, 0, 0);
    }

    return null;
  };

  const calcularCronograma = (lista: { data_retorno: string }[] | null) => {
    const contadores = {
      totalAgendados: 0,
      atrasado: 0,
      semana: 0,
      quinzena: 0,
      mes: 0,
      trimestre: 0,
      longoPrazo: 0
    };

    if (!lista) return contadores;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    for (let i = 0; i < lista.length; i++) {
      const dataRetorno = parseDataSemTimezone(lista[i].data_retorno);
      if (!dataRetorno) continue;

      contadores.totalAgendados++;

      const diffDays = Math.round((dataRetorno.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) contadores.atrasado++;
      else if (diffDays <= 7) contadores.semana++;
      else if (diffDays <= 15) contadores.quinzena++;
      else if (diffDays <= 30) contadores.mes++;
      else if (diffDays <= 90) contadores.trimestre++;
      else contadores.longoPrazo++;
    }

    return contadores;
  };

  // ==========================================
  // MÉTRICAS DA ABA 1: CLIENTES DA CARTEIRA
  // ==========================================
  const metricasCarteira = useMemo(() => {
    if (!clientesCarteira) return null;

    const porCorretorMap: Record<string, { nome: string; pf: number; pj: number; total: number }> = {};
    let simplesSim = 0, simplesNao = 0;
    let meiSim = 0, meiNao = 0;
    const localizacaoMap: Record<string, { municipio: string; bairro: string; total: number }> = {};

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const aniversariantes: { id: string; nome: string; dataNasc: string; diasFaltando: number }[] = [];

    const kanbanMap: Record<string, number> = {};
    const sexoMap: Record<string, number> = { Masculino: 0, Feminino: 0, Outro: 0, 'Não informado': 0 };

    clientesCarteira.forEach((c) => {
      // 1. Clientes por Corretor
      const cId = c.corretor_id || 'sem_corretor';
      const cNome = mapaCorretores.get(cId) || (cId === 'sem_corretor' ? 'Sem Corretor' : 'Corretor Desconhecido');
      if (!porCorretorMap[cId]) {
        porCorretorMap[cId] = { nome: cNome, pf: 0, pj: 0, total: 0 };
      }
      if (c.tipo_cliente === 'PJ') porCorretorMap[cId].pj++;
      else porCorretorMap[cId].pf++;
      porCorretorMap[cId].total++;

      // 2. Simples / MEI
      if (c.tipo_cliente === 'PJ') {
        if (c.opcao_pelo_simples === true) simplesSim++;
        else simplesNao++;

        if (c.opcao_pelo_mei === true) meiSim++;
        else meiNao++;
      }

      // 3. Município e Bairro
      const mun = (c.tipo_cliente === 'PJ' ? c.municipio : c.municipio_pf) || 'Não Informado';
      const bai = (c.tipo_cliente === 'PJ' ? c.bairro : c.bairro_pf) || 'Não Informado';
      const locKey = `${mun.toUpperCase()} - ${bai.toUpperCase()}`;

      if (!localizacaoMap[locKey]) {
        localizacaoMap[locKey] = { municipio: mun, bairro: bai, total: 0 };
      }
      localizacaoMap[locKey].total++;

      // 4. Aniversariantes (próximos 30 dias)
      if (c.data_nascimento) {
        const [ano, mes, dia] = String(c.data_nascimento).substring(0, 10).split('-').map(Number);
        if (ano && mes && dia) {
          const proxNiver = new Date(hoje.getFullYear(), mes - 1, dia);
          if (proxNiver < hoje) {
            proxNiver.setFullYear(hoje.getFullYear() + 1);
          }
          const diffMs = proxNiver.getTime() - hoje.getTime();
          const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          if (diffDias <= 30) {
            aniversariantes.push({
              id: c.id,
              nome: c.tipo_cliente === 'PF' ? (c.nome || 'Sem Nome') : (c.razao_social || c.nome_fantasia || 'Sem Razão Social'),
              dataNasc: `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`,
              diasFaltando: diffDias
            });
          }
        }
      }

      // 5. Kanban
      const status = c.fase_kanban || c.status_kanban || 'Sem Fase';
      kanbanMap[status] = (kanbanMap[status] || 0) + 1;

      // 6. Sexo
      if (c.sexo) {
        const sUpper = String(c.sexo).trim().toUpperCase();
        if (sUpper.startsWith('M')) sexoMap['Masculino']++;
        else if (sUpper.startsWith('F')) sexoMap['Feminino']++;
        else sexoMap['Outro']++;
      } else {
        sexoMap['Não informado']++;
      }
    });

    aniversariantes.sort((a, b) => a.diasFaltando - b.diasFaltando);
    const listaLocalizacao = Object.values(localizacaoMap).sort((a, b) => b.total - a.total);

    return {
      cronograma: calcularCronograma(clientesCarteira),
      porCorretor: Object.values(porCorretorMap),
      simplesSim,
      simplesNao,
      meiSim,
      meiNao,
      listaLocalizacao,
      aniversariantes,
      kanbanMap,
      sexoMap
    };
  }, [clientesCarteira, mapaCorretores]);

  // ==========================================
  // MÉTRICAS DA ABA 2: CLIENTES IMPORTADOS (RPC)
  // ==========================================
  const metricasImportados = metricasFrios;

  // ==========================================
  // MÉTRICAS DA ABA 3: CLIENTES AVULSOS
  // ==========================================
  const cronogramaAgenda = useMemo(() => calcularCronograma(clientesAgenda), [clientesAgenda]);

  return (
    <div className="space-y-6">
      {/* BARRA DE SUB-ABAS */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('carteira')}
          className={`py-3 px-5 font-black text-xs uppercase tracking-wider transition-all border-b-2 -mb-px ${
            activeTab === 'carteira'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Clientes da Carteira
        </button>

        <button
          onClick={() => setActiveTab('importados')}
          className={`py-3 px-5 font-black text-xs uppercase tracking-wider transition-all border-b-2 -mb-px ${
            activeTab === 'importados'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Clientes Importados
        </button>

        <button
          onClick={() => setActiveTab('avulsos')}
          className={`py-3 px-5 font-black text-xs uppercase tracking-wider transition-all border-b-2 -mb-px ${
            activeTab === 'avulsos'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Clientes Avulsos
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-bold uppercase text-xs tracking-wider animate-pulse">
          Carregando dados da aba selecionada...
        </div>
      ) : (
        <>
          {/* ==========================================
              ABA 1: CLIENTES DA CARTEIRA
             ========================================== */}
          {activeTab === 'carteira' && metricasCarteira && (
            <div className="space-y-6">
              {/* CRONOGRAMA */}
              <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                  Cronograma de Retornos (Clientes da Carteira)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
                    <span className="block text-3xl font-black text-red-600">{metricasCarteira.cronograma.atrasado}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-500">Atrasados</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <span className="block text-3xl font-black text-indigo-600">{metricasCarteira.cronograma.semana}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">0 a 7 dias</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <span className="block text-3xl font-black text-indigo-600">{metricasCarteira.cronograma.quinzena}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">8 a 15 dias</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <span className="block text-3xl font-black text-indigo-600">{metricasCarteira.cronograma.mes}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">16 a 30 dias</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <span className="block text-3xl font-black text-indigo-600">{metricasCarteira.cronograma.trimestre}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">31 a 90 dias</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <span className="block text-3xl font-black text-indigo-600">{metricasCarteira.cronograma.longoPrazo}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">+ 90 dias</span>
                  </div>
                </div>
              </div>

              {/* 1. CLIENTES POR CORRETOR (PF / PJ) */}
              <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                  1. Clientes por Corretor (PF / PJ)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-black uppercase">
                        <th className="py-2 px-3">Corretor</th>
                        <th className="py-2 px-3 text-center">Pessoa Física (PF)</th>
                        <th className="py-2 px-3 text-center">Pessoa Jurídica (PJ)</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {metricasCarteira.porCorretor.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-800">{row.nome}</td>
                          <td className="py-2.5 px-3 text-center text-indigo-600 font-bold">{row.pf}</td>
                          <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">{row.pj}</td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900">{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2 & 6: REGIME TRIBUTÁRIO & PERFIL DE SEXO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                    2. Regime Tributário (Empresas PJ)
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <span className="block text-2xl font-black text-indigo-600">{metricasCarteira.simplesSim}</span>
                      <span className="text-[10px] font-black uppercase text-slate-500">Optante Simples</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <span className="block text-2xl font-black text-slate-600">{metricasCarteira.simplesNao}</span>
                      <span className="text-[10px] font-black uppercase text-slate-500">Não Simples</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <span className="block text-2xl font-black text-emerald-600">{metricasCarteira.meiSim}</span>
                      <span className="text-[10px] font-black uppercase text-slate-500">Optante MEI</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <span className="block text-2xl font-black text-slate-600">{metricasCarteira.meiNao}</span>
                      <span className="text-[10px] font-black uppercase text-slate-500">Não MEI</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                    6. Perfil por Sexo
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-center">
                      <span className="block text-2xl font-black text-blue-600">{metricasCarteira.sexoMap['Masculino']}</span>
                      <span className="text-[10px] font-black uppercase text-blue-500">Masculino</span>
                    </div>
                    <div className="p-4 bg-pink-50 border border-pink-100 rounded-xl text-center">
                      <span className="block text-2xl font-black text-pink-600">{metricasCarteira.sexoMap['Feminino']}</span>
                      <span className="text-[10px] font-black uppercase text-pink-500">Feminino</span>
                    </div>
                    <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl text-center">
                      <span className="block text-2xl font-black text-purple-600">{metricasCarteira.sexoMap['Outro']}</span>
                      <span className="text-[10px] font-black uppercase text-purple-500">Outro</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <span className="block text-2xl font-black text-slate-500">{metricasCarteira.sexoMap['Não informado']}</span>
                      <span className="text-[10px] font-black uppercase text-slate-400">Não Informado</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5 & 4: KANBAN E ANIVERSARIANTES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                    5. Status / Fase Kanban
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {Object.entries(metricasCarteira.kanbanMap).map(([fase, qtd], idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs font-bold text-slate-700">
                        <span className="uppercase">{fase}</span>
                        <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full font-black">{qtd}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                    4. Aniversariantes (Próximos 30 dias)
                  </h3>
                  {metricasCarteira.aniversariantes.length === 0 ? (
                    <div className="text-center py-8 text-xs font-bold text-slate-400 uppercase">
                      Nenhum aniversariante nos próximos 30 dias.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {metricasCarteira.aniversariantes.map((item) => (
                        <div key={item.id} className="flex justify-between items-center p-2.5 bg-amber-50/60 border border-amber-100 rounded-lg text-xs font-bold text-slate-800">
                          <div>
                            <span className="block font-black text-slate-900">{item.nome}</span>
                            <span className="text-[10px] text-amber-700 uppercase">Aniversário: {item.dataNasc}</span>
                          </div>
                          <span className="px-2.5 py-1 bg-amber-200 text-amber-900 rounded-full text-[10px] font-black uppercase">
                            {item.diasFaltando === 0 ? 'Hoje!' : `Em ${item.diasFaltando}d`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. MUNICÍPIOS E BAIRROS */}
              <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                  3. Distribuição por Município e Bairro
                </h3>
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-white shadow-sm">
                      <tr className="border-b border-slate-200 text-slate-400 font-black uppercase">
                        <th className="py-2 px-3">Município</th>
                        <th className="py-2 px-3">Bairro</th>
                        <th className="py-2 px-3 text-right">Total de Clientes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {metricasCarteira.listaLocalizacao.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-800">{row.municipio}</td>
                          <td className="py-2 px-3 text-slate-600">{row.bairro}</td>
                          <td className="py-2 px-3 text-right font-black text-indigo-600">{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              ABA 2: CLIENTES IMPORTADOS
            ========================================== */}
          {activeTab === 'importados' && metricasImportados && (
            <div className="space-y-6">
              {/* CRONOGRAMA DE RETORNOS */}
              <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                    Cronograma de Retornos (Clientes Importados)
                  </h3>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-black rounded-full uppercase">
                    Total Agendados: {metricasImportados?.cronograma?.totalAgendados || 0}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
                    <span className="block text-3xl font-black text-red-600">
                      {metricasImportados?.cronograma?.atrasado || 0}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-500">Atrasados</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <span className="block text-3xl font-black text-indigo-600">
                      {metricasImportados?.cronograma?.semana || 0}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">0 a 7 dias</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <span className="block text-3xl font-black text-indigo-600">
                      {metricasImportados?.cronograma?.quinzena || 0}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">8 a 15 dias</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <span className="block text-3xl font-black text-indigo-600">
                      {metricasImportados?.cronograma?.mes || 0}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">16 a 30 dias</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <span className="block text-3xl font-black text-indigo-600">
                      {metricasImportados?.cronograma?.trimestre || 0}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">31 a 90 dias</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <span className="block text-3xl font-black text-indigo-600">
                      {metricasImportados?.cronograma?.longoPrazo || 0}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">+ 90 dias</span>
                  </div>
                </div>
              </div>

              {/* METRICAS DE DESTAQUE: CAPITAL SOCIAL, IDADE MÉDIA E SÓCIOS MÉDIOS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 text-center">
                  <span className="block text-[11px] font-black uppercase text-indigo-500 tracking-wider">3. Capital Social Médio</span>
                  <span className="block text-3xl font-black text-indigo-700 mt-2">
                    {(metricasImportados?.capitalSocialMedio || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                <div className="p-6 bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-100 text-center">
                  <span className="block text-[11px] font-black uppercase text-emerald-500 tracking-wider">10. Idade Média das Empresas</span>
                  <span className="block text-3xl font-black text-emerald-700 mt-2">
                    {metricasImportados?.idadeMediaAnos || 0} <span className="text-sm font-bold">anos</span>
                  </span>
                </div>

                <div className="p-6 bg-gradient-to-br from-amber-50 to-white rounded-2xl border border-amber-100 text-center">
                  <span className="block text-[11px] font-black uppercase text-amber-600 tracking-wider">7. Média de Sócios / Empresa</span>
                  <span className="block text-3xl font-black text-amber-700 mt-2">
                    {metricasImportados?.sociosMedio || 0} <span className="text-sm font-bold">sócios</span>
                  </span>
                </div>
              </div>

              {/* 1 & 2: STATUS PROSPECÇÃO E PORTE MÉDIO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                    1. Status de Prospecção
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(metricasImportados?.statusProspeccaoMap || {}).map(([st, qtd], idx) => {
                      const numQtd = Number(qtd) || 0;
                      const total = metricasImportados?.totalGeral || 0;
                      const pct = total > 0 ? Math.round((numQtd / total) * 100) : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-slate-700 uppercase">
                            <span>{st.replace(/_/g, ' ')}</span>
                            <span>{numQtd} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                    2. Porte das Empresas
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(metricasImportados?.porteMap || {}).map(([porte, qtd], idx) => {
                      const numQtd = Number(qtd) || 0;
                      const total = metricasImportados?.totalGeral || 0;
                      const pct = total > 0 ? Math.round((numQtd / total) * 100) : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-slate-700 uppercase">
                            <span>{porte}</span>
                            <span>{numQtd} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 4 & 5: REGIME TRIBUTÁRIO E MATRIZ/FILIAL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                    4. MEI e Simples Nacional
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <span className="block text-2xl font-black text-indigo-600">{metricasImportados?.simplesSim || 0}</span>
                      <span className="text-[10px] font-black uppercase text-slate-500">Optante Simples</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <span className="block text-2xl font-black text-slate-600">{metricasImportados?.simplesNao || 0}</span>
                      <span className="text-[10px] font-black uppercase text-slate-500">Não Simples</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <span className="block text-2xl font-black text-emerald-600">{metricasImportados?.meiSim || 0}</span>
                      <span className="text-[10px] font-black uppercase text-slate-500">Optante MEI</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <span className="block text-2xl font-black text-slate-600">{metricasImportados?.meiNao || 0}</span>
                      <span className="text-[10px] font-black uppercase text-slate-500">Não MEI</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                    5. Identificador Matriz / Filial
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(metricasImportados?.matrizFilialMap || {}).map(([mf, qtd], idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-700">
                        <span className="uppercase">{mf}</span>
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-black">{Number(qtd)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 11, 12, 13: FASE, TEMPERATURA E PRÓXIMA AÇÃO */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                    11. Fase de Atendimento
                  </h3>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {Object.entries(metricasImportados?.faseAtendimentoMap || {}).map(([fase, qtd], idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-700">
                        <span className="uppercase">{fase.replace(/_/g, ' ')}</span>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-black text-[11px]">{Number(qtd)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                    12. Temperatura
                  </h3>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {Object.entries(metricasImportados?.temperaturaMap || {}).map(([temp, qtd], idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-700">
                        <span className="uppercase">{temp}</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-black text-[11px]">{Number(qtd)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                    13. Próxima Ação
                  </h3>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {Object.entries(metricasImportados?.proximaAcaoMap || {}).map(([act, qtd], idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-700">
                        <span className="uppercase">{act}</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-black text-[11px]">{Number(qtd)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 8 & 9: FAIXAS ETÁRIAS DE SÓCIOS E TOP 20 CNAES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                    8. Faixas Etárias dos Sócios
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {Object.entries(metricasImportados?.faixasEtariasMap || {}).map(([fx, qtd], idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs font-bold text-slate-700">
                        <span className="uppercase">{fx}</span>
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full font-black">{Number(qtd)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                    9. Top 20 CNAEs Principais
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {(metricasImportados?.top20Cnaes || []).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-700">
                        <span className="truncate pr-2">{item.cnae}</span>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-black text-[10px]">{item.qtd}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 6. MUNICÍPIOS E BAIRROS */}
              <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                  6. Distribuição por Município e Bairro
                </h3>
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-white shadow-sm">
                      <tr className="border-b border-slate-200 text-slate-400 font-black uppercase">
                        <th className="py-2 px-3">Município</th>
                        <th className="py-2 px-3">Bairro</th>
                        <th className="py-2 px-3 text-right">Total Registros</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {(metricasImportados?.listaLocalizacao || []).map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-800">{row.municipio}</td>
                          <td className="py-2 px-3 text-slate-600">{row.bairro}</td>
                          <td className="py-2 px-3 text-right font-black text-indigo-600">{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              ABA 3: CLIENTES AVULSOS
             ========================================== */}
          {activeTab === 'avulsos' && (
            <div className="space-y-6">
              <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                  Cronograma de Retornos (Clientes Avulsos)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
                    <span className="block text-3xl font-black text-red-600">{cronogramaAgenda.atrasado}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-500">Atrasados</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <span className="block text-3xl font-black text-indigo-600">{cronogramaAgenda.semana}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">0 a 7 dias</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <span className="block text-3xl font-black text-indigo-600">{cronogramaAgenda.quinzena}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">8 a 15 dias</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <span className="block text-3xl font-black text-indigo-600">{cronogramaAgenda.mes}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">16 a 30 dias</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <span className="block text-3xl font-black text-indigo-600">{cronogramaAgenda.trimestre}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">31 a 90 dias</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <span className="block text-3xl font-black text-indigo-600">{cronogramaAgenda.longoPrazo}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">+ 90 dias</span>
                  </div>
                </div>
              </div>

              {/* LISTA DE REGISTROS AVULSOS */}
              <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                  Agendamentos e Atendimentos Avulsos
                </h3>
                {(!clientesAgenda || clientesAgenda.length === 0) ? (
                  <div className="text-center py-8 text-xs font-bold text-slate-400 uppercase">
                    Nenhum cliente avulso agendado.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-black uppercase">
                          <th className="py-2 px-3">Cliente</th>
                          <th className="py-2 px-3">Telefone</th>
                          <th className="py-2 px-3">E-mail</th>
                          <th className="py-2 px-3 text-center">Data Retorno</th>
                          <th className="py-2 px-3">Descrição</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {clientesAgenda.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-bold text-slate-800">{item.nome_cliente}</td>
                            <td className="py-2.5 px-3 text-slate-600">{item.tel_cliente || '-'}</td>
                            <td className="py-2.5 px-3 text-slate-600">{item.email_cliente || '-'}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-indigo-600">
                              {item.data_retorno ? String(item.data_retorno).split('-').reverse().join('/') : '-'}
                              {item.horario_retorno && ` às ${item.horario_retorno}`}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{item.breve_descricao || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VisaoCliente;