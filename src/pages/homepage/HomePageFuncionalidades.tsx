import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, ChevronDown, ChevronRight, Globe2, MessageCircle,
 Users, BriefcaseBusiness, Wallet, Settings2, Headphones, FolderOpen, ShieldCheck, RefreshCw } from "lucide-react";
import hero from "./img/hero-ecossistema.png";
import site from "./img/site-integrado.png";
import whatsapp from "./img/atendimento-whatsapp.png";
import clientes from "./img/clientes-360.png";
import propostas from "./img/propostas-renovacoes.png";
import financeiro from "./img/financeiro-comissoes.png";
import armazenamento from "./img/armazenamento-documentos.png";
import sinistros from "./img/sinistros-assistencias.png";
import equipe from "./img/gestao-equipe.png";

const reveal = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.08 }, transition: { duration: 0.45 } };
const wrap = "mx-auto max-w-7xl px-5 sm:px-6";

type Modulo = { nome: string; resumo: string; itens: string[] };
type Grupo = { id: string; nome: string; resumo: string; icon: ReactNode; modulos: Modulo[] };

const grupos: Grupo[] = [
  { id:"atendimento", nome:"Atendimento", resumo:"Do contato sincronizado à gestão completa da conversa.",icon:<MessageCircle size={19}/>,modulos:[
    {nome:"Contatos",resumo:"Sua base começa no WhatsApp e continua no CRM.",itens:[
      "Sincronização dos contatos do WhatsApp, com importação direta para a base de contatos do CRM.",
    ]},
    {nome:"Conversas",resumo:"Uma única conversa pode movimentar toda a corretora.",itens:[
      "WhatsApp integrado ao CRM, permitindo que múltiplos atendentes trabalhem com o mesmo número.",
      "Visualização de conversas em lista, por agenda de compromissos ou em Kanban.",
      "Filtros interativos para localizar, segmentar e acompanhar atendimentos.",
      "Criação de compromissos diretamente na interface de conversas.",
      "Distribuição das conversas entre os corretores e atendentes responsáveis.",
      "Anexos e documentos facilmente acessíveis durante o atendimento.",
      "Ligações pelo WhatsApp diretamente no CRM, com histórico e gravações associados à conversa.",
      "Encerramento e reabertura de conversas quando necessário.",
      "Painel lateral com visão 360° do cliente: cadastro, propostas, contratos, financeiro, comissões, assistências e sinistros na mesma tela.",
      "Criação de tarefas sem abandonar a conversa.",
      "Qualificação do cliente durante o atendimento.",
      "Classificação da temperatura da conversa: quente, morna ou fria.",
      "Movimentação do cliente pelas etapas do atendimento conforme a negociação evolui.",
      "Visualização dos produtos de interesse do cliente na própria conversa.",
      "Anotações particulares visíveis somente ao usuário autorizado.",
      "Envio de imagens, vídeos, áudios e documentos.",
      "Respostas rápidas para agilizar interações frequentes.",
      "Reações, encaminhamento, exclusão de mensagens e outros recursos de comunicação.",
    ]},
    {nome:"Agenda",resumo:"Oportunidades não podem depender da memória.",itens:[
      "Criação e acompanhamento de compromissos e retornos comerciais.",
      "Integração com o Google Agenda para acompanhar a rotina de atendimento.",
    ]},
    {nome:"Tarefas",resumo:"Cada responsabilidade tem um dono e um andamento.",itens:[
      "Criação de tarefas individuais ou para integrantes da equipe, com acompanhamento de status.",
    ]},
  ]},
  { id:"operacao",nome:"Operação",resumo:"Carteira, vendas, equipe e pós-venda em um fluxo contínuo.",icon:<BriefcaseBusiness size={19}/>,modulos:[
    {nome:"Equipe",resumo:"Cresça sem pagar licença por colaborador.",itens:[
      "Criação de usuários ilimitados, sem cobrança adicional por usuário.",
      "Mais de 110 permissões disponíveis para definir as ações de cada colaborador, por módulo e escopo de acesso.",
    ]},
    {nome:"Clientes",resumo:"Transforme sua carteira em fonte de novas oportunidades.",itens:[
      "Visualização de clientes em lista ou Kanban.",
      "Cards resumidos e indicadores para avaliação da carteira.",
      "Múltiplas combinações de filtros para encontrar públicos específicos.",
      "Exportação para Excel ou PDF com campos customizados.",
      "Identificação dos produtos já contratados para ações de cross-selling e upselling.",
      "Cadastro simplificado de clientes PJ a partir do CNPJ.",
      "APIs de apoio ao cadastro, incluindo busca de CEP.",
      "Abertura de conversas no WhatsApp diretamente na lista de clientes.",
      "Visão 360° no cadastro: dados, agenda, propostas, contratos, sinistros, assistências, financeiro, comissões e arquivos anexados.",
    ]},
    {nome:"Propostas",resumo:"Do primeiro orçamento ao contrato emitido.",itens:[
      "Cards de acompanhamento de propostas em negociação, vendidas e perdidas.",
      "Filtros combinados para buscar propostas por status, datas, produtos e corretor.",
      "Mais de uma proposta para o mesmo cliente, com diferentes oportunidades comerciais.",
      "Visualização dos contratos resultantes de cada proposta.",
    ]},
    {nome:"Renovações",resumo:"Encontre a próxima venda dentro da própria carteira.",itens:[
      "Localização de renovações por período, datas de vigência, produto e corretor responsável pela venda.",
      "Cards estratégicos com o valor estimado da carteira a renovar, segmentado por produto.",
    ]},
    {nome:"Comissões",resumo:"Comissão é cálculo, distribuição, previsão e recebimento.",itens:[
      "Definição da previsão de recebimento de comissões pela corretora.",
      "Splits de comissão para corretores, parceiros, indicadores e demais participantes.",
      "Abatimentos da base de cálculo, como IOF, impostos e deduções configuráveis.",
      "Controle de comissões em vendas parceladas e respectivas parcelas a receber.",
      "Integração operacional com Contas a Pagar e Contas a Receber.",
    ]},
    {nome:"Sinistros",resumo:"Cada ocorrência documentada, com responsável e histórico.",itens:[
      "Gestão por etapas de atendimento, status e prioridade.",
      "Anexação de documentos, fotos e vídeos, com registro de novas ocorrências e compromissos.",
      "Cadastro de tipo, responsável, data do evento, data do aviso, local, causa e descrição do sinistro.",
      "Controle de número do sinistro, protocolos, prejuízo estimado, franquia e valor reclamado.",
      "Informações e acompanhamento vinculados ao cadastro do cliente.",
    ]},
    {nome:"Assistências",resumo:"O pós-venda começa quando o cliente precisa de ajuda.",itens:[
      "Controle por responsável, tipo de assistência e status.",
      "Registro de data de solicitação, protocolo, número de atendimento e descrição da solicitação.",
      "Informações do prestador: nome, telefone, previsão e detalhes do atendimento.",
      "Registro de ocorrências, anexos de fotos, imagens e vídeos.",
      "Agendamento de compromissos e timeline de solicitações e acompanhamentos.",
    ]},
  ]},
  {id:"financeiro",nome:"Financeiro",resumo:"Organize receitas, despesas, comissões, caixa e parcelas.",icon:<Wallet size={19}/>,modulos:[
    {nome:"Contas a pagar e receber",resumo:"Controle financeiro adaptado à estrutura da corretora.",itens:[
      "Plano de contas configurável com níveis e subníveis sem limite de profundidade.",
      "Controle de despesas e receitas fixas e variáveis.",
      "Cards estratégicos para acompanhamento financeiro.",
      "Lançamentos únicos ou recorrentes, com provisionamento de parcelas.",
      "Múltiplas baixas para o mesmo lançamento, inclusive pagamentos parciais.",
      "Anexos de documentos e comprovantes diretamente no lançamento.",
      "Reversões e estornos com rastreabilidade operacional.",
    ]},
    {nome:"Fluxo de caixa",resumo:"Entenda entradas e saídas sem juntar planilhas.",itens:[
      "Visão consolidada e estratégica das entradas e saídas por período.",
      "Exportação para Excel e acompanhamento de períodos.",
      "Filtros de segmentação para análise gerencial do fluxo financeiro.",
    ]},
    {nome:"Controle de parcelas",resumo:"Acompanhe o pagamento do cliente e a continuidade da cobertura.",itens:[
      "Monitoramento das parcelas dos clientes para identificar situações que exigem acompanhamento.",
      "Cards estratégicos de situação e controle das parcelas.",
      "Múltiplos filtros para localizar pendências e acompanhar recebimentos.",
    ]},
  ]},
  {id:"gestao",nome:"Gestão",resumo:"Configuração, segurança, documentos e infraestrutura da corretora.",icon:<Settings2 size={19}/>,modulos:[
    {nome:"Conexões WhatsApp",resumo:"Operação compartilhada sem perder o histórico.",itens:[
      "Criação e administração de conexões WhatsApp, definindo quais profissionais podem atender.",
      "Preservação do histórico de conversas mesmo após troca ou desativação de um número.",
    ]},
    {nome:"Armazenamento",resumo:"Saiba o que ocupa espaço e onde encontrar cada arquivo.",itens:[
      "Central de gestão de documentos, mídias e arquivos importados para o sistema.",
      "Acompanhamento de espaço contratado, consumo e capacidade disponível.",
      "Cards estratégicos de consumo por origem dos arquivos.",
      "Recursos de limpeza e exclusão de arquivos desnecessários, inclusive em lote.",
    ]},
    {nome:"Seguradoras",resumo:"Seu portfólio fica organizado e conectado ao comercial.",itens:[
      "Ativação e administração de seguradoras e produtos, com integração à configuração do site.",
    ]},
    {nome:"Configurações",resumo:"A plataforma se adapta à marca e ao momento da corretora.",itens:[
      "Personalização do site integrado ao CRM de maneira centralizada e intuitiva.",
      "Consulta de dados da corretora, assinatura e outras configurações operacionais.",
    ]},
  ]},
];

