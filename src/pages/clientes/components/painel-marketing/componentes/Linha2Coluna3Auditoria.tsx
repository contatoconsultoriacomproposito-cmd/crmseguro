import React from 'react';
import { usePainelMarketing } from '../context/PainelMarketingContext';

// 1. Interface expandida com TODOS os campos reais da tab_clientes_frios e tab_clientes
interface DadosCadastraisExtra {
  tabela_origem?: string;
  tipo_cliente?: 'PF' | 'PJ' | string;
  temperatura?: string;
  
  // Campos de Pessoa Jurídica (tab_clientes_frios / PJ)
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  porte?: string;
  capital_social?: string | number;
  ddd_telefone_1?: string;
  opcao_pelo_mei?: boolean;
  opcao_pelo_simples?: boolean;
  natureza_juridica?: string;
  cep?: string;
  uf?: string;
  municipio?: string;
  bairro?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  email?: string;
  telefone_adicional?: string | null;
  nomes_socios?: string;
  cpfs_socios?: string;
  faixas_etarias?: string;
  cnae_principal?: string;
  data_abertura?: string;
  situacao_cadastral?: string;

  // Campos de Pessoa Física (PF)
  nome?: string;
  cpf?: string;
  logradouro_pf?: string;
  bairro_pf?: string;
  municipio_pf?: string;
  uf_pf?: string;
  telefone_whats?: string;
}

interface LogAuditoriaExtendido {
  id: string;
  nome_cliente: string;
  email_cliente: string;
  status_entrega: string;
  abriu_email: unknown;
  clicou_whatsapp: unknown;
  cadastrado_no_sistema: boolean;
  tipo_cliente?: string;
  resend_id?: string;
  ultimo_evento_em?: string;
  dadosCadastrais?: any; 
}

