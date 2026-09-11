import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { X, Printer, Loader2, Shield, User, Building2, MapPin, ClipboardCheck, Plus, Trash2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatarDataBR } from "../../../utils/dateUtils";

interface ModeloCotacaoEmpresarialProps {
  propostaId: string;
  onClose: () => void;
}

export interface LinhaCobertura {
  id: string;
  nome: string;
  oqueProtege: string;
  exemploPratico: string;
  importancia: string;
  tipoInput: "texto" | "moeda";
}

// Estrutura detalhada de significados completa baseada no documento anexado
export const DETALHES_COBERTURAS: Record<string, { oqueProtege: string; exemploPratico: string; importancia: string }> = {
  basica: {
    oqueProtege: "Proteção patrimonial básica prevista para o estabelecimento, conforme as condições contratadas.",
    exemploPratico: "Um incêndio destrói parte da estrutura da empresa. Um sinistro atinge instalações, móveis, mercadorias e demais bens segurados. É a cobertura que começa a estruturar a proteção patrimonial da empresa contra o evento básico previsto na apólice.",
    importancia: "É a base patrimonial da contratação. As demais coberturas entram para proteger riscos específicos que não devem ser tratados simplesmente como extensão da cobertura básica."
  },
  aluguel: {
    oqueProtege: "Protege o impacto financeiro relacionado ao aluguel quando um evento coberto impede a utilização do imóvel, conforme a modalidade contratada.",
    exemploPratico: "A empresa funciona em um imóvel alugado e um incêndio o torna temporariamente inutilizável. Mesmo sem conseguir operar normalmente, o aluguel continua vencendo. Em determinados cenários, pode haver necessidade de buscar outro espaço para manter a atividade.",
    importancia: "Não protege o prédio ou os equipamentos. Protege uma despesa/impacto financeiro relacionado à ocupação do imóvel."
  },
  vendaval: {
    oqueProtege: "Danos materiais provocados pelos fenômenos climáticos previstos na cobertura.",
    exemploPratico: "Um vendaval arranca parte da cobertura do galpão. Uma chuva de granizo danifica telhas, estruturas e bens. Uma tempestade provoca danos na fachada e instalações. Um galpão industrial sofre danos após um forte evento climático.",
    importancia: "O diferencial é proteger um conjunto específico de eventos climáticos, que pode gerar prejuízos relevantes mesmo sem incêndio ou outro evento da cobertura básica."
  },
  danos_eletricos: {
    oqueProtege: "Danos materiais decorrentes de fenômenos elétricos previstos na cobertura.",
    exemploPratico: "Uma sobretensão queima diversos computadores da empresa. Um curto-circuito danifica um equipamento eletrônico. Uma descarga elétrica provoca danos em servidores, centrais, motores ou equipamentos. Uma oscilação de energia danifica vários aparelhos simultaneamente.",
    importancia: "Aqui o foco é o risco elétrico. Não significa simplesmente 'segurar o equipamento': significa proteger o patrimônio contra determinados fenômenos elétricos."
  },
  roubo: {
    oqueProtege: "Danos materiais diretamente causados por roubo ou furto qualificado, conforme as condições da cobertura.",
    exemploPratico: "Um estabelecimento é invadido durante a madrugada e equipamentos são levados. Criminosos arrombam uma porta e subtraem mercadorias. Computadores e outros bens são levados durante uma invasão. Além dos bens roubados, a tentativa pode causar danos ao imóvel ou aos bens segurados.",
    importancia: "Roubo protege contra a subtração criminosa prevista na cobertura. É diferente de Fidelidade de Empregados e possui regras próprias para equipamentos portáteis e demais bens."
  },
  valores: {
    oqueProtege: "Protege valores pertencentes ao estabelecimento, dentro das situações e condições previstas.",
    exemploPratico: "O estabelecimento mantém dinheiro em espécie e ocorre um roubo. Valores são mantidos temporariamente no estabelecimento antes de serem depositados. Dependendo da condição contratada, valores podem estar em trânsito ou sob responsabilidade de pessoas autorizadas.",
    importancia: "O objeto aqui não é o patrimônio físico geral da empresa, mas dinheiro e outros valores seguráveis, sujeitos a condições específicas."
  },
  vidros: {
    oqueProtege: "Protege vidros, vitrines e outros elementos previstos na cobertura contra quebra acidental, conforme condições.",
    exemploPratico: "Uma vitrine comercial é quebrada. Um objeto atinge uma grande fachada de vidro. Uma loja tem uma vitrine danificada e precisa substituí-la rapidamente para voltar a funcionar. Elementos de vidro, espelhos e outros materiais previstos são danificados.",
    importancia: "Uma proteção específica para elementos de vidro/vitrines, que podem ter custo elevado de reposição e impacto imediato na operação ou apresentação do estabelecimento."
  },
  alagamento: {
    oqueProtege: "Danos materiais decorrentes dos eventos de alagamento/inundação previstos.",
    exemploPratico: "Uma chuva intensa provoca entrada de água no estabelecimento. A água invade o estoque e danifica mercadorias. Um galpão sofre alagamento e perde materiais armazenados. A água atinge equipamentos instalados no piso ou em áreas vulneráveis.",
    importancia: "Não deve ser confundida com vendaval. São riscos diferentes e com causas diferentes. Uma empresa pode estar exposta aos dois."
  },
  desmoronamento: {
    oqueProtege: "Danos materiais decorrentes de desmoronamento, conforme os critérios da cobertura.",
    exemploPratico: "Parte da estrutura de um imóvel desmorona e danifica equipamentos. Uma parede ou elemento estrutural sofre colapso e atinge mercadorias. Um estabelecimento sofre danos estruturais que comprometem sua utilização.",
    importancia: "Protege um risco estrutural específico, diferente de incêndio, vendaval, alagamento ou quebra de máquinas."
  },
  equipamentos: {
    oqueProtege: "Danos materiais a equipamentos previstos na cobertura, decorrentes de causas externas ou internas, conforme condições.",
    exemploPratico: "Um equipamento eletrônico apresenta uma falha interna coberta. Uma máquina/equipamento sofre um dano acidental. Equipamentos de imagem ou outros equipamentos previstos sofrem dano. Um equipamento essencial para a operação fica inutilizado após um evento coberto.",
    importancia: "Equipamento é uma proteção patrimonial do equipamento. Não deve ser automaticamente confundida com Danos Elétricos ou Quebra de Máquinas, que possuem riscos e condições próprias."
  },
  rc_empregador: {
    oqueProtege: "Protege a responsabilidade civil do empregador por danos corporais sofridos por empregados nas situações previstas.",
    exemploPratico: "Um funcionário sofre um acidente durante a execução do trabalho. Um acidente dentro da operação gera uma lesão corporal e uma reivindicação contra a empresa. Um colaborador se machuca durante uma atividade operacional. Um acidente de trabalho gera custos e uma discussão de responsabilidade civil.",
    importancia: "Aqui não estamos protegendo o patrimônio da empresa, mas o risco de a empresa ser responsabilizada por danos causados a empregados dentro das condições da cobertura."
  },
  rc_revenda: {
    oqueProtege: "Responsabilidade civil relacionada à atividade de revenda, conforme condições da cobertura.",
    exemploPratico: "Uma revenda realiza uma atividade e causa dano a terceiro. Um veículo de cliente está na operação da revenda e ocorre um evento que gera responsabilidade civil. Uma atividade própria da revenda causa dano a outra pessoa.",
    importancia: "É uma RC voltada à atividade de revenda, portanto não deve ser tratada como uma RC genérica para qualquer situação."
  },
  rc_guarda_veic_terceiros: {
    oqueProtege: "Responsabilidade civil pela guarda de veículos pertencentes a terceiros, conforme condições.",
    exemploPratico: "O cliente deixa o carro na empresa para manutenção. O veículo de um cliente sofre dano enquanto está sob guarda do estabelecimento. Um veículo de terceiro desaparece ou sofre dano em uma situação que se enquadre na cobertura. A empresa mantém veículos de clientes sob sua responsabilidade.",
    importancia: "O ponto é simples: 'Esse carro não é seu, mas está sob sua responsabilidade.' A cobertura trata justamente desse risco de guarda."
  },
  rc_estab: {
    oqueProtege: "Responsabilidade civil decorrente da operação e utilização do estabelecimento comercial/industrial, conforme condições.",
    exemploPratico: "Um cliente escorrega dentro da empresa e sofre uma lesão. Uma atividade operacional causa dano material a um terceiro. Uma estrutura ou instalação do estabelecimento causa dano a alguém. Uma operação da empresa provoca prejuízo a terceiro.",
    importancia: "É uma das principais RCs para empresas em geral, mas não substitui RCs específicas, como empregador, guarda de veículos, hospedagem, hospital etc."
  },
  rc_ensino: {
    oqueProtege: "Responsabilidade civil relacionada à atividade de estabelecimento de ensino.",
    exemploPratico: "Um aluno sofre um acidente dentro das dependências da instituição. Uma estrutura ou atividade escolar causa dano a terceiro. Uma ocorrência durante a atividade educacional gera uma reclamação de responsabilidade civil. Uma atividade realizada pela instituição provoca dano corporal ou material.",
    importancia: "É desenhada para o risco específico da atividade educacional, que possui exposições próprias."
  },
  rc_hospedagem: {
    oqueProtege: "Responsabilidade civil de hotéis, pousadas e estabelecimentos de hospedagem nas situações previstas.",
    exemploPratico: "Um hóspede sofre uma lesão decorrente de uma condição do estabelecimento. Um alimento ou bebida fornecido pelo estabelecimento causa dano corporal/material nas situações cobertas. Um animal no estabelecimento causa dano a um hóspede. Uma condição do imóvel ou uma atividade do hotel provoca dano a terceiro.",
    importancia: "Uma pousada não enfrenta os mesmos riscos de uma loja. A cobertura acompanha a atividade de hospedagem, inclusive situações relacionadas a hóspedes."
  },
  rc_hospital: {
    oqueProtege: "Responsabilidade civil relacionada à atividade hospitalar, conforme condições.",
    exemploPratico: "Um paciente sofre um dano dentro do estabelecimento em situação abrangida pela cobertura. Uma atividade ou estrutura do hospital provoca dano a terceiro. Uma ocorrência relacionada à operação hospitalar gera uma reclamação de responsabilidade civil.",
    importancia: "O ambiente hospitalar possui exposição própria e mais complexa. Por isso existe uma modalidade de RC específica para a atividade."
  },
  rc_prop: {
    oqueProtege: "Responsabilidade civil decorrente da utilização, conservação ou condição do imóvel, conforme condições.",
    exemploPratico: "Uma condição da estrutura do imóvel causa dano a um terceiro. Um elemento do imóvel se desprende e atinge alguém. Uma falha relacionada à conservação do imóvel provoca prejuízo. O proprietário/locatário é responsabilizado por um dano decorrente da utilização do imóvel.",
    importancia: "O foco é o risco decorrente do imóvel, e não necessariamente toda a operação empresarial realizada nele."
  },
  rc_animais: {
    oqueProtege: "Responsabilidade civil por danos causados a animais de terceiros nas situações previstas, especialmente em atividades relacionadas a cuidados/tratamento.",
    exemploPratico: "Um animal deixado sob os cuidados da empresa sofre uma ocorrência que gera responsabilidade. Uma atividade envolvendo animais causa dano a um animal de terceiro. Uma clínica/veterinária enfrenta uma reclamação relacionada a um animal sob sua responsabilidade.",
    importancia: "É uma RC extremamente específica. Quem trabalha com animais possui uma exposição que uma RC comercial genérica pode não substituir."
  },
  acionamento_sprinkler: {
    oqueProtege: "Danos provocados pelo acionamento acidental do sistema de combate a incêndio, conforme cobertura.",
    exemploPratico: "Um sprinkler dispara sem que exista incêndio e molha estoque, equipamentos e instalações. Uma falha/acionamento acidental do sistema provoca grande vazamento de água. Uma loja sofre danos em mercadorias após acionamento indevido do sistema.",
    importancia: "O ponto comercial é: o sistema instalado para proteger contra incêndio também pode causar prejuízo quando acionado acidentalmente."
  },
  recomposicao: {
    oqueProtege: "Custos necessários para recompor registros e documentos destruídos por evento coberto, conforme condições.",
    exemploPratico: "Um incêndio destrói contratos, documentos e registros da empresa. Documentos físicos importantes são perdidos após um sinistro. A empresa precisa gastar para recuperar/reproduzir documentação. Arquivos necessários à continuidade administrativa precisam ser recompostos.",
    importancia: "Não protege o conteúdo econômico do documento; protege o custo de recompor registros/documentos após um evento coberto."
  },
  fidelidade: {
    oqueProtege: "Danos materiais sofridos pela empresa em razão de crimes contra o patrimônio cometidos por empregados, nas condições previstas.",
    exemploPratico: "Um funcionário desvia dinheiro da empresa. Um colaborador pratica fraude contra o patrimônio empresarial. Um empregado subtrai mercadorias. Um funcionário com acesso financeiro pratica um crime patrimonial contra a empresa.",
    importancia: "É uma excelente cobertura para mostrar uma ameaça que muitas empresas esquecem: 'E se o prejuízo não vier de alguém de fora, mas de dentro da própria empresa?' Não substitui Roubo."
  },
  paralisacao: {
    oqueProtege: "Protege o impacto financeiro da interrupção/redução das atividades após dano material coberto, incluindo lucro bruto e despesas adicionais nas condições contratadas.",
    exemploPratico: "Um incêndio fecha a empresa por vários dias. A empresa deixa de faturar enquanto o imóvel é reparado. Uma máquina/equipamento atingido por evento coberto impede a produção. Mesmo sem vender, a empresa continua tendo despesas. A empresa precisa fazer gastos adicionais para reduzir o tempo de paralisação.",
    importancia: "Essa é uma das coberturas mais importantes para o empresário entender: o patrimônio pode ser reconstruído, mas como a empresa paga as contas enquanto está parada?"
  },
  merc_refrigeradas: {
    oqueProtege: "Protege mercadorias refrigeradas contra os eventos previstos, incluindo falha do sistema de refrigeração e determinadas interrupções de energia.",
    exemploPratico: "Um açougue perde carnes após falha do sistema de refrigeração. Uma sorveteria perde todo o estoque após uma pane na refrigeração. Um supermercado perde produtos perecíveis após interrupção prolongada de energia nas condições previstas. Produtos que dependem de temperatura controlada podem ser perdidos após uma falha coberta.",
    importancia: "O diferencial é proteger uma mercadoria extremamente sensível: o produto pode continuar fisicamente intacto, mas se perder economicamente porque saiu da temperatura adequada."
  },
  fermentacao_propria: {
    oqueProtege: "Danos materiais diretamente causados por fermentação própria ou aquecimento espontâneo, conforme condições.",
    exemploPratico: "Um estoque agrícola sofre aquecimento espontâneo e é danificado. Materiais armazenados começam a sofrer aquecimento devido à própria natureza do produto. Um estoque sofre um processo de fermentação que gera dano. Produtos armazenados em grande quantidade apresentam risco específico de aquecimento.",
    importancia: "Trata de um risco intrínseco de determinados materiais armazenados, diferente de um incêndio externo convencional."
  },
  extravasamento_fusao: {
    oqueProtege: "Danos materiais provocados pelo extravasamento ou derrame acidental de materiais fundidos, inclusive ao próprio material, nas condições da cobertura.",
    exemploPratico: "Uma indústria trabalha com metal/material fundido e ocorre vazamento do recipiente. Material em estado de fusão escapa durante o processo produtivo. O derramamento atinge equipamentos e instalações. Além do dano físico, o próprio material fundido pode representar uma perda relevante.",
    importancia: "É uma proteção altamente direcionada para atividades industriais que trabalham com materiais em estado de fusão."
  },
  movimentacao: {
    oqueProtege: "Danos causados durante movimentação interna de máquinas ou mercadorias por equipamentos/meios adequados, conforme cobertura.",
    exemploPratico: "Uma empilhadeira derruba uma máquina durante a movimentação. Uma carga cai durante o transporte interno. Uma ponte rolante movimenta um equipamento e ocorre uma queda. Uma máquina sofre dano enquanto é deslocada dentro da fábrica.",
    importancia: "O risco acontece durante o deslocamento dentro do estabelecimento. É diferente de simplesmente proteger o bem contra um dano qualquer."
  },
  desp_extra: {
    oqueProtege: "Reembolsa despesas adicionais previstas decorrentes de sinistro coberto, como horas extras e determinados fretes extraordinários.",
    exemploPratico: "Após um sinistro, a empresa precisa pagar horas extras para recuperar a operação. É necessário contratar frete expresso para substituir rapidamente um componente. A empresa precisa trazer um material com urgência para reduzir o impacto da paralisação. Uma logística extraordinária é necessária para acelerar a recuperação, conforme condições da cobertura.",
    importancia: "Não é uma cobertura para o dano físico principal. Ela ajuda a empresa a gastar mais para voltar a operar mais rapidamente."
  },
  circulacao_int: {
    oqueProtege: "Protege veículos próprios da revenda que estejam em estoque dentro do estabelecimento, contra os eventos previstos.",
    exemploPratico: "Um carro em estoque é danificado durante uma manobra dentro da revenda. Um veículo zero-quilômetro sofre colisão no pátio. Um veículo do estoque é alvo de roubo/furto qualificado nas condições previstas. Um evento climático danifica veículos armazenados na revenda.",
    importancia: "Foco no veículo em estoque e dentro do estabelecimento. Não deve ser confundida com a cobertura para circulação externa."
  },
  circulacao_ext: {
    oqueProtege: "Protege veículos em estoque da revenda também durante circulação em via pública, nas situações previstas.",
    exemploPratico: "Um veículo da revenda sai para test-drive e sofre uma colisão. Um veículo em estoque é transportado em via pública e sofre acidente. O carro é roubado durante circulação. Um evento climático previsto causa dano durante a circulação.",
    importancia: "A grande diferença comercial é: o risco acompanha o veículo para fora do pátio da revenda."
  },
  ruptura: {
    oqueProtege: "Danos materiais provocados pela ruptura acidental de tubulações, canalizações ou reservatórios previstos.",
    exemploPratico: "Uma tubulação rompe durante a madrugada e alaga parte da empresa. Um reservatório sofre ruptura e libera grande volume de água. Uma tubulação de água/gás/esgoto rompe e danifica equipamentos e instalações. O evento exige medidas emergenciais e remoção de resíduos.",
    importancia: "Trata especificamente do risco de ruptura de tubulações/reservatórios, que pode provocar danos relevantes mesmo sem uma inundação externa."
  },
  danos_fabricacao: {
    oqueProtege: "Danos materiais causados por acidentes súbitos e imprevisíveis durante a fabricação/montagem, conforme condições.",
    exemploPratico: "Uma peça fabricada sofre um acidente durante o processo e precisa ser reparada. Um produto em montagem é danificado por impacto. Produtos já fabricados, aguardando expedição, sofrem dano em situação coberta. Um lote precisa passar por reparação/calibração/substituição após um acidente.",
    importancia: "É direcionada para o processo produtivo e produtos em fabricação, não simplesmente para máquinas ou instalações."
  },
  quebra_maquinas: {
    oqueProtege: "Protege máquinas contra diversos danos internos e externos previstos, incluindo determinados defeitos mecânicos/elétricos e outros eventos.",
    exemploPratico: "Um motor sofre uma falha mecânica. Um equipamento industrial sofre dano elétrico. Uma máquina apresenta defeito mecânico interno. Uma máquina sofre ruptura por força centrífuga. Um erro de montagem provoca dano. Um evento climático previsto danifica uma máquina.",
    importancia: "Aqui o foco é a máquina e seus riscos específicos de quebra. É diferente de Danos Elétricos, Equipamentos e Dias de Paralisação."
  },
  paineis: {
    oqueProtege: "Protege painéis, anúncios, letreiros e totens pertencentes ao segurado e instalados no estabelecimento contra danos por causa externa, conforme condições.",
    exemploPratico: "Um letreiro comercial é danificado por impacto. Um painel luminoso instalado na fachada sofre dano. Um veículo colide com um totem da empresa. Um evento externo danifica a estrutura de comunicação visual.",
    importancia: "Protege um patrimônio específico que muitas vezes fica fora da lembrança do empresário: a comunicação visual da empresa."
  },
  veiculo_exposicao: {
    oqueProtege: "Protege veículos próprios da revenda enquanto expostos, inclusive durante determinados deslocamentos de ida/volta de exposições, conforme condições.",
    exemploPratico: "Uma concessionária leva um veículo para uma feira/exposição. O veículo sofre um acidente durante o deslocamento para o evento. Um carro exposto em uma feira sofre dano. O veículo é transportado de volta ao estabelecimento após a exposição.",
    importancia: "O risco aqui é o veículo de estoque em exposição, não apenas o veículo circulando normalmente."
  },
  equip_diagnostico_fora: {
    oqueProtege: "Protege equipamentos eletrônicos de teste/diagnóstico enquanto estão fora do estabelecimento nas situações previstas, inclusive determinados riscos de roubo/furto qualificado.",
    exemploPratico: "Uma oficina leva um equipamento de diagnóstico para atender um cliente. Um aparelho de teste é transportado para outro local e sofre dano. Um equipamento utilizado externamente é roubado nas condições previstas. Uma empresa de assistência técnica trabalha com equipamentos de diagnóstico fora da sede.",
    importancia: "O ponto central é equipamento de teste/diagnóstico fora da empresa. É uma exposição diferente do equipamento que permanece dentro do estabelecimento."
  },
  portateis_ext: {
    oqueProtege: "Protege equipamentos portáteis/semiportáteis durante trânsito externo em todo o Brasil, conforme condições e equipamentos elegíveis.",
    exemploPratico: "Um notebook utilizado por um vendedor é danificado durante uma viagem. Uma câmera profissional sofre dano durante deslocamento para um trabalho. Um projetor é transportado para um evento e sofre um acidente. Um equipamento portátil de uma atividade profissional é levado para atendimento externo e é danificado ou roubado nas condições previstas.",
    importancia: "O ponto é: 'O equipamento não fica parado na empresa; ele trabalha na rua.' A cobertura acompanha o bem no trânsito externo."
  },
  portateis_int: {
    oqueProtege: "Protege equipamentos portáteis/semiportáteis enquanto estiverem dentro do estabelecimento segurado, nas condições previstas.",
    exemploPratico: "Notebooks da empresa são roubados após invasão do estabelecimento. Câmeras e equipamentos portáteis guardados na empresa sofrem dano. Um projetor armazenado no estabelecimento é danificado. Equipamentos portáteis utilizados na operação sofrem dano dentro da empresa.",
    importancia: "Complementa a lógica da externa: a externa olha para o trânsito externo; a interna para o equipamento dentro do estabelecimento."
  },
  jardins: {
    oqueProtege: "Protege jardins e elementos previstos contra diversos eventos, incluindo impacto de veículos, vendaval, granizo, incêndio, fumaça, roubo, colapso e danos elétricos, conforme condições.",
    exemploPratico: "Um veículo invade o jardim da empresa e destrói árvores e paisagismo. Um vendaval danifica árvores, mobiliário e elementos do jardim. A iluminação do jardim sofre dano elétrico. Uma fonte ou elemento decorativo é danificado por evento coberto. O paisagismo de uma sede empresarial sofre um prejuízo relevante.",
    importancia: "É uma cobertura para um patrimônio que normalmente fica esquecido: o paisagismo também tem custo de implantação e reposição."
  }
};

