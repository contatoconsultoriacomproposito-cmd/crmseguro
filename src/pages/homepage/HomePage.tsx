import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, Check, MessageCircle, Menu, X, 
  Star, ChevronLeft, ChevronRight, 
  LayoutDashboard, Calendar, Users, Zap, 
  FileSpreadsheet, BarChart3, Clock, Wallet, 
  ArrowRight, Instagram, Facebook, MapPin
} from "lucide-react";

import LoginModal from "../../components/homepage/LoginModal";
import RegistroModal from "../../components/homepage/RegistroModal";

export default function HomePage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
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
    { icon: <LayoutDashboard />, title: "Dashboard em Tempo Real", desc: "Visão 360º da corretora ou filtros por corretor para análise individual de performance." },
    { icon: <Calendar />, title: "Agenda Inteligente", desc: "Notificações de compromissos diários: vendas, renovações ou assistência de sinistros." },
    { icon: <Users />, title: "Central de Parceiros", desc: "Link exclusivo integrado para indicações qualificadas que alimentam seu funil automaticamente." },
    { icon: <Zap />, title: "Cadastro Ultra Rápido", desc: "Puxa dados automaticamente via CNPJ (Receita) ou CEP. Digite e o sistema faz o resto." },
    { icon: <FileSpreadsheet />, title: "Comparativo de Propostas", desc: "Gere comparativos entre múltiplas seguradoras em segundos e envie para o cliente." },
    { icon: <BarChart3 />, title: "Kanban Avançado", desc: "Funil de vendas visual e inteligente para garantir que nenhuma oportunidade esfrie." },
    { icon: <Clock />, title: "Cards Enriquecidos", desc: "Histórico completo: mensagens, propostas, produtos, sinistros e comissões num só lugar." },
    { icon: <ShieldCheck />, title: "Gestão de Sinistros", desc: "Acompanhamento rigoroso de eventos para fidelizar o cliente no momento que ele mais precisa." },
    { icon: <Wallet />, title: "Controle de Comissões", desc: "Gestão financeira transparente do que você recebe e do que paga aos seus parceiros." },
    { icon: <Zap />, title: "Produtos e Seguradoras", desc: "Catálogo inteligente para não perder tempo procurando condições comerciais em portais externos." },
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

      {/* --- MENU MOBILE (Simples) --- */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed inset-0 z-[60] bg-white dark:bg-zinc-950 flex flex-col p-8">
            <button onClick={() => setIsMenuOpen(false)} className="self-end p-2"><X size={32} /></button>
            <div className="flex flex-col gap-8 mt-12 text-2xl font-black uppercase">
              <a href="#beneficios" onClick={() => setIsMenuOpen(false)}>Benefícios</a>
              <a href="#precos" onClick={() => setIsMenuOpen(false)}>Preços</a>
              <button onClick={() => { setIsLoginOpen(true); setIsMenuOpen(false); }} className="text-left text-blue-600">Entrar</button>
              <button onClick={() => { setIsRegisterOpen(true); setIsMenuOpen(false); }} className="bg-blue-600 text-white p-6 rounded-2xl text-center">Registrar</button>
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
          O CRM feito por e para corretores
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
            vendas reais.
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
          onClick={() => setIsRegisterOpen(true)}
          className="px-10 py-5 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group"
        >
          Teste grátis agora 
          <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
        </button>
        <button className="px-10 py-5 bg-white text-zinc-700 border border-zinc-200 rounded-xl font-bold text-lg hover:bg-zinc-50 transition-all">
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

{/* --- SESSÃO BENEFÍCIOS REFINADA --- */}
<section id="beneficios" className="py-32 bg-white relative overflow-hidden">
  
  {/* Detalhe de fundo sutil */}
  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

  <div className="max-w-7xl mx-auto px-6">
    <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
      <div className="max-w-2xl">
        <motion.span 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-blue-600 font-bold tracking-[0.2em] uppercase text-xs mb-4 block"
        >
          Alta Performance
        </motion.span>
        <h2 className="text-4xl lg:text-6xl font-black tracking-tight text-zinc-900 leading-[1.1]">
          Feito para quem entende que <br />
          <span className="text-zinc-400">tempo é o seu maior ativo.</span>
        </h2>
      </div>
      <p className="text-zinc-500 font-medium max-w-xs text-lg leading-relaxed border-l-2 border-blue-600 pl-6">
        Desenvolvemos cada detalhe para resolver a dor de quem vende seguros todos os dias.
      </p>
    </div>

    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {beneficios.map((b, i) => (
        <motion.div 
          key={i} 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          viewport={{ once: true }}
          whileHover={{ y: -8, transition: { duration: 0.2 } }}
          className="group p-10 bg-zinc-50 hover:bg-white rounded-[40px] border border-zinc-100 hover:border-blue-100 transition-all duration-300 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)]"
        >
          {/* Ícone com Container Minimalista */}
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-500 border border-zinc-100 group-hover:border-blue-50">
            <div className="text-blue-600 w-8 h-8 group-hover:animate-pulse">
              {b.icon}
            </div>
          </div>

          <h3 className="text-2xl font-black text-zinc-900 mb-4 tracking-tight leading-none">
            {b.title}
          </h3>
          
          <p className="text-zinc-500 text-base leading-relaxed font-medium">
            {b.desc}
          </p>

          {/* Indicador visual de hover sutil */}
          <div className="mt-8 flex items-center gap-2 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold text-sm">
            Saiba mais <ArrowRight size={16} />
          </div>
        </motion.div>
      ))}
    </div>
  </div>
</section>

      {/* --- SESSÃO SITE INTEGRADO: PREMIMUM & CONECTADO --- */}
<section id="site-integrado" className="py-32 overflow-hidden bg-white">
  <div className="max-w-7xl mx-auto px-6">
    <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[60px] p-8 lg:p-24 overflow-hidden shadow-[0_40px_100px_-20px_rgba(37,99,235,0.35)]">
      
      {/* Elementos decorativos de fundo */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 skew-x-12 translate-x-32" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-400/20 blur-[100px] rounded-full" />

      <div className="flex flex-col lg:flex-row items-center gap-20 relative z-10">
        
        {/* TEXTO: FOCO EM CONVERSÃO */}
        <div className="lg:w-5/12 text-white">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-4 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-[0.3em] mb-6">
              Incluso em todos os planos
            </span>
            
            <h2 className="text-4xl lg:text-6xl font-black tracking-tight mb-8 leading-[1.1]">
              Sua corretora <br /> 
              <span className="text-blue-200">online em 24h.</span>
            </h2>

            <p className="text-blue-50 text-xl mb-12 font-medium leading-relaxed opacity-90">
              Não gaste fortunas com agências. Tenha um site moderno, rápido e <span className="text-white font-black italic">totalmente integrado</span> ao seu novo CRM.
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4 mb-14">
              {["Hospedagem Inclusa", "Design Responsivo", "Leads Automáticos", "Domínio Próprio"].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-bold tracking-tight">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-400/30 rounded-full flex items-center justify-center border border-white/20">
                    <Check size={14} strokeWidth={4} />
                  </div>
                  {item}
                </li>
              ))}
            </ul>

            <button 
              onClick={() => setIsRegisterOpen(true)}
              className="group w-full sm:w-auto bg-white text-blue-700 px-12 py-6 rounded-[20px] font-black text-lg shadow-2xl shadow-black/10 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              GARANTIR MEU SITE <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>

        {/* VISUAL: COMPOSIÇÃO ESTILO PIPEDRIVE */}
        <div className="lg:w-7/12 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: 5 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            {/* Mockup de Navegador (Site) */}
            <div className="relative z-20 bg-white p-2 rounded-[24px] shadow-2xl border border-white/10 overflow-hidden transform lg:translate-x-10">
              <div className="bg-zinc-100 px-4 py-3 border-b border-zinc-200 flex gap-2 items-center">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                </div>
                <div className="mx-auto bg-white rounded-md text-[10px] text-zinc-400 px-10 py-1 font-medium italic border border-zinc-200">
                  suacorretora.com.br
                </div>
              </div>
              <img 
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800" 
                alt="Site Corretor" 
                className="w-full h-auto" 
              />
            </div>

            {/* Elemento de Interface do CRM (Sobreposto) */}
            <motion.div 
              animate={{ x: [0, -15, 0], y: [0, 10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-10 -left-10 lg:-left-20 z-30 bg-zinc-900 text-white p-6 rounded-[24px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border border-zinc-800 hidden md:block"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                  <Zap fill="white" size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Integração Ativa</p>
                  <p className="text-base font-bold">Novo Lead via Site!</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

      </div>
    </div>
  </div>
</section>

      {/* --- SESSÃO PROVA SOCIAL & STATS --- */}
<section className="py-32 bg-white overflow-hidden">
  <div className="max-w-7xl mx-auto px-6">
    
    {/* Título de Autoridade */}
    <div className="text-center mb-16">
      <motion.span 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className="text-zinc-400 text-[11px] font-black uppercase tracking-[0.4em] block mb-4"
      >
        Confiabilidade Comprovada
      </motion.span>
      <h2 className="text-3xl font-black text-zinc-900 tracking-tight">
        Corretoras que escalam com o SeguroCRM
      </h2>
    </div>

    {/* CARROSSEL INFINITO DE LOGOS (Estilo Tech Moderno) */}
    <div className="relative group">
      {/* Máscaras de Gradiente para o efeito de "sumir" nas pontas */}
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

      <div className="flex overflow-hidden gap-12 select-none py-4">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="flex flex-none gap-12 items-center"
        >
          {/* Substitua os spans pelas suas tags <img> */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="w-[160px] h-12 flex items-center justify-center opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
               <img 
                 src={`/logos/cliente-${i + 1}.png`} 
                 alt="Logo Parceiro" 
                 className="max-w-full max-h-full object-contain filter contrast-[0.8]" 
               />
            </div>
          ))}
        </motion.div>
        
        {/* Duplicata para o loop infinito */}
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="flex flex-none gap-12 items-center"
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={`dup-${i}`} className="w-[160px] h-12 flex items-center justify-center opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
               <img src={`/logos/cliente-${i + 1}.png`} alt="Logo Parceiro" className="max-w-full max-h-full object-contain filter contrast-[0.8]" />
            </div>
          ))}
        </motion.div>
      </div>
    </div>

    {/* GRID DE STATS: CLEAN & BOLD (Refatorado para 3 colunas) */}
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-24">
      {/* CARD 1: PROPOSTAS */}
      <motion.div 
        whileHover={{ y: -5 }}
        className="relative group p-10 rounded-[40px] bg-zinc-50 border border-zinc-100 overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
          <Zap size={100} strokeWidth={3} />
        </div>
        <div className="relative z-10">
          <p className="text-5xl lg:text-6xl font-black text-blue-600 mb-4 tracking-tighter">30k+</p>
          <div className="h-1.5 w-10 bg-blue-600 mb-6 rounded-full" />
          <p className="font-bold text-zinc-900 uppercase text-[10px] tracking-[0.2em] leading-relaxed">
            Propostas Cadastradas <br /> <span className="text-zinc-400">em nosso ecossistema</span>
          </p>
        </div>
      </motion.div>

      {/* CARD 2: VOLUME DE VENDAS */}
      <motion.div 
        whileHover={{ y: -5 }}
        className="relative group p-10 rounded-[40px] bg-zinc-50 border border-zinc-100 overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
          <Check size={100} strokeWidth={3} />
        </div>
        <div className="relative z-10">
          <p className="text-5xl lg:text-6xl font-black text-blue-600 mb-4 tracking-tighter">R$ 80M</p>
          <div className="h-1.5 w-10 bg-blue-600 mb-6 rounded-full" />
          <p className="font-bold text-zinc-900 uppercase text-[10px] tracking-[0.2em] leading-relaxed">
            Volume de Vendas <br /> <span className="text-zinc-400">gerenciados anualmente</span>
          </p>
        </div>
      </motion.div>

      {/* NOVO CARD 3: CORRETORES & PARCEIROS */}
      <motion.div 
        whileHover={{ y: -5 }}
        className="relative group p-10 rounded-[40px] bg-zinc-50 border border-zinc-100 overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
          <Users size={100} strokeWidth={3} />
        </div>
        <div className="relative z-10">
          <p className="text-5xl lg:text-6xl font-black text-blue-600 mb-4 tracking-tighter">300+</p>
          <div className="h-1.5 w-10 bg-blue-600 mb-6 rounded-full" />
          <p className="font-bold text-zinc-900 uppercase text-[10px] tracking-[0.2em] leading-relaxed">
            Corretores ativos <br /> <span className="text-zinc-400">e parceiros cadastrados</span>
          </p>
        </div>
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

      {/* --- SESSÃO PLANOS --- */}
      <section id="precos" className="py-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl lg:text-5xl font-black tracking-tighter mb-4 uppercase">Invista no seu crescimento</h2>
          <p className="text-zinc-500 mb-16 font-medium">Escolha o plano que melhor se adapta à sua estrutura.</p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <PrecoCard periodo="Mensal" valor="119,97" extra="Adicional Corretor: R$ 69,97" info="Site: R$ 300,00/mês" />
            <PrecoCard periodo="Trimestral" valor="109,97" extra="Adicional Corretor: R$ 59,97" info="Site: R$ 250,00/mês" />
            <PrecoCard periodo="Semestral" valor="99,97" extra="Adicional Corretor: R$ 49,97" info="Site: R$ 200,00/mês" />
            <PrecoCard periodo="Anual" valor="79,97" extra="Adicional Corretor: R$ 39,97" info="Site: R$ 150,00/mês" destaque />
          </div>
        </div>
      </section>

      {/* --- RODAPÉ --- */}
      <footer className="bg-zinc-950 text-white pt-24 pb-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-4 gap-12 mb-20">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><ShieldCheck size={18} /></div>
                <span className="text-xl font-black uppercase tracking-tighter">Seguro<span className="text-blue-600">CRM</span></span>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed">A tecnologia que transforma corretoras comuns em máquinas de vendas organizadas.</p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-blue-600 transition-all"><Instagram size={18}/></a>
                <a href="#" className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-blue-600 transition-all"><Facebook size={18}/></a>
              </div>
            </div>

            <div>
              <h4 className="font-black uppercase text-xs tracking-widest mb-8 text-blue-600">Mapa do Site</h4>
              <ul className="space-y-4 text-sm text-zinc-500">
                <li><a href="#beneficios" className="hover:text-white transition-all">Benefícios</a></li>
                <li><a href="#precos" className="hover:text-white transition-all">Planos e Preços</a></li>
                <li><a href="/termos" className="hover:text-white transition-all">Termos de Uso</a></li>
                <li><a href="/privacidade" className="hover:text-white transition-all">Política de Privacidade</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-black uppercase text-xs tracking-widest mb-8 text-blue-600">Localização</h4>
              <p className="text-sm text-zinc-500 flex items-center gap-2 italic"><MapPin size={16}/> Santa Catarina, Brasil</p>
            </div>

            <div>
              <h4 className="font-black uppercase text-xs tracking-widest mb-8 text-blue-600">Fale Conosco</h4>
              <a href="https://wa.me/5548996461645" className="bg-zinc-900 p-6 rounded-2xl flex flex-col gap-2 hover:bg-zinc-800 transition-all group">
                <span className="text-[10px] font-black uppercase tracking-widest text-green-500">WhatsApp Comercial</span>
                <span className="text-lg font-bold group-hover:text-blue-600 transition-colors">(48) 99646-1645</span>
              </a>
            </div>
          </div>
          <div className="text-center pt-12 border-t border-white/5 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em]">
            © Seguro CRM 2026 - Todos os direitos reservados
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {isLoginOpen && <LoginModal onClose={() => setIsLoginOpen(false)} onSwitch={() => {setIsLoginOpen(false); setIsRegisterOpen(true)}} />}
        {isRegisterOpen && <RegistroModal onClose={() => setIsRegisterOpen(false)} onSwitch={() => {setIsRegisterOpen(false); setIsLoginOpen(true)}} />}
      </AnimatePresence>
    </div>
  );
}

