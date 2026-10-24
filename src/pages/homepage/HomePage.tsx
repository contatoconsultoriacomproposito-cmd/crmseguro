import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  Columns,
  Database,
  DollarSign,
  FileText,
  Globe,
  HandCoins,
  HardDrive,
  Headphones,
  Menu,
  MessageCircle,
  MessagesSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

import LoginModal from "../../components/homepage/LoginModal";
import RegistroModal from "../../components/homepage/RegistroModal";
import { useAuth } from "../../auth/AuthContext";

import imgCapa from "./img/img-capa.png";

// ======================================================
// CONFIGURAÇÕES COMERCIAIS
// ======================================================

const WHATSAPP_COMERCIAL = "5548996461645";

const planos = [
  {
    nome: "Mensal",
    mensalidade: "129,90",
    total: "R$ 129,90",
    periodo: "1 mês",
    descricao: "Liberdade para começar",
    destaque: false,
  },
  {
    nome: "Trimestral",
    mensalidade: "119,90",
    total: "R$ 359,70",
    periodo: "3 meses",
    descricao: "Mais economia no ciclo",
    destaque: false,
  },
  {
    nome: "Semestral",
    mensalidade: "109,90",
    total: "R$ 659,40",
    periodo: "6 meses",
    descricao: "Equilíbrio entre prazo e economia",
    destaque: false,
  },
  {
    nome: "Anual",
    mensalidade: "97,90",
    total: "R$ 1.174,80",
    periodo: "12 meses",
    descricao: "Maior economia",
    destaque: true,
  },
];

// ======================================================
// DADOS DAS SEÇÕES
// ======================================================

const jornada = [
  {
    numero: "01",
    titulo: "Conversa",
    descricao:
      "O relacionamento começa pelo WhatsApp e já nasce dentro da operação da corretora.",
    icon: <MessagesSquare size={20} />,
  },
  {
    numero: "02",
    titulo: "Cliente",
    descricao:
      "Dados pessoais, empresa, contatos e histórico passam a compor uma visão única.",
    icon: <Users size={20} />,
  },
  {
    numero: "03",
    titulo: "Proposta",
    descricao:
      "Cotações e negociações ficam ligadas ao cliente e ao atendimento que originou a oportunidade.",
    icon: <FileText size={20} />,
  },
  {
    numero: "04",
    titulo: "Contrato",
    descricao:
      "A venda deixa de ser um fim. Ela inicia o ciclo de acompanhamento da apólice.",
    icon: <ShieldCheck size={20} />,
  },
  {
    numero: "05",
    titulo: "Pós-venda",
    descricao:
      "Financeiro, comissões, assistências, sinistros e documentos permanecem conectados.",
    icon: <Zap size={20} />,
  },
  {
    numero: "06",
    titulo: "Renovação",
    descricao:
      "O histórico permanece disponível para que o próximo ciclo comercial comece com contexto.",
    icon: <CalendarCheck2 size={20} />,
  },
];

const modulos = [
  {
    titulo: "WhatsApp CRM",
    descricao:
      "Converse com o cliente e consulte o contexto comercial sem sair do atendimento.",
    icon: <MessagesSquare size={22} />,
    destaque: true,
  },
  {
    titulo: "Central de Clientes",
    descricao:
      "Pessoas, empresas, contatos e relacionamento reunidos em uma visão única.",
    icon: <Users size={22} />,
  },
  {
    titulo: "Propostas",
    descricao:
      "Organize oportunidades, cotações e o fechamento comercial em um fluxo conectado.",
    icon: <FileText size={22} />,
  },
  {
    titulo: "Contratos",
    descricao:
      "Acompanhe as apólices que nasceram das vendas e mantenha todo o ciclo organizado.",
    icon: <ShieldCheck size={22} />,
  },
  {
    titulo: "Financeiro",
    descricao:
      "Parcelas, recebimentos e informações financeiras vinculadas aos contratos.",
    icon: <DollarSign size={22} />,
  },
  {
    titulo: "Comissões",
    descricao:
      "Controle o que a corretora recebe e acompanhe a distribuição das comissões.",
    icon: <HandCoins size={22} />,
  },
  {
    titulo: "Sinistros",
    descricao:
      "Registre e acompanhe ocorrências mantendo cliente e contrato no mesmo contexto.",
    icon: <ShieldCheck size={22} />,
  },
  {
    titulo: "Assistências",
    descricao:
      "Histórico pós-venda organizado para que sua equipe saiba exatamente o que aconteceu.",
    icon: <Headphones size={22} />,
  },
  {
    titulo: "Agenda",
    descricao:
      "Compromissos e retornos comerciais integrados ao dia a dia da operação.",
    icon: <CalendarCheck2 size={22} />,
  },
  {
    titulo: "Kanban",
    descricao:
      "Organize visualmente o atendimento e acompanhe cada oportunidade em seu estágio.",
    icon: <Columns size={22} />,
  },
  {
    titulo: "Documentos",
    descricao:
      "Arquivos e documentos da corretora centralizados em uma estrutura própria.",
    icon: <HardDrive size={22} />,
  },
  {
    titulo: "Equipe",
    descricao:
      "Adicione sua equipe ao CRM sem cobrança adicional por usuário.",
    icon: <Users size={22} />,
  },
];

const depoimentos = [
  {
    nome: "Mariana S.",
    empresa: "Souza Corretora",
    perfil: "Gestora de Corretora",
    texto:
      "Antes o WhatsApp era onde a conversa acontecia e o CRM era onde a equipe precisava lembrar de registrar tudo depois. Com o SeguroCRM, o atendimento e a operação finalmente ficaram no mesmo lugar.",
    iniciais: "MS",
  },
  {
    nome: "Carlos E.",
    empresa: "Elantra Seguros",
    perfil: "Corretor de Seguros",
    texto:
      "O que mais fez diferença foi abrir uma conversa e já conseguir entender o cliente, visualizar propostas, contratos e o que aconteceu antes. Isso muda completamente a qualidade do atendimento.",
    iniciais: "CE",
  },
  {
    nome: "Fernanda C.",
    empresa: "Costa Seguros",
    perfil: "Gestora Comercial",
    texto:
      "Minha equipe passou a trabalhar com muito mais contexto. O cliente não sente que está começando tudo de novo cada vez que fala com outra pessoa da corretora.",
    iniciais: "FC",
  },
  {
    nome: "Paulo M.",
    empresa: "Martins Corretora",
    perfil: "Sócio-diretor",
    texto:
      "Eu procurava um CRM para seguros, mas não queria apenas mais um cadastro de clientes. A integração da operação com o WhatsApp foi o que realmente chamou minha atenção.",
    iniciais: "PM",
  },
  {
    nome: "Juliana L.",
    empresa: "Lima Seguros",
    perfil: "Corretora de Seguros",
    texto:
      "Proposta, contrato, financeiro e pós-venda deixaram de parecer sistemas separados. Hoje consigo enxergar a jornada do cliente como uma coisa só.",
    iniciais: "JL",
  },
  {
    nome: "Roberto A.",
    empresa: "RA Corretora",
    perfil: "Gestor",
    texto:
      "A possibilidade de colocar a equipe inteira dentro da operação sem pagar por usuário foi decisiva. Consigo crescer sem começar a limitar quem pode acessar o CRM.",
    iniciais: "RA",
  },
];

