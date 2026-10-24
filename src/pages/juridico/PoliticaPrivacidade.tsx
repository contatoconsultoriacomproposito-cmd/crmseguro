import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Baby,
  BrainCircuit,
  CheckCircle2,
  Chrome,
  Clock3,
  CloudCog,
  Database,
  Eye,
  FileArchive,
  Globe2,
  LockKeyhole,
  Mail,
  MessageSquareText,
  Mic,
  PhoneCall,
  Scale,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

const empresa = {
  nome: "21.205.476 BRUCE MACIEL DA SILVA DUARTE",
  nomeProduto: "SeguroCRM",
  cnpj: "21.205.476/0001-39",
  endereco:
    "R ALEXANDRINA DE SOUZA MARTINS, SN, BOA VISTA, IMBITUBA/SC, CEP 88.780-000",
  email: "BRUCE.ECONOMISTA@GMAIL.COM",
  dataAtualizacao: "24 de outubro de 2026",
};

export default function PoliticaPrivacidade() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f6f8fb] px-4 py-10 font-sans text-zinc-900 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="group mb-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
          >
            <ArrowLeft
              size={16}
              className="transition-transform group-hover:-translate-x-1"
            />
            Voltar para o início
          </button>

          <div className="rounded-[36px] bg-zinc-950 px-7 py-10 text-white sm:px-10 lg:px-14 lg:py-14">
            <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
              <ShieldCheck size={28} />
            </div>

            <div className="max-w-3xl">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">
                Privacidade e proteção de dados
              </p>

              <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">
                Política de Privacidade
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                Esta Política explica como o SeguroCRM trata dados pessoais,
                documentos, comunicações e registros operacionais durante a
                utilização da plataforma.
              </p>

              <p className="mt-5 text-xs font-medium text-zinc-500">
                Última atualização: {empresa.dataAtualizacao}
              </p>
            </div>
          </div>
        </header>

        <div className="mb-8 rounded-3xl border border-blue-200 bg-blue-50 p-6">
          <div className="flex gap-4">
            <Eye className="mt-0.5 shrink-0 text-blue-600" size={22} />

            <div>
              <h2 className="font-black text-blue-950">
                Aviso importante de transparência
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-blue-900/80">
                Ao utilizar o SeguroCRM, sua organização poderá armazenar e
                processar informações relacionadas a clientes, leads,
                propostas, contratos, apólices, documentos, mensagens,
                conversas, mídias, áudios e demais registros necessários à
                operação da corretora. O tratamento efetivamente realizado
                dependerá das funcionalidades utilizadas e das informações
                inseridas pela própria organização.
              </p>
            </div>
          </div>
        </div>

        <main className="space-y-6">
          <LegalSection
            number="1"
            icon={<Scale size={20} />}
            title="Quem somos e os papéis na LGPD"
          >
            <p>
              O <strong>{empresa.nomeProduto}</strong> é uma plataforma SaaS
              destinada à gestão operacional de corretoras e profissionais do
              mercado de seguros.
            </p>

            <p>
              Para os dados pessoais de clientes, segurados, leads,
              beneficiários, sócios, contatos e demais terceiros inseridos ou
              tratados pela corretora usuária da plataforma, a própria
              corretora é, em regra, a <strong>Controladora</strong>, pois
              define as finalidades e os meios essenciais do tratamento.
            </p>

            <p>
              Nessas situações, o SeguroCRM atua predominantemente como
              <strong> Operador</strong>, realizando o tratamento em nome e
              conforme as instruções do cliente contratante.
            </p>

            <p>
              Em relação aos dados necessários para criação e administração de
              contas, autenticação, segurança, faturamento, assinatura,
              prevenção a fraudes, suporte e relacionamento direto com os
              usuários da plataforma, o SeguroCRM poderá atuar como
              <strong> Controlador</strong>.
            </p>
          </LegalSection>

          <LegalSection
            number="2"
            icon={<Database size={20} />}
            title="Quais dados podem ser tratados"
          >
            <p>
              Conforme os módulos utilizados, o SeguroCRM poderá tratar as
              seguintes categorias de informações:
            </p>

            <DataGrid
              items={[
                {
                  title: "Dados de conta",
                  text: "Nome, e-mail, telefone, perfil de acesso, corretora vinculada e informações necessárias à autenticação.",
                  icon: <Users size={18} />,
                },
                {
                  title: "Dados de clientes e leads",
                  text: "Nome, CPF/CNPJ, contatos, endereço, informações empresariais, responsáveis, sócios e demais dados cadastrados pela corretora.",
                  icon: <UserCheck size={18} />,
                },
                {
                  title: "Dados comerciais",
                  text: "Propostas, cotações, produtos, seguradoras, apólices, contratos, renovações, valores e histórico de negociação.",
                  icon: <Database size={18} />,
                },
                {
                  title: "Dados financeiros",
                  text: "Parcelas, recebimentos, comissões, repasses e demais registros financeiros vinculados à operação da corretora.",
                  icon: <Scale size={18} />,
                },
              ]}
            />
          </LegalSection>

          <LegalSection
            number="3"
            icon={<MessageSquareText size={20} />}
            title="Conversas, WhatsApp e histórico de atendimento"
            highlight
          >
            <p>
              Quando a corretora conecta canais de comunicação ao SeguroCRM,
              a plataforma poderá armazenar e processar o conteúdo necessário
              para registrar e manter o histórico de atendimento.
            </p>

            <DataGrid
              items={[
                {
                  title: "Mensagens",
                  text: "Mensagens recebidas e enviadas, incluindo conteúdo textual, identificadores, remetente, destinatário, data e horário.",
                  icon: <MessageSquareText size={18} />,
                },
                {
                  title: "Áudios",
                  text: "Mensagens de voz, gravações de áudio enviadas ou recebidas e respectivos metadados.",
                  icon: <Mic size={18} />,
                },
                {
                  title: "Mídias e anexos",
                  text: "Imagens, vídeos, documentos, PDFs e demais arquivos compartilhados durante o atendimento.",
                  icon: <FileArchive size={18} />,
                },
                {
                  title: "Histórico operacional",
                  text: "Status da conversa, responsável pelo atendimento, encaminhamentos, reações, eventos, vínculos e demais registros necessários à continuidade do atendimento.",
                  icon: <Clock3 size={18} />,
                },
              ]}
            />

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex gap-3">
                <PhoneCall className="shrink-0 text-amber-600" size={20} />

                <p className="text-sm leading-relaxed text-amber-900">
                  <strong>Chamadas e gravações:</strong> quando funcionalidades
                  de chamada, telefonia, gravação ou integração equivalente
                  estiverem habilitadas e forem utilizadas, o sistema poderá
                  registrar informações como origem, destino, duração, data,
                  horário, status da chamada e, quando aplicável e permitido
                  legalmente, o próprio conteúdo gravado.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection
            number="4"
            icon={<FileArchive size={20} />}
            title="Documentos e Central de Armazenamento"
          >
            <p>
              O SeguroCRM possui funcionalidades de armazenamento destinadas a
              organizar documentos e arquivos utilizados na operação da
              corretora.
            </p>

            <p>
              Podem ser armazenados, entre outros, apólices, propostas,
              documentos de identificação, comprovantes, formulários, anexos
              recebidos por canais de atendimento e arquivos associados a
              clientes, contratos, sinistros, assistências ou outros registros
              da plataforma.
            </p>

            <p>
              A corretora contratante é responsável por avaliar a necessidade,
              adequação e base legal para inserção de documentos contendo dados
              pessoais de terceiros.
            </p>
          </LegalSection>

          <LegalSection
            number="5"
            icon={<Eye size={20} />}
            title="Finalidades e bases legais"
          >
            <p>
              O tratamento será realizado conforme a finalidade de cada
              operação e poderá se fundamentar, entre outras hipóteses
              previstas na LGPD, em:
            </p>

            <BulletList
              items={[
                "execução de contrato ou de procedimentos preliminares relacionados ao contrato;",
                "cumprimento de obrigação legal ou regulatória;",
                "exercício regular de direitos em processo judicial, administrativo ou arbitral;",
                "legítimo interesse, quando aplicável e observados os direitos e liberdades fundamentais do titular;",
                "proteção ao crédito e prevenção a fraudes, quando cabível;",
                "consentimento do titular quando essa for efetivamente a base legal adequada;",
                "outras hipóteses autorizadas pela LGPD, inclusive para dados pessoais sensíveis nos termos do art. 11.",
              ]}
            />

            <p>
              A aceitação desta Política representa ciência sobre as práticas
              de tratamento descritas, mas <strong>não substitui consentimento
              específico</strong> quando a legislação exigir consentimento como
              base legal para uma determinada operação.
            </p>
          </LegalSection>

          <LegalSection
            number="6"
            icon={<AlertTriangle size={20} />}
            title="Dados pessoais sensíveis"
          >
            <p>
              Embora o SeguroCRM não tenha como finalidade principal coletar
              dados pessoais sensíveis, a natureza da atividade securitária
              pode fazer com que documentos, sinistros, assistências,
              comunicações ou registros inseridos pelos usuários contenham
              informações enquadradas no art. 5º, II, da LGPD, incluindo dados
              relativos à saúde.
            </p>

            <p>
              Nesses casos, cabe ao Controlador assegurar que o tratamento
              esteja amparado por hipótese legal adequada prevista no art. 11
              da LGPD e limitado ao necessário para a finalidade pretendida.
            </p>
          </LegalSection>

          <LegalSection
            number="7"
            icon={<Baby size={20} />}
            title="Dados de crianças e adolescentes"
          >
            <p>
              A plataforma não é destinada diretamente a crianças. Entretanto,
              operações de seguros podem eventualmente envolver menores como
              segurados, dependentes ou beneficiários.
            </p>

            <p>
              Nesses casos, a organização Controladora deverá observar o
              melhor interesse da criança ou adolescente e as exigências do
              art. 14 da LGPD e demais normas aplicáveis.
            </p>
          </LegalSection>

          <LegalSection
            number="8"
            icon={<CloudCog size={20} />}
            title="Operadores, subprocessadores e serviços de terceiros"
          >
            <p>
              Para viabilizar a infraestrutura da plataforma, o SeguroCRM pode
              utilizar fornecedores especializados de hospedagem, banco de
              dados, armazenamento de arquivos, autenticação, comunicação,
              monitoramento, processamento e serviços em nuvem.
            </p>

            <p>
              Atualmente, a arquitetura pode envolver serviços como
              <strong> Supabase</strong>, provedores de infraestrutura em nuvem,
              <strong> Backblaze B2</strong>, serviços de mensageria e
              provedores necessários às integrações habilitadas pelo cliente.
            </p>

            <p>
              Esses fornecedores recebem somente os dados necessários à
              execução de suas respectivas funções e permanecem sujeitos às
              obrigações contratuais e legais aplicáveis.
            </p>

            <p>
              O SeguroCRM <strong>não vende dados pessoais</strong> a
              anunciantes ou terceiros.
            </p>
          </LegalSection>

          <LegalSection
            number="9"
            icon={<Globe2 size={20} />}
            title="Transferências internacionais de dados"
          >
            <p>
              Alguns fornecedores de infraestrutura, armazenamento,
              autenticação ou integração podem possuir servidores, empresas do
              grupo ou operações localizadas fora do Brasil.
            </p>

            <p>
              Nessas situações poderá ocorrer transferência internacional de
              dados pessoais, observados os arts. 33 a 36 da LGPD e a
              regulamentação da Autoridade Nacional de Proteção de Dados,
              inclusive mecanismos válidos de transferência e salvaguardas
              contratuais aplicáveis.
            </p>

            <p>
              As localizações e fornecedores específicos podem variar de
              acordo com a infraestrutura contratada e com as integrações
              habilitadas pela corretora.
            </p>
          </LegalSection>

          <LegalSection
            number="10"
            icon={<Chrome size={20} />}
            title="Google APIs e OAuth"
            highlight
          >
            <p>
              Quando o usuário optar por conectar serviços Google, o
              SeguroCRM poderá utilizar OAuth 2.0 e APIs autorizadas pelo
              próprio usuário.
            </p>

            <BulletList
              items={[
                "dados básicos da conta Google necessários à autenticação e identificação;",
                "dados estritamente relacionados às funcionalidades autorizadas pelo usuário;",
                "informações necessárias à sincronização de agenda, lembretes ou outras integrações efetivamente habilitadas.",
              ]}
            />

            <p>
              Os dados obtidos por APIs do Google não serão vendidos nem
              utilizados para publicidade comportamental.
            </p>

            <p>
              O uso e a transferência de informações recebidas das APIs do
              Google observarão a Google API Services User Data Policy,
              incluindo seus requisitos de Limited Use.
            </p>

            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline"
            >
              Consultar a política oficial do Google
            </a>
          </LegalSection>

          <LegalSection
            number="11"
            icon={<BrainCircuit size={20} />}
            title="Automação e inteligência artificial"
          >
            <p>
              Determinadas funcionalidades podem utilizar regras automatizadas
              ou recursos de inteligência artificial para apoiar atendimento,
              organização, classificação, qualificação de leads ou produção de
              sugestões.
            </p>

            <p>
              Essas funcionalidades são ferramentas auxiliares e não substituem
              a avaliação humana quando decisões relevantes relacionadas a
              clientes, contratos ou direitos de titulares precisarem ser
              tomadas.
            </p>
          </LegalSection>

          <LegalSection
            number="12"
            icon={<LockKeyhole size={20} />}
            title="Segurança da informação"
          >
            <p>
              O SeguroCRM adota medidas técnicas e administrativas compatíveis
              com os riscos envolvidos no tratamento, buscando proteger os
              dados contra acessos não autorizados e situações acidentais ou
              ilícitas de destruição, perda, alteração, comunicação ou difusão.
            </p>

            <BulletList
              items={[
                "controle de autenticação e acesso;",
                "segregação lógica entre organizações e perfis;",
                "políticas de autorização e restrição de acesso aos dados;",
                "comunicação segura com serviços de infraestrutura;",
                "monitoramento e registros técnicos quando necessários à segurança;",
                "mecanismos de backup, redundância ou recuperação conforme os serviços utilizados;",
                "procedimentos destinados à prevenção e resposta a incidentes.",
              ]}
            />

            <p>
              Nenhum sistema conectado à internet pode oferecer garantia
              absoluta contra incidentes. As medidas adotadas serão
              continuamente avaliadas e aperfeiçoadas de acordo com a
              evolução da plataforma e dos riscos.
            </p>
          </LegalSection>

          <LegalSection
            number="13"
            icon={<Clock3 size={20} />}
            title="Retenção, exclusão e preservação de histórico"
          >
            <p>
              Os dados serão mantidos pelo período necessário ao cumprimento
              das finalidades para as quais foram tratados, durante a vigência
              contratual e pelos prazos adicionais necessários ao cumprimento
              de obrigações legais, regulatórias, contratuais ou ao exercício
              regular de direitos.
            </p>

            <p>
              O encerramento de uma conexão, usuário, sessão de WhatsApp ou
              integração <strong>não implica necessariamente a exclusão
              automática do histórico operacional</strong>, pois mensagens,
              documentos e demais registros poderão permanecer associados à
              corretora para preservação do histórico legítimo de atendimento,
              auditoria e continuidade operacional.
            </p>

            <p>
              Quando houver solicitação válida de eliminação, os dados serão
              excluídos, anonimizados ou bloqueados conforme aplicável, salvo
              quando sua conservação for autorizada ou exigida por lei.
            </p>

            <p>
              Cópias residuais poderão permanecer temporariamente em rotinas
              técnicas de backup e recuperação até sua substituição ou
              expiração normal.
            </p>
          </LegalSection>

          <LegalSection
            number="14"
            icon={<UserCheck size={20} />}
            title="Direitos dos titulares"
          >
            <p>
              Nos termos do art. 18 da LGPD, os titulares podem exercer,
              conforme aplicável:
            </p>

            <BulletList
              items={[
                "confirmação da existência de tratamento;",
                "acesso aos dados;",
                "correção de dados incompletos, inexatos ou desatualizados;",
                "anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade;",
                "portabilidade, quando regulamentada e tecnicamente aplicável;",
                "informação sobre compartilhamentos realizados;",
                "revogação do consentimento quando esta for a base legal do tratamento;",
                "oposição ao tratamento nas hipóteses legalmente previstas;",
                "peticionamento perante a Autoridade Nacional de Proteção de Dados.",
              ]}
            />

            <p>
              Quando o SeguroCRM estiver atuando apenas como Operador, o pedido
              relacionado a dados de clientes da corretora poderá ser
              encaminhado à respectiva organização Controladora para decisão.
            </p>
          </LegalSection>

          <LegalSection
            number="15"
            icon={<AlertTriangle size={20} />}
            title="Incidentes de segurança"
          >
            <p>
              Caso seja identificado incidente de segurança envolvendo dados
              pessoais, serão adotadas medidas compatíveis com a natureza,
              extensão e riscos do evento.
            </p>

            <p>
              Quando aplicável, o Controlador e a Autoridade Nacional de
              Proteção de Dados serão informados conforme os requisitos e
              prazos previstos na legislação e regulamentação vigentes.
            </p>
          </LegalSection>

          <LegalSection
            number="16"
            icon={<CheckCircle2 size={20} />}
            title="Responsabilidades da corretora contratante"
          >
            <p>
              A corretora é responsável pelas informações que decide inserir
              ou tratar no SeguroCRM e deverá:
            </p>

            <BulletList
              items={[
                "possuir base legal adequada para o tratamento dos dados de seus clientes e demais titulares;",
                "informar seus clientes sobre os tratamentos realizados quando exigido pela legislação;",
                "obter consentimentos específicos quando juridicamente necessários;",
                "respeitar regras aplicáveis à gravação de chamadas, comunicações e conteúdos de terceiros;",
                "limitar o acesso de seus usuários aos dados necessários às respectivas funções;",
                "manter atualizados os dados e permissões de seus colaboradores.",
              ]}
            />
          </LegalSection>

          <LegalSection
            number="17"
            icon={<Mail size={20} />}
            title="Canal de privacidade e Encarregado"
          >
            <div className="rounded-3xl bg-zinc-950 p-7 text-white">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">
                Proteção de dados
              </p>

              <p className="mt-3 text-lg font-black">
                Bruce Maciel da Silva Duarte
              </p>

              <p className="mt-2 text-sm text-zinc-400">
                Solicitações relacionadas à privacidade, proteção de dados e
                exercício de direitos podem ser encaminhadas para:
              </p>

              <a
                href={`mailto:${empresa.email}`}
                className="mt-5 inline-block font-mono text-sm font-bold text-blue-400 hover:underline"
              >
                {empresa.email}
              </a>
            </div>
          </LegalSection>

          <LegalSection
            number="18"
            icon={<ShieldCheck size={20} />}
            title="Alterações desta Política"
          >
            <p>
              Esta Política poderá ser atualizada para refletir alterações na
              legislação, regulamentações, infraestrutura, funcionalidades ou
              práticas de tratamento do SeguroCRM.
            </p>

            <p>
              Alterações relevantes poderão ser comunicadas pela própria
              plataforma, por e-mail ou por outros canais adequados.
            </p>

            <p>
              A versão vigente estará sempre identificada por sua data de
              atualização.
            </p>
          </LegalSection>
        </main>

        <LegalFooter />
      </div>
    </div>
  );
}

