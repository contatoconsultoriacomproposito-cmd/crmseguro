import { useState, useEffect, useRef, cloneElement } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, Check, MessageCircle, Menu, X, 
  Star, ChevronLeft, ChevronRight, 
  LayoutDashboard, Users, Zap, 
  FileSpreadsheet, BarChart3, Wallet, Globe,
  ArrowRight, Instagram, Facebook, MapPin, CalendarCheck2, BotMessageSquare, ArrowUpRight, Clock, Info
} from "lucide-react";

import LoginModal from "../../components/homepage/LoginModal";
import RegistroModal from "../../components/homepage/RegistroModal";
import { Link } from "react-router-dom";

export default function HomePage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
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

  const beneficios = [
    { id: 'google', icon: <CalendarCheck2 />, title: "Integração", desc: "Sincronização com o Google Agenda. Fez no CRM, aparece na sua agenda Google!", size: "col-span-1 md:col-span-4", theme: "google", tag: "INTEGRAÇÃO" },
    { id: 'bot', icon: <BotMessageSquare />, title: "Integração com Manychat", desc: "Leads do Instagram e WhatsApp integrados ao CRM.", size: "col-span-1 md:col-span-2", theme: "blue" },
    { id: 'dash', icon: <LayoutDashboard />, title: "DashBoard - Visão 360º", desc: "Análises em tempo real de vendas, produtividade, gestão de perdas e muito mais", size: "col-span-1 md:col-span-3", theme: "light" },
    { id: 'zap', icon: <Zap />, title: "Dados preenchidos automaticamente", desc: "Puxamos dados via CNPJ e CEP. Zero digitação manual.", size: "col-span-1 md:col-span-3", theme: "light" },
    { id: 'kanban', icon: <BarChart3 />, title: "Kanban & Cards", desc: "Funil visual com histórico de mensagens, sinistros e comissões.", size: "col-span-1 md:col-span-2", theme: "light" },
    { id: 'sinistro', icon: <ShieldCheck />, title: "Gestão de Eventos", desc: "Acompanhamento rigoroso para fidelização máxima no sinistro.", size: "col-span-1 md:col-span-2", theme: "light" },
    { id: 'fin', icon: <Wallet />, title: "Gestão de Comissões", desc: "Controle de comissões recebidas e repasses a parceiros.", size: "col-span-1 md:col-span-2", theme: "light" },
    { id: 'parceiros', icon: <Users />, title: "Portal do parceiro", desc: "Portal exclusivo para parceiros alimentarem seu funil.", size: "col-span-1 md:col-span-3", theme: "light" },
    { id: 'docs', icon: <FileSpreadsheet />, title: "Cotações comparativas", desc: "Comparativos de seguradoras prontos para envio em segundos.", size: "col-span-1 md:col-span-3", theme: "light" }
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
      <nav className={`fixed w-full z-50 transition-all duration-500 ${scrolled ? "bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl py-3 shadow-2xl border-b border-zinc-200/50 dark:border-zinc-800/50" : "bg-transparent py-6"}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:rotate-6 transition-transform">
              <ShieldCheck className="text-white" size={24} />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">Seguro<span className="text-blue-600">CRM</span></span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-[11px] font-black uppercase tracking-widest">
            <a href="#beneficios" className="hover:text-blue-600 transition-colors">BENEFÍCIOS</a>
            <a href="#site-integrado" className="hover:text-blue-600 transition-colors">SITE INTEGRADO</a>
            <a href="#precos" className="hover:text-blue-600 transition-colors">PLANOS</a>
            <button onClick={() => setIsLoginOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-1 active:scale-95">
              LOGIN
              </button>
            <button onClick={() => setIsRegisterOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-1 active:scale-95">
              CRIAR CONTA
            </button>
          </div>

          <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* --- MENU MOBILE (ESTILO 2026) --- */}
<AnimatePresence>
  {isMenuOpen && (
    <motion.div 
      initial={{ x: "100%" }} 
      animate={{ x: 0 }} 
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }} // Movimento mais orgânico
      className="fixed inset-0 z-[60] bg-white dark:bg-zinc-950 flex flex-col p-8"
    >
      {/* Header do Menu */}
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-blue-600" size={24} />
          <span className="text-xl font-black tracking-tighter uppercase">Seguro<span className="text-blue-600">CRM</span></span>
        </div>
        <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-full">
          <X size={24} />
        </button>
      </div>

      <div className="flex flex-col gap-6 text-3xl font-black uppercase tracking-tighter">
        <a href="#beneficios" onClick={() => setIsMenuOpen(false)} className="hover:text-blue-600 transition-colors">Benefícios</a>
        <a href="#site-integrado" onClick={() => setIsMenuOpen(false)} className="hover:text-blue-600 transition-colors">Site Premium</a>
        <a href="#precos" onClick={() => setIsMenuOpen(false)} className="hover:text-blue-600 transition-colors">Planos</a>
        
        <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-4" />
        
        <button 
          onClick={() => { setIsLoginOpen(true); setIsMenuOpen(false); }} 
          className="text-left text-zinc-500 hover:text-blue-600 transition-colors text-xl"
        >
          Entrar no Sistema
        </button>
        
        <button 
          onClick={() => { setIsFreeTrialModalOpen(true); setIsMenuOpen(false); }} 
          className="bg-blue-600 text-white p-6 rounded-[24px] text-center text-xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
        >
          CRIAR CONTA GRÁTIS
        </button>
      </div>
      
      {/* Rodapé do Menu Mobile */}
      <div className="mt-auto pb-8 text-center">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">© Seguro CRM 2026</p>
      </div>
    </motion.div>
  )}
</AnimatePresence>

{/* --- SESSÃO HERO REFATORADA: ELEGÂNCIA & IMPACTO --- */}
<section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-white pt-24 lg:pt-32">
  
  {/* BACKGROUND: VÍDEO SUTIL COM OVERLAY LIGHT */}
  <div className="absolute inset-0 z-0">
    <div className="absolute inset-0 bg-gradient-to-b from-white via-white/40 to-white z-10" />
    <video
      autoPlay
      loop
      muted
      playsInline
      key="hero-video"
      className="w-full h-full object-cover opacity-20"
    >
      <source src="https://www.apple.com/105/media/us/mac/family/2024/60787e91-496e-443b-a25e-3840742d99d1/anim/welcome/xlarge.mp4" type="video/mp4" />
    </video>
  </div>

  <div className="max-w-7xl mx-auto px-6 relative z-20 w-full">
    <div className="flex flex-col items-center text-center mb-16">
      
      {/* Badge Minimalista Estilo RD Station */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 shadow-sm"
      >
        <span className="text-blue-600 text-[12px] font-bold uppercase tracking-wider">
          O melhor CRM do Brasil para Corretores de Seguros!
        </span>
      </motion.div>

      {/* Título com Hierarquia Equilibrada */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-5xl"
      >
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[1.1] tracking-tight text-zinc-900 mb-8">
          Organização gera <br />
          <span className="text-blue-600 relative inline-block">
            vendas!
            <svg className="absolute -bottom-2 left-0 w-full h-3 text-blue-200 -z-10" viewBox="0 0 300 12" fill="none">
               <path d="M1 9.5C50 3.5 150 1.5 299 9.5" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
            </svg>
          </span>
        </h1>
      </motion.div>

      {/* Subtítulo com Respiro (Inspirado no Pipedrive) */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-lg md:text-xl text-zinc-500 max-w-2xl mb-12 leading-relaxed"
      >
        Abandone as planilhas. Centralize seus leads, apólices e renovações em uma plataforma <span className="text-zinc-900 font-semibold">elegante e intuitiva.</span>
      </motion.p>

      {/* CTAs Limpos */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
      >
        <button 
          onClick={() => setIsFreeTrialModalOpen(true)}
          className="px-10 py-5 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group"
        >
          Teste grátis agora 
          <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
        </button>
        <button 
          onClick={() => setIsFreeTrialModalOpen(true)}
          className="px-10 py-5 bg-white text-zinc-700 border border-zinc-200 rounded-xl font-bold text-lg hover:bg-zinc-50 transition-all active:scale-95"
        >
          Ver demonstração
        </button>
      </motion.div>
    </div>

    {/* DISPOSIÇÃO DE IMAGEM ESTILO PIPEDRIVE (Mockup flutuante com perspectiva) */}
    <motion.div 
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 1 }}
      className="relative max-w-6xl mx-auto group"
    >
      {/* Sombra de Profundidade */}
      <div className="absolute -inset-4 bg-gradient-to-b from-blue-100/50 to-transparent blur-3xl rounded-[50px] opacity-50" />
      
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] bg-white p-2">
        <img 
          src="/img/kanban.png" 
          alt="Interface do Sistema" 
          className="w-full h-auto rounded-xl" 
        />
      </div>

      {/* Floating Card (Detalhe Pipedrive) */}
      <motion.div 
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-6 top-1/4 hidden lg:block bg-white p-4 rounded-2xl shadow-xl border border-zinc-100 z-30"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
            <Check size={20} strokeWidth={3} />
          </div>
          <div className="text-left">
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">Status</p>
            <p className="text-sm text-zinc-900 font-black italic">Apólice Emitida!</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  </div>
</section>

{/* --- SESSÃO BENEFÍCIOS (ESTRUTURA BENTO GRID 2026) --- */}
<section id="beneficios" className="py-32 bg-white relative overflow-hidden">
  
  {/* Linha decorativa suave no topo */}
  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

  <div className="max-w-7xl mx-auto px-6">
    {/* Header da Sessão */}
    <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
      <div className="max-w-2xl">
        <motion.span 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-blue-600 font-bold tracking-[0.2em] uppercase text-xs mb-4 block"
        >
          Tecnologia de Ponta
        </motion.span>
        <h2 className="text-4xl lg:text-7xl font-black tracking-tighter text-zinc-900 leading-[0.9]">
          Feito para quem entende que <br />
          <span className="text-zinc-400 font-light">tempo é o seu maior ativo.</span>
        </h2>
      </div>
      <p className="text-zinc-500 font-medium max-w-xs text-lg leading-relaxed border-l-2 border-blue-600 pl-6">
        Desenvolvemos cada detalhe para resolver a dor de quem vende seguros todos os dias.
      </p>
    </div>

    {/* GRID BENTO ASSIMÉTRICA - O CORAÇÃO DO NOVO DESIGN */}
    <div className="grid grid-cols-1 md:grid-cols-6 auto-rows-[300px] gap-4">
      {beneficios.map((b, i) => (
        <motion.div
          key={b.id}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          viewport={{ once: true }}
          whileHover={{ y: -5 }}
          className={`
            relative group overflow-hidden rounded-[48px] p-10 flex flex-col justify-between transition-all duration-500
            col-span-1 ${b.size}
            ${b.theme === 'google' ? 'bg-[#4285F4] text-white' : 
              b.theme === 'dark' ? 'bg-zinc-900 text-white' : 
              b.theme === 'blue' ? 'bg-blue-600 text-white' : 
              'bg-zinc-50 border border-zinc-100 text-zinc-900 hover:bg-white hover:shadow-2xl hover:shadow-zinc-200/50'}
          `}
        >
          {/* Ícone gigante decorativo apenas nos cards grandes */}
          {b.size.includes('md:col-span-4') && (
            <div className="absolute right-[-5%] bottom-[-10%] opacity-10 text-white group-hover:scale-110 transition-transform duration-700 pointer-events-none">
              {cloneElement(b.icon as React.ReactElement<any>, { size: 380 })}
            </div>
          )}

          <div className="relative z-10 flex justify-between items-start">
            <div className={`
              w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500
              ${b.theme === 'google' ? 'bg-white shadow-lg' : 
                b.theme === 'dark' ? 'bg-zinc-800' : 
                b.theme === 'blue' ? 'bg-white/20' : 
                'bg-white shadow-sm'}
            `}>
              {cloneElement(b.icon as React.ReactElement<any>, { 
                size: 28, 
                className: b.theme === 'light' ? 'text-blue-600' : 
                          b.theme === 'google' ? 'text-[#4285F4]' : 'text-white' 
              })}
            </div>
            {b.tag && (
              <span className={`text-[10px] font-black px-4 py-1.5 rounded-full tracking-widest uppercase ${
                b.theme === 'google' ? 'bg-blue-700/30 text-white border border-white/20' : 'bg-blue-500 text-white'
              }`}>
                {b.tag}
              </span>
            )}
          </div>

          <div className="relative z-10">
            <h3 className={`font-black tracking-tighter leading-tight mb-4 ${b.size.includes('md:col-span-4') ? 'text-4xl' : 'text-2xl'}`}>
              {b.title}
            </h3>
            <p className={`font-medium leading-relaxed ${
              b.theme === 'light' ? 'text-zinc-500' : 'text-white/80'
            } ${b.size.includes('md:col-span-4') ? 'max-w-md text-lg' : 'text-sm'}`}>
              {b.desc}
            </p>
          </div>

          {/* Arrow link no topo direito */}
          <div className="absolute top-10 right-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight size={24} className={b.theme === 'light' ? 'text-blue-600' : 'text-white'} />
          </div>
        </motion.div>
      ))}
    </div>
  </div>
</section>

{/* --- SESSÃO SITE INTEGRADO: PREMIUM & CONECTADO --- */}
<section id="site-integrado" className="py-32 bg-white">
  <div className="max-w-7xl mx-auto px-6">
    <div className="relative bg-[#0A0A0B] rounded-[64px] p-8 lg:p-24 overflow-hidden shadow-[0_48px_100px_-20px_rgba(0,0,0,0.3)]">
      
      {/* Background Decorativo: Aurora Digital */}
      <div className="absolute top-0 right-0 w-full h-full">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-20 relative z-10">
        
        {/* TEXTO: FOCO EM AUTORIDADE */}
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
                Incluso em todos os planos
              </span>
            </div>
            
            <h2 className="text-5xl lg:text-7xl font-black tracking-tighter mb-8 leading-[0.85]">
              Sua vitrine <br /> 
              <span className="text-blue-500 italic">profissional.</span>
            </h2>

            <p className="text-zinc-400 text-xl mb-12 font-medium leading-relaxed max-w-lg">
              Não é apenas um site. É uma <span className="text-white">máquina de captura</span> que trabalha 24h por dia, totalmente conectada ao seu funil de vendas.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-14">
              {[
                { t: "Setup Instantâneo", d: "Ativo em até 24h" },
                { t: "SEO de Elite", d: "Google-friendly" },
                { t: "SSL Grátis", d: "Segurança total" },
                { t: "Conversão", d: "Foco em Leads" }
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-1 border-l border-white/10 pl-4">
                  <span className="text-white font-bold text-lg">{item.t}</span>
                  <span className="text-zinc-500 text-sm font-medium">{item.d}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setIsRegisterOpen(true)}
              className="group w-full sm:w-auto bg-blue-600 text-white px-10 py-6 rounded-[24px] font-black text-lg shadow-2xl shadow-blue-600/20 hover:bg-blue-500 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              GARANTIR MINHA PRESENÇA DIGITAL <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>

        {/* VISUAL: COMPOSIÇÃO MULTICAMADAS */}
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
                  suacorretora.com.br
                </div>
              </div>
              <img 
                src="img/kanban1.jpg" 
                alt="Site Corretor Moderno" 
                className="w-full h-auto rounded-b-[26px] grayscale hover:grayscale-0 transition-all duration-1000" 
              />
            </div>

            {/* Floating Card: O Lead chegando (Layer Superior) */}
            <motion.div 
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-10 -right-4 lg:-right-10 z-30 bg-white p-6 rounded-[32px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] border border-zinc-100 hidden md:block"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                  <Users size={28} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Novo Lead</p>
                  <p className="text-lg font-bold text-zinc-900 leading-none">Ricardo M. <span className="text-zinc-400 font-medium text-sm">· Seguro Auto</span></p>
                </div>
              </div>
            </motion.div>

            {/* Floating Card: A Notificação (Layer Inferior) */}
            <motion.div 
              animate={{ x: [0, 20, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-12 -left-4 lg:-left-20 z-20 bg-blue-600 text-white p-8 rounded-[32px] shadow-2xl hidden md:block"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Zap fill="white" size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest leading-none mb-1">Status do Site</p>
                  <p className="text-xl font-black">100% Online</p>
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
            "Criptografia SSL 256-bits", "LGPD Compliant", "Integração Google API", 
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
        className="text-blue-600 font-black uppercase text-[10px] tracking-[0.3em] mb-4 block"
      >
        Licenciamento Flexível
      </motion.span>
      <h2 className="text-5xl lg:text-7xl font-black text-zinc-900 tracking-tighter leading-none mb-6">
        O preço de um café <br />
        <span className="text-zinc-400">para escalar sua corretora.</span>
      </h2>
    </div>

    {/* CARDS DE ASSINATURA DO CRM */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[
        { p: "Mensal", v: "119,97", c: "69,97", best: false },
        { p: "Trimestral", v: "109,97", c: "59,97", best: false },
        { p: "Semestral", v: "99,97", c: "49,97", best: false },
        { p: "Anual", v: "79,97", c: "39,97", best: true },
      ].map((item, i) => (
        <motion.div
          key={i}
          whileHover={{ y: -8 }}
          className={`relative p-8 rounded-[40px] transition-all duration-500 ${
            item.best 
            ? 'bg-zinc-900 text-white shadow-2xl shadow-blue-900/20 scale-105 z-10' 
            : 'bg-white border border-zinc-200 text-zinc-900'
          }`}
        >
          {item.best && (
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black px-6 py-2 rounded-full tracking-widest uppercase">
              Economia Máxima
            </span>
          )}
          
          <p className={`font-black uppercase tracking-widest text-[11px] mb-8 ${item.best ? 'text-blue-400' : 'text-zinc-400'}`}>
            Plano {item.p}
          </p>
          
          <div className="mb-8">
            <span className="text-sm font-bold opacity-50">R$</span>
            <span className="text-6xl font-black tracking-tighter">{item.v.split(',')[0]}</span>
            <span className="text-xl font-bold">,{item.v.split(',')[1]}</span>
            <span className="text-sm font-medium opacity-50"> /mês</span>
          </div>

          <div className="space-y-4 mb-10">
            <div className={`flex justify-between text-xs font-bold py-4 border-b ${item.best ? 'border-white/10' : 'border-zinc-100'}`}>
              <span className="opacity-60 text-[10px] uppercase tracking-tight text-left">1 Acesso Master incluso</span>
              <Check size={14} className="text-blue-500" />
            </div>
            <div className={`flex justify-between text-xs font-bold py-4 border-b ${item.best ? 'border-white/10' : 'border-zinc-100'}`}>
              <span className="opacity-60 text-[10px] uppercase">Corretor Adicional</span>
              <span>R$ {item.c}</span>
            </div>
          </div>

          <button 
            onClick={() => setIsFreeTrialModalOpen(true)}
            className={`w-full py-5 rounded-2xl font-black text-sm transition-all ${
              item.best ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
            }`}
          >
            ASSINAR AGORA
          </button>
        </motion.div>
      ))}
    </div>

    {/* SEÇÃO DE ADD-ONS (SITE E MANYCHAT) */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      
      {/* ADD-ON 1: SITE INTEGRADO */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        className="p-8 rounded-[40px] bg-white border border-zinc-200 flex flex-col md:flex-row items-center gap-8 group hover:border-blue-500 transition-colors duration-500"
      >
        <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
          <Globe size={32} />
        </div>
        <div className="flex-grow text-center md:text-left">
          <h4 className="text-xl font-black text-zinc-900">Site Corretor Premium</h4>
          <p className="text-sm text-zinc-500 font-medium">Hospedagem, domínio e integração total.</p>
        </div>
        <div className="text-center px-6 border-l border-zinc-100">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Opcional e a partir de</p>
          <p className="text-2xl font-black text-zinc-900">R$ 150<span className="text-sm text-zinc-400">/mês</span></p>
        </div>
      </motion.div>

      {/* ADD-ON 2: MANYCHAT */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        className="p-8 rounded-[40px] bg-white border border-zinc-200 flex flex-col md:flex-row items-center gap-8 group hover:border-blue-500 transition-colors duration-500"
      >
        <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
          <BotMessageSquare size={32} />
        </div>
        <div className="flex-grow text-center md:text-left">
          <h4 className="text-xl font-black text-zinc-900">Gestão Manychat</h4>
          <p className="text-sm text-zinc-500 font-medium italic">Setup e automação de funil inclusos.</p>
        </div>
        <div className="text-center px-6 border-l border-zinc-100">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Opcional e a partir de</p>
          <p className="text-2xl font-black text-zinc-900">R$ 150<span className="text-sm text-zinc-400">/mês</span></p>
        </div>
      </motion.div>

    </div>

    {/* NOTA DE RODAPÉ DOS PREÇOS */}
    <div className="mt-8 flex justify-center">
      <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-full border border-zinc-100 shadow-sm">
        <Info size={14} className="text-blue-500" />
        <p className="text-[11px] font-medium text-zinc-400">
          Valores referentes apenas ao <b>SeguroCRM</b>. Ferramentas de terceiros (Manychat PRO, etc) são pagas separadamente.
        </p>
      </div>
    </div>

    {/* NOVO: MODAL DE CONVITE AO TESTE GRÁTIS */}
    <AnimatePresence>
      {isFreeTrialModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFreeTrialModalOpen(false)}
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white rounded-[48px] p-8 lg:p-12 max-w-lg w-full shadow-2xl text-center"
          >
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mx-auto mb-8">
              <Zap size={40} fill="currentColor" />
            </div>
            <h3 className="text-3xl font-black text-zinc-900 tracking-tighter mb-4">
              Experimente 7 dias <br/><span className="text-blue-600 text-2xl font-black">Totalmente Grátis</span>
            </h3>
            <p className="text-zinc-500 font-medium mb-10 leading-relaxed">
              Você terá acesso completo a todas as funcionalidades do SeguroCRM para validar sua operação. Sem compromisso.
            </p>
            
            <div className="space-y-3">
              <button 
                onClick={() => {
                  setIsFreeTrialModalOpen(false);
                  setIsRegisterOpen(true);
                }}
                className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20"
              >
                ATIVAR MEU TESTE GRÁTIS
              </button>
              <button 
                onClick={() => setIsFreeTrialModalOpen(false)}
                className="w-full bg-transparent text-zinc-400 py-2 rounded-2xl font-bold text-xs hover:text-zinc-600 transition-all uppercase tracking-widest"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
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

<AnimatePresence>
        {isLoginOpen && (
          <LoginModal 
            onClose={() => setIsLoginOpen(false)} 
            onSwitch={() => { setIsLoginOpen(false); setIsRegisterOpen(true); }} 
          />
        )}
        
        {isRegisterOpen && (
          <RegistroModal 
            onClose={() => setIsRegisterOpen(false)} 
            onSwitch={() => { setIsRegisterOpen(false); setIsLoginOpen(true); }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}



