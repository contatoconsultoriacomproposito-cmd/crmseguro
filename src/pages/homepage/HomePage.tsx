import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ShieldCheck, Check, MessageCircle, Menu, X, 
  Star, ChevronLeft, ChevronRight, Quote 
} from "lucide-react"

// Componentes internos
import LoginModal from "../../components/homepage/LoginModal"
import RegistroModal from "../../components/homepage/RegistroModal"

export default function HomePage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 340; 
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const depoimentos = [
    { nome: "Carlos Mendes", cargo: "Mendes Seguros", texto: "O Kanban mudou o jogo. Não perdemos mais nenhum lead e a conversão disparou!", img: "https://i.pravatar.cc/100?u=carlos" },
    { nome: "Ana Paula Silva", cargo: "Silva & Associados", texto: "Gestão de sinistros na nuvem é fantástica. Equipe muito mais produtiva.", img: "https://i.pravatar.cc/100?u=ana" },
    { nome: "Ricardo Souza", cargo: "Souza Corretora", texto: "Interface intuitiva. Meus corretores aprenderam a usar em minutos.", img: "https://i.pravatar.cc/100?u=ricardo" },
    { nome: "Juliana Lima", cargo: "Lima Seguros", texto: "O suporte é impecável e as automações economizam horas de trabalho.", img: "https://i.pravatar.cc/100?u=ju" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 dark:from-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      
      {/* --- NAVBAR --- */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? "bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md py-4 shadow-md" : "bg-transparent py-6"}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:rotate-6 transition-transform">
              <ShieldCheck className="text-white" size={24} />
            </div>
            <span className="text-xl font-black tracking-tighter">CRM<span className="text-blue-600">SEGURO</span></span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold">
            <a href="#funcionalidades" className="hover:text-blue-600 transition-colors">Funcionalidades</a>
            <a href="#depoimentos" className="hover:text-blue-600 transition-colors">Depoimentos</a>
            <a href="#precos" className="hover:text-blue-600 transition-colors">Planos</a>
            <button onClick={() => setIsLoginOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full shadow-lg shadow-blue-500/25 transition-all active:scale-95">Entrar</button>
            <button onClick={() => setIsRegisterOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full shadow-lg shadow-blue-500/25 transition-all active:scale-95">
              Começar Grátis
            </button>
          </div>

          <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* --- MENU MOBILE --- */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 left-0 w-full h-screen bg-white dark:bg-zinc-950 z-[60] flex flex-col items-center justify-center space-y-8 md:hidden"
          >
            <button className="absolute top-6 right-6 p-2" onClick={() => setIsMenuOpen(false)}>
              <X size={28} />
            </button>
            <a href="#funcionalidades" onClick={() => setIsMenuOpen(false)} className="text-2xl font-bold">Funcionalidades</a>
            <a href="#depoimentos" onClick={() => setIsMenuOpen(false)} className="text-2xl font-bold">Depoimentos</a>
            <button onClick={() => { setIsLoginOpen(true); setIsMenuOpen(false); }} className="bg-blue-600 text-white px-8 py-3 rounded-full shadow-lg">Entrar</button>
            <button onClick={() => { setIsRegisterOpen(true); setIsMenuOpen(false); }} className="bg-blue-600 text-white px-8 py-3 rounded-full shadow-lg">Começar Grátis</button>
          </motion.div>
        )}
      </AnimatePresence>

     <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      transition={{ duration: 0.8, delay: 0.2 }} 
      className="relative"
    >
      {/* Moldura Principal do Dashboard */}
      <div className="relative z-10 bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl border border-zinc-200 dark:border-zinc-800 p-2 transform lg:rotate-2 hover:rotate-0 transition-all duration-700 overflow-hidden">
        <img 
          src="/img/kanban.png"
          alt="Dashboard CRMSEGURO" 
          className="rounded-[24px] w-full h-auto min-h-[300px] bg-zinc-100 dark:bg-zinc-800 object-cover" 
        />
      </div>

  {/* Card Flutuante 1: Notificação de Venda */}
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-6 -right-6 z-20 bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-700 hidden sm:flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/20">
            <Check size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-tight">Nova Apólice</p>
            <p className="text-sm font-bold text-zinc-900 dark:text-white">R$ 2.450,00</p>
          </div>
        </motion.div>

        {/* Card Flutuante 2: Performance */}
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-10 -left-10 z-20 bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-700 hidden sm:flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
            <Star size={18} fill="currentColor" />
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-tight">Taxa de Conversão</p>
            <p className="text-sm font-bold text-zinc-900 dark:text-white">+24% este mês</p>
          </div>
        </motion.div>

        {/* Brilho de fundo (Glow) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] rounded-full -z-10" />
      </motion.div>

      {/* --- SEÇÃO DEPOIMENTOS (REFATORADA) --- */}
      <section id="depoimentos" className="py-24 bg-blue-600 dark:bg-blue-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="text-left">
              <h2 className="text-4xl font-black mb-4 tracking-tight leading-tight">Quem usa, comprova.</h2>
              <p className="text-blue-100 text-lg opacity-80">Histórias reais de corretores que escalaram com o CRMSEGURO.</p>
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => scroll('left')} className="p-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all active:scale-90">
                <ChevronLeft size={24} />
              </button>
              <button onClick={() => scroll('right')} className="p-4 rounded-full bg-white text-blue-600 hover:bg-zinc-100 transition-all active:scale-90 shadow-xl">
                <ChevronRight size={24} />
              </button>
            </div>
          </div>

          <div className="relative">
            <div 
              ref={scrollRef}
              className="flex overflow-x-auto snap-x snap-mandatory space-x-6 scrollbar-hide pb-8 px-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {depoimentos.map((item, index) => (
                <div key={index} className="snap-center min-w-[320px] max-w-[320px] bg-white dark:bg-zinc-800 rounded-[24px] p-6 shadow-2xl flex-shrink-0 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-0.5 text-yellow-500">
                        {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                      </div>
                      <Quote className="text-blue-50 dark:text-zinc-700" size={32} />
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-300 mb-6 text-sm font-medium leading-relaxed italic">
                      "{item.texto}"
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-700">
                    <img src={item.img} alt={item.nome} className="w-11 h-11 rounded-full object-cover ring-2 ring-blue-500/20" />
                    <div className="overflow-hidden">
                      <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">{item.nome}</p>
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-black tracking-widest truncate">{item.cargo}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Gradientes laterais para profundidade */}
            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-blue-600 dark:from-blue-900 to-transparent pointer-events-none z-10 hidden md:block" />
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-blue-600 dark:from-blue-900 to-transparent pointer-events-none z-10 hidden md:block" />
          </div>
        </div>
        {/* Elemento decorativo de fundo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      </section>

      {/* --- SEÇÃO PLANOS --- */}
      <section id="precos" className="py-24 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-black mb-4">Invista no seu crescimento</h2>
          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto mt-12">
            <PrecoCard periodo="Mensal" valor="89,90" info="Liberdade total" />
            <PrecoCard periodo="3 Meses" valor="69,90" info="Economia de 22%" />
            <PrecoCard periodo="6 Meses" valor="59,90" info="Economia de 33%" />
            <PrecoCard periodo="12 Meses" valor="49,90" info="Melhor oferta" destaque />
          </div>
        </div>
      </section>

      {/* --- CTA FINAL --- */}
      <section className="py-20 bg-zinc-900 text-white rounded-[48px] mx-6 mb-12 text-center relative overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto px-6">
          <h2 className="text-4xl font-black mb-6">Pronto para transformar sua corretora?</h2>
          <a href="https://wa.me/5548996536507" target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-xl hover:scale-105 transition-all">
            <MessageCircle /> Chamar no WhatsApp
          </a>
        </div>
      </section>

      <AnimatePresence>
        {isLoginOpen && <LoginModal onClose={() => setIsLoginOpen(false)} onSwitch={() => {setIsLoginOpen(false); setIsRegisterOpen(true)}} />}
        {isRegisterOpen && <RegistroModal onClose={() => setIsRegisterOpen(false)} onSwitch={() => {setIsRegisterOpen(false); setIsLoginOpen(true)}} />}
      </AnimatePresence>
    </div>
  )
}

