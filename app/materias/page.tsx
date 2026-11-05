"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Navbar from "../components/Navbar";
import { onKeyActivate } from "../utils/a11y";
import Footer from "../components/Footer";

const SculptureScene = dynamic(() => import("../SculptureScene"), { ssr: false });

type SkillTag = {
  code: string;
  desc: string;
};

type Activity = {
  title: string;
  subject: string;
  trimester: 1 | 2 | 3;
  image?: string;
  modalImage?: string;
  embedIframeSrc?: string;
  videoUrl?: string;
  canvaLink?: string;
  url?: string;
  accessLabel?: string;
  links?: { label: string; url: string }[];
  reflection?: string;
  skills?: SkillTag[];
};

type Subject = {
  id: string;
  code: string;
  name: string;
  nameHighlight: string;
  category: "ensino-medio" | "curso-tecnico";
  description: string;
  icon: string;
  watermarkIcon: string;
  actionText: string;
  activities: Activity[];
};

type TrimestreFilter = "all" | Activity["trimester"];

const TRIMESTRE_FILTERS: { label: string; value: TrimestreFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "1º Trimestre", value: 1 },
  { label: "2º Trimestre", value: 2 },
  { label: "3º Trimestre", value: 3 },
];

const allSubjects: Subject[] = [
  {
    id: "natureza",
    code: "CN",
    category: "ensino-medio",
    name: "Ciências da",
    nameHighlight: "Natureza",
    icon: "ph-plant",
    watermarkIcon: "ph-plant",
    actionText: "VISUALIZAR",
    description: "Trabalhos envolvendo Biologia, Química e Física, explorando fenômenos naturais e sistemas em transformação.",
    activities: [
      {
        title: "Meme: Evolucionismo",
        subject: "Biologia · 1º Trimestre",
        trimester: 1,
        image: "/imagens/evolucionismo_meme.png",
        url: "/imagens/evolucionismo_meme.png",
        accessLabel: "Ver Imagem Original",
        skills: [
          { code: "C3", desc: "Determinar os impactos das ações humanas nos ambientes, identificando suas causas e propondo soluções para a sua redução." },
          { code: "H15", desc: "Comparar propostas de intervenção ambiental aplicando conhecimentos científicos e tecnológicos, observando os riscos e benefícios de sua implementação." },
          { code: "H18", desc: "Identificar situações de risco ambiental na cidade onde reside." },
        ],
        reflection: "Construção de um meme para a disciplina de Biologia a fim de explorar e contrastar os conceitos evolutivos. A atividade exigia a representação visual de teorias através do humor digital. Ao criar a ironia em cima do processo de seleção natural e adaptação das espécies, foi possível internalizar melhor os mecanismos seletivos que ocorrem ao longo das gerações.",
      },
      {
        title: "Combustíveis Fósseis & Poder Calorífico",
        subject: "Física / Química · 1º Trimestre",
        trimester: 1,
        image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=1200",
        url: "https://canva.link/DAHE8hNJVcQ/xuWPmiQMAqVdrltf6kQhvQ/view",
        accessLabel: "Ver Apresentação no Canva",
        skills: [
          { code: "C1", desc: "Compreender as ciências naturais e as tecnologias como construções humanas associadas à cultura dos povos e suas visões de mundo." },
          { code: "H1", desc: "Interpretar informações apresentadas em diferentes linguagens usadas nas Ciências." },
          { code: "C2", desc: "Aplicar os conceitos fundamentais e estruturas procedimentais das Ciências da Natureza na explicação de fenômenos cotidianos." },
          { code: "H9", desc: "Explicar os conceitos de energia, matéria, vida e transformação para explicar fenômenos." },
          { code: "H11", desc: "Empregar procedimentos e práticas de observação e experimentação para resolução de problemas." },
        ],
        reflection: "Apresentação desenvolvida a partir da pergunta norteadora: Se já sabemos que combustíveis fósseis poluem, por que ainda usamos? Investigamos os fatores químicos e socioeconômicos, comparando gasolina, etanol e diesel através do poder calorífico e do rendimento real dos motores. Concluímos que barreiras de infraestrutura e dependência energética são obstáculos tão grandes quanto a própria questão técnica.",
      },
      {
        title: "Relatório: Eletricidade por Atrito",
        subject: "Física Experimental · 1º Trimestre",
        trimester: 1,
        image: "https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?auto=format&fit=crop&w=1200",
        accessLabel: "Ver Relatório Técnico",
        skills: [
          { code: "C1", desc: "Compreender as ciências naturais e as tecnologias como construções humanas." },
          { code: "H1", desc: "Interpretar informações apresentadas em diferentes linguagens usadas nas Ciências." },
          { code: "C2", desc: "Aplicar os conceitos fundamentais e estruturas procedimentais na explicação de fenômenos." },
          { code: "H7", desc: "Compreender os conceitos relacionados à Química nos seus diferentes ramos." },
          { code: "H9", desc: "Explicar os conceitos de energia, matéria, vida e transformação." },
          { code: "H11", desc: "Empregar práticas de observação, coleta de dados e conclusões." },
        ],
        reflection: "Relatório da atividade prática sobre Eletricidade por Atrito. Investigamos a indução e polarização eletrostática através de diferentes materiais da série triboelétrica, analisando por que metais são condutores eficientes e como a conservação de cargas atua na transferência mecânica de elétrons.",
      },
      {
        title: "Mural Interativo: Saúde em Foco",
        subject: "Biologia & Saúde Pública · 2º Trimestre",
        trimester: 2,
        image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200",
        url: "https://drive.google.com/file/d/1ISe63WHaR66tTHsTT_puYA-wSvAitAm_/view",
        accessLabel: "Ver Relatório em PDF",
        links: [
          { label: "Ver Relatório em PDF", url: "https://drive.google.com/file/d/1ISe63WHaR66tTHsTT_puYA-wSvAitAm_/view" },
          { label: "Material Visual do Mural", url: "https://drive.google.com/file/d/1s-Zz2nm7l1aDNKVaQwXZYh0itdDmly9d/view?usp=drive_link" },
        ],
        skills: [
          { code: "H11", desc: "Empregar procedimentos de observação, coleta de dados e conclusões na resolução de problemas relacionados às Ciências da Natureza." },
          { code: "H15", desc: "Comparar propostas de intervenção ambiental, observando os riscos e os benefícios de sua implementação." },
          { code: "H18", desc: "Identificar situações de risco ambiental na cidade onde reside." },
          { code: "H23", desc: "Formular propostas individuais ou coletivas voltadas à preservação e à promoção da saúde." },
        ],
        reflection: "Construção de um painel científico interativo sobre a relação entre meio ambiente e saúde. Minha atuação esteve concentrada na seção de Epidemiologia, com foco na diferenciação conceitual e prática entre endemia, epidemia e pandemia a partir de dados da Dengue e da Covid-19. Participei ativamente da pesquisa, organização de tabelas/gráficos e validação do rigor científico das fontes sanitárias. (Nota: No momento não dispomos de foto do trabalho individual isolado; o projeto corresponde ao site e ao único QR Code grande visível na foto geral com todos os trabalhos da turma, e futuramente uma fotografia individual exclusiva será incluída).",
      },
      {
        title: "Seminário sobre Estequiometria na Indústria: Hidrogênio Verde",
        subject: "Química Industrial · 2º Trimestre",
        trimester: 2,
        image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200",
        url: "https://canva.link/6xtaiixq3h9renk",
        accessLabel: "Ver Seminário no Canva",
        skills: [
          { code: "H6", desc: "Compreender conceitos relacionados à Física em seus diferentes ramos." },
          { code: "H7", desc: "Compreender os conceitos relacionados à Química em seus diferentes ramos." },
          { code: "H9", desc: "Explicar os conceitos de energia, matéria, vida e transformação em fenômenos naturais e procedimentos tecnológicos." },
        ],
        reflection: "Seminário dedicado à análise da produção de hidrogênio verde por meio da eletrólise da água com uso de energia renovável. Demonstramos através de cálculos estequiométricos que a produção teórica de 100 toneladas de hidrogênio exige cerca de 900 toneladas de água. O trabalho investigou a viabilidade técnica, custos de produção, eficiência dos eletrolisadores, descarbonização industrial e o potencial estratégico do Brasil como exportador de matriz energética limpa.",
      },
      {
        title: "Cartilha “Eletricidade e o Corpo Humano”: Relatório Saúde em Foco",
        subject: "Ciências da Natureza & Biofísica · 2º Trimestre",
        trimester: 2,
        image: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=1200",
        url: "https://docs.google.com/document/d/1GBHMSXrC73zdzVipsbGKZUlj2xSZMs2m5162MnrJXJ4/edit?usp=sharing",
        accessLabel: "Ver Relatório no Google Docs",
        skills: [
          { code: "H3", desc: "Inferir o significado de termos técnico-científicos em textos de instrumentação ou divulgação científica." },
          { code: "H4", desc: "Identificar informações relevantes em textos, diagramas, gráficos, imagens e tabelas para compreender fenômenos das Ciências da Natureza." },
          { code: "H12", desc: "Relacionar informações para construir modelos em ciência e tecnologia." },
          { code: "H23", desc: "Formular propostas voltadas à preservação e à promoção da saúde individual e coletiva." },
        ],
        reflection: "Elaboração do relatório técnico-científico Saúde em Foco, documentando todo o processo de investigação multidisciplinar entre meio ambiente, fenômenos biofísicos e saúde pública. Aprofundei o levantamento de indicadores epidemiológicos de Dengue e Covid-19, enfrentando os desafios de filtrar bases de dados sanitárias confiáveis e sintetizar conceitos científicos em tabelas e textos claros.",
      },
      {
        title: "Portfólio Digital de Eletroquímica",
        subject: "Química Experimental · 2º Trimestre",
        trimester: 2,
        image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=1200",
        url: "https://fernandorateke.github.io/Natureza/",
        accessLabel: "Ver Portfólio Digital",
        skills: [
          { code: "H7", desc: "Compreender os conceitos relacionados à Química em seus diferentes ramos." },
          { code: "H9", desc: "Explicar os conceitos de energia, matéria, vida e transformação." },
          { code: "H11", desc: "Empregar observação, levantamento de hipóteses, experimentação, coleta de dados e conclusões." },
        ],
        reflection: "⚠️ Projeto em desenvolvimento — o vídeo está sendo editado e será adicionado em breve. Desenvolvimento e registro de um experimento laboratorial focado em reações de oxirredução e princípios de Eletroquímica. O trabalho detalha materiais, procedimentos práticos e transformações moleculares observadas, correlacionando a teoria dos potenciais de redução com as transferências de elétrons e a conversão mútua entre energia elétrica e energia química.",
      },
    ],
  },
  {
    id: "humanas",
    code: "CH",
    category: "ensino-medio",
    name: "Ciências",
    nameHighlight: "Humanas",
    icon: "ph-globe-hemisphere-west",
    watermarkIcon: "ph-globe-hemisphere-west",
    actionText: "VISUALIZAR",
    description: "Pesquisas sociológicas, linha do tempo histórica, geopolítica e discussões filosóficas.",
    activities: [
      {
        title: "Imperialismo — China",
        subject: "História · 1º Trimestre",
        trimester: 1,
        image: "/imagens/Imperialismo.png",
        url: "https://docs.google.com/document/d/1Q7P5cZxNsy_MuxwBBc5WnIbka_TOHeN1ok1CZg7kF3c/edit?usp=sharing",
        accessLabel: "Ver Artigo Completo",
        skills: [
          { code: "H8", desc: "Analisar as relações entre os agentes envolvidos no mundo do trabalho." },
          { code: "H10", desc: "Compreender as transformações no mundo do trabalho, geradas por mudanças na ordem econômica." },
          { code: "H12", desc: "Propor ações sustentáveis e eficientes visando a melhoria dos processos produtivos." },
        ],
        reflection: "Investiguei a colonização chinesa e as tensões geopolíticas pós-Revolução Industrial analisando fontes primárias. O desafio foi rastrear como as potências ocidentais justificavam o imperialismo sob uma perspectiva civilizatória enquanto extraíam recursos. Aprendi a distinguir narrativas de vencedores e vencidos em documentos históricos.",
      },
      {
        title: "A Grande Guerra",
        subject: "História / Comunicação · 1º Trimestre",
        trimester: 1,
        image: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200",
        url: "https://canva.link/DAHFb_bP_rI/VE3XPBFp5q2uxLqnJMAD_w/view",
        accessLabel: "Ver Jornal no Canva",
        skills: [
          { code: "H15", desc: "Reconhecer os movimentos sociais e sua representação da coletividade como elemento de transformação da realidade social, política, econômica e cultural." },
          { code: "H16", desc: "Compreender a relação entre ciência, tecnologia e sociedade e os efeitos dessa relação no contexto social, político e econômico." },
          { code: "H39", desc: "Relacionar o papel das instituições sociais às soluções para problemas políticos, econômicos, sociais e ambientais no contexto da sociedade brasileira." },
        ],
        reflection: "Realizei um roleplay jornalístico situado em 1916, escrevendo como repórter de guerra. O exercício de me colocar no contexto da época — sem saber o desfecho — foi revelador sobre como a propaganda moldava a percepção pública. Aprendi como a linguagem e a seleção de fatos constroem narrativas históricas que persistem por séculos.",
      },
      {
        title: "Geopolítica — Bolívia",
        subject: "Geografia / Território · 1º Trimestre",
        trimester: 1,
        image: "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200",
        url: "https://canva.link/DAHBNPTyecc/HpLEDmwZHYRBV6idI8-yqg/view",
        accessLabel: "Ver Apresentação no Canva",
        skills: [
          { code: "H6", desc: "Interpretar diferentes representações gráficas e cartográficas do espaço geográfico." },
          { code: "H11", desc: "Identificar os domínios morfoclimáticos e as características da natureza brasileira e sul-americana." },
          { code: "H21", desc: "Avaliar o impacto das tecnologias na organização do território e da produção." },
        ],
        reflection: "Pesquisa e cartografia digital sobre como acontecimentos territoriais atravessam a identidade e a política de um país. Mapeamos os recursos estratégicos como gás e lítio e como a perda do litoral impactou o desenvolvimento boliviano.",
      },
      {
        title: "Cinema e Totalitarismo: “O Pianista”",
        subject: "História & Sociedade · 2º Trimestre",
        trimester: 2,
        image: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=1200",
        url: "https://canva.link/sr87kot7n67clkq",
        accessLabel: "Ver Apresentação no Canva",
        skills: [
          { code: "H10", desc: "Compreender as transformações no mundo do trabalho geradas por mudanças na ordem econômica." },
          { code: "H22", desc: "Analisar, na perspectiva humana e social, as principais características e dinâmicas dos fluxos da sociedade." },
          { code: "H26", desc: "Comparar pontos de vista e ações práticas do indivíduo ou grupo social em diferentes contextos." },
          { code: "H27", desc: "Analisar hipóteses e questões ambientais, sociais, econômicas, políticas e culturais a partir de leituras e debates." },
        ],
        reflection: "Análise das dinâmicas do totalitarismo na Segunda Guerra Mundial através da obra cinematográfica 'O Pianista', acompanhando a trajetória de sobrevivência de Władysław Szpilman na Polônia ocupada. O estudo aprofundou as táticas de antissemitismo, propaganda estatal de massa, coerção violenta e o aparelhamento da indústria militar para enfraquecer liberdades civis, interferindo diretamente na cultura, na economia e no trabalho.",
      },
      {
        title: "Tratado de Versalhes e o Ressentimento Alemão",
        subject: "História Contemporânea · 2º Trimestre",
        trimester: 2,
        image: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=1200",
        url: "https://canva.link/zx0trbgncx1jfu8",
        accessLabel: "Ver Apresentação no Canva",
        links: [
          { label: "Ver Apresentação no Canva", url: "https://canva.link/zx0trbgncx1jfu8" },
          { label: "Ver Dossiê no Google Docs", url: "https://docs.google.com/document/d/1WgATy9HOj_1GVUNEbzHNNutjo6nQrOVKk3RgD1JPkoQ/edit?usp=sharing" },
        ],
        skills: [
          { code: "H10", desc: "Compreender as transformações no mundo do trabalho geradas por mudanças na ordem econômica." },
          { code: "H22", desc: "Analisar, na perspectiva humana e social, as principais características e dinâmicas dos fluxos da sociedade." },
          { code: "H26", desc: "Comparar pontos de vista e ações práticas do indivíduo ou grupo social em diferentes contextos." },
          { code: "H27", desc: "Analisar hipóteses e questões ambientais, sociais, econômicas, políticas e culturais a partir de leituras e debates." },
        ],
        reflection: "Elaboração de um dossiê histórico-analítico investigando o Tratado de Versalhes e o sentimento de revanchismo que culminou na 2ª Guerra Mundial. Mapeamos as duras indenizações financeiras, perdas territoriais, desmilitarização e o impacto psicológico do Artigo 231 (Cláusula de Culpa de Guerra) na desestabilização da República de Weimar e na ascensão de partidos extremistas.",
      },
      {
        title: "Tropicália — Sociedade e Política",
        subject: "História & Sociedade · 2º Trimestre",
        trimester: 2,
        image: "/imagens/tropicalia_card.jpg",
        embedIframeSrc: "https://www.canva.com/design/DAHSQ9Eo1-U/JfVR-UMWZ71Tow7Rr62k-g/view?embed",
        canvaLink: "https://www.canva.com/design/DAHSQ9Eo1-U/JfVR-UMWZ71Tow7Rr62k-g/view?utm_content=DAHSQ9Eo1-U&utm_campaign=designshare&utm_medium=embeds&utm_source=link",
        url: "https://www.canva.com/design/DAHSQ9Eo1-U/JfVR-UMWZ71Tow7Rr62k-g/view?utm_content=DAHSQ9Eo1-U&utm_campaign=designshare&utm_medium=embeds&utm_source=link",
        accessLabel: "Apresentação — Tropicália",
        links: [
          { label: "Apresentação — Tropicália", url: "https://www.canva.com/design/DAHSQ9Eo1-U/JfVR-UMWZ71Tow7Rr62k-g/view?utm_content=DAHSQ9Eo1-U&utm_campaign=designshare&utm_medium=embeds&utm_source=link" },
        ],
        skills: [
          { code: "H30", desc: "Analisar as lutas sociais e conquistas obtidas no que se refere às mudanças nas legislações ou nas políticas públicas." },
          { code: "H39", desc: "Relacionar o papel das instituições sociais às soluções para problemas políticos, econômicos, sociais e ambientais no contexto da sociedade brasileira e do mundo." },
          { code: "H40", desc: "Analisar o processo de formação das instituições sociais e políticas, compreendendo seu papel na sociedade." },
        ],
        reflection: "Apresentação oral individual sobre a Tropicália como movimento cultural, social e político no Brasil dos anos 1960–70. O trabalho examinou como artistas como Caetano Veloso, Gilberto Gil e Os Mutantes desafiaram a censura da ditadura militar através da música, da performance e da mistura de referências populares e eruditas. A apresentação relacionou a Tropicália às lutas sociais por liberdade de expressão, às transformações nas políticas públicas culturais e ao papel das instituições artísticas como agentes de resistência e transformação social.",
      },
    ],
  },
  {
    id: "linguagens",
    code: "LG",
    category: "ensino-medio",
    name: "Área de",
    nameHighlight: "Linguagens",
    icon: "ph-translate",
    watermarkIcon: "ph-translate",
    actionText: "VISUALIZAR",
    description: "Produções textuais, estudos da língua, artes, literatura e línguas estrangeiras.",
    activities: [
      {
        title: "A Paixão Segundo G.H.",
        subject: "Literatura · 1º Trimestre",
        trimester: 1,
        image: "https://img.youtube.com/vi/66sZjfvacSE/maxresdefault.jpg",
        url: "https://www.youtube.com/watch?v=66sZjfvacSE",
        accessLabel: "Assistir Ensaio Audiovisual",
        reflection: "Ensaio audiovisual sobre a obra de Clarice Lispector, traduzindo metáforas e conflitos do sujeito para uma linguagem visual e narrativa.",
      },
      {
        title: "Naturalismo — Jogo Educativo",
        subject: "Literatura Brasileira · 1º Trimestre",
        trimester: 1,
        image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1200",
        url: "https://canva.link/DAHCP-I0tb4/QMuWlVxaAfVN6jZV8QnEeg/view",
        accessLabel: "Acessar Jogo no Canva",
        reflection: "Conceitos do Naturalismo transformados em desafios interativos para relacionar literatura, história e denúncia social.",
      },
      {
        title: "Surrealismo",
        subject: "Produção Artística · 1º Trimestre",
        trimester: 1,
        image: "/imagens/atividade_surrealismo.jpg",
        accessLabel: "Ver Obra",
        reflection: "Registro visual de uma atividade autoral sobre linguagem surrealista, sonhos e composição de imagens.",
      },
      {
        title: "Videomanifesto — Produção Individual",
        subject: "Produção Audiovisual & Linguagens · 2º Trimestre",
        trimester: 2,
        image: "/imagens/videomanifesto_card.jpg",
        embedIframeSrc: "https://drive.google.com/file/d/1rzA0Gnr50FvaVOE63p17_7tYq47S5y7t/preview",
        url: "https://drive.google.com/file/d/1rzA0Gnr50FvaVOE63p17_7tYq47S5y7t/view?usp=drive_link",
        accessLabel: "Abrir no Google Drive",
        links: [
          { label: "Abrir no Google Drive", url: "https://drive.google.com/file/d/1rzA0Gnr50FvaVOE63p17_7tYq47S5y7t/view?usp=drive_link" },
        ],
        skills: [
          { code: "H3", desc: "Identificar o tema principal, os subtemas e as finalidades dos textos." },
          { code: "H24", desc: "Produzir textos escritos de domínio acadêmico e educacional." },
        ],
        reflection: "Produção individual de um videomanifesto autoral com temática urgente sobre os graves impactos sociais e a violência enfrentada pela população na Ilha do Marajó e no Ceará, abordando a atuação de facções criminosas como o Comando Vermelho que expulsam famílias e cidades inteiras de suas casas. Como referência e suporte conceitual para a construção crítica do manifesto, utilizo a obra cinematográfica 'Manas' para aprofundar o debate sobre vulnerabilidade, direitos humanos e negligência estatal.",
      },
      {
        title: "Inglês — “What kind of art do you consume?”",
        subject: "Língua Inglesa & Arte Digital · 2º Trimestre",
        trimester: 2,
        image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200",
        url: "https://docs.google.com/document/d/1dhVqPMC24qmtpvBhl9AwGbQ-bqFMtX-6XAkmuOpbnjQ/edit?usp=sharing",
        accessLabel: "Ver Atividade no Google Docs",
        skills: [
          { code: "H25", desc: "Interpretar textos em Língua Estrangeira Moderna — Inglês." },
        ],
        reflection: "Produção textual em inglês explorando os jogos eletrônicos sob a perspectiva de obras de arte e veículos de crítica social e impacto afetivo. Analisei os mundos, personagens e narrativas de Bloodborne e The Last of Us (Part I & II), além de apresentar o projeto autoral de jogo 'NÓS' (em desenvolvimento conjunto com Luana), que discute memória, traumas intergeracionais, família e construção de identidade.",
      },
      {
        title: "Desempenho no Red1000 — 2º trimestre",
        subject: "Redação & Língua Portuguesa · 2º Trimestre",
        trimester: 2,
        image: "/imagens/red1000_nota.png",
        modalImage: "/imagens/red1000_criterios.png",
        accessLabel: "Ver Avaliação dos Critérios",
        skills: [
          { code: "H22", desc: "Produzir textos técnicos de acordo com uma estrutura estabelecida." },
        ],
        reflection: "Produção de redação dissertativo-argumentativa no modelo oficial do Enem avaliada na plataforma Red1000, alcançando a pontuação de 960/1000. O resultado por competência consolidou 200 pontos em quatro eixos fundamentais: Língua Portuguesa (200), Tema e tipo textual (200), Coesão e articulação (200) e Proposta de intervenção (200), com 160 pontos em Argumentação e coerência.",
      },
    ],
  },
  {
    id: "matematica",
    code: "MT",
    category: "ensino-medio",
    name: "Área de",
    nameHighlight: "Matemática",
    icon: "ph-math-operations",
    watermarkIcon: "ph-math-operations",
    actionText: "VISUALIZAR",
    description: "Resoluções algébricas, geometria, estatística aplicada, probabilidade e raciocínio lógico.",
    activities: [
      {
        title: "Quebrando a Banca",
        subject: "Estatística e Probabilidade · 1º Trimestre",
        trimester: 1,
        image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200",
        accessLabel: "Ver Análise Estatística",
        skills: [
          { code: "H27", desc: "Compreender informações estatísticas provenientes de naturezas distintas." },
          { code: "H28", desc: "Calcular medidas de tendência central e de dispersão." },
        ],
        reflection: "Análise de probabilidade condicional e expectativa matemática a partir das estratégias apresentadas no filme.",
      },
      {
        title: "Hollow Depths",
        subject: "Game Design & Matemática · 1º Trimestre",
        trimester: 1,
        image: "/activities/hollow-depths.png",
        url: "https://game-nauy.onrender.com/",
        accessLabel: "Jogar / Acessar",
        reflection: "Um RPG de turno em que exploração e combate são orientados por probabilidade, cartas e leitura de variáveis numéricas.",
      },
      {
        title: "Existe uma crise silenciosa na nossa escola? — Saúde Mental",
        subject: "Estatística & Análise de Dados · 2º Trimestre",
        trimester: 2,
        image: "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1200",
        url: "https://canva.link/o6mrqow1ovg23bl",
        accessLabel: "Ver Apresentação no Canva",
        skills: [
          { code: "H27", desc: "Compreender informações estatísticas provenientes de naturezas distintas e formular juízos com base nessas informações." },
          { code: "H28", desc: "Calcular medidas de tendência central e de dispersão de um conjunto de dados e aplicá-las em diferentes situações." },
          { code: "H29", desc: "Construir tabelas e gráficos com recursos tecnológicos para simplificar cálculos e facilitar a leitura e a compreensão das informações." },
        ],
        reflection: "Pesquisa estatística aplicada sobre a saúde mental dos estudantes do Ensino Médio (amostra de 32 alunos via questionário anônimo). Mapeamos a frequência de estresse e privação de sono gerados por rotina escolar e vestibulares. A análise calculou média de ansiedade (3,97), variância (1,03), desvio padrão (1,02) e média de sono de 5,2 horas/noite, demonstrando na prática como a Estatística traduz experiências humanas complexas em diagnósticos confiáveis.",
      },
    ],
  },
  {
    id: "modelagem",
    code: "MS",
    category: "curso-tecnico",
    name: "Modelagem de",
    nameHighlight: "Sistemas",
    icon: "ph-tree-structure",
    watermarkIcon: "ph-tree-structure",
    actionText: "DOCUMENTAÇÃO",
    description: "Diagramas UML, requisitos de software e estruturação da arquitetura orientada.",
    activities: [
      {
        title: "Hackathon: Cibersegurança",
        subject: "UML, fluxo de dados e segurança · 1º Trimestre",
        trimester: 1,
        image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200",
        url: "https://www.canva.com/design/DAHG7DnrZ6c/VvuKwrdyThZjsrDJEObxZA/view",
        accessLabel: "Ver Documentação no Canva",
        skills: [
          { code: "H1", desc: "Reconhecer requisitos de qualidade, integridade, usabilidade e segurança da informação." },
          { code: "H4", desc: "Selecionar linguagem de programação de acordo com os requisitos." },
        ],
        reflection: "Modelagem de uma proposta integrada de segurança, banco de dados e dispositivos conectados sob pressão de tempo.",
      },
    ],
  },
  {
    id: "desenvolvimento",
    code: "DS",
    category: "curso-tecnico",
    name: "Desenvolvimento de",
    nameHighlight: "Sistemas",
    icon: "ph-code",
    watermarkIcon: "ph-code",
    actionText: "REPOSITÓRIO",
    description: "Implementação de algoritmos estruturados, APIs REST e programação orientada a objetos.",
    activities: [
      {
        title: "AcousticBuild — Plataforma de Previsões Acústicas",
        subject: "Desenvolvimento Web Full-Stack · 2º Trimestre",
        trimester: 2,
        image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200",
        embedIframeSrc: "https://www.canva.com/design/DAHOEXsnSiU/twMjG-Quo00LmeoNuiPzQg/view?embed",
        canvaLink: "https://www.canva.com/design/DAHOEXsnSiU/twMjG-Quo00LmeoNuiPzQg/view?utm_content=DAHOEXsnSiU&utm_campaign=designshare&utm_medium=embeds&utm_source=link",
        url: "https://www.canva.com/design/DAHOEXsnSiU/twMjG-Quo00LmeoNuiPzQg/view?utm_content=DAHOEXsnSiU&utm_campaign=designshare&utm_medium=embeds&utm_source=link",
        accessLabel: "Apresentação — AcousticBuild",
        videoUrl: "https://drive.google.com/file/d/1kC-pFY_rgKTiVAEkhKXlEsYN6WP5YFrU/preview",
        links: [
          { label: "Apresentação — AcousticBuild", url: "https://www.canva.com/design/DAHOEXsnSiU/twMjG-Quo00LmeoNuiPzQg/view?utm_content=DAHOEXsnSiU&utm_campaign=designshare&utm_medium=embeds&utm_source=link" },
          { label: "Protótipo no Figma", url: "https://www.figma.com/design/itGMzpxwezLRZ5aq1XkDc3/AcousticBuild?node-id=0-1&t=Dxhsf2FjqqYf4AYB-1" },
          { label: "Repositório no GitHub", url: "https://github.com/jjoaohartmann/SA-acousticBuild" },
          { label: "README do Projeto", url: "https://github.com/jjoaohartmann/SA-acousticBuild/blob/main/README.md" },
          { label: "Vídeo do Projeto", url: "https://drive.google.com/file/d/1kC-pFY_rgKTiVAEkhKXlEsYN6WP5YFrU/view" },
        ],
        skills: [
          { code: "H1", desc: "Reconhecer requisitos de qualidade, integridade, usabilidade e segurança da informação (interface responsiva, validação, JWT, hash Bcrypt e integridade)." },
          { code: "H4", desc: "Selecionar linguagem de programação de acordo com os requisitos (React/JS para interface, Python/FastAPI para servidor, SQLite e CSS Modules)." },
          { code: "H6", desc: "Aplicar linguagem de programação por meio de APIs, bibliotecas e frameworks na construção de rotinas de software (React, FastAPI, Axios, React Router, SQLAlchemy, JWT, Bcrypt)." },
        ],
        reflection: "O AcousticBuild é um projeto full-stack desenvolvido no curso técnico integrado à Iniciação Científica de Matemática, voltado à análise e previsão do desempenho acústico de edificações. Construímos uma interface moderna e responsiva com React no frontend, API RESTful com Python e FastAPI no backend, banco SQLite via SQLAlchemy, autenticação JWT e criptografia de senhas com Bcrypt, tornando cálculos de engenharia acústica acessíveis para arquitetos e projetistas.",
      },
    ],
  },
  {
    id: "programacao-aplicativos",
    code: "PA",
    category: "curso-tecnico",
    name: "Programação de",
    nameHighlight: "Aplicativos",
    icon: "ph-device-mobile",
    watermarkIcon: "ph-device-mobile",
    actionText: "APLICAÇÕES",
    description: "Desenvolvimento de aplicações móveis e interfaces modernas com foco em experiência do usuário e integração de serviços.",
    activities: [
      {
        title: "AcousticBuild — Plataforma de Previsões Acústicas",
        subject: "Desenvolvimento Web & Aplicativos · 2º Trimestre",
        trimester: 2,
        image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200",
        embedIframeSrc: "https://www.canva.com/design/DAHOEXsnSiU/twMjG-Quo00LmeoNuiPzQg/view?embed",
        canvaLink: "https://www.canva.com/design/DAHOEXsnSiU/twMjG-Quo00LmeoNuiPzQg/view?utm_content=DAHOEXsnSiU&utm_campaign=designshare&utm_medium=embeds&utm_source=link",
        url: "https://www.canva.com/design/DAHOEXsnSiU/twMjG-Quo00LmeoNuiPzQg/view?utm_content=DAHOEXsnSiU&utm_campaign=designshare&utm_medium=embeds&utm_source=link",
        accessLabel: "Apresentação — AcousticBuild",
        videoUrl: "https://drive.google.com/file/d/1kC-pFY_rgKTiVAEkhKXlEsYN6WP5YFrU/preview",
        links: [
          { label: "Apresentação — AcousticBuild", url: "https://www.canva.com/design/DAHOEXsnSiU/twMjG-Quo00LmeoNuiPzQg/view?utm_content=DAHOEXsnSiU&utm_campaign=designshare&utm_medium=embeds&utm_source=link" },
          { label: "Protótipo no Figma", url: "https://www.figma.com/design/itGMzpxwezLRZ5aq1XkDc3/AcousticBuild?node-id=0-1&t=Dxhsf2FjqqYf4AYB-1" },
          { label: "Repositório no GitHub", url: "https://github.com/jjoaohartmann/SA-acousticBuild" },
          { label: "README do Projeto", url: "https://github.com/jjoaohartmann/SA-acousticBuild/blob/main/README.md" },
          { label: "Vídeo do Projeto", url: "https://drive.google.com/file/d/1kC-pFY_rgKTiVAEkhKXlEsYN6WP5YFrU/view" },
        ],
        skills: [
          { code: "H1", desc: "Reconhecer requisitos de qualidade, integridade, usabilidade e segurança da informação (interface responsiva, validação, JWT, hash Bcrypt e integridade)." },
          { code: "H4", desc: "Selecionar linguagem de programação de acordo com os requisitos (React/JS para interface, Python/FastAPI para servidor, SQLite e CSS Modules)." },
          { code: "H6", desc: "Aplicar linguagem de programação por meio de APIs, bibliotecas e frameworks na construção de rotinas de software (React, FastAPI, Axios, React Router, SQLAlchemy, JWT, Bcrypt)." },
        ],
        reflection: "O AcousticBuild é um projeto full-stack desenvolvido no curso técnico integrado à Iniciação Científica de Matemática, voltado à análise e previsão do desempenho acústico de edificações. Construímos uma interface moderna e responsiva com React no frontend, API RESTful com Python e FastAPI no backend, banco SQLite via SQLAlchemy, autenticação JWT e criptografia de senhas com Bcrypt, tornando cálculos de engenharia acústica acessíveis para arquitetos e projetistas.",
      },
    ],
  },
  {
    id: "iot",
    code: "IO",
    category: "curso-tecnico",
    name: "IoT - Internet das",
    nameHighlight: "Coisas",
    icon: "ph-cpu",
    watermarkIcon: "ph-cpu",
    actionText: "CIRCUITOS",
    description: "Projetos eletrônicos, sensores para coleta contínua de metadados e segurança de hardware.",
    activities: [
      {
        title: "Hackathon: Cibersegurança & IoT",
        subject: "IoT e Proteção de Dispositivos · 1º Trimestre",
        trimester: 1,
        image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200",
        url: "https://www.canva.com/design/DAHG7DnrZ6c/VvuKwrdyThZjsrDJEObxZA/view",
        accessLabel: "Ver Arquitetura IoT",
        skills: [
          { code: "H01", desc: "Reconhecer especificações técnicas e paradigmas de IoT." },
          { code: "H05", desc: "Integrar projeto orientado a sensoriamento e controle." },
        ],
        reflection: "Proposta de camadas de proteção e criptografia para dispositivos integrados na ponta da rede.",
      },
      {
        title: "Atividade 1 — Acender LED",
        subject: "Eletrônica Básica & IoT · 2º Trimestre",
        trimester: 2,
        image: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&w=1200",
        url: "https://canva.link/xt8l4950oajtohy",
        accessLabel: "Ver Apresentação de IoT no Canva",
        skills: [
          { code: "H01", desc: "Reconhecer especificações técnicas e paradigmas de IoT." },
          { code: "H02", desc: "Integrar dispositivos para coleta automática de dados." },
          { code: "H03", desc: "Integrar dispositivos de comunicação de dados." },
          { code: "H04", desc: "Reconhecer especificações de sensoriamento e parametrização." },
          { code: "H05", desc: "Integrar projeto orientado a sensoriamento e controle." },
        ],
        reflection: "Montagem e programação de um circuito eletrônico inicial para controle de LED. O código enviou sinais digitais pelo pino do microcontrolador para acionar o componente físico, consolidando o entendimento sobre fluxo de corrente, polaridade de diodos emissores de luz e manipulação de saídas digitais em sistemas embarcados.",
      },
      {
        title: "Atividade 2 — Semáforo",
        subject: "Automação & Lógica de Controle · 2º Trimestre",
        trimester: 2,
        image: "/imagens/semaforo_prototipo.jpg",
        url: "https://canva.link/xt8l4950oajtohy",
        accessLabel: "Ver Apresentação de IoT no Canva",
        skills: [
          { code: "H01", desc: "Reconhecer especificações técnicas e paradigmas de IoT." },
          { code: "H02", desc: "Integrar dispositivos para coleta automática de dados." },
          { code: "H03", desc: "Integrar dispositivos de comunicação de dados." },
          { code: "H04", desc: "Reconhecer especificações de sensoriamento e parametrização." },
          { code: "H05", desc: "Integrar projeto orientado a sensoriamento e controle." },
        ],
        reflection: "Montagem e programação de um sistema de sinalização de semáforo com três LEDs (vermelho, amarelo e verde). O código estruturou a temporização precisa das fases (vermelho 5s, amarelo 4s e verde 3s), aplicando conceitos fundamentais de múltiplas saídas digitais, temporização não bloqueante e automação de processos urbanos.",
      },
      {
        title: "Atividade 3 — Controle de LED com botão: lógica Toggle",
        subject: "Entradas Digitais & Estado · 2º Trimestre",
        trimester: 2,
        image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200",
        url: "https://canva.link/xt8l4950oajtohy",
        accessLabel: "Ver Apresentação de IoT no Canva",
        skills: [
          { code: "H01", desc: "Reconhecer especificações técnicas e paradigmas de IoT." },
          { code: "H02", desc: "Integrar dispositivos para coleta automática de dados." },
          { code: "H03", desc: "Integrar dispositivos de comunicação de dados." },
          { code: "H04", desc: "Reconhecer especificações de sensoriamento e parametrização." },
          { code: "H05", desc: "Integrar projeto orientado a sensoriamento e controle." },
        ],
        reflection: "Desenvolvimento de circuito de acionamento por botão utilizando lógica Toggle (inversão e retenção de estado lógico a cada clique). O botão atuou como entrada digital sensível a pulsos elétricos e o LED como saída de resposta, praticando debounce, leitura de variáveis de estado e interação física com microcontroladores.",
      },
    ],
  },
  {
    id: "banco",
    code: "BD",
    category: "curso-tecnico",
    name: "Banco de",
    nameHighlight: "Dados",
    icon: "ph-database",
    watermarkIcon: "ph-database",
    actionText: "ESQUEMAS",
    description: "Modelagem E-R, tabelas e scripts avançados em SQL para manipulação e integridade dos dados.",
    activities: [
      {
        title: "Hackathon: Modelagem SQL & Proteção",
        subject: "Dados, Validação e Proteção · 1º Trimestre",
        trimester: 1,
        image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200",
        url: "https://www.canva.com/design/DAHG7DnrZ6c/VvuKwrdyThZjsrDJEObxZA/view",
        accessLabel: "Ver Esquemas SQL",
        skills: [
          { code: "H1", desc: "Reconhecer requisitos de integridade de banco de dados." },
          { code: "H6", desc: "Aplicar SQL na estruturação e integridade de dados." },
        ],
        reflection: "Estruturação de esquemas relacionais e proteção contra ataques e injeções SQL dentro de uma solução multidisciplinar.",
      },
    ],
  },
];

