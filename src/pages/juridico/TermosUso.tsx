import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, ChevronLeft, 
  AlertTriangle, Cloud, Database, 
  UserCheck, Server, Info, Gavel, Chrome, Lock
} from 'lucide-react';

const Legal = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'termos' | 'privacidade'>('termos');

  const empresa = {
    nome: "21.205.476 BRUCE MACIEL DA SILVA DUARTE",
    cnpj: "21.205.476/0001-39",
    endereco: "R ALEXANDRINA DE SOUZA MARTINS, SN, BOA VISTA, IMBITUBA/SC, CEP 88.780-000",
    email: "BRUCE.ECONOMISTA@GMAIL.COM",
    dataAtualizacao: "04 de fevereiro de 2026"
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
          <h1 className="text-4xl font-black text-zinc-900 dark:text-white mb-4 tracking-tight uppercase italic">
            Compliance & Centro Jurídico
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto font-medium">
            Documentação atualizada em conformidade com as Leis 12.965/14 (Marco Civil) e 13.709/18 (LGPD).
          </p>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-zinc-200 dark:bg-zinc-900 rounded-2xl mb-8 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('termos')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'termos' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Gavel size={18} /> Termos de Uso
          </button>
          <button
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
              <p className="text-xs text-zinc-400 mb-10 tracking-widest uppercase">Última revisão: {empresa.dataAtualizacao}</p>
              
              <div className="space-y-10 text-zinc-700 dark:text-zinc-300">
                <section>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white uppercase"><Info size={20} className="text-blue-600"/> 1. Objeto e Licença</h3>
                  <p className="text-sm leading-relaxed">
                    Estes termos regem o uso da plataforma SeguroCRM. O licenciamento é feito na modalidade SaaS (Software as a Service), sendo uma licença de uso revogável, não exclusiva e intransferível. O uso da plataforma implica na aceitação plena destas condições.
                  </p>
                </section>

                <section>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white uppercase"><Cloud size={20} className="text-blue-600"/> 2. Responsabilidade sobre Dados</h3>
                  <p>
                    O <strong>Usuário</strong> é o único "Controlador" (nos termos da LGPD) dos dados de seus clientes. O SeguroCRM atua como "Operador", fornecendo a infraestrutura tecnológica. O Usuário garante possuir autorização legal para inserir dados de terceiros na plataforma.
                  </p>
                </section>

                <section>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white uppercase"><Lock size={20} className="text-blue-600"/> 3. Integrações e Terceiros</h3>
                  <p>
                    A plataforma permite integração com serviços de terceiros (como Google e Outlook). O Usuário reconhece que ao ativar estas integrações, está sujeito também aos termos e políticas desses provedores. O SeguroCRM não se responsabiliza por falhas ou interrupções causadas por serviços externos.
                  </p>
                </section>

                <section>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white uppercase"><AlertTriangle size={20} className="text-blue-600"/> 4. Limitação de Responsabilidade</h3>
                  <p>
                    Em nenhuma circunstância o SeguroCRM será responsável por lucros cessantes, perda de dados ou danos indiretos decorrentes do uso da ferramenta. A responsabilidade total da contratada limita-se ao valor total pago pelo usuário nos últimos 6 meses de serviço.
                  </p>
                </section>
              </div>
            </article>
          ) : (
            <article className="prose prose-zinc dark:prose-invert max-w-none">
              <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-2 uppercase italic">Política de Privacidade</h2>
              <p className="text-xs text-zinc-400 mb-10 tracking-widest uppercase">Conformidade com a Política de Dados do Google API</p>
              
              <div className="space-y-10 text-zinc-700 dark:text-zinc-300">
                
                {/* SEÇÃO CRUCIAL PARA O GOOGLE */}
                <section className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-[24px] border border-blue-100 dark:border-blue-900/30">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-blue-700 dark:text-blue-400 uppercase mb-4">
                    <Chrome size={22} /> Uso de Dados das APIs do Google
                  </h3>
                  <p className="text-sm leading-relaxed mb-4">
                    Para fornecer funcionalidades de CRM integradas, solicitamos acesso a informações do Google via OAuth 2.0.
                  </p>
                  <ul className="space-y-4 text-sm list-none p-0 m-0">
                    <li>
                      <strong>Dados Acessados:</strong> Endereço de e-mail e informações básicas de perfil (nome e foto) para autenticação segura.
                    </li>
                    <li>
                      <strong>Uso e Finalidade:</strong> Estes dados são usados exclusivamente para identificar sua conta, permitir o envio de notificações e sincronizar alertas de renovação.
                    </li>
                    <li>
                      <strong>Segurança e Transferência:</strong> O SeguroCRM <strong>não compartilha, não vende e não transfere</strong> dados obtidos através do Google para terceiros ou para fins de publicidade. O uso de informações recebidas das APIs do Google seguirá a <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" className="underline text-blue-600">Política de Dados do Usuário dos Serviços de API do Google</a>, incluindo os requisitos de Uso Limitado.
                    </li>
                  </ul>
                </section>

                <section>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white uppercase"><Database size={20} className="text-blue-600"/> 1. Coleta Mínima</h3>
                  <p>Coletamos apenas o estritamente necessário para a prestação do serviço. Informações como histórico de navegação ou dados sensíveis não são processados pela nossa plataforma.</p>
                </section>

                <section>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white uppercase"><Server size={20} className="text-blue-600"/> 2. Proteção Técnica</h3>
                  <p>Utilizamos criptografia ponta a ponta em trânsito (SSL/TLS 1.3) e em repouso (AES-256). Seus dados são isolados logicamente de outros usuários, garantindo privacidade total.</p>
                </section>

                <div className="bg-zinc-100 dark:bg-zinc-800 p-6 rounded-[24px]">
                  <div className="flex gap-4">
                    <UserCheck className="text-blue-600 shrink-0" />
                    <div>
                      <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase mb-1">Contato do Encarregado (DPO)</h4>
                      <p className="text-xs leading-relaxed">Dúvidas sobre seus dados? Contate <strong>{empresa.email}</strong> aos cuidados de Bruce Maciel.</p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          )}
        </div>

        {/* Footer Jurídico */}
        <div className="mt-12 text-center border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <p className="text-[10px] text-zinc-400 uppercase tracking-[0.4em] font-black">
            {empresa.nome}
          </p>
          <p className="text-[10px] text-zinc-500 mt-2 uppercase font-medium">
            CNPJ {empresa.cnpj} • Atualizado em {empresa.dataAtualizacao}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Legal;