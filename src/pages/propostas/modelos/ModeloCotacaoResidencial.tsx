import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { X, Printer, Loader2, Shield, ClipboardCheck, Plus, Trash2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatarDataBR } from "../../../utils/dateUtils";

export type SistemaProtecao = 
  | "Extintores" 
  | "Hidrantes" 
  | "Sprinklers" 
  | "Alarme Monitorado" 
  | "Câmeras (CFTV)" 
  | "Vigilância Armada" 
  | string;

export interface ModeloCotacaoResidencialProps {
  propostaId: string;
  onClose: () => void;
}

export interface LinhaCobertura {
  id: string;
  numero?: string | number;
  nome: string;
  significado?: string;
  oqueProtege: string;
  exemploPratico: string;
  importancia: string;
  tipoInput?: "texto" | "moeda";
}

export interface PerfilRiscoResidencial {
  tipoResidencia: "Casa" | "Apartamento" | "Sobrado" | "Outros";
  tipoMoradia: "Habitual" | "Veraneio" | "Desocupada";
  tipoConstrucao: "Alvenaria" | "Metálica" | "Mista" | "Madeira";
  localizacao: "Rua/Avenida" | "Condomínio Fechado" | "Outros";
  sistemasProtecao: SistemaProtecao[];
  sinistrosAnteriores: "Sim" | "Não";
}