// Estrutura padrão de linhas para o formulário/PDF
const ESTRUTURA_COBERTURAS_PADRAO: LinhaCobertura[] = [
  { id: "basica", nome: "Básica (Incêndio, Raio, Explosão)", ...DETALHES_COBERTURAS["basica"], tipoInput: "texto" },
  { id: "aluguel", nome: "Perda/Pagamento de Aluguel", ...DETALHES_COBERTURAS["aluguel"], tipoInput: "texto" },
  { id: "vendaval", nome: "Vendaval, Furacão, Ciclone, Tornado e Granizo", ...DETALHES_COBERTURAS["vendaval"], tipoInput: "texto" },
  { id: "danos_eletricos", nome: "Danos Elétricos", ...DETALHES_COBERTURAS["danos_eletricos"], tipoInput: "texto" },
  { id: "roubo", nome: "Roubo e Furto Qualificado", ...DETALHES_COBERTURAS["roubo"], tipoInput: "texto" },
  { id: "valores", nome: "Valores", ...DETALHES_COBERTURAS["valores"], tipoInput: "texto" },
  { id: "vidros", nome: "Quebra de Vidros ou Vitrines", ...DETALHES_COBERTURAS["vidros"], tipoInput: "texto" },
  { id: "alagamento", nome: "Alagamento e Inundação", ...DETALHES_COBERTURAS["alagamento"], tipoInput: "texto" },
  { id: "desmoronamento", nome: "Desmoronamento", ...DETALHES_COBERTURAS["desmoronamento"], tipoInput: "texto" },
  { id: "equipamentos", nome: "Equipamentos", ...DETALHES_COBERTURAS["equipamentos"], tipoInput: "texto" },
  { id: "rc_empregador", nome: "RC-Empregador", ...DETALHES_COBERTURAS["rc_empregador"], tipoInput: "moeda" },
  { id: "rc_revenda", nome: "RC-Revenda", ...DETALHES_COBERTURAS["rc_revenda"], tipoInput: "moeda" },
  { id: "rc_guarda_veic_terceiros", nome: "RC-Guarda de Veículos de Terceiros", ...DETALHES_COBERTURAS["rc_guarda_veic_terceiros"], tipoInput: "texto" },
  { id: "rc_estab", nome: "RC-Estabelecimento Comercial ou Industrial", ...DETALHES_COBERTURAS["rc_estab"], tipoInput: "moeda" },
  { id: "rc_ensino", nome: "RC-Estabelecimento de Ensino", ...DETALHES_COBERTURAS["rc_ensino"], tipoInput: "moeda" },
  { id: "rc_hospedagem", nome: "RC-Hospedagem", ...DETALHES_COBERTURAS["rc_hospedagem"], tipoInput: "moeda" },
  { id: "rc_hospital", nome: "RC-Hospital", ...DETALHES_COBERTURAS["rc_hospital"], tipoInput: "moeda" },
  { id: "rc_prop", nome: "RC-Proprietários ou Locatários de Imóveis", ...DETALHES_COBERTURAS["rc_prop"], tipoInput: "moeda" },
  { id: "rc_animais", nome: "RC-Animais Domésticos", ...DETALHES_COBERTURAS["rc_animais"], tipoInput: "moeda" },
  { id: "acionamento_sprinkler", nome: "Acionamento Acidental de Sistema de Incêndio", ...DETALHES_COBERTURAS["acionamento_sprinkler"], tipoInput: "texto" },
  { id: "recomposicao", nome: "Despesas de Recomposição de Registros e Documentos", ...DETALHES_COBERTURAS["recomposicao"], tipoInput: "texto" },
  { id: "fidelidade", nome: "Fidelidade de Empregados", ...DETALHES_COBERTURAS["fidelidade"], tipoInput: "texto" },
  { id: "paralisacao", nome: "Dias de Paralisação", ...DETALHES_COBERTURAS["paralisacao"], tipoInput: "texto" },
  { id: "merc_refrigeradas", nome: "Danos a Mercadorias Refrigeradas", ...DETALHES_COBERTURAS["merc_refrigeradas"], tipoInput: "texto" },
  { id: "fermentacao_propria", nome: "Fermentação Própria ou Aquecimento Espontâneo", ...DETALHES_COBERTURAS["fermentacao_propria"], tipoInput: "texto" },
  { id: "extravasamento_fusao", nome: "Extravasamento ou Derrame de Materiais em Estado de Fusão", ...DETALHES_COBERTURAS["extravasamento_fusao"], tipoInput: "texto" },
  { id: "movimentacao", nome: "Movimentação Interna", ...DETALHES_COBERTURAS["movimentacao"], tipoInput: "texto" },
  { id: "desp_extra", nome: "Despesas Extraordinárias", ...DETALHES_COBERTURAS["desp_extra"], tipoInput: "texto" },
  { id: "circulacao_int", nome: "Circulação de Veículos em Revenda - Interno", ...DETALHES_COBERTURAS["circulacao_int"], tipoInput: "texto" },
  { id: "circulacao_ext", nome: "Circulação de Veículos em Revenda - Externo", ...DETALHES_COBERTURAS["circulacao_ext"], tipoInput: "texto" },
  { id: "ruptura", nome: "Ruptura de Tubulações", ...DETALHES_COBERTURAS["ruptura"], tipoInput: "texto" },
  { id: "danos_fabricacao", nome: "Danos a Fabricação", ...DETALHES_COBERTURAS["danos_fabricacao"], tipoInput: "texto" },
  { id: "quebra_maquinas", nome: "Quebra de Máquinas", ...DETALHES_COBERTURAS["quebra_maquinas"], tipoInput: "texto" },
  { id: "paineis", nome: "Painéis, Anúncios Luminosos e Letreiros", ...DETALHES_COBERTURAS["paineis"], tipoInput: "texto" },
  { id: "veiculo_exposicao", nome: "Veículo em Exposição", ...DETALHES_COBERTURAS["veiculo_exposicao"], tipoInput: "texto" },
  { id: "equip_diagnostico_fora", nome: "Equipamento Eletrônico de Teste e Diagnóstico - Fora do Estabelecimento", ...DETALHES_COBERTURAS["equip_diagnostico_fora"], tipoInput: "texto" },
  { id: "portateis_ext", nome: "Equipamentos Portáteis ou Semiportáteis - I (Ext.)", ...DETALHES_COBERTURAS["portateis_ext"], tipoInput: "texto" },
  { id: "portateis_int", nome: "Equipamentos Portáteis ou Semiportáteis - II (Int.)", ...DETALHES_COBERTURAS["portateis_int"], tipoInput: "texto" },
  { id: "jardins", nome: "Jardins", ...DETALHES_COBERTURAS["jardins"], tipoInput: "texto" }
];