const vitrines = [
  {id:"site-integrado",tag:"01 / Presença digital",title:"Seu site transforma visitantes em oportunidades.",subtitle:"Sua marca na internet e seus contatos no centro da operação.",image:site,points:["Site personalizável com a identidade da corretora e possibilidade de domínio próprio.","Seguradoras e produtos integrados ao portfólio exibido no site.","Captação de leads, com agente SDR para pré-qualificação e continuidade no CRM e WhatsApp."],spotlight:"Site + SDR + CRM",icon:<Globe2 size={20}/>,tone:"light"},
  {id:"atendimento",tag:"02 / Atendimento",title:"Seu WhatsApp deixa de ser só uma caixa de entrada.",subtitle:"Atenda em equipe, qualifique, avance negócios e conheça o cliente sem sair da conversa.",image:whatsapp,points:["Vários atendentes, conversas por lista, agenda ou Kanban e filtros interativos.","Distribuição de atendimentos, tarefas, compromissos, temperatura do lead e respostas rápidas.","Painel 360° com propostas, contratos, financeiro, sinistros, assistências e arquivos."],spotlight:"Uma conversa. Toda a operação.",icon:<MessageCircle size={20}/>,tone:"dark"},
  {id:"clientes",tag:"03 / Carteira inteligente",title:"Cada cliente é uma visão completa. E uma nova oportunidade.",subtitle:"Encontre lacunas na carteira, planeje abordagens e aproveite o histórico do relacionamento.",image:clientes,points:["PF e PJ, lista ou Kanban, cards de carteira e cadastro inteligente por CNPJ/CEP.","Filtros e exportações Excel/PDF customizadas, inclusive roteiros de visitas.","Visão 360° com agenda, propostas, contratos, pós-venda, comissões e documentos."],spotlight:"Cross-selling e upselling",icon:<Users size={20}/>,tone:"light"},
  {id:"propostas",tag:"04 / Comercial e renovação",title:"Da primeira proposta à próxima renovação.",subtitle:"Não deixe vencer uma oportunidade que já pertence à sua carteira.",image:propostas,points:["Propostas em negociação, vendidas ou perdidas com filtros e indicadores.","Várias propostas por cliente, contratos vinculados e histórico do negócio.","Renovações por vigência, produto ou corretor e valor estimado segmentado."],spotlight:"Venda, contrato e renovação",icon:<RefreshCw size={20}/>,tone:"dark"},
  {id:"financas",tag:"05 / Financeiro e comissões",title:"O dinheiro da corretora merece o mesmo controle das vendas.",subtitle:"Planeje entradas, saídas, parcelas e distribuição de resultados.",image:financeiro,points:["Comissões com previsão, splits, IOF, impostos e deduções.","Contas a pagar/receber, plano de contas multinível, lançamentos recorrentes e baixas parciais.","Fluxo de caixa, acompanhamento de parcelas, filtros, relatórios e exportações."],spotlight:"Comissões + caixa + parcelas",icon:<Wallet size={20}/>,tone:"light"},
  {id:"documentos",tag:"06 / Gestão documental",title:"Documentos organizados no lugar em que você precisa deles.",subtitle:"Cada arquivo acompanha o cliente, o atendimento e o processo a que pertence.",image:armazenamento,points:["Documentos, imagens, áudios e vídeos vinculados a clientes e operações.","Visão do consumo e da capacidade de armazenamento, com indicadores por origem.","Visualização, download, permissões e limpeza de arquivos desnecessários."],spotlight:"Arquivos com contexto",icon:<FolderOpen size={20}/>,tone:"dark"},
  {id:"pos-venda",tag:"07 / Pós-venda",title:"Quando o cliente mais precisa, sua equipe tem todo o histórico.",subtitle:"Sinistros e assistências com responsáveis, registros e acompanhamento organizado.",image:sinistros,points:["Sinistros com status, prioridade, causa, ocorrência, franquia e valores.","Assistências com prestador, protocolo, previsão e timeline de solicitações.","Fotos, vídeos, documentos, compromissos e histórico vinculados ao cliente."],spotlight:"Relacionamento que continua",icon:<Headphones size={20}/>,tone:"light"},
  {id:"equipe",tag:"08 / Gestão da corretora",title:"Mais pessoas na operação. Mais controle para a gestão.",subtitle:"Cresça mantendo clareza sobre o que cada pessoa pode visualizar e fazer.",image:equipe,points:["Usuários ilimitados e sem cobrança adicional por colaborador.","Mais de 110 permissões granulares por módulo, ação e escopo.","Gestão de tarefas, responsáveis, acessos, conexões e configurações."],spotlight:"+110 tipos de permissões",icon:<ShieldCheck size={20}/>,tone:"dark"},
];