const perguntasFrequentes = [
  {
    pergunta:
      "O SeguroCRM cobra por usuário?",
    resposta:
      "Não. Os usuários da corretora são ilimitados. A proposta é permitir que toda a equipe trabalhe na mesma operação sem transformar crescimento em custo por licença individual.",
  },
  {
    pergunta:
      "O WhatsApp está incluso?",
    resposta:
      "Sim. A assinatura inclui uma conexão WhatsApp. Caso a corretora precise operar com mais números, novas conexões podem ser adicionadas conforme a necessidade.",
  },
  {
    pergunta:
      "O SeguroCRM é apenas uma caixa de entrada do WhatsApp?",
    resposta:
      "Não. O WhatsApp é a porta de entrada da experiência. A partir da conversa, sua equipe pode acessar clientes, propostas, contratos, financeiro, comissões, sinistros, assistências e documentos dentro do mesmo ecossistema.",
  },
  {
    pergunta:
      "Existe armazenamento de documentos?",
    resposta:
      "Sim. Todos os ciclos incluem 100 MB de armazenamento. A capacidade pode ser expandida conforme o volume de arquivos da corretora crescer.",
  },
  {
    pergunta:
      "O site da corretora faz parte da plataforma?",
    resposta:
      "Sim. O ecossistema inclui a estrutura de site da corretora, permitindo conectar a presença digital ao fluxo comercial do CRM.",
  },
  {
    pergunta:
      "Posso usar o sistema com toda a minha equipe?",
    resposta:
      "Sim. O SeguroCRM foi estruturado para operação em equipe, preservando histórico, responsáveis e contexto de atendimento.",
  },
];




// ======================================================
// HOME PAGE
// ======================================================

