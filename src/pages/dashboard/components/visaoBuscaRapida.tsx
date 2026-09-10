import { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient'; 
import { Search, Users, MapPin, FileText, Phone, MessageSquare } from 'lucide-react';

interface VisaoBuscaRapidaProps {
  corretoraId: string;
}

// Estrutura do item dentro do JSONB de contatos
interface ContatoV2 {
  id?: string;
  nome?: string;
  email?: string;
  telefone?: string;
  principal?: boolean;
  cargo_parentesco?: string;
}

// Estrutura do JSONB dados_complementares na V2
interface DadosComplementaresV2 {
  porte?: string;
  capital_social?: number;
  data_abertura?: string;
  natureza_juridica?: string;
  nomes_socios_texto?: string;
  cpfs_socios_texto?: string;
  opcao_pelo_mei?: boolean;
  opcao_pelo_simples?: boolean;
}

// Interface ajustada para a tab_clientes
interface LeadCliente {
  id: string;
  nome_razao_social: string;
  nome_fantasia: string;
  cpf_cnpj: string;
  bairro: string;
  municipio: string;
  uf: string;
  fase_atendimento: string;
  contatos: ContatoV2[] | string;
  dados_complementares_pf?: DadosComplementaresV2 | string;
  dados_complementares_pj?: DadosComplementaresV2 | string;
}

export default function VisaoBuscaRapida({ corretoraId }: VisaoBuscaRapidaProps) {
  const [termo, setTermo] = useState<string>('');
  const [resultados, setResultados] = useState<LeadCliente[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [buscou, setBuscou] = useState<boolean>(false);

  const buscarEmpresas = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!termo || termo.length < 3) return;

    setLoading(true);
    setBuscou(true);

    const termoLimpo = termo.replace(/\D/g, '');
    const queryTexto = `%${termo}%`;
    const queryCnpj = termoLimpo.length >= 3 ? `%${termoLimpo}%` : queryTexto;

    // Consulta apontando para tab_clientes
    const { data, error } = await supabase
      .from('tab_clientes')
      .select(`
        id, 
        nome_razao_social, 
        nome_fantasia, 
        cpf_cnpj, 
        bairro, 
        municipio, 
        uf, 
        fase_atendimento,
        contatos,
        dados_complementares_pf,
        dados_complementares_pj
      `)
      .eq('corretora_id', corretoraId)
      .or(`nome_razao_social.ilike.${queryTexto},nome_fantasia.ilike.${queryTexto},cpf_cnpj.ilike.${queryCnpj}`)
      .limit(20);

    if (error) {
      console.error('Erro ao buscar empresas na tab_clientes:', error);
      setResultados([]);
    } else {
      setResultados((data as LeadCliente[]) || []);
    }

    setLoading(false);
  };

  const limparTelefone = (tel: string | null | undefined): string => {
    return tel ? tel.replace(/\D/g, '') : '';
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* CARD DE BUSCA */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <form onSubmit={buscarEmpresas} className="flex flex-col gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Search size={14} className="text-indigo-600" /> Consulta Rápida de Campo
          </label>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Digite Razão Social, Fantasia ou CNPJ..."
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
            <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
          </div>

          <button
            type="submit"
            disabled={loading || termo.length < 3}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Pesquisando...' : 'Buscar Empresa'}
          </button>
        </form>
      </div>

      {/* LISTA DE RESULTADOS */}
      {loading && (
        <div className="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-widest">
          Consultando base de prospecção...
        </div>
      )}

      {!loading && buscou && resultados.length === 0 && (
        <div className="text-center py-8 bg-white rounded-2xl border border-slate-200 p-6 text-slate-500 text-sm">
          Nenhuma empresa encontrada com o termo "{termo}".
        </div>
      )}

      {!loading && resultados.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
            Resultados Encontrados ({resultados.length})
          </p>

          {resultados.map((lead) => {
            // Extração do JSONB de contatos
            const contatosArray: ContatoV2[] = typeof lead.contatos === 'string' 
              ? JSON.parse(lead.contatos || '[]') 
              : (lead.contatos || []);

            const contatoPrincipal = contatosArray.find(c => c.principal) || contatosArray[0];
            const contatoSecundario = contatosArray.find(c => !c.principal) || contatosArray[1];

            const tel1Limpo = limparTelefone(contatoPrincipal?.telefone);
            const tel2Limpo = limparTelefone(contatoSecundario?.telefone);

            // Extração do JSONB de dados complementares
            const pfObj = typeof lead.dados_complementares_pf === 'string'
              ? JSON.parse(lead.dados_complementares_pf || '{}')
              : (lead.dados_complementares_pf || {});

            const pjObj = typeof lead.dados_complementares_pj === 'string'
              ? JSON.parse(lead.dados_complementares_pj || '{}')
              : (lead.dados_complementares_pj || {});

            const dadosComp: DadosComplementaresV2 = { ...pfObj, ...pjObj };

            const nomesSocios = dadosComp.nomes_socios_texto || '';

            return (
              <div 
                key={lead.id} 
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3"
              >
                {/* Nome & CNPJ */}
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug">
                    {lead.nome_fantasia || lead.nome_razao_social}
                  </h3>
                  {lead.nome_fantasia && (
                    <p className="text-xs text-slate-400 font-medium uppercase mt-0.5">
                      {lead.nome_razao_social}
                    </p>
                  )}
                  <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-slate-100 rounded text-[11px] font-mono font-semibold text-slate-600">
                    <FileText size={12} className="text-slate-400" /> {lead.cpf_cnpj}
                  </div>
                </div>

                {/* Sócios */}
                {nomesSocios ? (
                  <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 flex items-start gap-2.5">
                    <Users size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-wider text-indigo-900">
                        Quadro de Sócios / Administradores
                      </span>
                      <p className="text-xs font-bold text-indigo-950 mt-0.5 leading-relaxed">
                        {nomesSocios}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] italic text-slate-400 bg-slate-50 p-2 rounded-lg">
                    Sócios não informados no cadastro.
                  </div>
                )}

                {/* Localização */}
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <MapPin size={14} className="text-slate-400 shrink-0" />
                  <span>
                    {lead.bairro ? `${lead.bairro}, ` : ''}{lead.municipio} - {lead.uf}
                  </span>
                </div>

                {/* Ações Rápidas */}
                {(tel1Limpo || tel2Limpo) && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    {tel1Limpo && (
                      <a
                        href={`https://wa.me/55${tel1Limpo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <MessageSquare size={14} /> Whats ({contatoPrincipal?.telefone})
                      </a>
                    )}
                    {tel2Limpo && (
                      <a
                        href={`tel:${tel2Limpo}`}
                        className="py-2 px-3 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Phone size={14} /> Ligar ({contatoSecundario?.telefone})
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}