function FeatureImage({src,alt}:{src:string;alt:string}) {return <div className="overflow-hidden rounded-[26px] border border-blue-100/50 bg-[#eaf4ff] shadow-[0_24px_65px_-35px_rgba(20,67,150,.35)]"><img src={src} alt={alt} loading="lazy" decoding="async" className="block h-auto w-full object-contain" /></div>}

export function SeguroCRMVisualHero(){return <div className="relative mx-auto mt-14 max-w-7xl px-4 sm:px-6"><motion.div {...reveal} className="relative overflow-hidden rounded-[30px] border border-white/15 bg-[#122d56] shadow-[0_35px_100px_-40px_rgba(0,95,255,.65)]"><img src={hero} alt="Visão do ecossistema SeguroCRM com site, clientes, conversas, propostas, financeiro, documentos e gestão conectados" className="w-full object-contain" /></motion.div><div className="mt-6 flex flex-wrap justify-center gap-2">{[{label:"Site + SDR",href:"#site-integrado"},{label:"WhatsApp 360°",href:"#atendimento"},{label:"Carteira",href:"#clientes"},{label:"Finanças",href:"#financas"},{label:"Equipe",href:"#equipe"}].map(x=><a key={x.label} href={x.href} className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-bold text-slate-200 transition hover:border-blue-400 hover:bg-blue-600 hover:text-white">{x.label} <span aria-hidden="true">↗</span></a>)}</div></div>}

export function SeguroCRMVisualTour(){return <section id="explorar" className="bg-[#f5f8fe] py-20 lg:py-28"><div className={wrap}><motion.div {...reveal} className="max-w-4xl"><span className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Uma plataforma, uma operação</span><h2 className="mt-4 text-4xl font-black leading-tight tracking-tight text-[#071632] sm:text-5xl">Muito mais do que CRM. <span className="text-blue-600">Tudo o que move sua corretora.</span></h2><p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600">Cada solução tem sua própria profundidade. Explore os recursos centrais e veja como eles se conectam para ajudar sua equipe a atender, vender, administrar e acompanhar.</p></motion.div><div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{vitrines.map(x=><a key={x.id} href={`#${x.id}`} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm font-extrabold text-slate-800 transition hover:-translate-y-1 hover:border-blue-300 hover:text-blue-700 hover:shadow-lg"><span className="rounded-xl bg-blue-50 p-2 text-blue-600">{x.icon}</span><span className="min-w-0 flex-1">{x.spotlight}</span><ChevronRight size={17} className="text-blue-500" /></a>)}</div></div></section>}

export function SeguroCRMImageStories(){return <>{vitrines.map((item,index)=>{const dark=item.tone==="dark";return <section key={item.id} id={item.id} className={`scroll-mt-20 overflow-hidden py-20 lg:py-28 ${dark?'bg-[#07162f] text-white':'bg-white text-[#091831]'}`}><div className={wrap}><motion.div {...reveal} className={`grid items-center gap-10 lg:gap-14 ${index%2===1?'lg:grid-cols-[1.02fr_.98fr]':'lg:grid-cols-[.98fr_1.02fr]'}`}><div className={index%2===1?'lg:order-2':''}><span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest ${dark?'bg-white/10 text-blue-200':'bg-blue-50 text-blue-700'}`}>{item.icon}{item.tag}</span><h2 className="mt-6 text-3xl font-black leading-[1.12] tracking-tight sm:text-4xl lg:text-5xl">{item.title}</h2><p className={`mt-5 max-w-xl text-base leading-relaxed ${dark?'text-slate-300':'text-slate-600'}`}>{item.subtitle}</p><div className="mt-8 space-y-4">{item.points.map(text=><div key={text} className="flex items-start gap-3"><CheckCircle2 size={21} className={`mt-0.5 shrink-0 ${dark?'text-sky-400':'text-blue-600'}`} /><p className={`text-sm leading-relaxed ${dark?'text-slate-200':'text-slate-700'}`}>{text}</p></div>)}</div><a href="#funcionalidades" className={`mt-9 inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-xs font-extrabold transition ${dark?'border-white/20 bg-white/10 text-white hover:bg-blue-600':'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white'}`}>Explorar todas as funcionalidades <ArrowRight size={17}/></a></div><div className={index%2===1?'lg:order-1':''}><FeatureImage src={item.image} alt={`Representação visual: ${item.tag.toLowerCase()} no SeguroCRM`}/></div></motion.div></div></section>})}</>}

export function SeguroCRMFeatureExplorer(){const [selected,setSelected]=useState("atendimento");const [expanded,setExpanded]=useState<string[]>(["Conversas"]);const grupo=grupos.find(x=>x.id===selected)!;function toggle(name:string){setExpanded(old=>old.includes(name)?old.filter(x=>x!==name):[...old,name])}const total=grupos.reduce((a,g)=>a+g.modulos.reduce((s,m)=>s+m.itens.length,0),0);return <section id="funcionalidades" className="scroll-mt-20 bg-[#eff4fc] py-20 lg:py-28"><div className={wrap}><div className="max-w-4xl"><span className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Explore a profundidade</span><h2 className="mt-4 text-4xl font-black tracking-tight text-[#071632] sm:text-5xl">Funcionalidades de ponta a ponta.</h2><p className="mt-5 text-base leading-relaxed text-slate-600">São {total} capacidades e detalhes de uso apresentados nesta vitrine, organizados pelos quatro menus da corretora. Escolha um menu e abra os módulos para descobrir o que o SeguroCRM oferece.</p></div><div className="mt-10 flex flex-wrap gap-2" role="tablist" aria-label="Módulos do SeguroCRM">{grupos.map(g=><button key={g.id} type="button" role="tab" aria-selected={selected===g.id} onClick={()=>{setSelected(g.id);setExpanded([g.modulos[0].nome])}} className={`inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-extrabold transition ${selected===g.id?'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/15':'border-slate-200 bg-white text-slate-700 hover:border-blue-300'}`}>{g.icon}{g.nome}</button>)}</div><div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]"><aside className="rounded-[25px] bg-[#0b1b37] p-7 text-white"><p className="text-xs font-black uppercase tracking-widest text-blue-300">Menu {grupo.nome}</p><p className="mt-4 text-xl font-black leading-tight">{grupo.resumo}</p><div className="mt-7 space-y-2">{grupo.modulos.map(m=><button key={m.nome} type="button" onClick={()=>toggle(m.nome)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left text-xs font-bold text-slate-200 transition hover:bg-white/15">{m.nome}<ChevronRight size={14}/></button>)}</div><p className="mt-7 text-[11px] leading-relaxed text-slate-400">As funções disponíveis podem respeitar permissões, configurações e plano contratado.</p></aside><div className="space-y-3">{grupo.modulos.map(mod=><div key={mod.nome} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><button type="button" aria-expanded={expanded.includes(mod.nome)} onClick={()=>toggle(mod.nome)} className="flex w-full items-center justify-between gap-3 p-5 text-left sm:p-6"><span><span className="block text-lg font-black text-slate-900">{mod.nome}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{mod.resumo}</span></span><span className="flex shrink-0 items-center gap-2"><span className="hidden rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-700 sm:block">{mod.itens.length} recursos</span><ChevronDown size={20} className={`text-blue-600 transition-transform ${expanded.includes(mod.nome)?'rotate-180':''}`}/></span></button><AnimatePresence initial={false}>{expanded.includes(mod.nome)&&<motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:.22}} className="overflow-hidden"><div className="grid gap-3 border-t border-slate-100 bg-[#fafcff] p-5 sm:grid-cols-2 sm:p-6">{mod.itens.map(text=><div key={text} className="flex items-start gap-2 rounded-xl border border-blue-50 bg-white p-4"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-blue-600"/><span className="text-xs leading-relaxed text-slate-700">{text}</span></div>)}</div></motion.div>}</AnimatePresence></div>)}</div></div></div></section>}

export function SeguroCRMClosingPitch({onRegister}:{onRegister:()=>void}){return <section className="bg-[#07162f] px-5 py-20 text-white sm:px-6"><div className="mx-auto max-w-5xl text-center"><span className="text-xs font-black uppercase tracking-widest text-sky-400">Tudo conversa com tudo</span><h2 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">Seu site atrai. Seu WhatsApp atende. <span className="text-sky-400">Seu SeguroCRM faz a corretora acontecer.</span></h2><p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-slate-300">Do primeiro contato à renovação, da gestão de documentos às finanças e às permissões da equipe. Uma estrutura conectada para transformar relacionamento em crescimento.</p><button onClick={onRegister} type="button" className="mt-9 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-sm font-black text-white transition hover:bg-blue-500">Conhecer o SeguroCRM <ArrowRight size={18}/></button></div></section>}