const ESTRUTURA_COBERTURAS_PADRAO: LinhaCobertura[] = [
  {
    id: "basica",
    numero: 1,
    nome: "Básica",
    oqueProtege: "Protege os bens segurados contra os eventos básicos previstos no contrato, incluindo incêndio, fumaça, queda de raio, explosão/implosão, impacto de veículos/objetos, queda de aeronaves e tumultos, greves e lockout. A cobertura também prevê recomposição de documentos pessoais e do imóvel e despesas com despachantes, dentro dos limites estabelecidos.",
    exemploPratico: "Um incêndio começa na cozinha e se espalha pela residência, destruindo móveis, eletrodomésticos e parte da estrutura. Um raio atinge a residência e provoca danos previstos à edificação/instalações. Uma explosão causa danos ao imóvel e ao conteúdo. Um veículo invade a residência e danifica muro, garagem e bens. Uma aeronave ou objeto por ela conduzido cai sobre a residência. Um tumulto provoca danos materiais ao imóvel. Depois de um grande sinistro, o segurado ainda precisa recompor documentos pessoais e do imóvel.",
    importancia: "É a base obrigatória da apólice. As demais coberturas entram para ampliar a proteção para riscos específicos que vão muito além desses eventos básicos.",
    tipoInput: "texto"
  },
  {
    id: "moradia_temporaria",
    numero: 1,
    nome: "Moradia Temporária",
    oqueProtege: "Garante despesas com moradia temporária quando a residência não puder permanecer ocupada, total ou parcialmente, em consequência de um sinistro coberto, respeitando o periodo indenitário contratado.",
    exemploPratico: "A casa sofre um incêndio e a família precisa sair imediatamente. Ο apartamento fica temporariamente sem condições de uso após um sinistro. A família precisa ficar em um hotel enquanto a residência é reparada. O imóvel fica parcialmente interditado e é necessário buscar uma alternativa de moradia. O cliente muitas vezes pensa: \"Minha casa tem seguro, mas onde vou morar durante a reforma?\"",
    importancia: "Não paga o conserto da casa. Protege a família contra o custo de ficar temporariamente fora dela. É uma cobertura de continuidade da vida familiar.",
    tipoInput: "texto"
  },
  {
    id: "vendaval_granizo",
    numero: 3,
    nome: "Vendaval, Furacão, Ciclone. Tornado, Granizo, Neve e Geada",
    oqueProtege: "Protege os bens segurados contra danos materiais diretamente causados pelos fenômenos climáticos previstos. O documento estabelece critérios específicos para caracterização dos eventos.",
    exemploPratico: "Um vendaval destelha a residência. Uma forte chuva de granizo danifica telhado, janelas e outros bens. Uma tempestade provoca queda de árvores sobre a casa. O vento causa danos à cobertura e permite a entrada de água posteriormente. Em regiões sujeitas a neve ou geada, o fenômeno provoca danos aos bens segurados. Uma residência de praia sofre danos após uma forte tempestade.",
    importancia: "O ponto comercial é mostrar que \"incêndio\" não é o único grande risco para uma casa. Uma tempestade severa pode produzir um prejuízo de dezenas de milhares de reais em poucas horas.",
    tipoInput: "texto"
  },
  {
    id: "danos_eletricos",
    numero: 4,
    nome: "Danos Elétricos",
    oqueProtege: "Protege instalações elétricas/eletrônicas, equipamentos e aparelhos eletroeletrônicos contra danos elétricos previstos, inclusive em consequência de queda de raio, independentemente do local onde o raio tenha ocorrido. Inclui fenômenos como variações anormais de tensão, curto-circuito, arco voltaico e descargas elétricas.",
    exemploPratico: "Uma oscilação de tensão queima a televisão. Um notebook é danificado por um fenômeno elétrico. Vários aparelhos são atingidos durante uma anomalia na rede. Um curto-circuito provoca danos em equipamentos e instalações. Um raio causa danos elétricos nos aparelhos da residência. Geladeira, televisão, computador, home theater e outros equipamentos podem representar milhares de reais concentrados em um único evento.",
    importancia: "Aqui está um excelente argumento: não é preciso haver incêndio para um prejuízo elétrico ser enorme. Danos Elétricos é uma proteção específica para o risco elétrico, diferente de simplesmente proteger a casa contra incêndio.",
    tipoInput: "texto"
  },
  {
    id: "roubo",
    numero: 5,
    nome: "Roubo",
    oqueProtege: "Protege bens do segurado, familiares e moradores contra roubo ou furto qualificado dentro da residência. Também contempla danos materiais causados ao imóvel ou conteúdo durante a prática ou tentativa do roubo/furto qualificado.",
    exemploPratico: "A familia viaja e a residência é invadida. Criminosos arrombam uma porta e levam televisão, computadores e outros bens. O ladrão tenta entrar e danifica porta, fechadura e outros elementos. O criminoso leva equipamentos eletrônicos de alto valor. A família possui bens relevantes dentro da residência e quer proteção patrimonial contra invasão. Uma casa de veraneio permanece fechada durante boa parte do ano e fica especialmente vulnerável a invasões.",
    importancia: "É diferente de Equipamentos Portáteis: Roubo olha para o risco de subtração dentro da residência, enquanto a cobertura de Portáteis possui proteção mais ampla para os equipamentos relacionados, inclusive em trânsito externo.",
    tipoInput: "texto"
  },
  {
    id: "vidros_marmores",
    numero: 7,
    nome: "Vidros, Mármores, Granitos e Porcelanatos",
    oqueProtege: "Protege vidros, inclusive temperados e blindados, espelhos, mármores, granitos, porcelanatos e quartzo instalados na residência, em diversos elementos como janelas, portas, pisos, boxes, divisórias, móveis, cortinas de vidro, louças sanitárias, cooktop e balcões, contra os eventos previstos.",
    exemploPratico: "Uma porta de vidro quebra acidentalmente. O box de vidro do banheiro é danificado. Um cooktop de vidro sofre quebra coberta. Uma cortina de vidro da varanda é danificada. Um espelho instalado na residência quebra em uma situação coberta. Uma bancada de mármore/granito sofre dano. Um choque térmico provoca a quebra de um vidro. Uma criança ou outro morador causa involuntariamente a quebra de um elemento de vidro.",
    importancia: "Excelente cobertura para mostrar que \"pequenos acidentes dentro de casa podem gerar reparos caros\". Não é simplesmente \"seguro de janela\": o alcance inclui diversos materiais e componentes da residência.",
    tipoInput: "texto"
  },
  {
    id: "alagamento",
    numero: 9,
    nome: "Alagamento e Inundação",
    oqueProtege: "Protege os bens contra alagamento, inundação e enchente decorrentes de acúmulo de água nas ruas, problemas de drenagem ou transbordamento de lagos/rios por fortes chuvas, além de determinadas entradas de água provenientes de ruptura de tubulações externas ao imóvel.",
    exemploPratico: "Uma chuva muito forte faz a água subir na rua e entrar na residência. O bairro sofre uma inundação e a água atinge móveis e eletrodomésticos. A garagem fica alagada e a água atinge bens armazenados. A residência está em região com histórico de enchentes. Uma falha de drenagem faz a água invadir o imóvel. Uma tubulação externa ao imóvel se rompe e provoca entrada de água em determinadas condições.",
    importancia: "Alagamento não é automaticamente a mesma coisa que ruptura de tubulação interna. Por isso essa cobertura é importante: protege um risco relacionado à entrada/acúmulo de água por causas específicas de alagamento e inundação.",
    tipoInput: "texto"
  },
  {
    id: "desmoronamento",
    numero: 10,
    nome: "Desmoronamento",
    oqueProtege: "Protege os bens segurados contra danos materiais decorrentes de desmoronamento total ou parcial do imóvel. Para desmoronamento parcial, o documento considers o colapso de parede ou elemento estrutural como coluna, viga ou laje.",
    exemploPratico: "Uma parede estrutural desmorona e danifica móveis e equipamentos. Uma laje ou elemento estrutural desaba e atinge o conteúdo da casa. Parte da residència sofre colapso. Um desmoronamento parcial torna parte do imóvel inutilizável. O colapso estrutural provoca uma cadeia de danos dentro da residência.",
    importancia: "É uma proteção específica para colapso estrutural. Não deve ser confundida com danos causados simplesmente por água, vendaval ou outros eventos, que possuem coberturas próprias.",
    tipoInput: "texto"
  },
  {
    id: "rc_familiar",
    numero: 12,
    nome: "Responsabilidade Civil Familiar — com Danos Morais",
    oqueProtege: "Reembolsa valores pelos quais o segurado seja civilmente responsável, em sentença judicial ou acordo autorizado, por danos involuntários corporais ou materiais causados a terceiros. Abrange situações relacionadas à residência, queda de objetos, atos do segurado e familiares, empregados domésticos e animais domésticos. Também contempla danos morais decorrentes dos danos corporais/materiais cobertos, dentro do sublimite previsto.",
    exemploPratico: "Uma telha/objeto da residência cai e atinge o patrimônio de um vizinho. Um vazamento originado na residência causa danos ao apartamento vizinho. Um vazamento de água/esgoto provoca prejuízo ao imóvel de terceiro. Um objeto é lançado ou cai da residência e danifica um veículo. O cachorro do segurado causa dano a uma pessoa ou a outro animal, nas condições da cobertura. Uma ação involuntária do segurado ou de um familiar causa dano a terceiro. O terceiro ingressa judicialmente buscando indenização. Além do dano material/corporal coberto, surge dano moral diretamente decorrente do evento.",
    importancia: "Essa é uma das coberturas que mais permite uma venda consultiva: “Você protege sua casa, mas quem protege você quando o problema causado pela sua casa atinge outra pessoa?” É responsabilidade civil, não patrimônio próprio.",
    tipoInput: "moeda"
  },
  {
    id: "tremor_terra",
    numero: 21,
    nome: "Tremor de Terra, Terremoto e Maremoto",
    oqueProtege: "Protege os bens segurados contra danos materiais diretamente causados por tremor de terra, terremoto ou maremoto e também por incêndio ou explosão consequentes desses eventos.",
    exemploPratico: "Um terremoto provoca rachaduras e danos relevantes na residência. Um tremor provoca queda de elementos estruturais e danos ao conteúdo. Um maremoto provoca danos à residência em local sujeito ao fenômeno. Um terremoto provoca posteriormente um incêndio coberto pela própria modalidade. Um evento sísmico provoca uma explosão consequente e danos materiais.",
    importancia: "É uma cobertura para um risco catastrófico específico, que não deve ser presumido simplesmente porque a residência possui a cobertura básica.",
    tipoInput: "texto"
  },
  {
    id: "equipamentos_eletronicos",
    numero: 25,
    nome: "Equipamentos Eletrônicos e Eletrodomésticos",
    oqueProtege: "Protege equipamentos eletrônicos, portáteis e eletrodomésticos existentes no endereço segurado contra acidentes decorrentes de causa externa que exijam reparo ou reposição para que continuem funcionando normalmente.",
    exemploPratico: "A televisão sofre uma queda acidental e precisa ser reparada. A geladeira é danificada por um acidente externo. Uma máquina de lavar sofre dano acidental. Um eletrodoméstico é atingido por um acidente e deixa de funcionar. Equipamentos eletrônicos da família sofrem danos acidentais. Um equipamento eletrônico sofre um acidente que exige reparo para voltar a funcionar.",
    importancia: "Aqui existe uma diferença comercial muito importante: Danos Elétricos = fenômeno elétrico; Equipamentos = acidente decorrente de causa externa. O cliente pode ter ambos porque são riscos diferentes.",
    tipoInput: "texto"
  },
  {
    id: "ruptura_tubulacoes",
    numero: 33,
    nome: "Ruptura de Tubulações",
    oqueProtege: "Protege contra danos materiais decorrentes da ruptura acidental de tubulações/canalizações de esgoto, gás e água ou caixa d’água, incluindo determinadas canalizações externas à parede, como mangueiras/rabichos de pia, vaso sanitário, ducha e semelhantes.",
    exemploPratico: "Uma mangueira da pia rompe durante a madrugada e causa um grande vazamento. Uma tubulação do banheiro se rompe e alaga parte da casa. Uma conexão do vaso sanitário rompe e causa danos ao piso e móveis. A caixa d’água sofre ruptura e libera grande volume de água. Uma tubulação de gás sofre ruptura e gera uma situação de risco com danos materiais. A água atinge móveis, pisos, paredes e equipamentos.",
    importancia: "Aqui está uma pergunta comercial muito forte: “Se um cano romper dentro da sua casa às 2h da manhã, quanto pode custar o prejuízo antes de você conseguir controlar a água?” É diferente de Alagamento/Inundação porque trata da ruptura acidental das instalações/tubulações previstas.",
    tipoInput: "texto"
  },
  {
    id: "bicicleta",
    numero: 37,
    nome: "Bicicleta",
    oqueProtege: "Protege bicicletas, inclusive elétricas, do segurado e moradores, quando relacionadas na apólice, contra roubo, furto qualificado e determinados danos, inclusive algumas situações fora do local de risco e durante transporte, respeitando as condições da cobertura.",
    exemploPratico: "Uma bicicleta de alto valor é roubada durante um passeio, observadas as condições da cobertura. A bicicleta é furtada mediante arrombamento. A bicicleta fica guardada em bicicletário de condomínio devidamente presa e é furtada. A bicicleta sofre dano em acidente com o veículo que a transporta, nas condições previstas. Uma e-bike de alto valor é roubada e o cliente precisa ter proteção específica. Um cliente possui bicicleta esportiva de R$ 10 mil, R$ 20 mil ou mais e não quer assumir sozinho esse patrimônio.",
    importancia: "O grande argumento é: bicicleta de alto valor virou patrimônio relevante. E a cobertura possui regras específicas de identificação, guarda e utilização. Não é simplesmente presumir que qualquer bicicleta esteja automaticamente protegida.",
    tipoInput: "texto"
  },
  {
    id: "equipamentos_portateis",
    numero: 52,
    nome: "Equipamentos Portáteis",
    oqueProtege: "Protege aparelhos portáteis de propriedade do segurado, cônjuge, filhos, familiares e moradores contra danos materiais decorrentes de causa externa, inclusive roubo ou furto qualificado, tanto dentro da residência quanto em trânsito externo em todo o território nacional. Os objetos devem ser relacionados individualmente na apólice.",
    exemploPratico: "O notebook do segurado é roubado durante uma viagem. Um aparelho celular sofre um acidente durante uma saída. Uma câmera é danificada durante uma viagem pelo Brasil. Um notebook é danificado dentro da própria residência. Equipamentos portáteis de alto valor são levados para trabalho, estudo ou lazer. O equipamento acompanha o segurado em viagens e deslocamentos. Um equipamento portátil é roubado fora da residência nas condições previstas.",
    importancia: "Essa é uma das coberturas mais interessantes para explicar ao cliente: “Seu patrimônio não fica parado dentro de casa.” Ela acompanha determinados equipamentos portáteis inclusive em trânsito externo nacional. É mais ampla, nesse aspecto, que a cobertura de Roubo da residência.",
    tipoInput: "texto"
  },
  {
    id: "desp_salvamento",
    numero: 58,
    nome: "Despesas de Salvamento, Desentulho e Demolição",
    oqueProtege: "Reembolsa despesas comprovadas de salvamento, desentulho e demolição realizadas durante ou depois de determinados sinistros indenizados, além de despesas para evitar/minorar o dano e determinadas despesas de implosão quando o imóvel for condenado pela Defesa Civil.",
    exemploPratico: "Depois de um incêndio, é necessário retirar grande quantidade de entulho. Parte da estrutura precisa ser removida após um desmoronamento. É necessário escorar, desmontar, limpar e transportar resíduos. Após um sinistro grave, a Defesa Civil condena o imóvel e surge necessidade de demolição/implosão dentro das condições previstas. A família toma medidas emergenciais para salvar bens e impedir que o prejuízo aumente. O custo de retirada e transporte do entulho pode ser significativo mesmo depois que o sinistro principal já foi reconhecido.",
    importancia: "Essa cobertura resolve uma pergunta que quase ninguém faz antes do sinistro: “Quem paga para limpar o estrago depois que o evento acontece?” O seguro não trata apenas do bem destruído; há também custos para salvar, limpar e remover o que ficou para trás.",
    tipoInput: "texto"
  }
];