export default function HomePage() {
  const { loading } = useAuth();

  const [scrolled, setScrolled] =
    useState(false);

  const [
    isMenuOpen,
    setIsMenuOpen,
  ] = useState(false);

  const [
    isLoginOpen,
    setIsLoginOpen,
  ] = useState(false);

  const [
    isFreeTrialModalOpen,
    setIsFreeTrialModalOpen,
  ] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    window.addEventListener(
      "scroll",
      handleScroll
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const abrirCadastro = () => {
    setIsFreeTrialModalOpen(true);
  };

  const abrirLogin = () => {
    setIsLoginOpen(true);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans text-zinc-900 selection:bg-blue-500/30">
      {/* ==================================================
          WHATSAPP FLUTUANTE
      ================================================== */}

      <FloatingWhatsApp />

      {/* ==================================================
          NAVBAR
      ================================================== */}

      <Navbar
        scrolled={scrolled}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        onLogin={abrirLogin}
        onRegister={abrirCadastro}
      />

      {/* ==================================================
          HERO
      ================================================== */}

      <HeroSection
        onRegister={abrirCadastro}
      />

      {/* ==================================================
          NOVO CONCEITO:
          TUDO AO REDOR DA CONVERSA
      ================================================== */}

      <ConversationCoreSection />

      {/* ==================================================
          JORNADA COMERCIAL
      ================================================== */}

      <JourneySection />

      {/* ==================================================
          MÓDULOS DO NOVO NÚCLEO
      ================================================== */}

      <ModulesSection
        onRegister={abrirCadastro}
      />

      {/* ==================================================
          EQUIPE + WHATSAPP
      ================================================== */}

      <WhatsAppTeamSection />

      {/* ==================================================
          SITE INTEGRADO
      ================================================== */}

      <SiteSection
        onRegister={abrirCadastro}
      />

      {/* ==================================================
          ARMAZENAMENTO
      ================================================== */}

      <StorageSection />

      {/* ==================================================
          PROVA SOCIAL
      ================================================== */}

      <SocialProofSection />

      {/* ==================================================
          PLANOS
      ================================================== */}

      <PricingSection
        onRegister={abrirCadastro}
      />

      {/* ==================================================
          FAQ
      ================================================== */}

      <FAQSection />

      {/* ==================================================
          CTA FINAL
      ================================================== */}

      <FinalCTASection
        onRegister={abrirCadastro}
      />

      {/* ==================================================
          FOOTER
      ================================================== */}

      <Footer />

      {/* ==================================================
          MODAIS DE AUTENTICAÇÃO
      ================================================== */}

      <AnimatePresence mode="wait">
        {isLoginOpen && (
          <LoginModal
            onClose={() =>
              setIsLoginOpen(false)
            }
            onSwitch={() => {
              setIsLoginOpen(false);
              setIsFreeTrialModalOpen(
                true
              );
            }}
          />
        )}

        {isFreeTrialModalOpen && (
          <RegistroModal
            isOpen={
              isFreeTrialModalOpen
            }
            onClose={() =>
              setIsFreeTrialModalOpen(
                false
              )
            }
            onSwitch={() => {
              setIsFreeTrialModalOpen(
                false
              );
              setIsLoginOpen(true);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ======================================================
// 01. NAVBAR
// ======================================================

function Navbar({
  scrolled,
  isMenuOpen,
  setIsMenuOpen,
  onLogin,
  onRegister,
}: {
  scrolled: boolean;
  isMenuOpen: boolean;
  setIsMenuOpen: (
    value: boolean
  ) => void;
  onLogin: () => void;
  onRegister: () => void;
}) {
  const navClass = scrolled
    ? "border-b border-zinc-200/70 bg-white/90 py-3 text-zinc-900 shadow-lg shadow-zinc-950/5 backdrop-blur-xl"
    : "bg-transparent py-5 text-white";

  return (
    <>
      <nav
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${navClass}`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
          <a
            href="#inicio"
            className="group flex items-center gap-3"
          >
            <BrandMark />

            <div className="leading-none">
              <div className="text-lg font-black uppercase tracking-tighter">
                Seguro
                <span className="text-blue-600">
                  CRM
                </span>
              </div>

              <div
                className={`mt-1 text-[8px] font-bold uppercase tracking-[0.22em] ${
                  scrolled
                    ? "text-zinc-400"
                    : "text-zinc-500"
                }`}
              >
                CRM para corretoras
              </div>
            </div>
          </a>

          <div className="hidden items-center gap-7 lg:flex">
            <NavbarLink
              href="#como-funciona"
              label="Como funciona"
            />

            <NavbarLink
              href="#plataforma"
              label="Plataforma"
            />

            <NavbarLink
              href="#site"
              label="Site integrado"
            />

            <NavbarLink
              href="#planos"
              label="Planos"
            />

            <NavbarLink
              href="#faq"
              label="FAQ"
            />

            <button
              type="button"
              onClick={onLogin}
              className={`text-[11px] font-black uppercase tracking-[0.12em] transition-colors hover:text-blue-500 ${
                scrolled
                  ? "text-zinc-600"
                  : "text-zinc-300"
              }`}
            >
              Entrar
            </button>

            <button
              type="button"
              onClick={onRegister}
              className="rounded-xl bg-blue-600 px-5 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-500"
            >
              Conhecer o SeguroCRM
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              setIsMenuOpen(
                !isMenuOpen
              )
            }
            className={`flex h-10 w-10 items-center justify-center rounded-xl lg:hidden ${
              scrolled
                ? "bg-zinc-100 text-zinc-900"
                : "bg-white/10 text-white"
            }`}
          >
            {isMenuOpen ? (
              <X size={21} />
            ) : (
              <Menu size={21} />
            )}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{
              opacity: 0,
              y: -16,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -16,
            }}
            className="fixed inset-0 z-[60] flex flex-col bg-zinc-950 p-6 text-white lg:hidden"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div className="flex items-center gap-3">
                <BrandMark />

                <span className="text-lg font-black uppercase tracking-tighter">
                  Seguro
                  <span className="text-blue-500">
                    CRM
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsMenuOpen(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-zinc-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="my-auto space-y-2 py-10">
              {[
                [
                  "#como-funciona",
                  "Como funciona",
                ],
                [
                  "#plataforma",
                  "Plataforma",
                ],
                [
                  "#site",
                  "Site integrado",
                ],
                ["#planos", "Planos"],
                ["#faq", "FAQ"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() =>
                    setIsMenuOpen(
                      false
                    )
                  }
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-zinc-900/70 p-4 text-sm font-bold text-zinc-300"
                >
                  {label}

                  <ArrowRight
                    size={16}
                    className="text-blue-500"
                  />
                </a>
              ))}
            </div>

            <div className="space-y-3 border-t border-white/10 pt-6">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onLogin();
                }}
                className="w-full rounded-xl border border-white/10 py-4 text-xs font-black uppercase tracking-wider text-zinc-300"
              >
                Entrar
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onRegister();
                }}
                className="w-full rounded-xl bg-blue-600 py-4 text-xs font-black uppercase tracking-wider text-white"
              >
                Conhecer o SeguroCRM
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NavbarLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      className="text-[10px] font-black uppercase tracking-[0.14em] transition-colors hover:text-blue-500"
    >
      {label}
    </a>
  );
}

// ======================================================
// 02. HERO
// ======================================================

function HeroSection({
  onRegister,
}: {
  onRegister: () => void;
}) {
  return (
    <section
      id="inicio"
      className="relative overflow-hidden bg-[#07080b] pb-24 pt-32 text-white lg:pb-32 lg:pt-44"
    >
      <HeroBackground />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-5xl text-center">
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
            </span>

            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">
              Uma nova forma de operar sua corretora
            </span>
          </motion.div>

          <motion.h1
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
            }}
            className="text-5xl font-black leading-[0.98] tracking-[-0.05em] sm:text-6xl lg:text-[88px]"
          >
            Seu WhatsApp virou
            <br />

            <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-400 bg-clip-text text-transparent">
              o centro da sua corretora.
            </span>
          </motion.h1>

          <motion.p
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              delay: 0.2,
            }}
            className="mx-auto mt-8 max-w-3xl text-base leading-relaxed text-zinc-400 sm:text-lg lg:text-xl"
          >
            Atenda o cliente e,
            sem sair da conversa,
            tenha acesso a
            clientes, propostas,
            contratos, financeiro,
            comissões, sinistros,
            assistências e
            documentos.
          </motion.p>

          <motion.p
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              delay: 0.3,
            }}
            className="mt-4 text-lg font-black text-white"
          >
            Uma conversa.
            <span className="text-blue-500">
              {" "}
              Toda a operação.
            </span>
          </motion.p>

          <motion.div
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.4,
            }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <button
              type="button"
              onClick={onRegister}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 text-sm font-black text-white shadow-2xl shadow-blue-600/25 transition-all hover:-translate-y-1 hover:bg-blue-500 sm:w-auto"
            >
              Conhecer o SeguroCRM

              <ArrowRight
                size={18}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>

            <a
              href="#como-funciona"
              className="flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-sm font-bold text-zinc-300 backdrop-blur transition-all hover:border-white/20 hover:bg-white/10 sm:w-auto"
            >
              Ver como funciona
            </a>
          </motion.div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-medium text-zinc-500">
            <HeroCheck>
              Usuários ilimitados
            </HeroCheck>

            <HeroCheck>
              1 WhatsApp incluso
            </HeroCheck>

            <HeroCheck>
              Site integrado
            </HeroCheck>

            <HeroCheck>
              100 MB inclusos
            </HeroCheck>
          </div>
        </div>

        <HeroProductPreview />
      </div>
    </section>
  );
}

function HeroBackground() {
  return (
    <>
      <div className="absolute inset-0">
        <img
          src={imgCapa}
          alt=""
          className="h-full w-full scale-105 object-cover opacity-[0.10]"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-[#07080b]/70 via-[#07080b]/95 to-[#07080b]" />
      </div>

      <div className="absolute left-1/2 top-[15%] h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-blue-600/15 blur-[150px]" />

      <div className="absolute -right-40 top-1/2 h-96 w-96 rounded-full bg-indigo-600/10 blur-[120px]" />
    </>
  );
}

function HeroCheck({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
        <Check size={12} />
      </span>

      {children}
    </span>
  );
}

function HeroProductPreview() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 50,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: 0.55,
        duration: 0.8,
      }}
      className="relative mx-auto mt-20 max-w-6xl"
    >
      <div className="absolute -inset-5 rounded-[40px] bg-blue-600/15 blur-3xl" />

      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-zinc-900/80 p-2 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <img
          src={imgCapa}
          alt="Interface do SeguroCRM"
          className="w-full rounded-[22px]"
        />

        <motion.div
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute right-6 top-6 hidden rounded-2xl border border-white/10 bg-zinc-950/90 p-4 shadow-2xl backdrop-blur lg:block"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <MessagesSquare
                size={20}
              />
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                Atendimento
              </p>

              <p className="text-sm font-black text-white">
                Contexto completo
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ======================================================
// 03. TUDO AO REDOR DA CONVERSA
// ======================================================

function ConversationCoreSection() {
  return (
    <section
      id="como-funciona"
      className="relative overflow-hidden bg-white py-24 lg:py-32"
    >
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="WhatsApp + CRM"
          title={
            <>
              Muito além de
              <br />
              responder mensagens.
            </>
          }
          description="A conversa é o ponto de partida. Todo o restante da operação aparece no contexto certo, no momento em que sua equipe precisa."
          dark={false}
        />

        <div className="mt-16 grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <ConversationMock />

          <div className="space-y-5">
            <ContextFeature
              icon={
                <Users size={20} />
              }
              title="Cliente identificado"
              description="Veja quem está falando e acesse dados pessoais, empresa, contatos e histórico."
            />

            <ContextFeature
              icon={
                <FileText size={20} />
              }
              title="Negociação no mesmo contexto"
              description="Consulte propostas e contratos sem quebrar o fluxo do atendimento."
            />

            <ContextFeature
              icon={
                <Wallet size={20} />
              }
              title="Financeiro e comissões"
              description="A operação continua depois da venda: parcelas e comissões permanecem conectadas."
            />

            <ContextFeature
              icon={
                <Headphones
                  size={20}
                />
              }
              title="Pós-venda de verdade"
              description="Assistências e sinistros ficam ligados ao cliente e ao contrato."
            />

            <ContextFeature
              icon={
                <HardDrive
                  size={20}
                />
              }
              title="Documentos organizados"
              description="Arquivos deixam de ficar espalhados e passam a fazer parte do histórico operacional."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ConversationMock() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        x: -30,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
      }}
      viewport={{
        once: true,
      }}
      className="overflow-hidden rounded-[32px] border border-zinc-200 bg-zinc-950 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.3)]"
    >
      <div className="flex h-11 items-center gap-2 border-b border-white/10 px-5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />

        <div className="ml-4 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
          SeguroCRM · Atendimento
        </div>
      </div>

      <div className="grid min-h-[520px] md:grid-cols-[180px_1fr_210px]">
        {/* LISTA */}

        <div className="hidden border-r border-white/10 bg-zinc-950/80 p-3 md:block">
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-zinc-600">
            <Search size={13} />
            <span className="text-[9px]">
              Buscar conversa
            </span>
          </div>

          {[
            "Mariana Souza",
            "Empresa Atlântico",
            "João Martins",
            "Padaria Central",
          ].map((nome, index) => (
            <div
              key={nome}
              className={`mb-1 rounded-xl p-3 ${
                index === 0
                  ? "bg-blue-600"
                  : "bg-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-black ${
                    index === 0
                      ? "bg-white/20 text-white"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {nome
                    .substring(0, 2)
                    .toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p
                    className={`truncate text-[10px] font-bold ${
                      index === 0
                        ? "text-white"
                        : "text-zinc-400"
                    }`}
                  >
                    {nome}
                  </p>

                  <p
                    className={`truncate text-[8px] ${
                      index === 0
                        ? "text-blue-100"
                        : "text-zinc-700"
                    }`}
                  >
                    Clique para continuar
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CONVERSA */}

        <div className="flex flex-col bg-[#0d1015]">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="text-sm font-black text-white">
              Mariana Souza
            </p>

            <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
              atendimento ativo
            </p>
          </div>

          <div className="flex flex-1 flex-col justify-end space-y-3 p-5">
            <ChatBubble
              side="left"
              text="Olá! Gostaria de revisar meu seguro antes da renovação."
            />

            <ChatBubble
              side="right"
              text="Claro, Mariana. Já localizei seu cadastro e o contrato atual."
            />

            <ChatBubble
              side="left"
              text="Ótimo. Podemos cotar novamente?"
            />

            <ChatBubble
              side="right"
              text="Sim. Vou iniciar uma nova proposta mantendo todo o seu histórico."
            />
          </div>

          <div className="m-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-3">
            <span className="flex-1 text-[10px] text-zinc-600">
              Digite uma mensagem...
            </span>

            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <ArrowRight
                size={14}
              />
            </div>
          </div>
        </div>

        {/* CONTEXTO */}

        <div className="hidden border-l border-white/10 bg-zinc-950/70 p-3 md:block">
          <p className="mb-3 px-1 text-[8px] font-black uppercase tracking-[0.18em] text-zinc-600">
            Contexto do cliente
          </p>

          {[
            [
              "Dados",
              "Cadastro completo",
            ],
            [
              "Propostas",
              "2 registros",
            ],
            [
              "Contratos",
              "1 ativo",
            ],
            [
              "Financeiro",
              "Parcelas",
            ],
            [
              "Comissões",
              "Acompanhar",
            ],
            [
              "Assistências",
              "Histórico",
            ],
            [
              "Sinistros",
              "Histórico",
            ],
          ].map(([title, value]) => (
            <div
              key={title}
              className="mb-2 rounded-xl border border-white/5 bg-white/[0.03] p-3"
            >
              <p className="text-[8px] font-black uppercase tracking-wider text-zinc-600">
                {title}
              </p>

              <p className="mt-1 text-[10px] font-bold text-zinc-300">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ChatBubble({
  side,
  text,
}: {
  side: "left" | "right";
  text: string;
}) {
  return (
    <div
      className={`max-w-[85%] rounded-2xl px-4 py-3 text-[11px] leading-relaxed ${
        side === "right"
          ? "ml-auto rounded-br-md bg-blue-600 text-white"
          : "rounded-bl-md bg-zinc-800 text-zinc-300"
      }`}
    >
      {text}
    </div>
  );
}

function ContextFeature({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        x: 20,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
      }}
      viewport={{
        once: true,
      }}
      className="group flex gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-5 transition-all hover:border-blue-200 hover:bg-white hover:shadow-lg hover:shadow-blue-500/5"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
        {icon}
      </div>

      <div>
        <h3 className="font-black tracking-tight text-zinc-900">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-relaxed text-zinc-500">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

// ======================================================
// 04. JORNADA DO PRIMEIRO OI À RENOVAÇÃO
// ======================================================

function JourneySection() {
  return (
    <section className="relative overflow-hidden bg-zinc-950 py-24 text-white lg:py-32">
      <div className="absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[150px]" />

      <div className="relative mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Jornada conectada"
          title={
            <>
              Do primeiro “oi”
              <br />
              à próxima renovação.
            </>
          }
          description="O histórico não termina quando a proposta vira venda. Ele continua acompanhando o cliente durante toda a relação com a corretora."
          dark
        />

        <div className="relative mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="absolute left-[8%] right-[8%] top-[42px] hidden h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent lg:block" />

          {jornada.map(
            (item, index) => (
              <motion.div
                key={item.numero}
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay:
                    index * 0.07,
                }}
                viewport={{
                  once: true,
                }}
                className="relative z-10 rounded-3xl border border-white/10 bg-zinc-900/80 p-5 backdrop-blur"
              >
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                    {item.icon}
                  </div>

                  <span className="text-[10px] font-black text-zinc-700">
                    {item.numero}
                  </span>
                </div>

                <h3 className="text-lg font-black tracking-tight">
                  {item.titulo}
                </h3>

                <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                  {item.descricao}
                </p>
              </motion.div>
            )
          )}
        </div>

        <div className="mt-14 text-center">
          <p className="text-xl font-black tracking-tight text-white md:text-3xl">
            Uma jornada inteira.
            <span className="text-blue-500">
              {" "}
              Sem perder o
              histórico no caminho.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

// ======================================================
// 05. MÓDULOS
// ======================================================

function ModulesSection({
  onRegister,
}: {
  onRegister: () => void;
}) {
  return (
    <section
      id="plataforma"
      className="bg-white py-24 lg:py-32"
    >
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Uma plataforma. Uma operação."
          title={
            <>
              Tudo conectado
              <br />
              ao mesmo cliente.
            </>
          }
          description="O SeguroCRM organiza os principais fluxos da corretora sem transformar cada necessidade em uma ferramenta isolada."
          dark={false}
        />

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modulos.map(
            (modulo, index) => (
              <motion.div
                key={modulo.titulo}
                initial={{
                  opacity: 0,
                  y: 18,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay:
                    index * 0.035,
                }}
                viewport={{
                  once: true,
                }}
                className={`group relative overflow-hidden rounded-[28px] border p-7 transition-all duration-300 hover:-translate-y-1 ${
                  modulo.destaque
                    ? "border-blue-500 bg-blue-600 text-white shadow-xl shadow-blue-500/15 sm:col-span-2"
                    : "border-zinc-200 bg-white text-zinc-900 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5"
                }`}
              >
                <div
                  className={`mb-8 flex h-12 w-12 items-center justify-center rounded-2xl ${
                    modulo.destaque
                      ? "bg-white/15 text-white"
                      : "bg-blue-50 text-blue-600 transition-all group-hover:bg-blue-600 group-hover:text-white"
                  }`}
                >
                  {modulo.icon}
                </div>

                <h3
                  className={`font-black tracking-tight ${
                    modulo.destaque
                      ? "text-2xl sm:text-3xl"
                      : "text-lg"
                  }`}
                >
                  {modulo.titulo}
                </h3>

                <p
                  className={`mt-3 max-w-2xl text-sm leading-relaxed ${
                    modulo.destaque
                      ? "text-blue-100"
                      : "text-zinc-500"
                  }`}
                >
                  {modulo.descricao}
                </p>

                {modulo.destaque && (
                  <div className="absolute -bottom-16 -right-16 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
                )}
              </motion.div>
            )
          )}
        </div>

        <div className="mt-14 flex justify-center">
          <button
            type="button"
            onClick={onRegister}
            className="group flex items-center gap-2 rounded-2xl bg-zinc-950 px-7 py-4 text-sm font-black text-white transition-all hover:-translate-y-1 hover:bg-blue-600"
          >
            Quero conhecer a plataforma

            <ArrowRight
              size={17}
              className="transition-transform group-hover:translate-x-1"
            />
          </button>
        </div>
      </div>
    </section>
  );
}

// ======================================================
// 06. EQUIPE + WHATSAPP
// ======================================================

function WhatsAppTeamSection() {
  return (
    <section className="overflow-hidden bg-[#f6f8fb] py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-2">
        <div>
          <SectionBadge>
            Operação em equipe
          </SectionBadge>

          <h2 className="mt-5 max-w-xl text-4xl font-black leading-[0.98] tracking-[-0.04em] text-zinc-950 sm:text-5xl lg:text-6xl">
            Um WhatsApp.
            <br />

            <span className="text-blue-600">
              Uma equipe inteira
              trabalhando.
            </span>
          </h2>

          <p className="mt-7 max-w-xl text-base leading-relaxed text-zinc-500">
            Sua corretora não
            precisa depender do
            celular de uma única
            pessoa para preservar
            relacionamento,
            contexto e histórico
            comercial.
          </p>

          <div className="mt-9 space-y-4">
            <SimpleCheck>
              Usuários ilimitados
            </SimpleCheck>

            <SimpleCheck>
              1 conexão WhatsApp
              inclusa no plano
            </SimpleCheck>

            <SimpleCheck>
              Histórico preservado
              na operação
            </SimpleCheck>

            <SimpleCheck>
              Responsabilidade e
              contexto por conversa
            </SimpleCheck>

            <SimpleCheck>
              Possibilidade de
              adicionar novas
              conexões conforme a
              corretora cresce
            </SimpleCheck>
          </div>
        </div>

        <TeamVisual />
      </div>
    </section>
  );
}

function TeamVisual() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0.96,
      }}
      whileInView={{
        opacity: 1,
        scale: 1,
      }}
      viewport={{
        once: true,
      }}
      className="relative"
    >
      <div className="absolute inset-10 rounded-full bg-blue-600/15 blur-[90px]" />

      <div className="relative rounded-[40px] bg-zinc-950 p-5 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.35)]">
        <div className="rounded-[30px] border border-white/10 bg-zinc-900 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                Atendimento
              </p>

              <p className="mt-1 text-lg font-black text-white">
                Equipe conectada
              </p>
            </div>

            <div className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-400">
              WhatsApp online
            </div>
          </div>

          <div className="space-y-3">
            {[
              [
                "Mariana Souza",
                "Bruce",
                "Atendimento",
              ],
              [
                "Empresa Atlântico",
                "Carla",
                "Proposta",
              ],
              [
                "João Martins",
                "Rafael",
                "Pós-venda",
              ],
              [
                "Mercado Central",
                "Ana",
                "Renovação",
              ],
            ].map(
              ([
                cliente,
                responsavel,
                status,
              ]) => (
                <div
                  key={cliente}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-[10px] font-black text-white">
                      {cliente
                        .substring(0, 2)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-white">
                        {cliente}
                      </p>

                      <p className="mt-1 text-[9px] text-zinc-600">
                        Responsável:{" "}
                        {responsavel}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full bg-blue-500/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-blue-400">
                    {status}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ======================================================
// 07. SITE INTEGRADO
// ======================================================

function SiteSection({
  onRegister,
}: {
  onRegister: () => void;
}) {
  return (
    <section
      id="site"
      className="bg-white py-24 lg:py-32"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative overflow-hidden rounded-[40px] bg-zinc-950 px-7 py-12 text-white shadow-[0_50px_100px_-30px_rgba(0,0,0,0.35)] sm:px-10 lg:px-16 lg:py-20">
          <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[130px]" />

          <div className="relative grid items-center gap-14 lg:grid-cols-2">
            <div>
              <SectionBadge dark>
                Aquisição conectada
              </SectionBadge>

              <h2 className="mt-6 text-4xl font-black leading-[0.98] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                Seu site encontra
                o cliente.
                <br />

                <span className="text-blue-500">
                  O SeguroCRM
                  continua a
                  conversa.
                </span>
              </h2>

              <p className="mt-7 max-w-xl text-base leading-relaxed text-zinc-400">
                Sua presença
                digital deixa de
                viver separada da
                operação comercial.
                Leads captados pelo
                site entram no
                ecossistema da
                corretora para
                continuar o
                atendimento.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <DarkFeature>
                  Site da corretora
                </DarkFeature>

                <DarkFeature>
                  Sua marca e identidade
                </DarkFeature>

                <DarkFeature>
                  Captação de leads
                </DarkFeature>

                <DarkFeature>
                  Continuidade no CRM
                </DarkFeature>
              </div>

              <button
                type="button"
                onClick={onRegister}
                className="group mt-9 flex items-center gap-2 rounded-2xl bg-blue-600 px-7 py-4 text-sm font-black transition-all hover:bg-blue-500"
              >
                Conhecer o ecossistema

                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-1"
                />
              </button>
            </div>

            <SiteFlowVisual />
          </div>
        </div>
      </div>
    </section>
  );
}

function SiteFlowVisual() {
  const flow = [
    {
      title: "Site",
      subtitle:
        "Sua presença digital",
      icon: <Globe size={20} />,
    },
    {
      title: "Lead",
      subtitle:
        "Interesse identificado",
      icon: <Zap size={20} />,
    },
    {
      title: "SeguroCRM",
      subtitle:
        "Contexto centralizado",
      icon: <ShieldCheck size={20} />,
    },
    {
      title: "WhatsApp",
      subtitle:
        "Atendimento continua",
      icon: (
        <MessageCircle
          size={20}
        />
      ),
    },
  ];

  return (
    <div className="relative">
      <div className="absolute left-[32px] top-10 h-[calc(100%-80px)] w-px bg-gradient-to-b from-blue-500 via-blue-500/40 to-transparent" />

      <div className="space-y-4">
        {flow.map(
          (item, index) => (
            <motion.div
              key={item.title}
              initial={{
                opacity: 0,
                x: 20,
              }}
              whileInView={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                delay:
                  index * 0.08,
              }}
              viewport={{
                once: true,
              }}
              className="relative flex items-center gap-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur"
            >
              <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                {item.icon}
              </div>

              <div>
                <p className="font-black">
                  {item.title}
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  {item.subtitle}
                </p>
              </div>

              {index <
                flow.length -
                  1 && (
                <ArrowRight
                  size={15}
                  className="ml-auto rotate-90 text-zinc-700"
                />
              )}
            </motion.div>
          )
        )}
      </div>
    </div>
  );
}

// ======================================================
// 08. CENTRAL DE ARMAZENAMENTO
// ======================================================

function StorageSection() {
  return (
    <section className="overflow-hidden bg-[#f6f8fb] py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-[0.85fr_1.15fr]">
        <StorageVisual />

        <div>
          <SectionBadge>
            Central de armazenamento
          </SectionBadge>

          <h2 className="mt-5 text-4xl font-black leading-[0.98] tracking-[-0.04em] text-zinc-950 sm:text-5xl lg:text-6xl">
            A conversa passa.
            <br />

            <span className="text-blue-600">
              O histórico fica.
            </span>
          </h2>

          <p className="mt-7 max-w-xl text-base leading-relaxed text-zinc-500">
            Documentos e arquivos
            deixam de depender de
            computadores pessoais,
            conversas soltas ou
            pastas sem contexto.
          </p>

          <div className="mt-8 space-y-4">
            <SimpleCheck>
              100 MB inclusos em
              todos os ciclos
            </SimpleCheck>

            <SimpleCheck>
              Capacidade expansível
              conforme a corretora
              cresce
            </SimpleCheck>

            <SimpleCheck>
              Estrutura centralizada
              de documentos
            </SimpleCheck>

            <SimpleCheck>
              Arquivos ligados à
              operação do CRM
            </SimpleCheck>
          </div>
        </div>
      </div>
    </section>
  );
}

function StorageVisual() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        x: -30,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
      }}
      viewport={{
        once: true,
      }}
      className="relative"
    >
      <div className="absolute inset-10 rounded-full bg-indigo-500/15 blur-[90px]" />

      <div className="relative rounded-[38px] bg-zinc-950 p-6 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
              Armazenamento
            </p>

            <p className="mt-1 text-xl font-black text-white">
              Central de
              Documentos
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
            <HardDrive size={21} />
          </div>
        </div>

        <div className="my-7 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full w-[28%] rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Plano base"
            value="100 MB"
          />

          <MetricCard
            label="Expansão"
            value="Modular"
          />
        </div>

        <div className="mt-4 space-y-2">
          {[
            [
              "Apólice Auto.pdf",
              "Contrato",
            ],
            [
              "Proposta Empresa.pdf",
              "Proposta",
            ],
            [
              "Documento Cliente.pdf",
              "Cliente",
            ],
          ].map(
            ([name, type]) => (
              <div
                key={name}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                  <FileText
                    size={15}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-bold text-zinc-300">
                    {name}
                  </p>

                  <p className="mt-0.5 text-[8px] uppercase tracking-wider text-zinc-700">
                    {type}
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <p className="text-[8px] font-black uppercase tracking-wider text-zinc-700">
        {label}
      </p>

      <p className="mt-1 font-black text-white">
        {value}
      </p>
    </div>
  );
}

// ======================================================
// 09. PROVA SOCIAL
// ======================================================

function SocialProofSection() {
  const [indiceAtivo, setIndiceAtivo] =
    useState(0);

  const anterior = () => {
    setIndiceAtivo(atual =>
      atual === 0
        ? depoimentos.length - 1
        : atual - 1
    );
  };

  const proximo = () => {
    setIndiceAtivo(atual =>
      atual === depoimentos.length - 1
        ? 0
        : atual + 1
    );
  };

  const principal =
    depoimentos[indiceAtivo];

  const secundarios = [
    depoimentos[
      (indiceAtivo + 1) %
        depoimentos.length
    ],
    depoimentos[
      (indiceAtivo + 2) %
        depoimentos.length
    ],
  ];

  return (
    <section className="relative overflow-hidden bg-zinc-950 py-24 text-white lg:py-32">
      <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[160px]" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-3xl">
            <SectionBadge dark>
              Quem vive a rotina entende
            </SectionBadge>

            <h2 className="mt-5 text-4xl font-black leading-[0.98] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
              Um CRM só faz sentido
              <br />

              <span className="text-blue-500">
                quando a equipe quer usá-lo.
              </span>
            </h2>
          </div>

          <p className="max-w-md border-l-2 border-blue-600 pl-5 text-sm leading-relaxed text-zinc-500 md:text-base">
            Experiências que representam
            o tipo de transformação que
            buscamos entregar no dia a dia
            das corretoras de seguros.
          </p>
        </div>

        <div className="mt-16 grid gap-5 lg:grid-cols-[1.45fr_0.75fr]">
          {/* DEPOIMENTO PRINCIPAL */}

          <motion.div
            key={principal.nome}
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.35,
            }}
            className="relative flex min-h-[430px] flex-col justify-between overflow-hidden rounded-[36px] border border-blue-500/30 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 sm:p-10 lg:p-12"
          >
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-[60px]" />

            <div className="relative">
              <div className="mb-10 flex gap-1 text-blue-100">
                {Array.from({
                  length: 5,
                }).map((_, index) => (
                  <svg
                    key={index}
                    viewBox="0 0 24 24"
                    className="h-4 w-4 fill-current"
                    aria-hidden="true"
                  >
                    <path d="M12 2.6l2.84 5.76 6.36.92-4.6 4.48 1.09 6.33L12 17.1l-5.69 2.99 1.09-6.33-4.6-4.48 6.36-.92L12 2.6z" />
                  </svg>
                ))}
              </div>

              <blockquote className="max-w-4xl text-2xl font-black leading-[1.25] tracking-[-0.025em] text-white sm:text-3xl lg:text-[38px]">
                “{principal.texto}”
              </blockquote>
            </div>

            <div className="relative mt-12 flex flex-wrap items-center justify-between gap-5">
              <PessoaDepoimento
                depoimento={
                  principal
                }
                destaque
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={anterior}
                  aria-label="Depoimento anterior"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 transition-colors hover:bg-white/20"
                >
                  <ArrowRight
                    size={17}
                    className="rotate-180"
                  />
                </button>

                <button
                  type="button"
                  onClick={proximo}
                  aria-label="Próximo depoimento"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-700 transition-transform hover:scale-105"
                >
                  <ArrowRight
                    size={17}
                  />
                </button>
              </div>
            </div>
          </motion.div>

          {/* DEPOIMENTOS SECUNDÁRIOS */}

          <div className="grid gap-5">
            {secundarios.map(
              depoimento => (
                <motion.div
                  key={
                    depoimento.nome
                  }
                  whileHover={{
                    y: -3,
                  }}
                  className="flex flex-col justify-between rounded-[30px] border border-white/10 bg-zinc-900/70 p-7 transition-colors hover:border-blue-500/30"
                >
                  <div>
                    <div className="mb-5 flex gap-1 text-amber-400">
                      {Array.from({
                        length: 5,
                      }).map(
                        (_, index) => (
                          <svg
                            key={
                              index
                            }
                            viewBox="0 0 24 24"
                            className="h-3.5 w-3.5 fill-current"
                            aria-hidden="true"
                          >
                            <path d="M12 2.6l2.84 5.76 6.36.92-4.6 4.48 1.09 6.33L12 17.1l-5.69 2.99 1.09-6.33-4.6-4.48 6.36-.92L12 2.6z" />
                          </svg>
                        )
                      )}
                    </div>

                    <p className="text-sm font-medium leading-relaxed text-zinc-300">
                      “
                      {
                        depoimento.texto
                      }
                      ”
                    </p>
                  </div>

                  <div className="mt-7">
                    <PessoaDepoimento
                      depoimento={
                        depoimento
                      }
                    />
                  </div>
                </motion.div>
              )
            )}
          </div>
        </div>

        {/* MINI CARDS */}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {depoimentos
            .slice(3)
            .map(depoimento => (
              <button
                type="button"
                key={
                  depoimento.nome
                }
                onClick={() =>
                  setIndiceAtivo(
                    depoimentos.findIndex(
                      item =>
                        item.nome ===
                        depoimento.nome
                    )
                  )
                }
                className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.025] p-4 text-left transition-all hover:border-blue-500/30 hover:bg-white/[0.05]"
              >
                <AvatarDepoimento
                  iniciais={
                    depoimento.iniciais
                  }
                />

                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-white">
                    {depoimento.nome}
                  </p>

                  <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-blue-400">
                    {
                      depoimento.empresa
                    }
                  </p>
                </div>

                <ArrowRight
                  size={14}
                  className="ml-auto shrink-0 text-zinc-700 transition-transform group-hover:translate-x-1 group-hover:text-blue-500"
                />
              </button>
            ))}
        </div>

        <div className="mt-10 flex items-center justify-center gap-2">
          {depoimentos.map(
            (_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Ver depoimento ${
                  index + 1
                }`}
                onClick={() =>
                  setIndiceAtivo(index)
                }
                className={`h-1.5 rounded-full transition-all ${
                  indiceAtivo ===
                  index
                    ? "w-8 bg-blue-500"
                    : "w-2 bg-zinc-800 hover:bg-zinc-700"
                }`}
              />
            )
          )}
        </div>
      </div>
    </section>
  );
}

function PessoaDepoimento({
  depoimento,
  destaque = false,
}: {
  depoimento: (typeof depoimentos)[number];
  destaque?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <AvatarDepoimento
        iniciais={
          depoimento.iniciais
        }
        destaque={destaque}
      />

      <div>
        <p
          className={`font-black ${
            destaque
              ? "text-white"
              : "text-zinc-200"
          }`}
        >
          {depoimento.nome}
        </p>

        <p
          className={`mt-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${
            destaque
              ? "text-blue-100"
              : "text-blue-400"
          }`}
        >
          {depoimento.perfil}
        </p>

        <p
          className={`mt-0.5 text-[10px] ${
            destaque
              ? "text-blue-200"
              : "text-zinc-600"
          }`}
        >
          {depoimento.empresa}
        </p>
      </div>
    </div>
  );
}

function AvatarDepoimento({
  iniciais,
  destaque = false,
}: {
  iniciais: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-black ${
        destaque
          ? "bg-white/15 text-white"
          : "border border-blue-500/20 bg-blue-500/10 text-blue-400"
      }`}
    >
      {iniciais}
    </div>
  );
}

// ======================================================
// 10. PLANOS
// ======================================================

function PricingSection({
  onRegister,
}: {
  onRegister: () => void;
}) {
  return (
    <section
      id="planos"
      className="bg-white py-24 lg:py-32"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <SectionBadge>
            Planos simples
          </SectionBadge>

          <h2 className="mt-5 text-4xl font-black leading-[0.98] tracking-[-0.04em] text-zinc-950 sm:text-5xl lg:text-6xl">
            O mesmo SeguroCRM.
            <br />

            <span className="text-zinc-400">
              Você escolhe o ciclo.
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-500">
            Todos os ciclos incluem
            usuários ilimitados,
            site da corretora,
            100 MB de armazenamento
            e 1 conexão WhatsApp.
          </p>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {planos.map(
            (plano, index) => (
              <motion.div
                key={plano.nome}
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay:
                    index * 0.05,
                }}
                viewport={{
                  once: true,
                }}
                className={`relative flex flex-col rounded-[32px] border p-7 transition-all duration-300 hover:-translate-y-2 ${
                  plano.destaque
                    ? "border-zinc-900 bg-zinc-950 text-white shadow-[0_30px_80px_-25px_rgba(37,99,235,0.35)]"
                    : "border-zinc-200 bg-white text-zinc-950 hover:border-blue-200 hover:shadow-xl"
                }`}
              >
                {plano.destaque && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-blue-600 px-5 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white">
                    Maior economia
                  </div>
                )}

                <div>
                  <p
                    className={`text-[10px] font-black uppercase tracking-[0.18em] ${
                      plano.destaque
                        ? "text-blue-400"
                        : "text-blue-600"
                    }`}
                  >
                    {plano.nome}
                  </p>

                  <p
                    className={`mt-2 text-xs ${
                      plano.destaque
                        ? "text-zinc-500"
                        : "text-zinc-400"
                    }`}
                  >
                    {plano.descricao}
                  </p>
                </div>

                <div className="my-8">
                  <div className="flex items-start">
                    <span className="mt-2 text-xs font-black opacity-40">
                      R$
                    </span>

                    <span className="ml-1 text-5xl font-black tracking-[-0.05em]">
                      {
                        plano.mensalidade.split(
                          ","
                        )[0]
                      }
                    </span>

                    <span className="mt-2 text-lg font-black opacity-60">
                      ,
                      {
                        plano.mensalidade.split(
                          ","
                        )[1]
                      }
                    </span>
                  </div>

                  <p className="mt-1 text-[9px] font-black uppercase tracking-wider opacity-40">
                    equivalente por
                    mês
                  </p>
                </div>

                <div className="space-y-3 border-y border-current/10 py-6">
                  <PlanFeature>
                    Usuários ilimitados
                  </PlanFeature>

                  <PlanFeature>
                    1 conexão WhatsApp
                  </PlanFeature>

                  <PlanFeature>
                    Site integrado
                  </PlanFeature>

                  <PlanFeature>
                    100 MB de
                    armazenamento
                  </PlanFeature>
                </div>

                <div className="mt-6">
                  <p className="text-[9px] font-black uppercase tracking-wider opacity-40">
                    Ciclo
                  </p>

                  <p className="mt-1 text-sm font-black">
                    {plano.periodo}
                  </p>

                  <p className="mt-1 text-xs opacity-50">
                    Total:{" "}
                    {plano.total}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onRegister}
                  className={`mt-7 w-full rounded-2xl py-4 text-xs font-black uppercase tracking-wider transition-all ${
                    plano.destaque
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : "bg-zinc-100 text-zinc-900 hover:bg-zinc-950 hover:text-white"
                  }`}
                >
                  Começar
                </button>
              </motion.div>
            )
          )}
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <AddonCard
            icon={
              <MessageCircle
                size={24}
              />
            }
            title="Precisa de mais conexões WhatsApp?"
            description="Comece com uma conexão inclusa e adicione novos números conforme sua operação crescer."
          />

          <AddonCard
            icon={
              <Database size={24} />
            }
            title="Precisa de mais armazenamento?"
            description="Aumente a capacidade de arquivos sem precisar mudar toda a sua assinatura."
          />
        </div>
      </div>
    </section>
  );
}

function PlanFeature({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-tight">
      <span>{children}</span>

      <Check
        size={15}
        className="shrink-0 text-emerald-500"
      />
    </div>
  );
}

function AddonCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 rounded-[28px] border border-zinc-200 bg-zinc-50 p-6">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        {icon}
      </div>

      <div>
        <h3 className="font-black tracking-tight text-zinc-900">
          {title}
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          {description}
        </p>
      </div>
    </div>
  );
}

// ======================================================
// 10. FAQ
// ======================================================

function FAQSection() {
  return (
    <section
      id="faq"
      className="bg-[#f6f8fb] py-24 lg:py-32"
    >
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center">
          <SectionBadge>
            Perguntas frequentes
          </SectionBadge>

          <h2 className="mt-5 text-4xl font-black tracking-[-0.04em] text-zinc-950 sm:text-5xl">
            Antes de começar,
            <br />

            <span className="text-zinc-400">
              algumas respostas.
            </span>
          </h2>
        </div>

        <div className="mt-14 space-y-3">
          {perguntasFrequentes.map(
            item => (
              <FAQItem
                key={item.pergunta}
                pergunta={
                  item.pergunta
                }
                resposta={
                  item.resposta
                }
              />
            )
          )}
        </div>
      </div>
    </section>
  );
}

function FAQItem({
  pergunta,
  resposta,
}: {
  pergunta: string;
  resposta: string;
}) {
  const [open, setOpen] =
    useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={() =>
          setOpen(!open)
        }
        className="flex w-full items-center justify-between gap-6 p-5 text-left"
      >
        <span className="font-black tracking-tight text-zinc-900">
          {pergunta}
        </span>

        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 transition-transform ${
            open
              ? "rotate-45"
              : ""
          }`}
        >
          <X size={15} />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              height: 0,
              opacity: 0,
            }}
            animate={{
              height: "auto",
              opacity: 1,
            }}
            exit={{
              height: 0,
              opacity: 0,
            }}
          >
            <p className="px-5 pb-5 text-sm leading-relaxed text-zinc-500">
              {resposta}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ======================================================
// 11. CTA FINAL
// ======================================================

function FinalCTASection({
  onRegister,
}: {
  onRegister: () => void;
}) {
  return (
    <section className="relative overflow-hidden bg-blue-600 py-24 text-white lg:py-32">
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-[100px]" />

      <div className="absolute -bottom-40 right-0 h-[500px] w-[500px] rounded-full bg-indigo-900/20 blur-[120px]" />

      <div className="relative mx-auto max-w-5xl px-6 text-center">
        <Sparkles
          size={32}
          className="mx-auto mb-7 text-blue-200"
        />

        <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.04em] sm:text-5xl lg:text-7xl">
          Transforme seu
          WhatsApp
          <br />
          em uma corretora
          organizada.
        </h2>

        <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-blue-100 lg:text-lg">
          Centralize
          atendimento, clientes,
          propostas, contratos e
          pós-venda em uma
          experiência construída
          para o mercado de
          seguros.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onRegister}
            className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-sm font-black text-blue-700 shadow-2xl shadow-blue-900/20 transition-all hover:-translate-y-1 sm:w-auto"
          >
            Conhecer o SeguroCRM

            <ArrowRight
              size={17}
              className="transition-transform group-hover:translate-x-1"
            />
          </button>

          <a
            href={`https://wa.me/${WHATSAPP_COMERCIAL}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-8 py-4 text-sm font-black text-white backdrop-blur transition-all hover:bg-white/15 sm:w-auto"
          >
            <MessageCircle
              size={17}
            />

            Falar com um consultor
          </a>
        </div>
      </div>
    </section>
  );
}

// ======================================================
// 12. FOOTER
// ======================================================

function Footer() {
  return (
    <footer className="bg-[#070708] pb-10 pt-20 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 border-b border-white/5 pb-16 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3">
              <BrandMark />

              <div>
                <p className="text-xl font-black uppercase tracking-tighter">
                  Seguro
                  <span className="text-blue-600">
                    CRM
                  </span>
                </p>

                <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                  CRM para corretoras
                </p>
              </div>
            </div>

            <p className="mt-6 max-w-md text-sm leading-relaxed text-zinc-500">
              A operação da
              corretora organizada
              ao redor da conversa
              com o cliente.
            </p>
          </div>

          <div className="lg:col-span-2">
            <FooterTitle>
              Plataforma
            </FooterTitle>

            <FooterLinks>
              <a href="#como-funciona">
                Como funciona
              </a>

              <a href="#plataforma">
                Recursos
              </a>

              <a href="#site">
                Site integrado
              </a>

              <a href="#planos">
                Planos
              </a>
            </FooterLinks>
          </div>

          <div className="lg:col-span-2">
            <FooterTitle>
              Legal
            </FooterTitle>

            <FooterLinks>
              <Link to="/termos">
                Termos de Uso
              </Link>

              <Link to="/privacidade">
                Política de
                Privacidade
              </Link>
            </FooterLinks>
          </div>

          <div className="lg:col-span-3">
            <FooterTitle>
              Vendas e suporte
            </FooterTitle>

            <a
              href={`https://wa.me/${WHATSAPP_COMERCIAL}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-4 block rounded-2xl border border-white/5 bg-zinc-900 p-5 transition-all hover:border-blue-500/40"
            >
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                WhatsApp comercial
              </div>

              <p className="mt-3 text-lg font-black transition-colors group-hover:text-blue-500">
                (48) 99646-1645
              </p>

              <p className="mt-1 text-[10px] text-zinc-600">
                Fale diretamente
                com nossa equipe.
              </p>
            </a>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 pt-8 md:flex-row">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-700">
            © SeguroCRM 2026.
            Todos os direitos
            reservados.
          </p>

          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-700">
            <ShieldCheck
              size={12}
            />
            Tecnologia para
            corretoras de seguros
          </div>
        </div>
      </div>
    </footer>
  );
}

// ======================================================
// COMPONENTES VISUAIS AUXILIARES
// ======================================================

function BrandMark() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/20">
      <ShieldCheck size={22} />
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  dark,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  dark: boolean;
}) {
  return (
    <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
      <div className="max-w-3xl">
        <SectionBadge dark={dark}>
          {eyebrow}
        </SectionBadge>

        <h2
          className={`mt-5 text-4xl font-black leading-[0.98] tracking-[-0.04em] sm:text-5xl lg:text-6xl ${
            dark
              ? "text-white"
              : "text-zinc-950"
          }`}
        >
          {title}
        </h2>
      </div>

      <p
        className={`max-w-md border-l-2 border-blue-600 pl-5 text-sm leading-relaxed md:text-base ${
          dark
            ? "text-zinc-500"
            : "text-zinc-500"
        }`}
      >
        {description}
      </p>
    </div>
  );
}

function SectionBadge({
  children,
  dark = false,
}: {
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] ${
        dark
          ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
          : "border-blue-100 bg-blue-50 text-blue-600"
      }`}
    >
      <Zap size={12} />

      {children}
    </div>
  );
}

function SimpleCheck({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <Check size={14} />
      </span>

      <span className="text-sm font-bold text-zinc-700">
        {children}
      </span>
    </div>
  );
}

function DarkFeature({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
        <Check size={13} />
      </span>

      <span className="text-xs font-bold text-zinc-300">
        {children}
      </span>
    </div>
  );
}

function FooterTitle({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-500">
      {children}
    </p>
  );
}

function FooterLinks({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mt-5 flex flex-col gap-3 text-sm font-medium text-zinc-500 [&_a:hover]:text-white [&_a]:transition-colors">
      {children}
    </div>
  );
}

function FloatingWhatsApp() {
  return (
    <a
      href={`https://wa.me/${WHATSAPP_COMERCIAL}`}
      target="_blank"
      rel="noopener noreferrer"
      title="Falar com o SeguroCRM"
      className="fixed bottom-5 right-5 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl shadow-emerald-600/25 transition-all hover:-translate-y-1 hover:scale-105 hover:bg-emerald-400"
    >
      <MessageCircle size={25} />
    </a>
  );
}