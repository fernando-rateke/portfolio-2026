# Plano: o portfólio em três atos

Decidido com o Fernando em 27/11/2026. Entrega do link: 30/11. Apresentação para a banca do SESI: 01–02/12.
O Vale (`/vale`) e o Tokyo Ghoul (`/tg`) ficam como estão, separados; não mexer neles.

## A estrutura

1. **Ato 1, o Japão** (`/` = `public/cidade`): quem o Fernando é.
   - Fica só: a rua, **uma loja** bem feita (a cafeteria) e a escadaria com os certificados (o quadro kōsatsu).
   - Sai: as outras lojas e **tudo a partir do santuário**: o santuário (haiden, mural de nomes, lanternas,
     quadro de emas), a árvore, a trilha, a floresta, o vale, o arrozal, a casa (minka), o lago e o torii do lago.
   - A loja: porta de verdade; o **sininho toca** enquanto o interior carrega; dentro, uma **folha** que, ao ser
     tocada, abre o currículo (o do Canva: `https://www.canva.com/design/DAGxm9Bd6lU/f8w8zNxuOLH2PDnrVvsAmQ/view?embed`)
     e um objeto do **"Sobre mim"** que abre o texto do PERFIL com a foto (`perfil/retrato.jpg`) ao lado.
     Na sala não aparece o currículo nem a foto; só a folha e o objeto.
   - **O torii do topo da escadaria (placa 神社) é a porta da Suzume**: de longe, dentro do vão dele aparece outro céu;
     a câmera atravessa e começa a transição para o Ato 2.
2. **Transição 1**: atravessar o torii leva ao céu do anoitecer acima das nuvens; luzes azuis e laranja (cores do
   SESI SENAI) desenham o Pavilhão no ar e ele se materializa.
3. **Ato 2, o Pavilhão SESI SENAI** (`/pavilhao`): um pavilhão de exposição do futuro, branco e curvo, sobre um espelho
   d'água, com faixas de luz azul e laranja. Cinco salas, **exatamente duas atividades cada** (lista abaixo), sem estoque.
4. **Transição 2**: na última sala a câmera entra numa tela; os pixels viram chuva; a chuva assenta na cidade neon.
5. **Ato 3, a cidade neon** (`/neon`): o futuro (texto FUTURO: 2027, Estados Unidos, jogos). Noite, chuva, canais
   refletindo o neon. É aqui também o final: **os agradecimentos** (o texto inteiro, `vale-src/textos/agradecimentos.md`)
   e **a cena de créditos** com a logo.
   - A cidade tem de ser muito bem feita e **pronta** (não feita à mão): detalhes que faltarem podem ser feitos.

## O roteiro do Ato 1 (feito)

- **Capa** (sem `?s` na URL): a câmera no alto da rua, o nome e "Começar" (Enter também).
- **Duas paradas**: a cafeteria (entra sozinha quando se vai pelo celular) e os certificados. O grande torii é passagem:
  a câmera desce na frente dele e segue a pé, por dentro dele, até os certificados (`rota` em `caminho.js`).
- **A porta**: dos certificados, "Atravessar a porta" sobe o resto da escadaria e cruza o torii do topo; o céu do outro
  lado cobre a tela antes de cruzar (atrás não há nada) e a página do Pavilhão abre (`porta.js`).
- **O mapa** só anda da rua até a porta. Ir a um lugar pelo celular sobe ao mapa e desce no lugar (`M.ir(id)`).
- **O celular** não tem cursor: mostra botões com nome do que dá para fazer agora (`M.acoes()` / `M.fazer(id)`; dentro
  da cafeteria `M.acoesDentro`), mais Fechar e uma faixa para rolar quando há um texto aberto. Meta do cronômetro: 8 min.

## O Ato 2, o Pavilhão SESI SENAI: uma feira de ciências (refeito em 27/11 a pedido do Fernando)

- O Fernando achou a galeria vazia e sem cara de SESI SENAI e escolheu: **feira de ciências**, com os **logos oficiais**
  (pegos da internet), **vídeo novo** na chegada e uma **parte só da Iniciação Científica**, falando o quanto ela
  contribuiu para a vida dele.
- `public/pavilhao/pavilhao.js` + `feira/` (galpão de Nicholas-3D; estande de fasih.lisan recolorido para cada matéria;
  estande maior de fasih.lisan para a Iniciação; gente de Loïc Norgeot; todos CC BY) + `img/sesi.png`, `img/senai.png`
  (logos 2024, Wikimedia Commons, CC BY-SA). Cores tiradas dos logos: azul #0e4194, verde #68b42d, laranja #e8490f.
- Corredor com tapete azul; estandes alternando os lados: Linguagens, Matemática, Ciências Humanas, Ciências da
  Natureza, Técnico. Cada estande: faixa com os logos e o nome, placa suspensa, balcão, dois cartazes (as atividades,
  "Abrir") e a TV alternando as duas. No fundo, o estande da **Iniciação Científica**: o título, um painel com as
  palavras do Fernando e "Ler", que abre os trechos do texto de agradecimentos sobre a Iniciação, sobre o que aprendeu
  com o prof. Wagner e sobre a equipe (sem inventar nada).
- A chegada é um vídeo (`chegada.webm`/`.mp4`): do céu da porta até a fachada com o nome do pavilhão, pelo portão
  (um plano de corte tira a parede na hora de passar) e pelo corredor até Linguagens.
- Da Iniciação, "Entrar na tela": a câmera entra na TV, os pixels caem e abre o Ato 3.
- As atividades continuam em `public/pavilhao/atividades.json` (campo vazio = "Em breve").