export default function ModeloCotacaoResidencial({ propostaId, onClose }: ModeloCotacaoResidencialProps) {
  const [loading, setLoading] = useState(true);
  const [dadosBase, setDadosBase] = useState<any>(null);
  const [valoresMatriz, setValoresMatriz] = useState<Record<string, Record<string, any>>>({});
  
  const [listaCoberturas, setListaCoberturas] = useState<LinhaCobertura[]>(ESTRUTURA_COBERTURAS_PADRAO);
  const [coberturasAtivas, setCoberturasAtivas] = useState<string[]>(ESTRUTURA_COBERTURAS_PADRAO.map(c => c.id));

  const [novoNome, setNovoNome] = useState("");
  const [novoOqueProtege, setNovoOqueProtege] = useState("");
  const [novoExemploPratico, setNovoExemploPratico] = useState("");
  const [novoImportancia, setNovoImportancia] = useState("");

  const [perfilRisco, setPerfilRisco] = useState<PerfilRiscoResidencial>({
    tipoResidencia: "Casa",
    tipoMoradia: "Habitual",
    tipoConstrucao: "Alvenaria",
    localizacao: "Rua/Avenida",
    sistemasProtecao: [],
    sinistrosAnteriores: "Não"
  });

  useEffect(() => {
    if (propostaId) {
      carregarDadosProposta();
    }
  }, [propostaId]);

  async function carregarDadosProposta() {
    try {
      setLoading(true);

      const { data: proposta, error: errorProp } = await supabase
        .from("tab_propostas")
        .select(`
          *,
          usuarios_perfis!tab_propostas_corretor_id_fkey (*) 
        `)
        .eq("id", propostaId)
        .single();

      if (errorProp || !proposta) throw new Error("Erro ao buscar dados básicos da proposta.");

      const corretor = proposta.usuarios_perfis;

      let clienteDb = null;
      if (proposta.cliente_id) {
        const { data: cliente, error: errorCliente } = await supabase
          .from("tab_clientes")
          .select("*")
          .eq("id", proposta.cliente_id)
          .maybeSingle();

        if (!errorCliente) {
          clienteDb = cliente;
        }
      }

      const { data: corretora } = await supabase
        .from("usuarios_perfis")
        .select(`
          id,
          cnpj_corretora,
          registro_susep,
          tab_configuracoes_site (
            nome_exibicao,
            dominio,
            logo_url
          )
        `)
        .eq("corretora_id", proposta.corretora_id)
        .or("tipo_usuario.eq.CORRETORA,tipo_usuario.eq.ADMIN") 
        .limit(1)
        .maybeSingle();

      const { data: opcoesDb, error: errorOpcoes } = await supabase
        .from("tab_proposta_opcoes")
        .select(`
          *,
          base_seguradoras (*),
          tab_proposta_itens (
            *,
            base_produtos (*)
          )
        `)
        .eq("proposta_id", propostaId)
        .order("ordem_opcao", { ascending: true });

      if (errorOpcoes) throw errorOpcoes;

      const opcoes = opcoesDb || [];
      const matrizInicial: Record<string, Record<string, any>> = {};

      opcoes.forEach((opt: any) => {
        matrizInicial[opt.id] = {
          formaPagamento: opt.tab_proposta_itens?.[0]?.meio_pagamento || "Boleto",
          parcelamento: opt.tab_proposta_itens?.[0]?.parcelamento || "1x",
          valorTotal: opt.valor_total_opcao || 0
        };

        listaCoberturas.forEach(cob => {
          matrizInicial[opt.id][cob.id] = "R$ 0,00";
        });

        opt.tab_proposta_itens?.forEach((item: any) => {
          const nomeProd = (item.base_produtos?.nome || "").toLowerCase();
          const textoSalvo = item.coberturas_franquias;

          if (!textoSalvo) return;

          listaCoberturas.forEach(cob => {
            if (nomeProd.includes(cob.id.toLowerCase()) || nomeProd.includes(cob.nome.toLowerCase().split(' ')[0])) {
              matrizInicial[opt.id][cob.id] = textoSalvo;
            }
          });
        });
      });

      setValoresMatriz(matrizInicial);

      setDadosBase({
        proposta,
        corretora,
        corretor,
        cliente: clienteDb,
        opcoes
      });

    } catch (error) {
      console.error("Erro ao carregar dados da proposta:", error);
      alert("Houve um erro ao carregar o espelho da proposta.");
    } finally {
      setLoading(false);
    }
  }

  const atualizarCelula = (opcaoId: string, campo: string, valor: any) => {
    setValoresMatriz(prev => ({
      ...prev,
      [opcaoId]: { ...prev[opcaoId], [campo]: valor }
    }));
  };

  const atualizarPerfil = (campo: keyof PerfilRiscoResidencial, valor: any) => {
    setPerfilRisco(prev => ({ ...prev, [campo]: valor }));
  };

  const gerenciarCheckboxSeguranca = (opcao: SistemaProtecao) => {
    const atuais = [...perfilRisco.sistemasProtecao];
    const index = atuais.indexOf(opcao);
    if (index > -1) {
      atuais.splice(index, 1);
    } else {
      atuais.push(opcao);
    }
    atualizarPerfil("sistemasProtecao", atuais);
  };

  const aplicarMascaraMoeda = (v: string) => {
    const apenasNumeros = v.replace(/\D/g, "");
    if (!apenasNumeros) return "R$ 0,00";
    const valorNumerico = parseFloat(apenasNumeros) / 100;
    return valorNumerico.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
  };

  const carregarImagemCache = (url: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      if (!url) return resolve(null);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  };

  const adicionarNovaCoberturaManual = () => {
    if (!novoNome.trim()) {
      alert("Informe o nome da cobertura para adicioná-la.");
      return;
    }
    const novoId = "custom_" + Date.now();
    const novaCob: LinhaCobertura = {
      id: novoId,
      numero: "+",
      nome: novoNome.trim(),
      oqueProtege: novoOqueProtege.trim() || "Cobertura customizada adicionada manualmente.",
      exemploPratico: novoExemploPratico.trim() || "Exemplo comercial customizado.",
      importancia: novoImportancia.trim() || "Proteção sob medida adicionada pelo corretor.",
      tipoInput: "texto"
    };

    setListaCoberturas(prev => [...prev, novaCob]);
    setCoberturasAtivas(prev => [...prev, novoId]);

    if (dadosBase?.opcoes) {
      setValoresMatriz(prev => {
        const atualizado = { ...prev };
        dadosBase.opcoes.forEach((opt: any) => {
          if (!atualizado[opt.id]) atualizado[opt.id] = {};
          atualizado[opt.id][novoId] = "R$ 0,00";
        });
        return atualizado;
      });
    }

    setNovoNome("");
    setNovoOqueProtege("");
    setNovoExemploPratico("");
    setNovoImportancia("");
  };

  const deletarCoberturaCompletamente = (id: string) => {
    setListaCoberturas(prev => prev.filter(c => c.id !== id));
    setCoberturasAtivas(prev => prev.filter(i => i !== id));
  };

  const exportarPDFProposta = async () => {
    if (!dadosBase) return;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const { proposta, cliente, corretor, corretora, opcoes } = dadosBase;

    const formatarValorParaPDF = (val: any) => {
      if (typeof val === 'number') return formatarMoeda(val);
      if (!val || val === "Não Contratado" || val === "" || val === "R$ NaN") return "R$ 0,00";
      return val;
    };

    const cacheLogos: Record<string, HTMLImageElement | null> = {};
    for (const opt of opcoes) {
      if (opt.base_seguradoras?.logo_url) {
        const img = await carregarImagemCache(opt.base_seguradoras.logo_url);
        cacheLogos[opt.id] = img;
      }
    }

    const urlLogoCorretora = corretora?.tab_configuracoes_site?.logo_url;
    const imgLogoCorretora = urlLogoCorretora ? await carregarImagemCache(urlLogoCorretora) : null;

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 297, 34, "F");
    
    let inicioTextoX = 15;
    if (imgLogoCorretora) {
      doc.setFillColor(255, 255, 255);
      doc.rect(15, 5, 32, 12, "F"); 
      doc.addImage(imgLogoCorretora, "PNG", 16, 6, 30, 10);
      inicioTextoX = 52;
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(corretora?.tab_configuracoes_site?.nome_exibicao || "CORRETORA DE SEGUROS", inicioTextoX, 12);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`CNPJ: ${corretora?.cnpj_corretora || "-"}`, inicioTextoX, 17);
    doc.text(`SUSEP: ${corretora?.registro_susep || "-"}`, inicioTextoX, 21);
    doc.text(`Site: ${corretora?.tab_configuracoes_site?.dominio || "-"}`, inicioTextoX, 25);

    const colunaDireitaX = 200;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`PROPOSTA Nº: ${proposta.numero_proposta || "-"}`, colunaDireitaX, 10);
    doc.text(`VALIDADE: ${proposta.data_validade ? formatarDataBR(proposta.data_validade) : "-"}`, colunaDireitaX, 14);
    
    doc.setDrawColor(71, 85, 105);
    doc.line(colunaDireitaX, 17, 282, 17);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Consultor: ${corretor?.nome || "-"}`, colunaDireitaX, 21);
    doc.text(`Telefone: ${corretor?.telefone_corretor || "-"}`, colunaDireitaX, 25);
    doc.text(`E-mail: ${corretor?.email || "-"}`, colunaDireitaX, 29);

    doc.setTextColor(51, 51, 51);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO SEGURADO E RISCO", 15, 41);
    doc.line(15, 43, 282, 43);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const isPJ = cliente?.tipo_cliente === "PJ";
    doc.text(`Cliente: ${isPJ ? cliente?.razao_social : cliente?.nome || "-"} | CPF/CNPJ: ${isPJ ? cliente?.cnpj : cliente?.cpf || "-"}`, 15, 48);
    doc.text(`Residência: ${perfilRisco.tipoResidencia} | Moradia: ${perfilRisco.tipoMoradia} | Construção: ${perfilRisco.tipoConstrucao} | Localização: ${perfilRisco.localizacao}`, 15, 53);

    const tableHead = [[
      "N°", 
      "Cobertura", 
      "O que protege na prática", 
      "Exemplos comerciais para fortalecer o argumento", 
      "Por que ela é importante / não é substituta", 
      ...opcoes.map((o: any) => o.base_seguradoras?.nome || "Opção")
    ]];

    const tableBody = listaCoberturas
      .filter(cob => coberturasAtivas.includes(cob.id))
      .map((cob, idx) => {
        const row = [
          String(cob.numero || idx + 1),
          cob.nome, 
          cob.oqueProtege,
          cob.exemploPratico,
          cob.importancia
        ];
        opcoes.forEach((opt: any) => {
          const valor = valoresMatriz[opt.id]?.[cob.id];
          row.push(formatarValorParaPDF(valor));
        });
        return row;
      });

    const rowFormaPgto = ["-", "Forma de Pagamento", "", "", ""];
    const rowParcelas = ["-", "Condição de Parcelamento", "", "", ""];
    const rowPremioTotal = ["-", "INVESTIMENTO TOTAL", "", "", ""];

    opcoes.forEach((opt: any) => {
      const vMatriz = valoresMatriz[opt.id];
      rowFormaPgto.push(vMatriz?.formaPagamento || "Boleto");
      rowParcelas.push(vMatriz?.parcelamento || "1x");
      rowPremioTotal.push(formatarMoeda(vMatriz?.valorTotal || 0));
    });

    tableBody.push(rowFormaPgto, rowParcelas, rowPremioTotal);

    autoTable(doc, {
      startY: 57,
      margin: { left: 15, right: 15 },
      head: tableHead,
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 6, cellPadding: 1.5, valign: "middle", overflow: 'linebreak' },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, halign: "center" },
      columnStyles: { 
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 30, fontStyle: "bold" }, 
        2: { cellWidth: 50 },
        3: { cellWidth: 50 },
        4: { cellWidth: 50 },
      },
      didDrawCell: (data) => {
        if (data.section === "head" && data.column.index >= 5) {
          const opt = opcoes[data.column.index - 5];
          if (cacheLogos[opt.id]) {
            doc.addImage(cacheLogos[opt.id]!, "PNG", data.cell.x + 2, data.cell.y + 2, 10, 3);
          }
        }
      },
      didParseCell: (data) => {
        if (data.row.index >= tableBody.length - 3) {
          data.cell.styles.fontStyle = "bold";
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("As coberturas apresentadas seguem as Condições Gerais de cada Seguradora.", 15, finalY);

    doc.save(`Proposta_Residencial_${proposta.numero_proposta || "Preview"}.pdf`);
  };

  const todosSelecionados = coberturasAtivas.length === listaCoberturas.length && listaCoberturas.length > 0;
  
  const alternarTodos = () => {
    if (todosSelecionados) {
      setCoberturasAtivas([]);
    } else {
      setCoberturasAtivas(listaCoberturas.map((c) => c.id));
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-xl flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <span className="font-medium text-gray-700">Construindo espelho comparativo...</span>
        </div>
      </div>
    );
  }

  if (!dadosBase) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-xl text-center space-y-4">
          <p className="text-red-600 font-medium">Erro ao carregar os dados da proposta.</p>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const { proposta, opcoes } = dadosBase;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm">
      <div className="bg-slate-50 w-full max-w-[98vw] h-[96vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300">
        
        {/* CABEÇALHO */}
        <div className="bg-white px-6 py-3.5 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 leading-snug">Comparativo Residencial Completo (5 Colunas Ítegras)</h2>
              <p className="text-xs text-slate-500">Proposta nº {proposta?.numero_proposta || "Não informada"}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={exportarPDFProposta} 
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" /> 
              Exportar PDF (Paisagem)
            </button>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ÁREA DE ROLAGEM PRINCIPAL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* PERFIL DE RISCO */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-emerald-600" />
              Perfil de Risco do Imóvel
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-5 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Residência</label>
                <select 
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
                  value={perfilRisco.tipoResidencia} 
                  onChange={e => atualizarPerfil("tipoResidencia", e.target.value)}
                >
                  <option value="Casa">Casa</option>
                  <option value="Apartamento">Apartamento</option>
                  <option value="Sobrado">Sobrado</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Moradia</label>
                <select 
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
                  value={perfilRisco.tipoMoradia} 
                  onChange={e => atualizarPerfil("tipoMoradia", e.target.value)}
                >
                  <option value="Habitual">Habitual</option>
                  <option value="Veraneio">Veraneio</option>
                  <option value="Desocupada">Desocupada</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Construção</label>
                <select 
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
                  value={perfilRisco.tipoConstrucao} 
                  onChange={e => atualizarPerfil("tipoConstrucao", e.target.value)}
                >
                  <option value="Alvenaria">Alvenaria</option>
                  <option value="Metálica">Metálica</option>
                  <option value="Mista">Mista</option>
                  <option value="Madeira">Madeira</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Localização</label>
                <select 
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
                  value={perfilRisco.localizacao} 
                  onChange={e => atualizarPerfil("localizacao", e.target.value)}
                >
                  <option value="Rua/Avenida">Rua/Avenida</option>
                  <option value="Condomínio Fechado">Condomínio Fechado</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Sinistros Anteriores?</label>
                <select 
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
                  value={perfilRisco.sinistrosAnteriores} 
                  onChange={e => atualizarPerfil("sinistrosAnteriores", e.target.value)}
                >
                  <option value="Não">Não</option>
                  <option value="Sim">Sim</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-medium text-slate-600 mb-2">Sistemas de Proteção Identificados</label>
              <div className="flex flex-wrap gap-3">
                {["Extintores", "Hidrantes", "Sprinklers", "Alarme Monitorado", "Câmeras (CFTV)", "Vigilância Armada"].map(sys => (
                  <label key={sys} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-1.5 hover:bg-slate-50 rounded transition-colors border border-transparent hover:border-slate-200">
                    <input 
                      type="checkbox" 
                      className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                      checked={perfilRisco.sistemasProtecao.includes(sys)} 
                      onChange={() => gerenciarCheckboxSeguranca(sys)} 
                    />
                    {sys}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* GRADE DE COBERTURAS - ROLAGEM HORIZONTAL E VERTICAL OTIMIZADA PARA 100% DE ZOOM */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh] w-full border-collapse">
              <table className="w-full text-left border-collapse min-w-[1200px] text-xs">
                <thead className="sticky top-0 z-20 bg-slate-100 border-b-2 border-slate-200 shadow-sm">
                  <tr className="text-slate-700 uppercase tracking-wider font-semibold">
                    <th className="p-3 w-10 text-center align-middle bg-slate-100">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        checked={todosSelecionados}
                        onChange={alternarTodos}
                        title="Marcar/Desmarcar todas"
                      />
                    </th>
                    <th className="p-3 w-12 text-center align-middle border-r border-slate-200 bg-slate-100 font-bold">N°</th>
                    <th className="p-3 min-w-[160px] max-w-[200px] align-middle bg-slate-100 font-bold">Cobertura</th>
                    <th className="p-3 min-w-[260px] max-w-[320px] align-middle bg-slate-100 font-bold">O que protege na prática</th>
                    <th className="p-3 min-w-[260px] max-w-[320px] align-middle bg-slate-100 font-bold">Exemplos comerciais para fortalecer o argumento</th>
                    <th className="p-3 min-w-[240px] max-w-[300px] align-middle border-r border-slate-200 bg-slate-100 font-bold">Por que ela é importante / não é substituta</th>
                    
                    {opcoes.map((opt: any, idx: number) => (
                      <th key={opt.id} className="p-3 font-bold text-slate-800 text-center border-l border-slate-200 min-w-[160px] max-w-[200px] align-middle bg-slate-200/60">
                        {opt.base_seguradoras?.nome || `Opção ${idx + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {listaCoberturas.map((cob, index) => {
                    const isAtiva = coberturasAtivas.includes(cob.id);
                    return (
                      <tr key={cob.id} className={`hover:bg-slate-50/80 transition-colors ${!isAtiva ? 'opacity-40 bg-slate-50/50' : ''}`}>
                        <td className="p-3 text-center align-middle">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            checked={isAtiva}
                            onChange={() => {
                              if (isAtiva) {
                                setCoberturasAtivas(prev => prev.filter(id => id !== cob.id));
                              } else {
                                setCoberturasAtivas(prev => [...prev, cob.id]);
                              }
                            }}
                          />
                        </td>
                        <td className="p-3 font-bold text-center text-slate-500 align-middle border-r border-slate-100">
                          {cob.numero || index + 1}
                        </td>
                        <td className="p-3 align-middle font-semibold text-slate-800 break-words max-w-[200px]">
                          <div>{cob.nome}</div>
                          {cob.id.startsWith("custom_") && (
                            <button 
                              onClick={() => deletarCoberturaCompletamente(cob.id)}
                              className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-1 mt-1 font-medium"
                            >
                              <Trash2 className="w-3 h-3" /> Remover
                            </button>
                          )}
                        </td>
                        <td className="p-3 align-middle leading-relaxed break-words whitespace-normal max-w-[320px] text-[11px] text-slate-600">
                          {cob.oqueProtege}
                        </td>
                        <td className="p-3 align-middle leading-relaxed break-words whitespace-normal max-w-[320px] text-[11px] text-slate-600 bg-slate-50/50">
                          {cob.exemploPratico}
                        </td>
                        <td className="p-3 align-middle leading-relaxed break-words whitespace-normal max-w-[300px] text-[11px] text-slate-600 border-r border-slate-100">
                          {cob.importancia}
                        </td>
                        
                        {opcoes.map((opt: any) => (
                          <td key={opt.id} className="p-3 border-l border-slate-100 align-middle min-w-[160px]">
                            <input
                              type="text"
                              disabled={!isAtiva}
                              className="w-full text-center py-2 px-1 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-xs font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 transition-all shadow-inner"
                              value={valoresMatriz[opt.id]?.[cob.id] || "R$ 0,00"}
                              onChange={(e) => {
                                const valorFormatado = aplicarMascaraMoeda(e.target.value);
                                atualizarCelula(opt.id, cob.id, valorFormatado);
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}

                  <tr className="bg-slate-100 border-t-2 border-slate-300">
                    <td colSpan={6} className="p-3 text-right font-bold text-slate-700 uppercase tracking-wide">
                      Forma de Pagamento
                    </td>
                    {opcoes.map((opt: any) => (
                      <td key={`pgto-${opt.id}`} className="p-3 border-l border-slate-300 bg-slate-50">
                        <input
                          type="text"
                          className="w-full text-center p-2 border border-slate-300 rounded text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                          value={valoresMatriz[opt.id]?.formaPagamento || ""}
                          onChange={(e) => atualizarCelula(opt.id, "formaPagamento", e.target.value)}
                          placeholder="Ex: Boleto Bancário"
                        />
                      </td>
                    ))}
                  </tr>
                  
                  <tr className="bg-slate-100">
                    <td colSpan={6} className="p-3 text-right font-bold text-slate-700 uppercase tracking-wide">
                      Condição de Parcelamento
                    </td>
                    {opcoes.map((opt: any) => (
                      <td key={`parc-${opt.id}`} className="p-3 border-l border-slate-300 bg-slate-50">
                        <input
                          type="text"
                          className="w-full text-center p-2 border border-slate-300 rounded text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                          value={valoresMatriz[opt.id]?.parcelamento || ""}
                          onChange={(e) => atualizarCelula(opt.id, "parcelamento", e.target.value)}
                          placeholder="Ex: 4x sem juros"
                        />
                      </td>
                    ))}
                  </tr>

                  <tr className="bg-emerald-50/80 border-t-2 border-emerald-300">
                    <td colSpan={6} className="p-4 text-right font-black text-emerald-800 text-sm uppercase tracking-wide">
                      Investimento Total
                    </td>
                    {opcoes.map((opt: any) => (
                      <td key={`total-${opt.id}`} className="p-3 border-l border-emerald-300 bg-emerald-100/40">
                        <input
                          type="text"
                          className="w-full text-center py-2 px-1 border-2 border-emerald-400 rounded focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-black text-emerald-800 shadow-sm bg-white"
                          value={valoresMatriz[opt.id]?.valorTotal !== undefined 
                            ? (typeof valoresMatriz[opt.id]?.valorTotal === 'number' 
                                ? formatarMoeda(valoresMatriz[opt.id]?.valorTotal) 
                                : valoresMatriz[opt.id]?.valorTotal) 
                            : "R$ 0,00"}
                          onChange={(e) => {
                            atualizarCelula(opt.id, "valorTotal", aplicarMascaraMoeda(e.target.value));
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ADICIONAR NOVA COBERTURA COM TODAS AS COLUNAS */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              Adicionar Cobertura Extra à Grade
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end text-xs">
              <div className="md:col-span-3">
                <label className="block font-medium text-slate-600 mb-1">Nome da Cobertura</label>
                <input 
                  type="text" 
                  value={novoNome} 
                  onChange={e => setNovoNome(e.target.value)} 
                  className="w-full p-2 bg-white border border-slate-300 rounded outline-none focus:ring-2 focus:ring-emerald-500" 
                  placeholder="Ex: Danos ao Jardim" 
                />
              </div>
              <div className="md:col-span-3">
                <label className="block font-medium text-slate-600 mb-1">O que protege na prática</label>
                <input 
                  type="text" 
                  value={novoOqueProtege} 
                  onChange={e => setNovoOqueProtege(e.target.value)} 
                  className="w-full p-2 bg-white border border-slate-300 rounded outline-none focus:ring-2 focus:ring-emerald-500" 
                  placeholder="Descrição da proteção" 
                />
              </div>
              <div className="md:col-span-3">
                <label className="block font-medium text-slate-600 mb-1">Exemplo comercial</label>
                <input 
                  type="text" 
                  value={novoExemploPratico} 
                  onChange={e => setNovoExemploPratico(e.target.value)} 
                  className="w-full p-2 bg-white border border-slate-300 rounded outline-none focus:ring-2 focus:ring-emerald-500" 
                  placeholder="Exemplo para o cliente" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block font-medium text-slate-600 mb-1">Por que importa?</label>
                <input 
                  type="text" 
                  value={novoImportancia} 
                  onChange={e => setNovoImportancia(e.target.value)} 
                  className="w-full p-2 bg-white border border-slate-300 rounded outline-none focus:ring-2 focus:ring-emerald-500" 
                  placeholder="Argumento de venda" 
                />
              </div>
              <div className="md:col-span-1">
                <button 
                  onClick={adicionarNovaCoberturaManual} 
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white p-2 rounded font-medium transition-colors"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}