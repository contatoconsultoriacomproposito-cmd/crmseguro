import { useState, useEffect, useRef, cloneElement } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, Check, MessageCircle, Menu, X, 
  Star, ChevronLeft, ChevronRight, 
  LayoutDashboard, Users, Zap, 
  FileSpreadsheet, BarChart3, Wallet, Database,
  ArrowRight, Instagram, Facebook, MapPin, CalendarCheck2, BotMessageSquare, Clock, Globe, Bot, Building2, Share2
} from "lucide-react";

import LoginModal from "../../components/homepage/LoginModal";
import RegistroModal from "../../components/homepage/RegistroModal";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import imgCapa from './img/img-capa.png';

export default function HomePage() {
  const { loading } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isFreeTrialModalOpen, setIsFreeTrialModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 340; 
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Se o contexto ainda está verificando o token do Supabase, exibe um loader limpo
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const beneficios = [
  // HIGHLIGHTS (BENTO DE DESTAQUE)
  {
    id: 'dash',
    icon: <LayoutDashboard />,
    title: "Dashboard Gerencial 360º",
    desc: "Análises em tempo real de clientes, propostas, produtos, seguradoras, produtividade, parceiros, comissões e sinistros.",
    size: "col-span-1 md:col-span-4",
    theme: "blue",
    tag: "VISÃO COMPLETA",
    highlight: "Análise Gerencial"
  },
  {
    id: 'kanban',
    icon: <BarChart3 />,
    title: "Kanban Autossuficiente",
    desc: "Cards dinâmicos com fluxos inteligentes, automações pós-atendimento e histórico unificado.",
    size: "col-span-1 md:col-span-2",
    theme: "dark",
    tag: "FLUXO AUTOMÁTICO"
  },
  {
    id: 'site-ia',
    icon: <Globe />,
    title: "Site + IA Atendendo 24x7",
    desc: "Site com seu domínio próprio integrado ao CRM e IA nativa captando leads mesmo enquanto você dorme.",
    size: "col-span-1 md:col-span-3",
    theme: "dark",
    tag: "CAPTAÇÃO PASSIVA"
  },
  {
    id: 'cnpj-soct',
    icon: <Zap />,
    title: "Busca Inteligente por CNPJ",
    desc: "Digite o CNPJ e preencha automaticamente a ficha cadastral da empresa e os nomes de todos os sócios.",
    size: "col-span-1 md:col-span-3",
    theme: "google",
    tag: "ZERO DIGITAÇÃO"
  },

  // GRID REGULAR (OUTROS 16 BENEFÍCIOS)
  { id: 'multiproprostas', icon: <FileSpreadsheet />, title: "Propostas Múltiplas", desc: "Apresente até 10 propostas simultâneas ao cliente no mesmo comparativo." },
  { id: 'comissao', icon: <Wallet />, title: "Gestão Avançada de Comissões", desc: "Regras comerciais personalizadas, múltiplos lançamentos e repasses automáticos." },
  { id: 'parceiros', icon: <Users />, title: "Portal de Parceiros", desc: "Inclusão ilimitada de parceiros internos e externos com repasses e comissões individualizadas." },
  { id: 'equipe', icon: <ShieldCheck />, title: "Corretores Ilimitados", desc: "Cadastre toda a sua equipe comercial sem custo extra por usuário." },
  { id: 'sinistro', icon: <Clock />, title: "Gestão de Sinistros", desc: "Organização ponta a ponta e controle de etapas para retenção máxima no sinistro." },
  { id: 'crosssell', icon: <Zap />, title: "Cross-Sell Estratégico", desc: "Controle de apólices por cliente e alertas de oportunidades para venda cruzada." },
  { id: 'emailmkt', icon: <MessageCircle />, title: "Email Marketing & Auditoria", desc: "Campanhas com rastreio de aberturas, cliques e ações (sob consulta)." },
  { id: 'agenda', icon: <CalendarCheck2 />, title: "Agenda Integrada", desc: "Sistema moderno de compromissos com centro de notificações em tempo real." },
  { id: 'financeiro', icon: <BarChart3 />, title: "Financeiro da Corretora", desc: "Controle absoluto de receitas e despesas com demonstrativo operacional." },
  { id: 'seguradoras', icon: <Building2 />, title: "Seguradoras Pré-configuradas", desc: "Catálogo pronto para uso instantâneo com as principais companhias do mercado." },
  { id: 'auditoria', icon: <ShieldCheck />, title: "Relatório de Ações e Auditoria", desc: "Monitoramento de movimentações no CRM para segurança total dos seus dados." },
  { id: 'b2b-prospect', icon: <Database />, title: "Busca de Empresas B2B", desc: "Mapeamento e prospeção de empresas do seu segmento (consultoria VIP sob demanda)." },
  { id: 'flexib', icon: <CalendarCheck2 />, title: "Flexibilidade de Assinatura", desc: "Planos mensais, trimestrais, semestrais e anuais para total previsibilidade." },
  { id: 'suporte', icon: <MessageCircle />, title: "Suporte 100% Humanizado", desc: "Atendimento próximo feito por especialistas do mercado de seguros." },
  { id: 'customizacao', icon: <Bot />, title: "Evolução Sob Demanda", desc: "Desenvolvimento próprio com constantes atualizações e melhorias solicitadas por corretores." }
];

  const depoimentos = [
    { nome: "Alana P.", cargo: "Mendes Seguros", texto: "O Kanban mudou o jogo. A transição das planilhas para o CRMSEGURO foi o melhor investimento do ano.", img: "https://i.pravatar.cc/100?u=1" },
    { nome: "Carlos E.", cargo: "Elantra Seguros", texto: "A central de parceiros me trouxe 30% mais leads no primeiro mês. Incrível!", img: "https://i.pravatar.cc/100?u=23" },
    { nome: "Marina S", cargo: "Souza Corretora", texto: "A busca por CNPJ economiza um tempo precioso da minha equipe de vendas.", img: "https://i.pravatar.cc/100?u=30" },
    { nome: "Juliana L", cargo: "Lima Seguros", texto: "O comparativo de propostas é lindo e profissional. Os clientes fecham muito mais rápido.", img: "https://i.pravatar.cc/100?u=34" },
    { nome: "Marcos R", cargo: "Reus Broker", texto: "Finalmente um CRM que entende que corretor precisa de histórico de sinistro fácil.", img: "https://i.pravatar.cc/100?u=5" },
    { nome: "Fernanda C", cargo: "Costa Seguros", texto: "A agenda de compromissos não me deixa esquecer nenhuma renovação. Nota 10.", img: "https://i.pravatar.cc/100?u=6" },
    { nome: "Paula B", cargo: "Bento Riscos", texto: "Gestão de comissões impecável. Sei exatamente quanto vou receber no mês.", img: "https://i.pravatar.cc/100?u=7" },
    { nome: "Clara L.", cargo: "Luz Corretora", texto: "O site integrado que eles fornecem é moderno e gera muita confiança para o segurado.", img: "https://i.pravatar.cc/100?u=13" },
    { nome: "Roberto J.", cargo: "RJ Seguros", texto: "As automações de pós-venda garantiram minha taxa de retenção acima de 95%.", img: "https://i.pravatar.cc/100?u=19" },
    { nome: "Sofia M.", cargo: "Marinho Corretora", texto: "Interface limpa, rápida e intuitiva. Meus corretores amam usar o sistema.", img: "https://i.pravatar.cc/100?u=27" },
  ];


  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      
      {/* Botão WhatsApp Flutuante */}
      <a href="https://wa.me/5548996461645" target="_blank" rel="noreferrer" className="fixed bottom-6 right-6 z-[100] bg-green-500 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform animate-bounce">
        <MessageCircle size={32} />
      </a>

      {/* --- NAVBAR --- */}
      <nav className={`fixed w-full z-50 transition-all duration-500 ${scrolled ? "bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl py-3 shadow-2xl border-b border-zinc-200/50 dark:border-zinc-800/50 text-zinc-900 dark:text-zinc-100" : "bg-transparent py-6 text-white"}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:rotate-6 transition-transform">
              <ShieldCheck className="text-white" size={24} />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">Seguro<span className="text-blue-600">CRM</span></span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-[11px] font-black uppercase tracking-widest">
            <a href="#beneficios" className="hover:text-blue-500 transition-colors">BENEFÍCIOS</a>
            <a href="#site-integrado" className="hover:text-blue-500 transition-colors">SITE INTEGRADO</a>
            <a href="#precos" className="hover:text-blue-500 transition-colors">PLANOS</a>
            
            {/* Ajustado a cor do texto para dinâmico (scrolled) */}
            <button onClick={() => setIsLoginOpen(true)} className={`${scrolled ? "text-zinc-600 dark:text-zinc-300" : "text-zinc-200"} hover:text-blue-500 transition-all`}>
              LOGIN
            </button>

            <button 
              onClick={() => setIsFreeTrialModalOpen(true)} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-1 active:scale-95"
            >
              TESTE GRÁTIS
            </button>
          </div>

          {/* Cor ajustada para o botão mobile */}
          <button className={`md:hidden p-2 ${scrolled ? "text-zinc-900 dark:text-white" : "text-white"}`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* --- MENU MOBILE (REFATORADO) --- */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-zinc-950/95 backdrop-blur-2xl flex flex-col justify-between p-6 text-white"
          >
            {/* Header do Menu */}
            <div className="flex justify-between items-center pb-6 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <ShieldCheck className="text-white" size={22} />
                </div>
                <span className="text-lg font-black tracking-tighter uppercase">Seguro<span className="text-blue-500">CRM</span></span>
              </div>
              <button 
                onClick={() => setIsMenuOpen(false)} 
                className="p-2.5 bg-zinc-900 border border-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Links de Navegação */}
            <div className="flex flex-col gap-3 my-auto py-6">
              <a 
                href="#beneficios" 
                onClick={() => setIsMenuOpen(false)} 
                className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-blue-500/30 text-zinc-300 font-bold text-sm tracking-wider uppercase transition-all"
              >
                <span>Benefícios</span>
                <ArrowRight size={16} className="text-blue-500" />
              </a>
              
              <a 
                href="#site-integrado" 
                onClick={() => setIsMenuOpen(false)} 
                className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-blue-500/30 text-zinc-300 font-bold text-sm tracking-wider uppercase transition-all"
              >
                <span>Site Integrado</span>
                <ArrowRight size={16} className="text-blue-500" />
              </a>

              <a 
                href="#precos" 
                onClick={() => setIsMenuOpen(false)} 
                className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-blue-500/30 text-zinc-300 font-bold text-sm tracking-wider uppercase transition-all"
              >
                <span>Planos</span>
                <ArrowRight size={16} className="text-blue-500" />
              </a>
            </div>

            {/* Ações / Botões */}
            <div className="flex flex-col gap-3 pt-6 border-t border-white/10">
              <button 
                onClick={() => { setIsLoginOpen(true); setIsMenuOpen(false); }} 
                className="w-full py-3.5 rounded-xl border border-white/10 bg-zinc-900 text-zinc-300 font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 transition-colors"
              >
                Entrar no Sistema
              </button>
              
              <button 
                onClick={() => { setIsFreeTrialModalOpen(true); setIsMenuOpen(false); }} 
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
              >
                Criar Conta Grátis
              </button>

              <p className="text-[10px] font-bold text-center text-zinc-600 uppercase tracking-[0.2em] pt-4">
                © Seguro CRM 2026
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- SESSÃO HERO REFATORADA: ELEGÂNCIA COM IMAGEM DE CAPA ESCURA --- */}
      <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden bg-zinc-950 pt-24 lg:pt-32 text-white">
        
        {/* BACKGROUND: IMAGEM DE CAPA COM OVERLAY ESCURO PARA CONTRASTE */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/60 to-zinc-950 z-10" />
          <img 
            src="/img/img-capa.png" 
            alt="Capa SeguroCRM" 
            className="w-full h-full object-cover opacity-40 scale-105" 
          />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-20 w-full">
          <div className="flex flex-col items-center text-center mb-16">
            
            {/* Badge Minimalista Estilo Tech */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 px-5 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-md shadow-sm flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-blue-400 text-[12px] font-bold uppercase tracking-wider">
                O melhor CRM do Brasil para Corretores de Seguros
              </span>
            </motion.div>

            {/* Título com Hierarquia Equilibrada & Frase de Impacto */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-5xl"
            >
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[1.05] tracking-tight text-white mb-6">
                Um CRM feito por <br />
                <span className="text-blue-500 relative inline-block">
                  Corretores!
                  <svg className="absolute -bottom-2 left-0 w-full h-3 text-blue-500/30 -z-10" viewBox="0 0 300 12" fill="none">
                    <path d="M1 9.5C50 3.5 150 1.5 299 9.5" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
                  </svg>
                </span>
              </h1>
            </motion.div>

            {/* Subtítulo com Respiro & Propósito */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-lg md:text-xl text-zinc-400 max-w-3xl mb-12 leading-relaxed"
            >
              Um ecossistema robusto <span className="text-white font-semibold">que facilita a vida dos corretores de seguros</span>. Abandone as planilhas e escale sua corretora com inteligência, automação e dados estratégicos integrados.
            </motion.p>

            {/* GRID DE VANTAGENS DO CORE (Estilo Bento Reforçado) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 max-w-6xl w-full mb-12"
            >
              <div className="p-5 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-white/10 flex flex-col items-center text-center group hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                  <Users className="w-6 h-6 text-blue-400 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-sm md:text-base font-bold text-white tracking-tight mb-1">Usuários Ilimitados</h3>
                <p className="text-xs md:text-sm text-zinc-400 font-normal leading-snug">Não cobramos por usuários</p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-white/10 flex flex-col items-center text-center group hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                  <Globe className="w-6 h-6 text-blue-400 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-sm md:text-base font-bold text-white tracking-tight mb-1">Site Integrado</h3>
                <p className="text-xs md:text-sm text-zinc-400 font-normal leading-snug">Pronto para conversão</p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-white/10 flex flex-col items-center text-center group hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                  <Bot className="w-6 h-6 text-blue-400 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-sm md:text-base font-bold text-white tracking-tight mb-1">IA 24x7 no Site</h3>
                <p className="text-xs md:text-sm text-zinc-400 font-normal leading-snug">Atendimento automatizado</p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-white/10 flex flex-col items-center text-center group hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                  <Building2 className="w-6 h-6 text-blue-400 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-sm md:text-base font-bold text-white tracking-tight mb-1">+28 Mi Empresas</h3>
                <p className="text-xs md:text-sm text-zinc-400 font-normal leading-snug">Dados de sócios <span className="text-[10px] text-zinc-500 block">*sob consulta</span></p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-white/10 flex flex-col items-center text-center group hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 sm:col-span-2 md:col-span-1">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                  <Share2 className="w-6 h-6 text-blue-400 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-sm md:text-base font-bold text-white tracking-tight mb-1">Parceiros On-line</h3>
                <p className="text-xs md:text-sm text-zinc-400 font-normal leading-snug">Gestão de parcerias</p>
              </div>
            </motion.div>

            {/* CTAs Limpos */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <button 
                onClick={() => setIsFreeTrialModalOpen(true)}
                className="px-10 py-5 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all flex items-center justify-center gap-2 group"
              >
                Teste grátis agora 
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
              </button>
              <button 
                onClick={() => setIsFreeTrialModalOpen(true)}
                className="px-10 py-5 bg-zinc-900/80 text-white border border-white/10 rounded-xl font-bold text-lg hover:bg-zinc-800 transition-all active:scale-95"
              >
                Ver demonstração
              </button>
            </motion.div>
          </div>

          {/* Mockup com Perspectiva */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 1 }}
            className="relative max-w-6xl mx-auto group"
          >
            <div className="absolute -inset-4 bg-gradient-to-b from-blue-600/20 to-transparent blur-3xl rounded-[50px] opacity-40" />
            
            <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] bg-zinc-900 p-2">
              <img 
                src={imgCapa}
                alt="Interface do Sistema SeguroCRM" 
                className="w-full h-auto rounded-xl" 
              />
            </div>

            {/* Floating Card: Status IA */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-6 top-1/4 hidden lg:block bg-zinc-900/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/10 z-30"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400">
                  <Check size={20} strokeWidth={3} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">Status IA 24x7</p>
                  <p className="text-sm text-white font-black italic">Lead Qualificado no Site!</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* --- SESSÃO BENEFÍCIOS (BENTO GRID HIGH-TECH) --- */}
      <section id="beneficios" className="py-24 md:py-32 bg-zinc-950 relative overflow-hidden text-white border-t border-white/10">
        
        {/* Luzes de Fundo Decorativas */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          
          {/* Header da Sessão */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
            <div className="max-w-3xl">
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest"
              >
                <Zap size={14} className="text-blue-400 animate-pulse" />
                <span>Ecossistema Completo para Corretoras</span>
              </motion.div>
              
              <h2 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight text-white leading-[1.05]">
                Feito para quem entende que <br />
                <span className="text-blue-500">tempo é o seu maior ativo.</span>
              </h2>
            </div>

            <p className="text-zinc-400 font-medium max-w-sm text-base md:text-lg leading-relaxed border-l-2 border-blue-600 pl-5">
              20 soluções integradas em uma única plataforma desenvolvida por quem vive o dia a dia do mercado segurador.
            </p>
          </div>

          {/* GRID BENTO PRINCIPAL (TOP 4 DESTAQUES) */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-5 mb-6">
            {beneficios.slice(0, 4).map((b, i) => {
              const itemSize = b.size || "col-span-1 md:col-span-3";
              const isLarge = itemSize.includes('md:col-span-4');

              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className={`
                    relative group overflow-hidden rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 border
                    ${itemSize}
                    ${b.theme === 'google' ? 'bg-gradient-to-br from-blue-900/40 via-zinc-900 to-zinc-950 border-blue-500/30 hover:border-blue-500' : 
                      b.theme === 'blue' ? 'bg-gradient-to-br from-blue-600 to-indigo-700 border-blue-400/40 hover:shadow-2xl hover:shadow-blue-500/20' : 
                      'bg-zinc-900/80 backdrop-blur-xl border-white/10 hover:border-blue-500/50 hover:bg-zinc-900'}
                  `}
                >
                  {/* Tag Superior */}
                  <div className="flex justify-between items-start mb-8 relative z-10">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                      b.theme === 'blue' ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {cloneElement(b.icon as React.ReactElement<any>, { size: 24 })}
                    </div>
                    
                    {b.tag && (
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full tracking-wider uppercase ${
                        b.theme === 'blue' ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {b.tag}
                      </span>
                    )}
                  </div>

                  {/* Conteúdo do Card */}
                  <div className="relative z-10">
                    <h3 className={`font-black tracking-tight mb-3 ${isLarge ? 'text-2xl sm:text-4xl' : 'text-xl sm:text-2xl'}`}>
                      {b.title}
                    </h3>
                    <p className={`font-normal leading-relaxed ${b.theme === 'blue' ? 'text-white/90' : 'text-zinc-400'} ${isLarge ? 'text-base sm:text-lg max-w-2xl' : 'text-sm'}`}>
                      {b.desc}
                    </p>
                  </div>

                  {/* Brilho no Hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </motion.div>
              );
            })}
          </div>

          {/* GRID DE CARDS COMPACTOS (OUTROS 16 BENEFÍCIOS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {beneficios.slice(4).map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-blue-500/40 hover:bg-zinc-900/90 hover:-translate-y-1 transition-all duration-300 flex items-start gap-4 group"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  {cloneElement(b.icon as React.ReactElement<any>, { size: 20 })}
                </div>

                <div>
                  <h4 className="text-base font-bold text-white tracking-tight mb-1 group-hover:text-blue-400 transition-colors">
                    {b.title}
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                    {b.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Chamada Final de Impacto */}
          <div className="mt-16 text-center">
            <button 
              onClick={() => setIsFreeTrialModalOpen(true)}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all hover:scale-105"
            >
              <span>Quero transformar minha corretora</span>
              <ArrowRight size={18} />
            </button>
          </div>

        </div>
      </section>

      {/* --- SESSÃO SITE INTEGRADO: PREMIUM & CONECTADO COM IA --- */}
      <section id="site-integrado" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative bg-[#0A0A0B] rounded-[64px] p-8 lg:p-24 overflow-hidden shadow-[0_48px_100px_-20px_rgba(0,0,0,0.3)]">
            
            {/* Background Decorativo: Aurora Digital */}
            <div className="absolute top-0 right-0 w-full h-full">
              <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full" />
              <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full" />
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-20 relative z-10">
              
              {/* TEXTO: FOCO EM IA E CONVERSÃO */}
              <div className="lg:w-1/2 text-white">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">
                      Site + IA ChatSDR Inclusos
                    </span>
                  </div>
                  
                  <h2 className="text-5xl lg:text-7xl font-black tracking-tighter mb-8 leading-[0.85]">
                    Venda enquanto <br /> 
                    <span className="text-blue-500 italic">você dorme.</span>
                  </h2>

                  <p className="text-zinc-400 text-xl mb-12 font-medium leading-relaxed max-w-lg">
                    Seu novo site vem com o <span className="text-white font-bold text-blue-400">ChatSDR nativo</span>: uma IA treinada para qualificar leads e agendar reuniões direto no seu CRM.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-14">
                    {[
                      { t: "IA ChatSDR", d: "Atendimento 24/7" },
                      { t: "Foco em Lead", d: "Captura ultra-rápida" },
                      { t: "Domínio Próprio", d: "Sua marca, sua casa" },
                      { t: "100% Integrado", d: "Cai direto no Kanban" }
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col gap-1 border-l border-white/10 pl-4">
                        <span className="text-white font-bold text-lg">{item.t}</span>
                        <span className="text-zinc-500 text-sm font-medium">{item.d}</span>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => setIsFreeTrialModalOpen(true)}
                    className="group w-full sm:w-auto bg-blue-600 text-white px-10 py-6 rounded-[24px] font-black text-lg shadow-2xl shadow-blue-600/20 hover:bg-blue-500 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    ATIVAR MEU SITE COM IA <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              </div>

              {/* VISUAL: MOCKUP COM INDICADOR DE IA */}
              <div className="lg:w-1/2 relative">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  {/* O "Site" em perspectiva */}
                  <div className="relative z-10 bg-zinc-800 p-1.5 rounded-[32px] shadow-2xl border border-white/10 transform lg:rotate-[-4deg] lg:translate-x-10 transition-transform hover:rotate-0 duration-700">
                    <div className="bg-zinc-900 px-4 py-3 rounded-t-[26px] border-b border-white/5 flex gap-2 items-center">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500/50" />
                        <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                        <div className="w-2 h-2 rounded-full bg-green-500/50" />
                      </div>
                      <div className="mx-auto bg-white/5 rounded-lg text-[9px] text-zinc-500 px-8 py-1.5 font-medium border border-white/5 tracking-tight">
                        corretora-inteligente.ai
                      </div>
                    </div>
                    <img 
                      src="img/kanban1.jpg" 
                      alt="Interface do Site com IA" 
                      className="w-full h-auto rounded-b-[26px] grayscale hover:grayscale-0 transition-all duration-1000" 
                    />
                  </div>

                  {/* Floating Card: IA ChatSDR Ativa */}
                  <motion.div 
                    animate={{ y: [0, -20, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-10 -right-4 lg:-right-10 z-30 bg-blue-600 text-white p-6 rounded-[32px] shadow-[0_40px_80px_-15px_rgba(37,99,235,0.4)] border border-blue-400/30 hidden md:block"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                        <BotMessageSquare size={28} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">ChatSDR Ativo</p>
                        <p className="text-lg font-bold leading-none italic">IA Qualificando Lead...</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Floating Card: Conversão Instantânea */}
                  <motion.div 
                    animate={{ x: [0, 20, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute -bottom-12 -left-4 lg:-left-20 z-20 bg-white p-8 rounded-[48px] shadow-2xl hidden md:block border border-zinc-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                        <Zap fill="currentColor" size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Resultado</p>
                        <p className="text-xl font-black text-zinc-900">+42% Conversão</p>
                      </div>
                    </div>
                  </motion.div>

                </motion.div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* --- SESSÃO PROVA SOCIAL & INFRAESTRUTURA --- */}
      <section className="py-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Título de Autoridade: Foco em Ecossistema, não em Clientes específicos ainda */}
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <div className="max-w-2xl">
              <motion.span 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                className="text-blue-600 font-black uppercase text-[10px] tracking-[0.3em] mb-4 block"
              >
                Segurança e Ecossistema
              </motion.span>
              <h2 className="text-4xl lg:text-6xl font-black text-zinc-900 tracking-tighter leading-[0.9]">
                Pronto para operar com as <br />
                <span className="text-zinc-400">maiores do mercado.</span>
              </h2>
            </div>
            <p className="text-zinc-500 font-medium max-w-xs text-sm border-l-2 border-zinc-100 pl-6">
              Nossa infraestrutura foi desenhada para integrar perfeitamente com o fluxo das principais seguradoras do país.
            </p>
          </div>

          {/* CARROSSEL DE INTEGRAÇÕES & SEGURANÇA (Substituindo Logos de Clientes) */}
          <div className="relative group mb-32">
            <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

            <div className="flex overflow-hidden gap-8 select-none py-4">
              <motion.div 
                animate={{ x: [0, -1200] }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="flex flex-none gap-8 items-center"
              >
                {/* Em vez de logos de clientes, usamos selos de tecnologia e categorias de seguros */}
                {[
                  "Criptografia SSL 256-bits", "LGPD Compliant",
                  "Multiplas Cotações", "Integração com WhatsApp - Extensão", "Backups Diários"
                ].map((text, i) => (
                  <div key={i} className="px-8 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center gap-3 whitespace-nowrap">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-zinc-600 font-bold uppercase text-[11px] tracking-widest">{text}</span>
                  </div>
                ))}
              </motion.div>
              
              {/* Clone para loop infinito */}
              <motion.div 
                animate={{ x: [0, -1200] }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="flex flex-none gap-8 items-center"
              >
                {[
                  "Criptografia SSL 256-bits", "LGPD Compliant", "Integração Google API", 
                  "Multiplas Cotações", "Integração com WhatsApp - Extensão", "Backups Diários"
                ].map((text, i) => (
                  <div key={`dup-${i}`} className="px-8 py-4 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center gap-3 whitespace-nowrap">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-zinc-600 font-bold uppercase text-[11px] tracking-widest">{text}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>

          {/* GRID DE STATS: Estilo Dashboard 2026 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* CARD 1: SEGURANÇA DE DADOS */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-12 rounded-[48px] bg-zinc-900 text-white overflow-hidden relative group"
            >
              <ShieldCheck className="absolute -right-8 -bottom-8 size-48 opacity-5 group-hover:rotate-12 transition-transform duration-700" />
              <p className="text-blue-500 font-black text-xs uppercase tracking-[0.3em] mb-8">Segurança</p>
              <p className="text-6xl font-black tracking-tighter mb-4">99.9%</p>
              <p className="text-zinc-400 font-medium leading-tight">
                Uptime garantido e proteção de dados <br />
                <span className="text-white">seguindo rigorosamente a LGPD.</span>
              </p>
            </motion.div>

            {/* CARD 2: PROPOSTAS (O Stat que você já tinha, mas com design Bento) */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-12 rounded-[48px] bg-blue-600 text-white overflow-hidden relative group"
            >
              <Zap className="absolute -right-8 -bottom-8 size-48 opacity-10 group-hover:scale-110 transition-transform duration-700" />
              <p className="text-blue-200 font-black text-xs uppercase tracking-[0.3em] mb-8">Performance</p>
              <p className="text-6xl font-black tracking-tighter mb-4">30k+</p>
              <p className="text-blue-50 font-medium leading-tight">
                Propostas movimentadas <br />
                <span className="text-white font-bold text-xl italic">mensalmente.</span>
              </p>
            </motion.div>

            {/* CARD 3: ECONOMIA DE TEMPO */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-12 rounded-[48px] bg-zinc-50 border border-zinc-100 text-zinc-900 overflow-hidden relative group"
            >
              <Clock className="absolute -right-8 -bottom-8 size-48 opacity-5 group-hover:-rotate-12 transition-transform duration-700" />
              <p className="text-blue-600 font-black text-xs uppercase tracking-[0.3em] mb-8">Eficiência</p>
              <p className="text-6xl font-black tracking-tighter mb-4">-4h</p>
              <p className="text-zinc-500 font-medium leading-tight">
                Economia média diária <br />
                <span className="text-zinc-900 font-bold text-xl">em tarefas operacionais.</span>
              </p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* --- SESSÃO DEPOIMENTOS --- */}
      <section className="py-24 bg-blue-600 dark:bg-blue-900 text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex justify-between items-end mb-12">
          <h2 className="text-4xl font-black tracking-tighter">Quem usa, comprova.</h2>
          <div className="flex gap-2">
            <button onClick={() => scroll('left')} className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-all"><ChevronLeft /></button>
            <button onClick={() => scroll('right')} className="p-4 rounded-full bg-white text-blue-600 hover:bg-zinc-100 transition-all"><ChevronRight /></button>
          </div>
        </div>
        <div ref={scrollRef} className="flex overflow-x-auto gap-6 scrollbar-hide pb-8 snap-x">
          {depoimentos.map((d, i) => (
            <div key={i} className="min-w-[320px] bg-white dark:bg-zinc-800 p-8 rounded-[32px] snap-center">
              <div className="flex gap-1 text-yellow-500 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
              </div>
              <p className="text-zinc-600 dark:text-zinc-300 italic mb-8 font-medium">"{d.texto}"</p>
              <div className="flex items-center gap-3">
                <img src={d.img} className="w-12 h-12 rounded-full border-2 border-blue-500/20" alt={d.nome} />
                <div>
                  <p className="font-black text-zinc-900 dark:text-white text-sm">{d.nome}</p>
                  <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{d.cargo}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      </section>

      {/* --- SESSÃO PLANOS (ESTILO DASHBOARD 2026) --- */}
      <section id="precos" className="py-32 bg-zinc-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <motion.span 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="text-blue-600 font-black uppercase text-[10px] tracking-[0.4em] mb-4 block"
            >
              Licenciamento Profissional 2026
            </motion.span>
            <h2 className="text-5xl lg:text-7xl font-black text-zinc-900 tracking-tighter leading-[0.9] mb-6">
              CRM, Site e IA <br />
              <span className="text-zinc-400">em um único ecossistema.</span>
            </h2>
            <p className="text-zinc-500 font-medium max-w-2xl mx-auto text-lg leading-relaxed">
              Usuários ilimitados e Site Corretor com ChatSDR já inclusos em todos os ciclos. 
              <br /><span className="text-blue-600 font-bold italic text-sm">Sem taxas de ativação ou custos ocultos.</span>
            </p>
          </div>

          {/* CARDS DE ASSINATURA CONFORME PLANOS_CONFIG */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {[
              { p: "Mensal", v: "89,97", desc: "Flexibilidade total", best: false },
              { p: "Trimestral", v: "79,97", desc: "Otimização de custos", best: false },
              { p: "Semestral", v: "69,97", desc: "Planejamento ideal", best: false },
              { p: "Anual", v: "49,97", desc: "Foco em alta performance", best: true },
            ].map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                className={`relative p-8 rounded-[48px] transition-all duration-500 group ${
                  item.best 
                  ? 'bg-zinc-900 text-white shadow-[0_40px_80px_-15px_rgba(37,99,235,0.25)] scale-105 z-10 border-blue-500/30' 
                  : 'bg-white border border-zinc-200 text-zinc-900 hover:shadow-xl'
                }`}
              >
                {item.best && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-black px-8 py-2.5 rounded-full tracking-[0.2em] uppercase shadow-lg">
                    Melhor Custo-Benefício
                  </div>
                )}
                
                <div className="mb-10">
                  <p className={`font-black uppercase tracking-widest text-[10px] mb-1 ${item.best ? 'text-blue-400' : 'text-blue-600'}`}>
                    Plano {item.p}
                  </p>
                  <p className="text-[11px] font-medium opacity-50 uppercase tracking-tighter">{item.desc}</p>
                </div>
                
                <div className="mb-8">
                  <span className="text-sm font-bold opacity-40">R$</span>
                  <span className="text-7xl font-black tracking-tighter leading-none">{item.v.split(',')[0]}</span>
                  <span className="text-xl font-black opacity-60">,{item.v.split(',')[1]}</span>
                  <span className={`block text-[10px] font-bold mt-2 uppercase tracking-widest ${item.best ? 'text-zinc-500' : 'text-zinc-400'}`}>por mês</span>
                </div>

                <div className="space-y-1 mb-10">
                  <div className={`flex justify-between items-center py-4 border-b ${item.best ? 'border-white/10' : 'border-zinc-100'}`}>
                    <span className="text-[10px] font-black uppercase tracking-tight">Usuários Ilimitados</span>
                    <Check size={16} className="text-emerald-500" />
                  </div>
                  <div className={`flex justify-between items-center py-4 border-b ${item.best ? 'border-white/10' : 'border-zinc-100'}`}>
                    <span className="text-[10px] font-black uppercase tracking-tight">Site Corretor Premium</span>
                    <Check size={16} className="text-emerald-500" />
                  </div>
                  <div className={`flex justify-between items-center py-4 border-b ${item.best ? 'border-white/10' : 'border-zinc-100'}`}>
                    <span className="text-[10px] font-black uppercase tracking-tight">IA ChatSDR Ativo</span>
                    <Check size={16} className="text-emerald-500" />
                  </div>
                </div>

                <button 
                  onClick={() => setIsFreeTrialModalOpen(true)}
                  className={`w-full py-5 rounded-[24px] font-black text-xs tracking-widest uppercase transition-all active:scale-95 ${
                    item.best 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30' 
                    : 'bg-zinc-100 hover:bg-zinc-900 hover:text-white text-zinc-900'
                  }`}
                >
                  Começar Agora
                </button>
              </motion.div>
            ))}
          </div>

          {/* SEÇÃO DE STORAGE ADICIONAL */}
          <div className="max-w-4xl mx-auto p-8 rounded-[40px] bg-white border border-zinc-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
              <Database size={32} />
            </div>
            <div className="flex-grow text-center md:text-left">
              <h4 className="text-xl font-black text-zinc-900 tracking-tight">Escalabilidade de Dados</h4>
              <p className="text-sm text-zinc-500 font-medium">
                Todos os planos iniciam com 50MB de storage. Se sua corretora crescer, você expande o armazenamento de arquivos e apólices de forma modular.
              </p>
            </div>
            <div className="text-center px-8 md:border-l border-zinc-100">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Storage Extra</p>
              <p className="text-xl font-black text-zinc-900">Sob demanda</p>
            </div>
          </div>

          <div className="mt-12 flex justify-center">
            <div className="flex items-center gap-3 bg-zinc-900/5 px-6 py-3 rounded-full border border-zinc-200/50">
              <ShieldCheck size={14} className="text-blue-600" />
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Processamento seguro e suporte consultivo via WhatsApp para sua configuração inicial.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- RODAPÉ PREMIUM --- */}
      <footer className="bg-[#070708] text-white pt-32 pb-12 border-t border-white/5 relative overflow-hidden">
        {/* Detalhe de luz suave no fundo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 mb-24">
            
            {/* COLUNA 1: BRAND & MISSION (4 colunas) */}
            <div className="lg:col-span-4 space-y-8">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <ShieldCheck size={22} />
                </div>
                <span className="text-2xl font-black uppercase tracking-tighter italic">
                  Seguro<span className="text-blue-600">CRM</span>
                </span>
              </div>
              <p className="text-zinc-500 text-base leading-relaxed max-w-sm">
                A infraestrutura tecnológica definitiva para corretores que buscam escala, organização e liberdade.
              </p>
              <div className="flex gap-3">
                {[
                  { icon: <Instagram size={20}/>, href: "#" },
                  { icon: <Facebook size={20}/>, href: "#" },
                  { icon: <Zap size={20}/>, href: "#" } // Representando automação/manychat
                ].map((social, i) => (
                  <a 
                    key={i} 
                    href={social.href} 
                    className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center hover:bg-blue-600 hover:border-blue-500 transition-all duration-300 group"
                  >
                    <span className="group-hover:scale-110 transition-transform">{social.icon}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* COLUNA 2: NAVEGAÇÃO (2 colunas) */}
            <div className="lg:col-span-2">
              <h4 className="font-black uppercase text-[10px] tracking-[0.2em] mb-8 text-blue-500">Plataforma</h4>
              <ul className="space-y-4 text-sm text-zinc-400 font-bold uppercase tracking-tight">
                <li><a href="#beneficios" className="hover:text-white transition-colors">Benefícios</a></li>
                <li><a href="#site-integrado" className="hover:text-white transition-colors">Site Premium</a></li>
                <li><a href="#precos" className="hover:text-white transition-colors">Planos</a></li>
              </ul>
            </div>

            {/* COLUNA 3: JURÍDICO (3 colunas) */}
            <div className="lg:col-span-3">
              <h4 className="font-black uppercase text-[10px] tracking-[0.2em] mb-8 text-blue-500">Segurança & Legal</h4>
              <ul className="space-y-4 text-sm text-zinc-500 font-medium">
                <li className="flex items-center gap-2 text-zinc-300 mb-6 bg-white/5 p-3 rounded-lg border border-white/5 w-fit">
                  <ShieldCheck size={16} className="text-blue-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest">LGPD Compliant</span>
                </li>
                <li><Link to="/termos" className="hover:text-white transition-colors">Termos de Uso</Link></li>
                <li><Link to="/privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link></li>
                <li className="flex items-center gap-2 text-zinc-600 italic mt-4">
                  <MapPin size={14}/> <span>Santa Catarina, Brasil</span>
                </li>
              </ul>
            </div>

            {/* COLUNA 4: CONTATO (3 colunas) */}
            <div className="lg:col-span-3">
              <h4 className="font-black uppercase text-[10px] tracking-[0.2em] mb-8 text-blue-500">Suporte & Vendas</h4>
              <a 
                href="https://wa.me/5548996461645" 
                target="_blank"
                rel="noopener noreferrer"
                className="relative overflow-hidden bg-zinc-900 border border-white/5 p-8 rounded-[32px] flex flex-col gap-2 hover:border-blue-500/50 transition-all group"
              >
                {/* Efeito de brilho ao passar o mouse */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 blur-3xl -translate-y-12 translate-x-12 group-hover:bg-blue-600/20 transition-all" />
                
                <span className="text-[10px] font-black uppercase tracking-widest text-green-500 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  WhatsApp Online
                </span>
                <span className="text-xl font-black group-hover:text-blue-500 transition-colors tracking-tighter">
                  (48) 99646-1645
                </span>
                <p className="text-[10px] text-zinc-500 mt-2 font-medium">Fale com um consultor agora</p>
              </a>
            </div>
          </div>

          {/* COPYRIGHT FINAL */}
          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em]">
              © Seguro CRM 2026 - O futuro da corretora de seguros
            </div>
            <div className="flex gap-8">
              <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">Built with Precision</span>
              <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">v2.4.0</span>
            </div>
          </div>
        </div>
      </footer>

      {/* CONTEÚDO PRINCIPAL DA HOMEPAGE AQUI */}

      {/* ================= MODAIS DE AUTENTICAÇÃO ================= */}
      <AnimatePresence mode="wait">
        {isLoginOpen && (
          <LoginModal 
            onClose={() => setIsLoginOpen(false)} 
            onSwitch={() => { 
              setIsLoginOpen(false); 
              setIsFreeTrialModalOpen(true); 
            }} 
          />
        )}
        
        {isFreeTrialModalOpen && (
          <RegistroModal 
            isOpen={isFreeTrialModalOpen}
            onClose={() => setIsFreeTrialModalOpen(false)} 
            onSwitch={() => { 
              setIsFreeTrialModalOpen(false); 
              setIsLoginOpen(true); 
            }} 
          />
        )}
      </AnimatePresence>

        

    </div>
  );
}