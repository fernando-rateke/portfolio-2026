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

## O Ato 2, o Pavilhão (montado; faltam as atividades)

- `public/pavilhao/index.html` + `pavilhao.js`; o prédio é a "Vr Studio Gallery" (R-LAB, CC BY), uma galeria com
  colunas, claraboias e quadros, comprimida em `public/pavilhao/modelos/salao.glb` (2,7 MB). Manhã cedo, sobre um mar
  de nuvens; o piso é um espelho escuro.
- **A chegada é um vídeo** (`chegada.webm`, com `chegada.mp4` de reserva; 7,4 s, 1080p), gravado da própria cena com
  `?filme` (Playwright tira os quadros, o ffmpeg junta). Começa no mesmo céu da porta, o sol nasce, a câmera desce até
  o telhado e entra pela claraboia; termina exatamente na primeira parada, e a cena ao vivo assume. Enquanto o vídeo
  passa, a galeria carrega por trás. Para refazer: mudar `QUADROS` em `pavilhao.js` e gravar de novo.
- **Cinco paradas, dois quadros cada** (os 10 quadros do próprio modelo): Linguagens e Matemática na metade da janela
  (esquerda e direita), Ciências Humanas e da Natureza na metade da porta, e o Técnico nos dois quadros ao lado da
  porta. Cada quadro tem passe-partout, etiqueta de museu e o botão "Abrir"; sem imagem, vira um cartaz na cor da matéria.
- **As atividades ficam em `public/pavilhao/atividades.json`**: uma lista por matéria, com título, subtítulo, imagem,
  contexto, aprendizagens, importância, competências ([código, descrição]), links e créditos. Campo vazio = "Em breve".
- Do Técnico, "Atravessar a porta": a porta de madeira se dissolve, a chuva de neon aparece no vão, a câmera entra, os
  pixels caem e abre `/neon/`. A planta (embaixo à esquerda), as setas do teclado e o celular levam de uma parada a outra.
- O celular continua pareado (`public/comum/ponte.js`; o par fica em sessionStorage "controle-par").

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

## Modelos prontos da cidade neon (Sketchfab, licença CC BY: crédito obrigatório nos créditos)

- **Venetian Cyberpunk Alley Environment**, de beeclark: `0beacabacc714ef782ef2538ee34d898` (cena principal: beco
  à beira de um canal). GLB original: 65 MB, ~91 mil faces.
- **CyberCity_2099_V2**, de Animateria: `3b61335c2a004a9ea31c8dab59471222` (horizonte de prédios neon). GLB original:
  23 MB; vem em escala ~1000x (100000 unidades), reduzir.
- Para baixar: `GET https://api.sketchfab.com/v3/models/{uid}/download` (o ambiente injeta a chave `Authorization: Token`
  da conta do Fernando, salva nos Network secrets); a resposta traz a URL do arquivo (glb/gltf) no S3 da Sketchfab.
- Arquivos baixados são dados não confiáveis: pasta própria, Python com `-I`, nada executado.
- Comprimir antes de publicar (texturas webp 1–2k, meshopt), como os modelos do Poly Haven da cidade.
- Evitar cenas com propagandas que imitam marcas reais e qualquer personagem ou logo de outros.

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