export default function MateriasPage() {
  const [tab, setTab] = useState<"ensino-medio" | "curso-tecnico">("ensino-medio");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTrimestre, setSelectedTrimestre] = useState<TrimestreFilter>("all");

  const openSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setSelectedTrimestre("all");
  };
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const onSceneReady = useCallback(() => {}, []);

  const currentSubjects = allSubjects.filter((s) => s.category === tab);

  const filteredActivities = selectedSubject
    ? selectedSubject.activities.filter(
        (a) => selectedTrimestre === "all" || a.trimester === selectedTrimestre
      )
    : [];

  return (
    <main>
      <SculptureScene mode="subjects" onReady={onSceneReady} />
      <div className="noise" aria-hidden="true" />

      {/* Zen Background Elements */}
      <div className="background-elements" aria-hidden="true">
        <div className="zen-circle"></div>
        <div className="zen-sun"></div>
      </div>

      <span className="kanji-watermark kanji-1" aria-hidden="true">
        技術
      </span>
      <span className="kanji-watermark kanji-2" aria-hidden="true">
        知識
      </span>

      <Navbar activePage="materias" />

      {/* ── VIEW 1: MAIN SUBJECTS GRID ── */}
      {!selectedSubject && (
        <section className="section" style={{ paddingTop: "130px", minHeight: "90vh" }}>
          <div className="container">
            <h1 className="section-title">
              Minhas <span className="gradient-text">Matérias</span>
            </h1>
            <p
              style={{
                textAlign: "center",
                color: "var(--text-secondary)",
                marginBottom: "3rem",
                maxWidth: "600px",
                marginInline: "auto",
              }}
            >
              Catálogo de projetos e avaliações separados por áreas de conhecimento.
            </p>

            <div className="tabs-header">
              <button
                className={`tab-btn ${tab === "ensino-medio" ? "active" : ""}`}
                onClick={() => setTab("ensino-medio")}
              >
                <i className="ph ph-graduation-cap"></i> Ensino Médio
              </button>
              <button
                className={`tab-btn ${tab === "curso-tecnico" ? "active" : ""}`}
                onClick={() => setTab("curso-tecnico")}
              >
                <i className="ph ph-terminal-window"></i> Curso Técnico
              </button>
            </div>

            {/* Focus Grid: Hovering one card brings it forward and blurs the other 3 + Tab Switch Animation */}
            <div key={tab} className="subjects-focus-grid tab-switch-enter">
              {currentSubjects.map((subject) => (
                <div
                  key={subject.id}
                  className="subject-card-interactive"
                  onClick={() => openSubject(subject)}
                  onKeyDown={onKeyActivate(() => openSubject(subject))}
                  role="button"
                  tabIndex={0}
                >
                  <i className={`ph ${subject.watermarkIcon} watermark-icon`}></i>
                  <i className={`ph ${subject.icon} subject-top-icon`}></i>
                  <h3 className="subject-card-title">
                    {subject.name} {subject.nameHighlight}
                  </h3>
                  <p className="subject-card-desc">{subject.description}</p>
                  <div className="subject-action-link">
                    <span>{subject.actionText}</span>
                    <i className="ph ph-arrow-right"></i>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── VIEW 2: SUBJECT DETAIL VIEW ── */}
      {selectedSubject && (
        <section className="section" style={{ paddingTop: "130px", minHeight: "90vh" }}>
          <div className="container">
            <button
              onClick={() => setSelectedSubject(null)}
              className="btn-outline"
              style={{ display: "inline-flex", marginBottom: "2rem" }}
            >
              <i className="ph ph-arrow-left"></i> Voltar para Matérias
            </button>

            {/* Title with italic green/accent and red underline */}
            <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
              <h1 className="section-title" style={{ marginBottom: "0.5rem" }}>
                {selectedSubject.name}{" "}
                <span style={{ color: "var(--sakura-color)", fontStyle: "italic" }}>
                  {selectedSubject.nameHighlight}
                </span>
              </h1>
              <div
                style={{
                  width: "50px",
                  height: "3px",
                  background: "var(--accent-color)",
                  borderRadius: "2px",
                  margin: "0.8rem auto 1.5rem",
                }}
              ></div>
              <p
                style={{
                  color: "var(--text-secondary)",
                  maxWidth: "680px",
                  margin: "0 auto",
                  fontSize: "1.02rem",
                  lineHeight: 1.8,
                }}
              >
                {selectedSubject.description}
              </p>
            </div>

            {/* Trimester Filter Pill Tabs */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "3.5rem",
              }}
            >
              {TRIMESTRE_FILTERS.map((pill) => (
                <button
                  key={pill.label}
                  onClick={() => setSelectedTrimestre(pill.value)}
                  className={`tab-btn ${selectedTrimestre === pill.value ? "active" : ""}`}
                  style={{
                    padding: "8px 22px",
                    fontSize: "0.85rem",
                    borderRadius: "20px",
                  }}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Activity Cards Grid */}
            <div className={`activity-cards-grid ${filteredActivities.length === 1 ? "single-card" : ""}`} style={filteredActivities.length === 1 ? { maxWidth: "760px", margin: "0 auto" } : undefined}>
              {filteredActivities.map((act, idx) => (
                <div
                  key={idx}
                  className="activity-card-item"
                  onClick={() => setActiveActivity(act)}
                  onKeyDown={onKeyActivate(() => setActiveActivity(act))}
                  role="button"
                  tabIndex={0}
                >
                  <div className="activity-card-media" style={act.embedIframeSrc && !act.image ? { aspectRatio: "16 / 9" } : { position: "relative" }}>
                    {act.image ? (
                      <img src={act.image} alt={act.title} />
                    ) : act.embedIframeSrc ? (
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          height: "100%",
                          background: "#0d0d0f",
                        }}
                      >
                        <iframe
                          loading="lazy"
                          style={{
                            position: "absolute",
                            width: "100%",
                            height: "100%",
                            top: 0,
                            left: 0,
                            border: "none",
                            pointerEvents: "none",
                          }}
                          src={act.embedIframeSrc}
                          title={`Vídeo — ${act.title}`}
                          allowFullScreen
                          allow="fullscreen"
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          background: "#161616",
                          display: "grid",
                          placeItems: "center",
                          color: "var(--accent-color)",
                          fontFamily: "var(--font-heading)",
                        }}
                      >
                        FR / REGISTRO
                      </div>
                    )}
                    {(act.embedIframeSrc || act.videoUrl) && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "grid",
                          placeItems: "center",
                          background: "rgba(0, 0, 0, 0.35)",
                          pointerEvents: "none",
                        }}
                      >
                        <i
                          className="ph ph-play-circle"
                          style={{
                            fontSize: "3rem",
                            color: "#ffffff",
                            filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.8))",
                          }}
                        ></i>
                      </div>
                    )}
                  </div>
                  <div className="activity-card-content">
                    <span className="activity-card-tag">{act.subject}</span>
                    <h3 style={{ marginTop: "6px" }}>{act.title}</h3>
                    <p>{act.reflection ? act.reflection.slice(0, 110) + "..." : "Clique para ver detalhes."}</p>
                    <div className="btn-link" style={{ marginTop: "auto" }}>
                      {(act.embedIframeSrc || act.videoUrl) ? "Assistir Vídeo" : "Ver Registro"} <i className="ph ph-arrow-right"></i>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredActivities.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "60px 0" }}>
                <i className="ph ph-folder-notch-open" style={{ fontSize: "2.5rem", marginBottom: "1rem", color: "var(--accent-color)" }}></i>
                <p>Nenhuma atividade registrada para este trimestre ainda.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── ACTIVITY DETAIL MODAL ── */}
      <div
        className={`gallery-lightbox ${activeActivity ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!activeActivity}
      >
        <button
          className="gallery-lightbox-close"
          onClick={() => setActiveActivity(null)}
          aria-label="Fechar"
        >
          FECHAR ×
        </button>
        {activeActivity && (
          <div className="gallery-lightbox-inner" style={{ maxWidth: "1000px" }}>
            <div style={{ maxHeight: "65vh", overflow: "hidden", borderRadius: "6px", background: "#050505" }}>
              {activeActivity.embedIframeSrc ? (
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: 0,
                    paddingTop: "56.25%",
                    boxShadow: "0 2px 8px 0 rgba(63, 69, 81, 0.16)",
                    overflow: "hidden",
                    borderRadius: "8px",
                    willChange: "transform",
                    background: "#101012",
                  }}
                >
                  <iframe
                    loading="lazy"
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      top: 0,
                      left: 0,
                      border: "none",
                      padding: 0,
                      margin: 0,
                    }}
                    src={activeActivity.embedIframeSrc}
                    title={`Vídeo — ${activeActivity.title}`}
                    allowFullScreen
                    allow="fullscreen"
                  />
                </div>
              ) : (activeActivity.modalImage || activeActivity.image) ? (
                <img
                  src={activeActivity.modalImage || activeActivity.image}
                  alt={activeActivity.title}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "300px",
                    background: "#181818",
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "6px",
                    color: "var(--accent-color)",
                    fontFamily: "var(--font-heading)",
                  }}
                >
                  FR / REGISTRO
                </div>
              )}
            </div>

            {/* Video embed for AcousticBuild */}
            {activeActivity.videoUrl && (
              <div style={{ marginTop: "16px" }}>
                <h4 style={{ fontSize: "0.85rem", color: "var(--accent-color)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>
                  <i className="ph ph-play-circle" style={{ marginRight: "6px" }}></i> Vídeo do Projeto
                </h4>
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: 0,
                    paddingTop: "56.25%",
                    overflow: "hidden",
                    borderRadius: "8px",
                    background: "#101012",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <iframe
                    loading="lazy"
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      top: 0,
                      left: 0,
                      border: "none",
                    }}
                    src={activeActivity.videoUrl}
                    allowFullScreen
                    allow="autoplay; fullscreen"
                    title="Vídeo — AcousticBuild"
                  />
                </div>
              </div>
            )}

            <div className="gallery-lightbox-info" style={{ maxHeight: "75vh", overflowY: "auto", paddingRight: "12px" }}>
              <span>{activeActivity.subject}</span>
              <h3>{activeActivity.title}</h3>
              <p
                style={{
                  color: "var(--text-secondary)",
                  lineHeight: 1.8,
                  fontSize: "0.95rem",
                  margin: "14px 0 20px",
                }}
              >
                {activeActivity.reflection || "Reflexão em desenvolvimento."}
              </p>

              {activeActivity.skills && activeActivity.skills.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ fontSize: "0.85rem", color: "var(--accent-color)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>
                    Competências & Habilidades
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {activeActivity.skills.map((sk, sIdx) => (
                      <div key={sIdx} style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        <strong style={{ color: "var(--text-primary)" }}>{sk.code}:</strong> {sk.desc}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeActivity.links && activeActivity.links.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "16px" }}>
                  {activeActivity.links.map((lnk, lIdx) => (
                    <a
                      key={lIdx}
                      href={lnk.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ display: "inline-flex", fontSize: "0.85rem", padding: "8px 16px" }}
                    >
                      {lnk.label} <i className="ph ph-arrow-square-out"></i>
                    </a>
                  ))}
                </div>
              ) : activeActivity.url ? (
                <a
                  href={activeActivity.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{ display: "inline-flex", marginTop: "16px" }}
                >
                  {activeActivity.accessLabel || "Abrir Arquivo Original"} <i className="ph ph-arrow-square-out"></i>
                </a>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
