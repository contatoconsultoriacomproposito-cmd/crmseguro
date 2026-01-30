import { 
  Lock, Eye, Database, UserCheck, 
  ChevronLeft, Server, Share2, Trash2, ShieldCheck 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PoliticaPrivacidade = () => {
  // ADICIONE ESTA LINHA ABAIXO PARA CORRIGIR O ERRO:
  const navigate = useNavigate();

const empresa = {
    nome: "21.205.476 BRUCE MACIEL DA SILVA DUARTE",
    cnpj: "21.205.476/0001-39",
    endereco: "R ALEXANDRINA DE SOUZA MARTINS, SN, BOA VISTA, IMBITUBA/SC, CEP 88.780-000",
    email: "BRUCE.ECONOMISTA@GMAIL.COM",
    dataAtualizacao: "30 de janeiro de 2026"
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          {/* Botão de Voltar */}
        <button 
        onClick={() => navigate('/')} // Agora ele força o retorno para a Home
        className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 mb-6 transition-colors group"
        >
        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
        Voltar para Início
        </button>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
              <ShieldCheck size={32} />
            </div>
          </div>
          <h1 className="text-4xl font-black text-zinc-900 dark:text-white mb-4 tracking-tight uppercase italic">
            Privacidade & Proteção
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 font-medium max-w-xl mx-auto">
            Compromisso com a Lei Geral de Proteção de Dados (LGPD) e transparência no tratamento de informações.
          </p>
        </div>

        {/* Conteúdo Principal */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[40px] p-8 md:p-16 shadow-sm">
          
          <article className="prose prose-zinc dark:prose-invert max-w-none">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-8 mb-10">
              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                Documento Oficial
              </span>
              <p className="text-xs text-zinc-400 m-0 italic">Última atualização: {empresa.dataAtualizacao}</p>
            </div>

            <div className="space-y-12 text-zinc-700 dark:text-zinc-300">
              
              {/* Seção 1 */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <Eye className="text-blue-600" size={20} />
                  </div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white m-0 uppercase tracking-tight">1. Coleta e Bases Legais</h3>
                </div>
                <p className="leading-relaxed">
                  Tratamos dados fundamentados estritamente nas bases legais da LGPD (Art. 7º), principalmente para a <strong>execução de contrato</strong> e <strong>legítimo interesse</strong>.
                </p>
                <ul className="list-none p-0 space-y-4 mt-6">
                  <li className="flex gap-4">
                    <span className="h-2 w-2 bg-blue-600 rounded-full mt-2 shrink-0"></span>
                    <span><strong>Dados de Identificação:</strong> Nome e e-mail para autenticação e segurança do acesso.</span>
                  </li>
                  <li className="flex gap-4">
                    <span className="h-2 w-2 bg-blue-600 rounded-full mt-2 shrink-0"></span>
                    <span><strong>Integrações de Terceiros:</strong> Tokens de acesso ao Google Agenda para sincronização de compromissos, processados via OAuth 2.0 seguro.</span>
                  </li>
                </ul>
              </section>

              {/* Seção 2 */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <Lock className="text-blue-600" size={20} />
                  </div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white m-0 uppercase tracking-tight">2. Segurança e Criptografia</h3>
                </div>
                <p className="leading-relaxed text-sm">
                  A <strong>{empresa.nome}</strong> utiliza protocolos de segurança de nível bancário para proteger o ecossistema do CRM:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <Database size={18} className="mb-2 text-blue-500" />
                    <h4 className="text-sm font-bold mb-1">Criptografia em Repouso</h4>
                    <p className="text-xs text-zinc-500">Bancos de dados protegidos por AES-256.</p>
                  </div>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <Server size={18} className="mb-2 text-blue-500" />
                    <h4 className="text-sm font-bold mb-1">Trânsito Seguro</h4>
                    <p className="text-xs text-zinc-500">Toda comunicação ocorre via túneis TLS 1.3.</p>
                  </div>
                </div>
              </section>

              {/* Seção 3 */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <Share2 className="text-blue-600" size={20} />
                  </div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white m-0 uppercase tracking-tight">3. Operadores e Subprocessadores</h3>
                </div>
                <p className="leading-relaxed">
                  Para viabilizar a plataforma, utilizamos subprocessadores de dados de classe mundial que cumprem rigorosos padrões de conformidade (SOC2 e GDPR). Seus dados <strong>não são vendidos</strong> em hipótese alguma. Nossos parceiros incluem infraestrutura em nuvem (Supabase/AWS) e serviços de autenticação (Google Identity).
                </p>
              </section>

              {/* Seção 4 */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <Trash2 className="text-blue-600" size={20} />
                  </div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white m-0 uppercase tracking-tight">4. Retenção e Exclusão</h3>
                </div>
                <p className="leading-relaxed">
                  Os dados pessoais e de clientes são mantidos apenas pelo período necessário para a prestação do serviço. No caso de encerramento da conta, o usuário dispõe de 30 dias para exportação de dados, após os quais procederemos com a <strong>exclusão definitiva</strong> ou anonimização irreversível.
                </p>
              </section>

              {/* Seção DPO */}
              <section className="pt-10 border-t border-zinc-100 dark:border-zinc-800">
                <div className="bg-zinc-900 dark:bg-zinc-800 p-8 rounded-[32px] text-white">
                  <div className="flex items-center gap-4 mb-4">
                    <UserCheck className="text-blue-400" size={28} />
                    <h3 className="text-lg font-bold m-0 italic">Encarregado de Dados (DPO)</h3>
                  </div>
                  <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                    Para exercer seus direitos de acesso, retificação ou exclusão (Art. 18 LGPD), entre em contato direto com o nosso responsável pela proteção de dados.
                  </p>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">Bruce Maciel da Silva Duarte</p>
                    <p className="text-sm text-blue-400 font-mono">{empresa.email}</p>
                  </div>
                </div>
              </section>

            </div>
          </article>
        </div>

        {/* Footer Jurídico */}
        <div className="mt-12 text-center">
          <p className="text-[10px] text-zinc-400 uppercase tracking-[0.4em] font-bold">
            {empresa.nome}
          </p>
          <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-tighter">
            CNPJ {empresa.cnpj} • {empresa.endereco}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PoliticaPrivacidade;