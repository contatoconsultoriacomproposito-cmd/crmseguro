import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  CloudCog,
  CreditCard,
  Database,
  FileArchive,
  Gavel,
  KeyRound,
  LockKeyhole,
  MessageSquareText,
  PhoneCall,
  RefreshCcw,
  Scale,
  Server,
  ShieldCheck,
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

export default function TermosUso() {
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
              <Gavel size={28} />
            </div>

            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">
              Contrato de utilização da plataforma
            </p>

            <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">
              Termos e Condições de Uso
            </h1>

            <p className="mt-5 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              Estes Termos regulam o acesso e a utilização do SeguroCRM e
              estabelecem direitos, responsabilidades e condições aplicáveis à
              relação entre a plataforma e seus usuários.
            </p>

            <p className="mt-5 text-xs font-medium text-zinc-500">
              Última atualização: {empresa.dataAtualizacao}
            </p>
          </div>
        </header>

        <div className="mb-8 rounded-3xl border border-blue-200 bg-blue-50 p-6">
          <div className="flex gap-4">
            <CheckCircle2 className="mt-0.5 shrink-0 text-blue-600" size={22} />

            <div>
              <h2 className="font-black text-blue-950">
                Aceitação dos Termos
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-blue-900/80">
                Ao criar uma conta, contratar, acessar ou continuar utilizando
                o SeguroCRM após tomar conhecimento destes Termos, o usuário e
                a organização à qual estiver vinculado declaram ciência e
                concordância com suas condições, observadas as disposições
                legais aplicáveis.
              </p>
            </div>
          </div>
        </div>

        <main className="space-y-6">
          <TermSection
            number="1"
            icon={<Scale size={20} />}
            title="Objeto e natureza do serviço"
          >
            <p>
              O SeguroCRM é disponibilizado na modalidade
              <strong> Software as a Service — SaaS</strong> e oferece
              ferramentas destinadas à gestão operacional de corretoras e
              profissionais do mercado de seguros.
            </p>

            <p>
              O contratante recebe licença limitada, revogável, não exclusiva,
              não sublicenciável e intransferível para utilização da plataforma
              durante a vigência da contratação, respeitados estes Termos e o
              plano contratado.
            </p>

            <p>
              A contratação não transfere ao usuário qualquer direito de
              propriedade sobre código-fonte, bancos de dados estruturais,
              marcas, componentes, algoritmos, interfaces ou demais ativos
              intelectuais do SeguroCRM.
            </p>
          </TermSection>

          <TermSection
            number="2"
            icon={<Users size={20} />}
            title="Cadastro, contas e usuários"
          >
            <p>
              O contratante é responsável por fornecer informações verdadeiras,
              completas e atualizadas, bem como por administrar os usuários
              vinculados à sua organização.
            </p>

            <p>
              As credenciais são pessoais e não devem ser compartilhadas entre
              pessoas não autorizadas.
            </p>

            <p>
              O contratante deverá revogar ou atualizar prontamente o acesso de
              funcionários, corretores, parceiros ou prestadores que deixem de
              possuir autorização para utilizar os dados da organização.
            </p>

            <p>
              A plataforma poderá registrar informações técnicas necessárias à
              autenticação, auditoria, segurança e investigação de uso
              indevido.
            </p>
          </TermSection>

          <TermSection
            number="3"
            icon={<Database size={20} />}
            title="Controlador, Operador e responsabilidade pelos dados"
            highlight
          >
            <p>
              Em relação aos dados de clientes, segurados, leads, beneficiários
              e demais terceiros inseridos pela corretora, o contratante é, em
              regra, o <strong>Controlador</strong> nos termos da Lei nº
              13.709/2018 — LGPD.
            </p>

            <p>
              O SeguroCRM atua predominantemente como
              <strong> Operador</strong>, tratando esses dados para prestar os
              serviços contratados e conforme as funcionalidades utilizadas.
            </p>

            <p>
              O contratante declara possuir bases legais adequadas para coletar,
              inserir, armazenar, utilizar e compartilhar os dados tratados na
              plataforma.
            </p>

            <p>
              O SeguroCRM poderá atuar como Controlador em tratamentos próprios
              relacionados a contas, autenticação, segurança, faturamento,
              suporte, prevenção a fraudes e administração da relação
              contratual.
            </p>
          </TermSection>

          <TermSection
            number="4"
            icon={<MessageSquareText size={20} />}
            title="Mensagens e histórico de conversas"
          >
            <p>
              Ao conectar canais de comunicação à plataforma, o contratante
              autoriza o SeguroCRM a processar e armazenar, dentro das
              funcionalidades disponibilizadas, conteúdos necessários à
              manutenção do histórico operacional.
            </p>

            <p>Esses registros poderão incluir:</p>

            <TermBulletList
              items={[
                "mensagens recebidas e enviadas;",
                "identificadores de remetentes e destinatários;",
                "datas, horários e status de entrega;",
                "imagens, vídeos, documentos e outros anexos;",
                "mensagens de voz e arquivos de áudio;",
                "reações, encaminhamentos e eventos relacionados às mensagens;",
                "responsável pela conversa e histórico de atendimento;",
                "vínculos entre conversas, clientes, propostas, contratos e outros registros do CRM.",
              ]}
            />

            <p>
              O encerramento ou a desativação de uma conexão não implica,
              automaticamente, exclusão do histórico gerado durante sua
              utilização.
            </p>
          </TermSection>

          <TermSection
            number="5"
            icon={<PhoneCall size={20} />}
            title="Chamadas, telefonia e gravações"
          >
            <p>
              Caso sejam disponibilizadas ou habilitadas funcionalidades de
              chamadas, telefonia ou gravação, poderão ser processados registros
              como número de origem e destino, horário, duração, status e outros
              metadados técnicos.
            </p>

            <p>
              Quando houver gravação de conteúdo de áudio, o contratante será
              responsável por avaliar e cumprir os requisitos legais aplicáveis
              à gravação, ciência dos participantes e demais obrigações
              relacionadas ao tratamento.
            </p>

            <p>
              O SeguroCRM não autoriza a utilização da plataforma para gravações
              clandestinas ou tratamentos contrários à legislação.
            </p>
          </TermSection>

          <TermSection
            number="6"
            icon={<FileArchive size={20} />}
            title="Armazenamento de documentos"
          >
            <p>
              A plataforma poderá disponibilizar espaço de armazenamento
              destinado a documentos e arquivos da operação da corretora.
            </p>

            <p>
              O contratante é responsável pelo conteúdo dos arquivos enviados e
              pela existência de fundamento jurídico para seu armazenamento.
            </p>

            <p>
              É proibido utilizar o serviço para armazenar conteúdo ilícito,
              malicioso, violador de direitos de terceiros ou não relacionado a
              finalidade legítima da organização.
            </p>

            <p>
              Limites de armazenamento, tamanho máximo de arquivo e capacidade
              adicional serão definidos de acordo com o plano e complementos
              contratados.
            </p>
          </TermSection>

          <TermSection
            number="7"
            icon={<CloudCog size={20} />}
            title="Integrações e serviços de terceiros"
          >
            <p>
              O SeguroCRM pode integrar-se a serviços externos, incluindo
              serviços de comunicação, Google, provedores de autenticação,
              armazenamento, infraestrutura e APIs de terceiros.
            </p>

            <p>
              Quando uma integração for ativada pelo usuário, poderão ser
              aplicáveis também os termos, políticas, limitações técnicas,
              disponibilidade e regras do respectivo fornecedor.
            </p>

            <p>
              O SeguroCRM não garante funcionamento ininterrupto de serviços de
              terceiros nem responde por indisponibilidades originadas
              exclusivamente em infraestrutura externa fora de seu controle
              razoável.
            </p>
          </TermSection>

          <TermSection
            number="8"
            icon={<KeyRound size={20} />}
            title="WhatsApp e canais de comunicação"
          >
            <p>
              O uso de integrações com WhatsApp ou outros canais depende da
              disponibilidade técnica dos provedores envolvidos e da observância
              das políticas e condições aplicáveis a esses serviços.
            </p>

            <p>
              O contratante é responsável pelo conteúdo das comunicações
              realizadas por seus usuários e deverá respeitar normas sobre
              publicidade, spam, proteção ao consumidor, privacidade e demais
              regras aplicáveis.
            </p>

            <p>
              Suspensões, bloqueios ou restrições impostas por fornecedores
              externos devido a condutas do contratante não configuram falha do
              SeguroCRM.
            </p>
          </TermSection>

          <TermSection
            number="9"
            icon={<ShieldCheck size={20} />}
            title="Segurança e deveres do contratante"
          >
            <p>
              O SeguroCRM adota medidas técnicas e administrativas destinadas a
              proteger a infraestrutura e os dados tratados.
            </p>

            <p>O contratante, por sua vez, deverá:</p>

            <TermBulletList
              items={[
                "manter credenciais seguras;",
                "utilizar perfis de acesso adequados às funções dos usuários;",
                "impedir compartilhamento indevido de contas;",
                "remover acessos de colaboradores desligados;",
                "manter seus dispositivos e redes em condições adequadas de segurança;",
                "comunicar imediatamente suspeitas de acesso indevido ou comprometimento de credenciais.",
              ]}
            />
          </TermSection>

          <TermSection
            number="10"
            icon={<Ban size={20} />}
            title="Uso proibido"
          >
            <p>É vedada a utilização da plataforma para:</p>

            <TermBulletList
              items={[
                "prática de atos ilícitos ou fraudulentos;",
                "envio de spam ou comunicações em desacordo com a legislação;",
                "tentativa de acessar dados de outras organizações sem autorização;",
                "explorar vulnerabilidades ou realizar testes não autorizados;",
                "distribuir malware ou arquivos maliciosos;",
                "violar direitos de propriedade intelectual ou privacidade de terceiros;",
                "revender, copiar, modificar ou realizar engenharia reversa do software, salvo quando expressamente autorizado por lei.",
              ]}
            />
          </TermSection>

          <TermSection
            number="11"
            icon={<CreditCard size={20} />}
            title="Planos, cobrança e recursos adicionais"
          >
            <p>
              Os valores, ciclos de contratação e recursos incluídos serão
              aqueles apresentados no momento da contratação ou formalizados
              entre as partes.
            </p>

            <p>
              Recursos adicionais, incluindo armazenamento ou conexões extras de
              comunicação, poderão gerar cobranças complementares.
            </p>

            <p>
              Alterações futuras de preços serão comunicadas previamente quando
              aplicáveis a contratos em vigor, respeitados os termos
              comerciais contratados e a legislação aplicável.
            </p>
          </TermSection>

          <TermSection
            number="12"
            icon={<RefreshCcw size={20} />}
            title="Cancelamento, suspensão e encerramento"
          >
            <p>
              O contratante poderá solicitar o encerramento da assinatura
              observando o ciclo contratado e eventuais condições comerciais
              vigentes.
            </p>

            <p>
              O SeguroCRM poderá suspender acessos em situações como fraude,
              risco de segurança, inadimplência, uso abusivo, violação destes
              Termos ou determinação legal.
            </p>

            <p>
              Sempre que razoavelmente possível, será oferecida oportunidade de
              regularização antes de suspensão definitiva, exceto em casos de
              urgência, fraude, risco relevante ou obrigação legal.
            </p>
          </TermSection>

          <TermSection
            number="13"
            icon={<FileArchive size={20} />}
            title="Dados após cancelamento"
          >
            <p>
              O término da assinatura não significa necessariamente eliminação
              instantânea de todos os dados.
            </p>

            <p>
              Registros poderão permanecer temporariamente armazenados para
              cumprimento de obrigações legais, exercício regular de direitos,
              prevenção de fraudes, segurança, backups e procedimentos técnicos
              de encerramento.
            </p>

            <p>
              O contratante deverá providenciar a exportação ou obtenção dos
              dados necessários antes do término dos prazos disponibilizados
              para acesso, quando houver funcionalidade ou procedimento de
              exportação aplicável.
            </p>
          </TermSection>

          <TermSection
            number="14"
            icon={<Server size={20} />}
            title="Disponibilidade, manutenção e evolução"
          >
            <p>
              O SeguroCRM busca manter a plataforma disponível de forma
              contínua, mas poderá realizar manutenções, atualizações,
              correções, alterações de infraestrutura e melhorias.
            </p>

            <p>
              Não é garantida disponibilidade absoluta ou livre de
              interrupções, especialmente diante de eventos de força maior,
              indisponibilidades de terceiros, ataques externos, falhas de
              telecomunicação ou circunstâncias fora do controle razoável da
              plataforma.
            </p>

            <p>
              Funcionalidades podem evoluir, ser substituídas ou reorganizadas
              para aprimorar segurança, desempenho, conformidade ou experiência
              dos usuários.
            </p>
          </TermSection>

          <TermSection
            number="15"
            icon={<AlertTriangle size={20} />}
            title="Limitação de responsabilidade"
          >
            <p>
              O SeguroCRM responderá pelos danos diretos comprovadamente
              decorrentes de falha que lhe seja juridicamente imputável, nos
              limites permitidos pela legislação aplicável.
            </p>

            <p>
              A plataforma não será responsável por decisões comerciais,
              securitárias, financeiras ou jurídicas tomadas pelo contratante
              com base nas informações registradas no sistema, nem por dados
              incorretos inseridos pelos próprios usuários.
            </p>

            <p>
              Também não responderá por danos originados exclusivamente de
              atos de terceiros, fornecedores externos, uso indevido,
              compartilhamento de credenciais, violação destes Termos ou eventos
              fora de seu controle razoável.
            </p>

            <p>
              Nenhuma disposição destes Termos pretende excluir responsabilidade
              que, por força de lei, não possa ser afastada ou limitada.
            </p>
          </TermSection>

          <TermSection
            number="16"
            icon={<LockKeyhole size={20} />}
            title="Propriedade intelectual"
          >
            <p>
              O SeguroCRM, sua marca, identidade visual, interfaces, estrutura
              de dados, código, componentes, documentação, textos e demais
              elementos próprios são protegidos pela legislação aplicável.
            </p>

            <p>
              Nenhuma disposição destes Termos representa cessão definitiva de
              direitos de propriedade intelectual ao contratante.
            </p>
          </TermSection>

          <TermSection
            number="17"
            icon={<Gavel size={20} />}
            title="Legislação aplicável"
          >
            <p>
              Estes Termos serão interpretados de acordo com a legislação da
              República Federativa do Brasil, incluindo, quando aplicáveis, o
              Código Civil, o Marco Civil da Internet, a Lei Geral de Proteção
              de Dados e normas de proteção do consumidor.
            </p>

            <p>
              Eventuais controvérsias deverão, preferencialmente, ser resolvidas
              de forma amigável antes da adoção de medidas judiciais.
            </p>

            <p>
              A definição de foro observará as regras legais de competência
              aplicáveis ao caso concreto, inclusive normas de proteção ao
              consumidor quando incidentes.
            </p>
          </TermSection>

          <TermSection
            number="18"
            icon={<CheckCircle2 size={20} />}
            title="Alterações dos Termos"
          >
            <p>
              Estes Termos poderão ser modificados em razão de mudanças legais,
              regulatórias, técnicas, comerciais ou funcionais.
            </p>

            <p>
              Alterações materiais poderão ser comunicadas por meio da
              plataforma, por e-mail ou por outro canal apropriado.
            </p>

            <p>
              A versão vigente será identificada pela respectiva data de
              atualização.
            </p>
          </TermSection>
        </main>

        <footer className="mt-10 border-t border-zinc-200 pt-8 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400">
            {empresa.nomeProduto}
          </p>

          <p className="mt-2 text-[10px] font-medium text-zinc-500">
            {empresa.nome} · CNPJ {empresa.cnpj}
          </p>

          <p className="mt-1 text-[10px] text-zinc-400">{empresa.endereco}</p>

          <p className="mt-3 text-[10px] text-zinc-500">
            Contato: {empresa.email}
          </p>
        </footer>
      </div>
    </div>
  );
}

function TermSection({
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
            Cláusula {number}
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

function TermBulletList({ items }: { items: string[] }) {
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