// --- SUBCOMPONENTES ---

function PrecoCard({ periodo, valor, extra, info, destaque = false }: any) {
  return (
    <div className={`p-10 rounded-[48px] border-2 transition-all flex flex-col relative ${destaque ? 'bg-blue-600 border-blue-600 text-white scale-105 shadow-2xl z-10' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-blue-500/50'}`}>
      {destaque && <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-blue-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Recomendado</span>}
      <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-6 ${destaque ? 'text-blue-100' : 'text-zinc-400'}`}>{periodo}</p>
      <div className="flex items-baseline gap-1 justify-center mb-2">
        <span className="text-5xl font-black tracking-tighter">R$ {valor.split(',')[0]}</span>
        <span className="text-xl font-bold">,{valor.split(',')[1]}</span>
      </div>
      <p className={`text-[10px] font-black uppercase mb-8 ${destaque ? 'text-blue-200' : 'text-blue-600'}`}>{extra}</p>
      
      <div className="space-y-4 mb-10 flex-grow">
        <div className="flex items-center gap-3 text-xs font-bold">
          <Check size={16} className={destaque ? 'text-white' : 'text-blue-600'} /> <span>Site Incluso ({info})</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold opacity-60">
          <Check size={16} /> <span>Todas as Funcionalidades</span>
        </div>
      </div>

      <button onClick={() => window.open('https://wa.me/5548996461645')} className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${destaque ? 'bg-white text-blue-600 hover:bg-zinc-100' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-500/20'}`}>
        Assinar Agora
      </button>
    </div>
  );
}