export const Linha2Coluna3Auditoria: React.FC = () => {
  const {
    auditoria,
    disparoSelecionado,
    loadingAuditoria,
    clienteAuditoriaSelecionado: clienteBase,
    selecionarEInspecionarCliente,
    setClienteAuditoriaSelecionado,
    loadingDadosExtras
  } = usePainelMarketing();

  const clienteAuditoriaSelecionado = clienteBase as unknown as LogAuditoriaExtendido | null;

  // 2. TRATAMENTO E TRADUÇÃO DOS DADOS (Resolve o problema do array e da inferência de PF/PJ)
  const dadosCadastrais = React.useMemo(() => {
    const raw = clienteAuditoriaSelecionado?.dadosCadastrais;
    if (!raw) return undefined;

    // Se vier como array [{}], desempacota o primeiro item
    const obj = Array.isArray(raw) ? raw[0] : raw;
    if (!obj || typeof obj !== 'object') return undefined;

    const resultado = { ...obj } as DadosCadastraisExtra;

    // Inferência inteligente: Se tem CNPJ ou Razão Social, é obrigatoriamente PJ
    if (resultado.cnpj || resultado.razao_social) {
      resultado.tipo_cliente = 'PJ';
    } else if (resultado.cpf || resultado.nome) {
      resultado.tipo_cliente = 'PF';
    }

    return resultado;
  }, [clienteAuditoriaSelecionado?.dadosCadastrais]);

  // FORMATADOR AUXILIAR DE MOEDA
  const formatarMoeda = (valor: any) => {
    if (!valor) return 'Não informado';
    const num = Number(valor);
    return isNaN(num) ? valor : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  // MÉTRICAS RÁPIDAS
  const metricas = React.useMemo(() => {
    if (!auditoria || !auditoria.length) {
      return { entregues: 0, abertos: 0, cliques: 0, bounces: 0 };
    }
    return auditoria.reduce(
      (acc, curr) => {
        const abriu = Boolean(curr.abriu_email);
        const clicou = Boolean(curr.clicou_whatsapp);
        if (curr.status_entrega === 'entregue' || curr.status_entrega === 'enviado') acc.entregues++;
        if (abriu) acc.abertos++;
        if (clicou) acc.cliques++;
        if (curr.status_entrega === 'erro_bounced') acc.bounces++;
        return acc;
      },
      { entregues: 0, abertos: 0, cliques: 0, bounces: 0 }
    );
  }, [auditoria]);

  const renderBadgeStatus = (status: string, abriu: unknown, clicou: unknown) => {
    if (Boolean(clicou)) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">🔥 Clicou Whats</span>;
    if (Boolean(abriu)) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700">🌤️ Abriu E-mail</span>;
    if (status === 'erro_bounced') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">🚨 Bounce</span>;
    if (status === 'entregue') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">📥 Entregue</span>;
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">⏳ Processando</span>;
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[520px] relative">
      
      {/* CABEÇALHO */}
      <div className="border-b pb-2 mb-3">
        <h2 className="font-semibold text-sm text-gray-700">📊 3. Rastreamento e Termometria</h2>
        <p className="text-[10px] text-gray-400">
          {disparoSelecionado ? `Logs do Lote: ${disparoSelecionado.id.substring(0, 8)}...` : 'Selecione um histórico de envio'}
        </p>
      </div>

      {!disparoSelecionado ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <div className="text-gray-300 text-3xl mb-1">👈</div>
          <p className="text-xs text-gray-400">Selecione um lote na coluna central para inspecionar.</p>
        </div>
      ) : loadingAuditoria ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-xs text-gray-400 animate-pulse">Lendo detalhes de envio...</p>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          {/* CARDS METRICAS */}
          <div className="grid grid-cols-4 gap-1.5 mb-3 text-center">
            <div className="bg-blue-50/50 border border-blue-100 p-1.5 rounded-lg">
              <p className="text-[9px] font-bold text-blue-500 uppercase">Enviados</p>
              <p className="text-sm font-bold text-blue-700 font-mono">{auditoria.length}</p>
            </div>
            <div className="bg-orange-50/50 border border-orange-100 p-1.5 rounded-lg">
              <p className="text-[9px] font-bold text-orange-500 uppercase">Abertos</p>
              <p className="text-sm font-bold text-orange-700 font-mono">{metricas.abertos}</p>
            </div>
            <div className="bg-green-50/50 border border-green-100 p-1.5 rounded-lg">
              <p className="text-[9px] font-bold text-green-500 uppercase">Cliques</p>
              <p className="text-sm font-bold text-green-700 font-mono">{metricas.cliques}</p>
            </div>
            <div className="bg-red-50/50 border border-red-100 p-1.5 rounded-lg">
              <p className="text-[9px] font-bold text-red-500 uppercase">Bounces</p>
              <p className="text-sm font-bold text-red-700 font-mono">{metricas.bounces}</p>
            </div>
          </div>

          {/* LISTA DE LOGS */}
          <div className="overflow-y-auto flex-1 divide-y border rounded-lg bg-slate-50/30 custom-scrollbar">
            {auditoria.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-400">Nenhum log encontrado.</div>
            ) : (
              auditoria.map((log) => {
                const isInspecting = clienteAuditoriaSelecionado?.id === log.id;
                return (
                  <div
                    key={log.id}
                    onClick={() => selecionarEInspecionarCliente(log)}
                    className={`p-2.5 flex justify-between items-center cursor-pointer transition-all ${
                      isInspecting ? 'bg-slate-200/60 font-medium border-l-4 border-slate-700 pl-1.5' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-left max-w-[60%]">
                      <p className="text-xs font-bold text-gray-700 truncate">{log.nome_cliente}</p>
                      <p className="text-[10px] text-gray-400 font-mono truncate">{log.email_cliente}</p>
                    </div>
                    <div>{renderBadgeStatus(log.status_entrega, log.abriu_email, log.clicou_whatsapp)}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* PAINEL LATERAL DE INSPEÇÃO */}
      {clienteAuditoriaSelecionado && (
        <div className="absolute inset-y-0 right-0 w-80 bg-slate-900 text-slate-100 shadow-2xl p-4 flex flex-col z-20 rounded-r-xl border-l border-slate-800 animate-slideLeft">
          <div className="flex justify-between items-start border-b border-slate-800 pb-3">
            <div className="text-left">
              <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                Inspeção de Auditoria
              </span>
              <h3 className="font-bold text-xs text-white mt-1 truncate max-w-[200px]">
                {clienteAuditoriaSelecionado.nome_cliente}
              </h3>
            </div>
            <button onClick={() => setClienteAuditoriaSelecionado(null)} className="text-slate-400 hover:text-white text-xs p-1">
              ✕ Fechar
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs text-left custom-scrollbar">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">E-mail de Destino</p>
              <p className="text-slate-300 font-mono mt-0.5 break-all select-all bg-slate-950 p-2 rounded border border-slate-800">
                {clienteAuditoriaSelecionado.email_cliente}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase">Tipo do Lead</p>
                <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded ${dadosCadastrais?.tipo_cliente === 'PJ' ? 'bg-indigo-950 text-indigo-400 border border-indigo-800' : 'bg-slate-800 text-slate-300'}`}>
                  {dadosCadastrais?.tipo_cliente || 'PF'}
                </span>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase">Vínculo CRM</p>
                <p className="text-slate-200 font-bold mt-0.5">
                  {clienteAuditoriaSelecionado.cadastrado_no_sistema ? '✅ Cadastrado' : '📁 Via CSV'}
                </p>
              </div>
            </div>

            {/* PAINEL DE DADOS ADICIONAIS VINDOS DO MARKETING OU CRM */}
            {loadingDadosExtras ? (
              <div className="bg-slate-950/30 p-2.5 rounded-xl border border-slate-800 text-center animate-pulse">
                <p className="text-[10px] text-slate-500 italic">Buscando cadastros vinculados...</p>
              </div>
            ) : dadosCadastrais ? (
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-2.5">
                <div className="flex justify-between items-center pb-1 border-b border-slate-800">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">📋 Dados Cadastrais Adicionais</p>
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    {dadosCadastrais.cnpj ? 'Leads Frios' : 'CRM Principal'}
                  </span>
                </div>

                {/* EXIBIÇÃO PESSOA JURÍDICA (PJ - TAB_CLIENTES_FRIOS) */}
                {dadosCadastrais.tipo_cliente === 'PJ' && (
                  <>
                    {dadosCadastrais.razao_social && (
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-bold">Razão Social</p>
                        <p className="text-slate-200 text-[11px] font-medium">{dadosCadastrais.razao_social}</p>
                      </div>
                    )}
                    {dadosCadastrais.nome_fantasia && (
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-bold">Nome Fantasia</p>
                        <p className="text-slate-200 text-[11px] font-medium">{dadosCadastrais.nome_fantasia}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {dadosCadastrais.cnpj && (
                        <div>
                          <p className="text-[9px] text-slate-500 uppercase font-bold">CNPJ</p>
                          <p className="text-slate-200 font-mono text-[10px] tracking-wider">{dadosCadastrais.cnpj}</p>
                        </div>
                      )}
                      {dadosCadastrais.porte && (
                        <div>
                          <p className="text-[9px] text-slate-500 uppercase font-bold">Porte</p>
                          <p className="text-slate-300 text-[10px]">{dadosCadastrais.porte}</p>
                        </div>
                      )}
                    </div>

                    {dadosCadastrais.capital_social && (
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-bold">Capital Social</p>
                        <p className="text-emerald-400 font-mono text-[10px]">{formatarMoeda(dadosCadastrais.capital_social)}</p>
                      </div>
                    )}

                    {dadosCadastrais.cnae_principal && (
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-bold">CNAE Atividade</p>
                        <p className="text-slate-300 text-[10px] leading-tight italic">{dadosCadastrais.cnae_principal}</p>
                      </div>
                    )}

                    {/* REGIME TRIBUTÁRIO BADGES */}
                    <div className="flex gap-1.5 pt-1">
                      {dadosCadastrais.opcao_pelo_simples !== undefined && (
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${dadosCadastrais.opcao_pelo_simples ? 'bg-green-950 text-green-400 border border-green-900' : 'bg-red-950 text-red-400'}`}>
                          {dadosCadastrais.opcao_pelo_simples ? 'Simples Nacional' : 'Não Simples'}
                        </span>
                      )}
                      {dadosCadastrais.opcao_pelo_mei && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-900">
                          MEI
                        </span>
                      )}
                    </div>

                    {/* ENDEREÇO COMERCIAL PJ */}
                    {(dadosCadastrais.municipio || dadosCadastrais.uf) && (
                      <div className="pt-1.5 border-t border-slate-800/60">
                        <p className="text-[9px] text-slate-500 uppercase font-bold">Localização</p>
                        <p className="text-slate-300 text-[10px] leading-tight mt-0.5">
                          {dadosCadastrais.logradouro && `${dadosCadastrais.logradouro}, `}
                          {dadosCadastrais.numero && `${dadosCadastrais.numero} `}
                          {dadosCadastrais.bairro && `— ${dadosCadastrais.bairro}, `}
                          {dadosCadastrais.municipio}/{dadosCadastrais.uf}
                        </p>
                      </div>
                    )}

                    {/* SOCIEDADE */}
                    {dadosCadastrais.nomes_socios && (
                      <div className="pt-1.5 border-t border-slate-800/60">
                        <p className="text-[9px] text-slate-500 uppercase font-bold">Sócios Vinculados</p>
                        <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">{dadosCadastrais.nomes_socios}</p>
                        {dadosCadastrais.cpfs_socios && (
                          <p className="text-[9px] text-slate-500 font-mono">{dadosCadastrais.cpfs_socios}</p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* EXIBIÇÃO PESSOA FÍSICA (PF) */}
                {dadosCadastrais.tipo_cliente === 'PF' && (
                  <>
                    {dadosCadastrais.nome && (
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-bold">Nome Completo</p>
                        <p className="text-slate-200 text-[11px] font-medium">{dadosCadastrais.nome}</p>
                      </div>
                    )}
                    {dadosCadastrais.cpf && (
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-bold">CPF</p>
                        <p className="text-slate-200 font-mono tracking-wider">{dadosCadastrais.cpf}</p>
                      </div>
                    )}
                    {(dadosCadastrais.municipio_pf || dadosCadastrais.uf_pf) && (
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-bold">Endereço Residencial</p>
                        <p className="text-slate-300 text-[10px] leading-tight">
                          {dadosCadastrais.logradouro_pf && `${dadosCadastrais.logradouro_pf}, `}
                          {dadosCadastrais.bairro_pf && `${dadosCadastrais.bairro_pf} — `}
                          {dadosCadastrais.municipio_pf}/{dadosCadastrais.uf_pf}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* TELEFONES E MEIOS DE CONTATO */}
                <div className="pt-1.5 border-t border-slate-800/60">
                  <p className="text-[9px] text-slate-500 uppercase font-bold">Contatos Cadastrados</p>
                  <div className="space-y-1 mt-0.5">
                    {/* ddd_telefone_1 vindo limpo ou formatado */}
                    {(dadosCadastrais.ddd_telefone_1 || dadosCadastrais.telefone_whats) && (
                      <p className="text-emerald-400 font-medium">
                        🟢 WhatsApp: <span className="text-slate-200 font-mono">{dadosCadastrais.ddd_telefone_1 || dadosCadastrais.telefone_whats}</span>
                      </p>
                    )}
                    {dadosCadastrais.telefone_adicional && (
                      <p className="text-slate-300">
                        📞 Adicional: <span className="text-slate-200 font-mono">{dadosCadastrais.telefone_adicional}</span>
                      </p>
                    )}
                    {dadosCadastrais.email && dadosCadastrais.email.toLowerCase() !== clienteAuditoriaSelecionado.email_cliente.toLowerCase() && (
                      <p className="text-slate-300 truncate">
                        ✉️ Alt: <span className="text-slate-200 font-mono text-[10px]">{dadosCadastrais.email}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/20 p-3 rounded-xl border border-slate-800/40 text-center text-slate-500 italic">
                Nenhum dado cadastral extra localizado.
              </div>
            )}

            {/* LINHA DO TEMPO */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Linha do Tempo (Resend Triggers)</p>
              <div className="space-y-2 border-l border-slate-800 pl-3 ml-1.5">
                <div className="relative">
                  <div className={`absolute -left-[17px] top-1 w-2 h-2 rounded-full ${clienteAuditoriaSelecionado.resend_id ? 'bg-blue-500' : 'bg-slate-700'}`} />
                  <p className="font-bold text-slate-300">Mensagem Processada</p>
                  <p className="text-[10px] text-slate-500 font-mono break-all">{clienteAuditoriaSelecionado.resend_id || 'Aguardando ID...'}</p>
                </div>
                <div className="relative">
                  <div className={`absolute -left-[17px] top-1 w-2 h-2 rounded-full ${clienteAuditoriaSelecionado.status_entrega === 'entregue' || clienteAuditoriaSelecionado.abriu_email ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                  <p className="font-bold text-slate-300">Entrega na Caixa</p>
                </div>
                <div className="relative">
                  <div className={`absolute -left-[17px] top-1 w-2 h-2 rounded-full ${clienteAuditoriaSelecionado.abriu_email ? 'bg-orange-500' : 'bg-slate-700'}`} />
                  <p className="font-bold text-slate-300">Abertura de E-mail</p>
                </div>
                <div className="relative">
                  <div className={`absolute -left-[17px] top-1 w-2 h-2 rounded-full ${clienteAuditoriaSelecionado.clicou_whatsapp ? 'bg-green-500' : 'bg-slate-700'}`} />
                  <p className="font-bold text-slate-300">Gatilho WhatsApp</p>
                </div>
              </div>
            </div>

            {clienteAuditoriaSelecionado.ultimo_evento_em && (
              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 text-center font-mono">
                Última atualização: {new Date(clienteAuditoriaSelecionado.ultimo_evento_em).toLocaleString('pt-BR')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};