function PrecoCard({ periodo, valor, info, destaque = false }: any) {
  return (
    <div className={`p-8 rounded-[40px] border-2 transition-all flex flex-col ${destaque ? 'bg-blue-600 border-blue-600 text-white scale-105 shadow-2xl z-10' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800'}`}>
      <p className={`text-[10px] font-black uppercase tracking-widest mb-4 ${destaque ? 'text-blue-200' : 'text-zinc-400'}`}>{periodo}</p>
      <div className="flex items-baseline gap-1 justify-center">
        <span className="text-4xl font-black tracking-tighter">R$ {valor.split(',')[0]}</span>
        <span className="text-lg font-bold">,{valor.split(',')[1]}</span>
      </div>
      <p className="text-[11px] font-bold mt-2 mb-8 opacity-70 uppercase tracking-tighter">{info}</p>
      <div className="space-y-3 mb-8 flex-grow text-left">
        <CheckItem text="Kanban de Vendas" destaque={destaque} />
        <CheckItem text="Gestão de Sinistros" destaque={destaque} />
        <CheckItem text="RLS Inteligente" destaque={destaque} />
      </div>
      <button className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${destaque ? 'bg-white text-blue-600 shadow-xl' : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'}`}>
        Selecionar
      </button>
    </div>
  )
}

function CheckItem({ text, destaque }: any) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-bold">
      <Check size={14} className={destaque ? 'text-blue-200' : 'text-blue-600'} />
      <span className={destaque ? 'text-blue-50' : 'text-zinc-500'}>{text}</span>
    </div>
  )
}