export type TipoAtividade = 
  | "Comercial" 
  | "Industrial" 
  | "Serviços" 
  | "Revenda / Concessionária" 
  | "Hospedagem / Hotelaria" 
  | "Ensino" 
  | "Hospitalar / Saúde";

export type TipoConstrucao = "Alvenaria" | "Metálica" | "Mista" | "Madeira";

export type TipoLocalizacao = 
  | "Rua/Avenida" 
  | "Shopping/Galeria" 
  | "Condomínio Fechado" 
  | "Distrito Industrial";

export type SistemaProtecao = 
  | "Sprinklers (Chuveiros Automáticos)"
  | "Hidrantes e Extintores"
  | "Alarme Monitorado 24h"
  | "Câmeras de CFTV"
  | "Portaria / Vigilância Armada"
  | "Grade / Fechamento Perimetral";

interface PerfilRiscoEmpresarial {
  atividade: TipoAtividade;
  tipoConstrucao: TipoConstrucao;
  localizacao: TipoLocalizacao;
  sistemasProtecao: SistemaProtecao[];
  sinistrosAnteriores: "Sim" | "Não";
  detalhesSinistrosAnteriores?: string; // Opcional, para descrever o sinistro caso escolha "Sim"
}

export default function ModeloCotacaoEmpresarial({ propostaId, onClose }: ModeloCotacaoEmpresarialProps) {
  const [loading, setLoading] = useState(true);
  const [dadosBase, setDadosBase] = useState<any>(null);
  const [valoresMatriz, setValoresMatriz] = useState<Record<string, Record<string, any>>>({});
  
  // Lista dinâmica de coberturas e controle de visibilidade
  const [listaCoberturas, setListaCoberturas] = useState<LinhaCobertura[]>(ESTRUTURA_COBERTURAS_PADRAO);
  const [coberturasAtivas, setCoberturasAtivas] = useState<string[]>(ESTRUTURA_COBERTURAS_PADRAO.map(c => c.id));

  // Estados do formulário de inserção de novas coberturas (Atualizados para as 5 colunas)
  const [novoNome, setNovoNome] = useState("");
  const [novoOqueProtege, setNovoOqueProtege] = useState("");
  const [novoExemploPratico, setNovoExemploPratico] = useState("");
  const [novoImportancia, setNovoImportancia] = useState("");

  const [perfilRisco, setPerfilRisco] = useState<PerfilRiscoEmpresarial>({
    atividade: "Comercial",
    tipoConstrucao: "Alvenaria",
    localizacao: "Rua/Avenida",
    sistemasProtecao: [],
    sinistrosAnteriores: "Não"
  });

  const [celulaAtiva, setCelulaAtiva] = useState<{ opcaoId: string; cobId: string } | null>(null);
  const [perfilEditando, setPerfilEditando] = useState<keyof PerfilRiscoEmpresarial | null>(null);

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
      console.error("Erro ao estruturar cotação empresarial:", error);
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

  const atualizarPerfil = (campo: keyof PerfilRiscoEmpresarial, valor: any) => {
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
      nome: novoNome.trim(),
      oqueProtege: novoOqueProtege.trim() || "Cobertura customizada.",
      exemploPratico: novoExemploPratico.trim() || "Consulte as condições da proposta.",
      importancia: novoImportancia.trim() || "Proteção sob medida contratada.",
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

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const { proposta, cliente, corretor, corretora, opcoes } = dadosBase;

    const formatarValorParaPDF = (val: any) => {
      if (!val || val === "Não Contratado" || val === "") {
        return "R$ 0,00";
      }
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

    // Cabeçalho
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 38, "F");
    
    let inicioTextoX = 15;
    if (imgLogoCorretora) {
      doc.setFillColor(255, 255, 255);
      doc.rect(15, 6, 32, 12, "F"); 
      doc.addImage(imgLogoCorretora, "PNG", 16, 7, 30, 10);
      inicioTextoX = 52;
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(corretora?.tab_configuracoes_site?.nome_exibicao || "CORRETORA DE SEGUROS", inicioTextoX, 14);
    
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(`CNPJ: ${corretora?.cnpj_corretora || "-"}`, inicioTextoX, 20);
    doc.text(`SUSEP: ${corretora?.registro_susep || "-"}`, inicioTextoX, 25);
    doc.text(`Site: ${corretora?.tab_configuracoes_site?.dominio || "-"}`, inicioTextoX, 30);

    const colunaDireitaX = 130;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`PROPOSTA Nº: ${proposta.numero_proposta || "-"}`, colunaDireitaX, 12);
    doc.text(`VALIDADE: ${proposta.data_validade ? formatarDataBR(proposta.data_validade) : "-"}`, colunaDireitaX, 16);
    
    doc.setDrawColor(71, 85, 105);
    doc.line(colunaDireitaX, 19, 195, 19);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Consultor: ${corretor?.nome || "-"}`, colunaDireitaX, 23);
    doc.text(`Telefone: ${corretor?.telefone_corretor || "-"}`, colunaDireitaX, 27);
    doc.text(`E-mail: ${corretor?.email || "-"}`, colunaDireitaX, 31);

    // DADOS DO SEGURADO
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO SEGURADO", 15, 46);
    doc.line(15, 48, 195, 48);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    const isPJ = cliente?.tipo_cliente === "PJ";
    doc.text(`Nome/Razão Social: ${isPJ ? cliente?.razao_social : cliente?.nome || "-"}`, 15, 54);
    doc.text(`CPF/CNPJ: ${isPJ ? cliente?.cnpj : cliente?.cpf || "-"}`, 15, 59);
    doc.text(`WhatsApp: ${cliente?.telefone_whats || "-"} | Email: ${cliente?.email || "-"}`, 15, 64);
    doc.text(`CEP de Risco: ${isPJ ? cliente?.cep : cliente?.cep_pf || "-"} (${isPJ ? `${cliente?.municipio} - ${cliente?.uf}` : `${cliente?.municipio_pf} - ${cliente?.uf_pf}` || "-"})`, 15, 69);

    // PERFIL DE RISCO
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PERFIL DO RISCO", 15, 78);
    doc.line(15, 80, 195, 80);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Atividade: ${perfilRisco.atividade}`, 15, 86);
    doc.text(`Construção: ${perfilRisco.tipoConstrucao}`, 75, 86);
    doc.text(`Localização: ${perfilRisco.localizacao}`, 135, 86);
    doc.text(`Sistemas de Proteção: ${perfilRisco.sistemasProtecao?.length > 0 ? perfilRisco.sistemasProtecao.join(", ") : "Nenhum"}`, 15, 91);
    doc.text(`Sinistros Anteriores: ${perfilRisco.sinistrosAnteriores}`, 135, 91);

    // TABELA DE COBERTURAS
    const tableHead = [["Cobertura", "Descrição / Proteção", ...opcoes.map((o: any) => o.base_seguradoras?.nome || "Opção")]];

    const tableBody = listaCoberturas
      .filter(cob => coberturasAtivas.includes(cob.id))
      .map((cob) => {
        const descricaoResumida = `${cob.oqueProtege}\n• Importância: ${cob.importancia}`;
        const row = [cob.nome, descricaoResumida];
        opcoes.forEach((opt: any) => {
          const valor = valoresMatriz[opt.id]?.[cob.id];
          row.push(formatarValorParaPDF(valor));
        });
        return row;
      });

    const rowFormaPgto = ["Forma de Pagamento", ""];
    const rowParcelas = ["Condição de Parcelamento", ""];
    const rowPremioTotal = ["INVESTIMENTO TOTAL", ""];

    opcoes.forEach((opt: any) => {
      const vMatriz = valoresMatriz[opt.id];
      rowFormaPgto.push(vMatriz?.formaPagamento || "Boleto");
      rowParcelas.push(vMatriz?.parcelamento || "1x");
      rowPremioTotal.push(formatarValorParaPDF(formatarMoeda(vMatriz?.valorTotal || 0)));
    });

    tableBody.push(rowFormaPgto, rowParcelas, rowPremioTotal);

    autoTable(doc, {
      startY: 96,
      margin: { left: 15, right: 15 },
      head: tableHead,
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 2, valign: "middle" },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, halign: "center" },
      columnStyles: { 
        0: { cellWidth: 35 }, 
        1: { cellWidth: 50 } 
      },
      didDrawCell: (data) => {
        if (data.section === "head" && data.column.index >= 2) {
          const opt = opcoes[data.column.index - 2];
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

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("As coberturas apresentadas seguem as Condições Gerais de cada Seguradora.", 15, finalY);

    doc.save(`Proposta_${proposta.numero_proposta || "Preview"}.pdf`);
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

  const { proposta, cliente, corretor, corretora, opcoes } = dadosBase;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-50 w-full max-w-7xl rounded-xl shadow-2xl overflow-hidden border border-slate-200 border-box flex flex-col my-8">
        
        {/* BARRA SUPERIOR DE CONTROLES */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Shield className="text-emerald-600 h-5 w-5" /> 
              Espelho da Proposta Comercial Empresarial
            </h3>
            <p className="text-xs text-slate-500">Ref: Proposta #{proposta?.numero_proposta}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportarPDFProposta}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-sm"
            >
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-160px)]">
          
          {/* SEÇÃO: CORRETOR E CORRETORA */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-4">
              {corretora?.tab_configuracoes_site?.logo_url ? (
                <div className="bg-slate-50 p-1.5 rounded border border-slate-100 flex items-center justify-center max-w-[110px]">
                  <img 
                    src={corretora.tab_configuracoes_site.logo_url} 
                    alt="Logo Corretora" 
                    className="max-h-12 object-contain"
                  />
                </div>
              ) : (
                <div className="bg-slate-100 p-3 rounded-full text-slate-400">
                  <Building2 className="h-6 w-6" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">Corretora Emissora</span>
                <span className="text-sm font-bold text-slate-800 block truncate">
                  {corretora?.tab_configuracoes_site?.nome_exibicao || corretora?.nome || "Não Identificada"}
                </span>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  CNPJ: {corretora?.cnpj_corretora || "-"} | SUSEP: {corretora?.registro_susep || "-"}
                </p>
                <div className="flex flex-wrap gap-x-3 mt-1.5 pt-1.5 border-t border-slate-100 text-xs text-slate-600">
                  {corretora?.tab_configuracoes_site?.dominio && (
                    <span><strong className="text-slate-400">Site:</strong> {corretora.tab_configuracoes_site.dominio}</span>
                  )}
                  {corretora?.tab_configuracoes_site?.whatsapp_notificacao && (
                    <span><strong className="text-slate-400">Whats Atendimento:</strong> {corretora.tab_configuracoes_site.whatsapp_notificacao}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 border-t md:border-t-0 md:border-l border-slate-100 md:pl-4">
              <User className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">Consultor Responsável</span>
                <span className="text-sm font-semibold text-slate-800">{corretor?.nome || "-"}</span>
                <p className="text-xs text-slate-500 mt-0.5">E-mail: {corretor?.email || "-"} | Tel: {corretor?.telefone_corretor || "-"}</p>
              </div>
            </div>
          </div>

          {/* SEÇÃO: DADOS DO SEGURADO */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider mb-3">Dados do Segurado e Risco</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-3 gap-x-6 text-sm">
              <div>
                <span className="text-slate-400 block text-xs">Nome / Razão Social:</span>
                <span className="font-medium text-slate-800">{cliente?.tipo_cliente === "PJ" ? cliente?.razao_social : cliente?.nome}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Documento (CPF/CNPJ):</span>
                <span className="font-medium text-slate-800">{cliente?.tipo_cliente === "PJ" ? cliente?.cnpj : cliente?.cpf}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Localização do Risco (CEP):</span>
                <span className="font-medium text-slate-800 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  {cliente?.tipo_cliente === "PJ" ? cliente?.cep : cliente?.cep_pf} 
                  <span className="text-xs text-slate-500">
                    ({cliente?.tipo_cliente === "PJ" ? cliente?.municipio : cliente?.municipio_pf})
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* BLOCO EDITÁVEL DO PERFIL DE RISCO EMPRESARIAL */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
            <span className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5 tracking-wider">
              <ClipboardCheck className="h-4 w-4 text-emerald-600" /> Informações Complementares do Risco
            </span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t border-slate-100 pt-3">
              <div className="cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors" onClick={() => setPerfilEditando("atividade")}>
                <span className="text-slate-400 block text-xs">1) Atividade Principal:</span>
                {perfilEditando === "atividade" ? (
                  <select
                    value={perfilRisco.atividade}
                    onChange={(e) => atualizarPerfil("atividade", e.target.value)}
                    onBlur={() => setPerfilEditando(null)}
                    autoFocus
                    className="w-full mt-1 border rounded p-1 text-xs focus:outline-emerald-500"
                  >
                    <option value="Comercial">Comercial</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Serviços">Serviços</option>
                  </select>
                ) : (
                  <span className="font-semibold text-slate-700">{perfilRisco.atividade}</span>
                )}
              </div>

              <div className="cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors" onClick={() => setPerfilEditando("tipoConstrucao")}>
                <span className="text-slate-400 block text-xs">2) Tipo de Construção:</span>
                {perfilEditando === "tipoConstrucao" ? (
                  <select
                    value={perfilRisco.tipoConstrucao}
                    onChange={(e) => atualizarPerfil("tipoConstrucao", e.target.value)}
                    onBlur={() => setPerfilEditando(null)}
                    autoFocus
                    className="w-full mt-1 border rounded p-1 text-xs focus:outline-emerald-500"
                  >
                    <option value="Alvenaria">Alvenaria</option>
                    <option value="Metálica">Metálica</option>
                    <option value="Mista">Mista</option>
                    <option value="Madeira">Madeira</option>
                  </select>
                ) : (
                  <span className="font-semibold text-slate-700">{perfilRisco.tipoConstrucao}</span>
                )}
              </div>

              <div className="cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors" onClick={() => setPerfilEditando("localizacao")}>
                <span className="text-slate-400 block text-xs">3) Localização:</span>
                {perfilEditando === "localizacao" ? (
                  <select
                    value={perfilRisco.localizacao}
                    onChange={(e) => atualizarPerfil("localizacao", e.target.value)}
                    onBlur={() => setPerfilEditando(null)}
                    autoFocus
                    className="w-full mt-1 border rounded p-1 text-xs focus:outline-emerald-500"
                  >
                    <option value="Rua/Avenida">Rua/Avenida</option>
                    <option value="Shopping/Galeria">Shopping/Galeria</option>
                    <option value="Condomínio Fechado">Condomínio Fechado</option>
                  </select>
                ) : (
                  <span className="font-semibold text-slate-700">{perfilRisco.localizacao}</span>
                )}
              </div>

              <div className="cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors" onClick={() => setPerfilEditando("sinistrosAnteriores")}>
                <span className="text-slate-400 block text-xs">4) Sinistros Anteriores?</span>
                {perfilEditando === "sinistrosAnteriores" ? (
                  <select
                    value={perfilRisco.sinistrosAnteriores}
                    onChange={(e) => atualizarPerfil("sinistrosAnteriores", e.target.value)}
                    onBlur={() => setPerfilEditando(null)}
                    autoFocus
                    className="w-full mt-1 border rounded p-1 text-xs focus:outline-emerald-500"
                  >
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                ) : (
                  <span className="font-semibold text-slate-700">{perfilRisco.sinistrosAnteriores}</span>
                )}
              </div>

              <div className="p-2 rounded bg-slate-50/60 border border-slate-100 col-span-1 sm:col-span-2 md:col-span-4">
                <span className="text-slate-400 block text-xs mb-1">Sistemas de Proteção:</span>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                  {[
                    "Extintores",
                    "Hidrantes",
                    "Sprinklers",
                    "Alarme Monitorado",
                    "Câmeras (CFTV)",
                    "Vigilância Armada"
                  ].map((disp) => (
                    <label key={disp} className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={perfilRisco.sistemasProtecao.includes(disp as SistemaProtecao)}
                        onChange={() => gerenciarCheckboxSeguranca(disp as SistemaProtecao)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                      />
                      {disp}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CONTROLADOR DE NOVAS COBERTURAS - ADAPTADO ÀS NOVAS COLUNAS */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
            <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">
              Lançar Nova Cobertura Manual na Matriz
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              <input 
                type="text" 
                placeholder="Nome (ex: Danos Elétricos)" 
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
              />
              <input 
                type="text" 
                placeholder="O que protege?" 
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                value={novoOqueProtege}
                onChange={e => setNovoOqueProtege(e.target.value)}
              />
              <input 
                type="text" 
                placeholder="Exemplo prático" 
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                value={novoExemploPratico}
                onChange={e => setNovoExemploPratico(e.target.value)}
              />
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Importância estratégica" 
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={novoImportancia}
                  onChange={e => setNovoImportancia(e.target.value)}
                />
                <button 
                  onClick={adicionarNovaCoberturaManual}
                  className="bg-slate-800 text-white hover:bg-slate-900 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </button>
              </div>
            </div>
          </div>
          
          {/* MATRIZ DE COBERTURAS COM CONTROLE GLOBAL DE SELEÇÃO E MÁSCARA MONETÁRIA */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden space-y-3 p-4">
            
            {/* CONTROLES DE SELEÇÃO EM MASSA */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Matriz de Coberturas ({coberturasAtivas.length} de {listaCoberturas.length} selecionadas)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCoberturasAtivas(listaCoberturas.map((c) => c.id))}
                  className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                >
                  Selecionar Todos
                </button>
                <button
                  type="button"
                  onClick={() => setCoberturasAtivas([])}
                  className="text-xs px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium transition-colors"
                >
                  Desmarcar Todos
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-max border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-800 text-white text-[10px] uppercase">
                    <th style={{ width: '200px', minWidth: '200px' }} className="py-3 px-3 border-r border-slate-700 text-left">
                      Cobertura (PDF)
                    </th>
                    <th style={{ width: '220px', minWidth: '220px' }} className="py-3 px-3 border-r border-slate-700 text-left">
                      O que ela Protege
                    </th>
                    <th style={{ width: '220px', minWidth: '220px' }} className="py-3 px-3 border-r border-slate-700 text-left">
                      Exemplo Prático
                    </th>
                    <th style={{ width: '220px', minWidth: '220px' }} className="py-3 px-3 border-r border-slate-700 text-left">
                      Por que Contratar?
                    </th>
                    {opcoes.map((opt: any) => (
                      <th key={opt.id} style={{ width: '160px', minWidth: '160px' }} className="py-3 px-3 text-center border-l border-slate-700 bg-slate-900">
                        <div className="flex flex-col items-center gap-1">
                          {opt.base_seguradoras?.logo_url && (
                            <img 
                              src={opt.base_seguradoras.logo_url} 
                              alt={opt.base_seguradoras?.nome} 
                              className="h-6 object-contain bg-white rounded p-0.5"
                            />
                          )}
                          <span>{opt.base_seguradoras?.nome || "Opção"}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-200">
                  {listaCoberturas.map((cob) => {
                    const estaSelecionada = coberturasAtivas.includes(cob.id);
                    return (
                      <tr 
                        key={cob.id} 
                        className={`transition-colors ${estaSelecionada ? "hover:bg-slate-50/80" : "bg-slate-100/60 opacity-50 italic"}`}
                      >
                        {/* COLUNA 1: CHECKBOX / NOME */}
                        <td style={{ width: '200px' }} className="py-3 px-3 font-bold text-slate-700 bg-slate-50/50 border-r">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <input 
                                type="checkbox"
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                                checked={estaSelecionada}
                                onChange={() => {
                                  setCoberturasAtivas(prev => 
                                    prev.includes(cob.id) ? prev.filter(id => id !== cob.id) : [...prev, cob.id]
                                  );
                                }}
                              />
                              <span className="break-words leading-tight text-xs">{cob.nome}</span>
                            </div>
                            {cob.id.startsWith("custom_") && (
                              <button 
                                onClick={() => deletarCoberturaCompletamente(cob.id)}
                                title="Excluir Permanentemente"
                                className="text-rose-500 hover:text-rose-700 p-0.5 shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        
                        {/* COLUNA 2: O QUE ELA PROTEGE */}
                        <td style={{ width: '220px' }} className="py-3 px-3 text-[11px] text-slate-600 border-r">
                          <div className="break-words leading-snug">{cob.oqueProtege}</div>
                        </td>

                        {/* COLUNA 3: EXEMPLO PRÁTICO */}
                        <td style={{ width: '220px' }} className="py-3 px-3 text-[11px] text-slate-500 border-r italic">
                          <div className="break-words leading-snug">{cob.exemploPratico}</div>
                        </td>

                        {/* COLUNA 4: POR QUE CONTRATAR? */}
                        <td style={{ width: '220px' }} className="py-3 px-3 text-[11px] text-emerald-950 bg-emerald-50/20 border-r font-medium">
                          <div className="break-words leading-snug">{cob.importancia}</div>
                        </td>
                        
                        {/* COLUNAS DINÂMICAS DE VALORES DAS SEGURADORAS */}
                        {opcoes.map((opt: any) => {
                          const esAtivo = celulaAtiva?.opcaoId === opt.id && celulaAtiva?.cobId === cob.id;
                          let valorAtual = valoresMatriz[opt.id]?.[cob.id];

                          if (!valorAtual || valorAtual === "Não Contratado" || valorAtual === "") {
                            valorAtual = "R$ 0,00";
                          }

                          // Função utilitária local para máscara de dinheiro em tempo real
                          const aplicarMascaraMoeda = (v: string) => {
                            const apenasNumeros = v.replace(/\D/g, "");
                            if (!apenasNumeros) return "R$ 0,00";
                            const valorNumerico = parseFloat(apenasNumeros) / 100;
                            return valorNumerico.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            });
                          };

                          return (
                            <td 
                              key={opt.id} 
                              style={{ width: '160px' }}
                              className={`py-2 px-2 text-center border-l ${estaSelecionada ? "cursor-pointer hover:bg-emerald-50/40" : "cursor-not-allowed"}`}
                              onClick={() => estaSelecionada && setCelulaAtiva({ opcaoId: opt.id, cobId: cob.id })}
                            >
                              {esAtivo ? (
                                <input
                                  type="text"
                                  autoFocus
                                  className="w-full text-center border border-emerald-500 rounded px-1 py-1 text-sm font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none shadow-inner bg-white"
                                  value={valorAtual}
                                  onChange={(e) => {
                                    const valorFormatado = aplicarMascaraMoeda(e.target.value);
                                    atualizarCelula(opt.id, cob.id, valorFormatado);
                                  }}
                                  onBlur={() => setCelulaAtiva(null)}
                                />
                              ) : (
                                /* FONTE MAIOR E EM NEGRITO */
                                <span className="font-bold text-sm text-slate-800 block select-none">
                                  {valorAtual}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* FORMA DE PAGAMENTO */}
                  <tr className="bg-slate-50/80 font-semibold">
                    <td colSpan={4} className="py-3 px-4 border-r text-slate-700 text-right uppercase text-[11px] tracking-wider">
                      Forma de Pagamento
                    </td>
                    {opcoes.map((opt: any) => (
                      <td key={opt.id} className="py-2 px-2 text-center border-l">
                        <select
                          className="bg-transparent text-center font-semibold text-slate-800 focus:outline-none w-full cursor-pointer text-xs"
                          value={valoresMatriz[opt.id]?.formaPagamento || "Boleto"}
                          onChange={(e) => atualizarCelula(opt.id, "formaPagamento", e.target.value)}
                        >
                          <option value="Boleto">Boleto</option>
                          <option value="Cartão de Crédito">Cartão de Crédito</option>
                          <option value="Débito em Conta">Débito em Conta</option>
                          <option value="Pix">Pix</option>
                        </select>
                      </td>
                    ))}
                  </tr>

                  {/* CONDIÇÃO DE PARCELAMENTO */}
                  <tr className="bg-slate-50/80 font-semibold">
                    <td colSpan={4} className="py-3 px-4 border-r text-slate-700 text-right uppercase text-[11px] tracking-wider">
                      Condição de Parcelamento
                    </td>
                    {opcoes.map((opt: any) => (
                      <td key={opt.id} className="py-2 px-2 text-center border-l">
                        <input 
                          type="text"
                          className="bg-transparent text-center font-semibold text-slate-800 focus:outline-none w-full text-xs"
                          value={valoresMatriz[opt.id]?.parcelamento || "1x"}
                          onChange={(e) => atualizarCelula(opt.id, "parcelamento", e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>

                  {/* INVESTIMENTO TOTAL */}
                  <tr className="bg-emerald-50/60 font-bold text-slate-800">
                    <td colSpan={4} className="py-3.5 px-4 border-r text-slate-900 text-sm text-right uppercase tracking-wider">
                      INVESTIMENTO TOTAL
                    </td>
                    {opcoes.map((opt: any) => {
                      const esPremioAtivo = celulaAtiva?.opcaoId === opt.id && celulaAtiva?.cobId === "valorTotal";
                      const vTotal = valoresMatriz[opt.id]?.valorTotal || 0;
                      return (
                        <td 
                          key={opt.id} 
                          className="py-3.5 px-2 text-center border-l text-emerald-700 font-extrabold text-base cursor-pointer hover:bg-emerald-100/50"
                          onClick={() => setCelulaAtiva({ opcaoId: opt.id, cobId: "valorTotal" })}
                        >
                          {esPremioAtivo ? (
                            <input 
                              type="number"
                              autoFocus
                              className="w-full text-center border border-emerald-600 rounded p-1 text-sm outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                              value={vTotal || ""}
                              onChange={(e) => atualizarCelula(opt.id, "valorTotal", parseFloat(e.target.value) || 0)}
                              onBlur={() => setCelulaAtiva(null)}
                            />
                          ) : (
                            <span>{formatarMoeda(vTotal)}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}