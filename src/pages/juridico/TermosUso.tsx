import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Importar o hook
import { 
  Shield, ChevronLeft, Scale, 
  AlertTriangle, Cloud, Ban, Database, 
  UserCheck, Server, Share2, Info, Gavel, Trash2
} from 'lucide-react';

const Legal = () => {
  const navigate = useNavigate(); // 2. Instanciar a função de navegação
  const [activeTab, setActiveTab] = useState<'termos' | 'privacidade'>('termos');

  const empresa = {
    nome: "21.205.476 BRUCE MACIEL DA SILVA DUARTE",
    cnpj: "21.205.476/0001-39",
    endereco: "R ALEXANDRINA DE SOUZA MARTINS, SN, BOA VISTA, IMBITUBA/SC, CEP 88.780-000",
    email: "BRUCE.ECONOMISTA@GMAIL.COM",
    dataInicio: "09/10/2014"
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <button 
            onClick={() => navigate('/')}
            className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 mb-6 transition-colors group"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
            Voltar para Início
          </button>
          <h1 className="text-4xl font-black text-zinc-900 dark:text-white mb-4 tracking-tight uppercase">
            Compliance & Centro Jurídico
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto font-medium">
            Documentação atualizada em conformidade com as Leis 12.965/14 e 13.709/18.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-zinc-200 dark:bg-zinc-900 rounded-2xl mb-8 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setActiveTab('termos')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'termos' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Gavel size={18} /> Termos de Uso
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privacidade')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'privacidade' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Shield size={18} /> Privacidade
          </button>
        </div>

        {/* Conteúdo Principal */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-8 md:p-12 shadow-sm">
          
          {activeTab === 'termos' ? (
            <article className="prose prose-zinc dark:prose-invert max-w-none">
              <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-2 uppercase italic">Termos e Condições de Uso</h2>
              <p className="text-xs text-zinc-400 mb-10 tracking-widest uppercase">Versão 2.0 - Fundamentada no Marco Civil da Internet</p>
              
              <div className="space-y-10 text-zinc-700 dark:text-zinc-300">
                <section>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white uppercase"><Info size={20} className="text-blue-600"/> 1. Definições (Glossário)</h3>
                  <p className="text-sm">Para clareza deste contrato: <strong>"Software"</strong> refere-se ao CRM; <strong>"Usuário"</strong> é a pessoa física ou jurídica licenciada; <strong>"Dados de Cliente"</strong> são as informações inseridas pelo usuário no sistema.</p>
                </section>

                <section>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white uppercase"><Cloud size={20} className="text-blue-600"/> 2. Propriedade dos Dados</h3>
                  <p>O <strong>Usuário</strong> mantém a propriedade exclusiva de todos os dados inseridos. O <strong>Software</strong> atua apenas como custodiante tecnológico, não possuindo qualquer direito de exploração comercial sobre os dados da carteira do usuário.</p>
                </section>

                <section>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white uppercase"><Ban size={20} className="text-blue-600"/> 3. Uso Aceitável e Segurança</h3>
                  <p>É vedada a utilização de scripts de automação não autorizados (bots) ou técnicas de <em>scraping</em>. O descumprimento resultará na suspensão imediata da conta sem direito a reembolso, visando proteger a integridade dos demais usuários.</p>
                </section>

                <section>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white uppercase"><AlertTriangle size={20} className="text-blue-600"/> 4. Isenção de Responsabilidade de Lucros</h3>
                  <p>O Software é uma ferramenta de apoio. Não garantimos resultados financeiros ou conversão de vendas, sendo a estratégia comercial de inteira responsabilidade do Usuário.</p>
                </section>

                <section>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white uppercase"><Scale size={20} className="text-blue-600"/> 5. Rescisão e Exportação</h3>
                  <p>O Usuário pode rescindir o serviço a qualquer momento. Em caso de cancelamento, o acesso aos dados será mantido por 30 dias para fins de exportação, sendo deletados permanentemente após este período.</p>
                </section>
              </div>
            </article>
          ) : (
            <article className="prose prose-zinc dark:prose-invert max-w-none">
              <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-2 uppercase italic">Política de Privacidade & Dados</h2>
              <p className="text-xs text-zinc-400 mb-10 tracking-widest uppercase">Certificação de Conformidade LGPD - Lei 13.709/18</p>
              
              <div className="space-y-10 text-zinc-700 dark:text-zinc-300">
                <section>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white uppercase"><Database size={20} className="text-blue-600"/> 1. Minimização de Dados</h3>
                  <p>Seguimos o princípio da minimização: coletamos apenas o essencial para o funcionamento do CRM. Dados como tokens do Google Agenda são utilizados estritamente para sincronização e nunca para leitura de dados não autorizados.</p>
                </section>

                <section>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white uppercase"><Server size={20} className="text-blue-600"/> 2. Medidas de Segurança Técnica</h3>
                  <ul className="list-disc pl-5 space-y-2 mt-2 text-sm">
                    <li>Criptografia SSL/TLS para todos os dados em trânsito.</li>
                    <li>Hash de segurança para senhas (não armazenamos senhas em texto puro).</li>
                    <li>Backups diários e isolamento de banco de dados por usuário (Tenant Isolation).</li>
                  </ul>
                </section>

                <section>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white uppercase"><Trash2 size={20} className="text-blue-600"/> 3. Retenção e Descarte</h3>
                  <p>Os dados pessoais são retidos enquanto a conta estiver ativa. Após o encerramento, os dados são anonimizados ou deletados conforme os requisitos legais de prescrição de obrigações (Marco Civil).</p>
                </section>

                <section>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white uppercase"><Share2 size={20} className="text-blue-600"/> 4. Operadores e Subprocessadores</h3>
                  <p>Utilizamos parceiros de infraestrutura de classe mundial (AWS/Supabase/Google). Ao utilizar o Software, o usuário autoriza o processamento técnico nestas plataformas sob nossos protocolos de segurança.</p>
                </section>

                <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[24px] border border-blue-100 dark:border-blue-900/30 mt-10">
                  <div className="flex gap-4">
                    <UserCheck className="text-blue-600 shrink-0" />
                    <div>
                      <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase mb-1">DPO e Direitos do Titular</h4>
                      <p className="text-xs leading-relaxed">Para exercer seu direito de acesso, portabilidade ou exclusão, contate Bruce Maciel através de <strong>{empresa.email}</strong>. Prazo de resposta: até 15 dias úteis.</p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          )}
        </div>

        {/* Footer Jurídico Institucional */}
        <div className="mt-12 text-center border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <p className="text-[10px] text-zinc-400 uppercase tracking-[0.4em] font-black">
            {empresa.nome}
          </p>
          <p className="text-[10px] text-zinc-500 mt-2 uppercase font-medium">
            CNPJ {empresa.cnpj} • Fundada em {empresa.dataInicio}
          </p>
          <p className="text-[10px] text-zinc-500 mt-1 uppercase italic font-medium">
            {empresa.endereco}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Legal;