## As atividades (duas por matéria)

| Matéria | Atividade | Link / observação |
|---|---|---|
| Linguagens | Atividade dos Secos e Molhados (o jogo "Nós") | demo: https://nos-brown-psi.vercel.app/ · roteiro: https://github.com/Rateke/NOS · arte: Luana Lupi Vergara |
| Linguagens | Haketemodu (o modelo físico de Hollow Depths) | https://canva.link/0ezrw2vogp0kmkb |
| Matemática | Hollow Depths | https://game-nauy.onrender.com (link que já estava no site) |
| Matemática | Ciclo Trigonométrico | (o Fernando vai mandar) |
| Ciências Humanas | Era Vargas: galeria de fotos | https://vargas-nine.vercel.app/ |
| Ciências Humanas | Júri simulado: o julgamento de Vargas | (o Fernando vai mandar) |
| Ciências da Natureza | Vozes pelo Ambiente (jogo e teaser) | jogo: https://projeto-aguente.vercel.app/ · teaser: o anexo não chegou, pedir de novo |
| Ciências da Natureza | Extração de óleos essenciais | (o Fernando vai mandar) |
| Técnico | AcousticBuild | já está no site |
| Técnico | Hackathon | https://drive.google.com/file/d/19nnz9vLPuvkBfWm0xNttYP2UVHxVL53J/view |

O Fernando ainda vai mostrar e falar mais de cada uma (fotos, contexto, aprendizagens, competências, importância).
Não inventar nada: o que não veio dele fica em branco.

## O Ato 3, o futuro (montado)

- `public/neon/index.html` + `neon.js` + `textos.js` (os textos de `vale-src/textos/futuro.md` e `agradecimentos.md`,
  copiados sem mudar nada). Referência do Fernando: rua cheia de letreiros rosa, vermelho, laranja e ciano, chão molhado
  espelhando as cores, chuva, e **neblina onde não há nada** (vale para os outros mapas também).
- Modelos prontos (Sketchfab, CC BY): "Japanese street at night" (afx_cgmotion) é a rua, em `neon/modelos/rua.glb`
  (5,7 MB); "Cyberpunk City - #1" (born2012) é o horizonte, em `neon/modelos/torres.glb`.
- Feito em código: céu roxo, torres com janelas acesas e faixas de néon acima dos telhados, letreiros verticais com
  palavras de verdade (未来 futuro, 夢 sonho, ゲーム jogo, ラテケ, 感謝 gratidão, 二〇二七), o telão do Nós, camadas de
  neblina, chuva, respingos, chão molhado (reflexo de verdade, esticado na vertical) e brilho do néon (bloom).
  Resolução automática: se o computador não der conta, desenha com menos pixels.
- Três paradas: **O futuro** (hologramas 2027 · Estados Unidos · Jogos; "Ler o texto" abre o futuro.md inteiro),
  **Agradecimentos** (alguns passos à frente; "Ler o texto" abre o agradecimentos.md inteiro) e **Créditos** (a câmera
  avança devagar, os nomes sobem, no fim a logo e o nome, e "Voltar ao começo").
- A chegada: a chuva de pixels do Pavilhão continua enquanto a rua carrega e se apaga; o Pavilhão já baixa o Ato 3 no Técnico.

## Como fica leve

- **Uma página por ato** (`/`, `/pavilhao`, `/neon`): cada uma carrega só o seu mundo.
- Enquanto o visitante está num ato, a página do próximo é baixada em segundo plano (prefetch dos arquivos).
- A transição começa na página atual e continua na tela de carregamento da próxima (mesmo visual), até o mundo novo
  estar pronto (`M.prepararGPU`: texturas aos poucos e shaders em paralelo, sem travar).
- O controle pelo celular continua pareado de uma página para outra (o código fica guardado no navegador).
- O controle pelo celular **não usa cursor**: mostra a lista do que dá para abrir no lugar atual e o visitante toca.

## O que já existe e é reaproveitado

- Motor da cidade (`public/cidade/*.js`): carregamento sem travar, resolução automática, sombra em degraus, anim.js
  (vento e partículas na placa de vídeo), pergaminho (kakejiku) e rolo horizontal (emakimono) para textos longos,
  voo do pássaro (mapa do céu com carimbos), controle pelo celular (`public/controle`, `apresentacao.js`), créditos.
- O motor dos interiores (`lojas.js`): sala com porta de vidro, luz do sol, pendentes, cavaletes, estoque etc.

## O que o Fernando ainda vai mandar

- Fotos, contexto, aprendizagens, competências e importância das 10 atividades.
- O teaser do Vozes pelo Ambiente.
- Os certificados atualizados (o quadro da escadaria fica; ele atualiza depois da estrutura pronta).

## A neblina onde não há nada (pedido do Fernando, vale para todos os mapas)

- Cidade (`public/cidade/neblina.js`): um tapete de neblina densa (duas camadas) que acompanha o relevo e cobre todo o
  campo de perto, para o chão vazio não aparecer; a rua, a escadaria e o platô do torii ficam abertos, com bordas
  suaves. Mais uma faixa em pé no horizonte, na cor do céu do tema.
- Prédios (`cidade.js`, `fundos`): o fundo e as laterais ganharam janelas (algumas acesas, que brilham mais à noite),
  ar-condicionados e canos; os telhados ganharam casinha da escada, antenas e mais aparelhos.
- Ato 3: camadas de neblina no fim da rua, entre as torres e no céu baixo. Ato 2: o mar de nuvens em volta da galeria.