function LegalSection({
  number,
  icon,
  title,
  children,
  highlight = false,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <section
      className={`rounded-[30px] border p-6 sm:p-8 ${
        highlight
          ? "border-blue-200 bg-blue-50/50"
          : "border-zinc-200 bg-white"
      }`}
    >
      <div className="mb-6 flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            highlight
              ? "bg-blue-600 text-white"
              : "bg-zinc-100 text-blue-600"
          }`}
        >
          {icon}
        </div>

        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">
            Seção {number}
          </p>

          <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-950">
            {title}
          </h2>
        </div>
      </div>

      <div className="space-y-4 text-sm leading-7 text-zinc-600 [&_strong]:font-bold [&_strong]:text-zinc-900">
        {children}
      </div>
    </section>
  );
}

function DataGrid({
  items,
}: {
  items: {
    title: string;
    text: string;
    icon: React.ReactNode;
  }[];
}) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {items.map(item => (
        <div
          key={item.title}
          className="rounded-2xl border border-zinc-200 bg-white p-5"
        >
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            {item.icon}
          </div>

          <h3 className="text-sm font-black text-zinc-900">
            {item.title}
          </h3>

          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            {item.text}
          </p>
        </div>
      ))}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map(item => (
        <li key={item} className="flex gap-3">
          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function LegalFooter() {
  return (
    <footer className="mt-10 border-t border-zinc-200 pt-8 text-center">
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400">
        {empresa.nomeProduto}
      </p>

      <p className="mt-2 text-[10px] font-medium text-zinc-500">
        {empresa.nome} · CNPJ {empresa.cnpj}
      </p>

      <p className="mt-1 text-[10px] text-zinc-400">{empresa.endereco}</p>
    </footer>
  );
}