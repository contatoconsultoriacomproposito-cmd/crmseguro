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
    { nome: "Carlos Mendes", cargo: "Mendes Seguros", texto: "O Kanban mudou o jogo. A transição das planilhas para o CRMSEGURO foi o melhor investimento do ano.", img: "https://i.pravatar.cc/100?u=1" },
    { nome: "Ana Paula Silva", cargo: "Silva & Associados", texto: "A central de parceiros me trouxe 30% mais leads no primeiro mês. Incrível!", img: "https://i.pravatar.cc/100?u=2" },
    { nome: "Ricardo Souza", cargo: "Souza Corretora", texto: "A busca por CNPJ economiza um tempo precioso da minha equipe de vendas.", img: "https://i.pravatar.cc/100?u=3" },
    { nome: "Juliana Lima", cargo: "Lima Seguros", texto: "O comparativo de propostas é lindo e profissional. Os clientes fecham muito mais rápido.", img: "https://i.pravatar.cc/100?u=4" },
    { nome: "Marcos Reus", cargo: "Reus Broker", texto: "Finalmente um CRM que entende que corretor precisa de histórico de sinistro fácil.", img: "https://i.pravatar.cc/100?u=5" },
    { nome: "Fernanda Costa", cargo: "Costa Seguros", texto: "A agenda de compromissos não me deixa esquecer nenhuma renovação. Nota 10.", img: "https://i.pravatar.cc/100?u=6" },
    { nome: "Paulo Bento", cargo: "Bento Riscos", texto: "Gestão de comissões impecável. Sei exatamente quanto vou receber no mês.", img: "https://i.pravatar.cc/100?u=7" },
    { nome: "Clara Luz", cargo: "Luz Corretora", texto: "O site integrado que eles fornecem é moderno e gera muita confiança para o segurado.", img: "https://i.pravatar.cc/100?u=8" },
    { nome: "Roberto Junior", cargo: "RJ Seguros", texto: "As automações de pós-venda garantiram minha taxa de retenção acima de 95%.", img: "https://i.pravatar.cc/100?u=9" },
    { nome: "Sofia Marinho", cargo: "Marinho Corretora", texto: "Interface limpa, rápida e intuitiva. Meus corretores amam usar o sistema.", img: "https://i.pravatar.cc/100?u=10" },
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
            <a href="#beneficios" className="hover:text-blue-600 transition-colors">Benefícios</a>
            <a href="#site-integrado" className="hover:text-blue-600 transition-colors">Site do Corretor</a>
            <a href="#precos" className="hover:text-blue-600 transition-colors">Planos</a>
            <button onClick={() => setIsLoginOpen(true)} className="px-4 py-2 hover:text-blue-600 transition-colors">Entrar</button>
            <button onClick={() => setIsRegisterOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-1 active:scale-95">
              Começar Agora
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

      {/* --- SESSÃO HERO --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <span className="inline-block px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
              O futuro da corretagem chegou
            </span>
            <h1 className="text-6xl lg:text-8xl font-black leading-[0.9] tracking-tighter mb-8">
              ORGANIZAÇÃO <br /> GERA <span className="text-blue-600 underline decoration-blue-200">VENDAS!</span>
            </h1>
            <p className="text-xl text-zinc-500 dark:text-zinc-400 mb-10 max-w-lg leading-relaxed font-medium">
              Pare de usar Planilhas ou CRMs genéricos. Tenha uma ferramenta 100% pensada para o dia a dia do corretor de seguros.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => setIsRegisterOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-2xl font-black text-lg shadow-2xl shadow-blue-500/40 flex items-center justify-center gap-3 transition-all hover:scale-105">
                Experimente Grátis <ArrowRight />
              </button>
              <a href="#beneficios" className="px-10 py-5 rounded-2xl font-black text-lg border-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all">
                Ver Funcionalidades
              </a>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotate: 5 }} 
            animate={{ opacity: 1, scale: 1, rotate: 2 }} 
            transition={{ duration: 1 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-blue-600/20 blur-[100px] rounded-full" />
            <div className="relative bg-white dark:bg-zinc-900 p-2 rounded-[40px] shadow-2xl border border-zinc-200 dark:border-zinc-800">
              <img src="/img/kanban.png" alt="Dashboard" className="rounded-[32px] w-full opacity-90 hover:opacity-100 transition-opacity" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- SESSÃO BENEFÍCIOS --- */}
      <section id="beneficios" className="py-24 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter mb-6 uppercase">Por que gerenciar meus clientes e vendas por um CRM?</h2>
            <p className="text-zinc-500 font-medium">Desenvolvemos cada detalhe para resolver a dor de quem vende seguros todos os dias.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {beneficios.map((b, i) => (
              <motion.div 
                key={i} 
                whileHover={{ y: -10 }}
                className="p-8 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-none"
              >
                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                  {b.icon}
                </div>
                <h3 className="text-xl font-black mb-3">{b.title}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- SESSÃO SITE INTEGRADO --- */}
      <section id="site-integrado" className="py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-blue-600 rounded-[48px] p-8 lg:p-20 flex flex-col lg:flex-row items-center gap-16 relative">
            <div className="lg:w-1/2 text-white z-10">
              <h2 className="text-4xl lg:text-6xl font-black tracking-tighter mb-8 leading-tight">
                Seu site profissional <br /> incluso no plano.
              </h2>
              <p className="text-blue-100 text-lg mb-10 font-medium opacity-90">
                Não gaste fortunas com agências. Ao assinar o SeguroCRM, você ganha um site moderno para sua corretora, totalmente integrado ao sistema. Captou um lead no site? Ele cai direto no seu Kanban!
              </p>
              <ul className="space-y-4 mb-10">
                {["Hospedagem inclusa", "Design Responsivo", "Captura de leads automática", "Domínio personalizado"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 font-bold">
                    <div className="p-1 bg-white/20 rounded-full"><Check size={16} /></div> {item}
                  </li>
                ))}
              </ul>
              <button onClick={() => setIsRegisterOpen(true)} className="bg-white text-blue-600 px-10 py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-zinc-100 transition-all">
                Garantir meu site agora
              </button>
            </div>
            <div className="lg:w-1/2 relative">
               <div className="bg-white dark:bg-zinc-900 p-4 rounded-[32px] shadow-2xl rotate-3">
                 <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800" alt="Site Corretor" className="rounded-2xl" />
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SESSÃO CLIENTES (LOGOS) --- */}
      <section className="py-24 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
             <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-12">Corretoras que confiam e escalam</h2>
             <div className="grid grid-cols-2 md:grid-cols-5 gap-8 opacity-40 grayscale hover:grayscale-0 transition-all">
                {Array.from({length: 15}).map((_, i) => (
                  <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center p-4">
                    <span className="font-black text-zinc-400 italic">Corretora {i + 1}</span>
                  </div>
                ))}
             </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mt-20">
            <div className="bg-zinc-50 dark:bg-zinc-900 p-12 rounded-[40px] text-center border border-zinc-100 dark:border-zinc-800">
              <p className="text-5xl font-black text-blue-600 mb-2">30.000+</p>
              <p className="font-bold text-zinc-500 uppercase text-xs tracking-widest">Propostas Cadastradas em nosso CRM</p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-900 p-12 rounded-[40px] text-center border border-zinc-100 dark:border-zinc-800">
              <p className="text-5xl font-black text-blue-600 mb-2">R$ 80 Mi+</p>
              <p className="font-bold text-zinc-500 uppercase text-xs tracking-widest">Em volume de vendas gerenciados por nós</p>
            </div>
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
                <span className="text-[10px] font-black uppercase tracking-widest text-green-500">WhatsApp Suporte</span>
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