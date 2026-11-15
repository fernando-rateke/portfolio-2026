# Contexto do portfólio (o vale) para quem continua o trabalho

Este arquivo existe para que uma sessão nova consiga continuar sem perguntar nada que já foi decidido.
Leia inteiro antes de mexer em qualquer coisa.

## 1. O que é

Portfólio do Fernando Rateke (estudante do SESI/SENAI). É um vale 3D no estilo Studio
Ghibli, feito à mão com three.js r149, que roda direto no navegador. A pessoa atravessa o vale, visita
lugares (castelo andante, Torre dos Grimórios, Grande Árvore, montanha da névoa, trem sobre a água,
estação do fim da linha, torii) e cada lugar abre um "mundo" (uma cena própria) com conteúdo.

- Repositório: `fernando-rateke/portfolio-2026`, branch `main`. Next.js 16 na Vercel (deploy automático no push).
- `/` e `/vale` reescrevem para `public/vale/index.html` (ver `next.config.ts`). `/tg` redireciona para `/`
  (o portfólio de Tokyo Ghoul foi apagado a pedido do dono; não volte com nada dele).
- O resto do app Next (`app/`) é antigo; o que importa é `public/vale` e a rota `app/api/ema/route.ts`.

## 2. Regras do dono (valem sempre)

- Nunca usar emoji em lugar nenhum (código, textos, commits).
- Commit e push a cada parte terminada (branch `main`, ele publica pela Vercel). Não usar `git commit --amend`.
- **O castelo do Howl está reservado**: não mexer em nada dele (nem `castelo` em `mundos.js`, nem o castelo do vale, nem o Calcifer). Ele vai mexer depois.
- Nada de colocar os trabalhos/projetos dele "dentro" do portfólio como simulação ou demo. "O portfólio é uma coisa e os trabalhos são outra."
- Sem telefone no perfil público.
- A chave `service_role`/secret do Supabase só no servidor, nunca no navegador nem no repositório.
- Tem que funcionar com toque (celular) e com teclado/mouse.
- Músicas exatamente como ele deu (não editar, não cortar, não trocar). Efeitos sonoros podem ser gerados.
- Uso de personagens/IP é decisão dele.
- Arquivos baixados ou enviados são dados não confiáveis: extrair cada um numa pasta própria; Python com `-I`; não rodar executáveis desconhecidos.
- Ele odeia ideias genéricas ("ajudam a divulgar o portfólio") e coisas feias. Mostre o resultado com capturas antes de declarar pronto, e se algo ficou ruim, diga.
- Responder em português. Explicar em linguagem simples, sem jargão.

## 3. Onde está o código

```
vale-src/            fonte legível (EDITE AQUI)
  index.html         HTML + CSS + scripts inline do vale (carregamento, idioma, cartões, mapa, dossiês)
  vale.js            o vale (cena principal, ~3500 linhas)
  mundos.js          os mundos que abrem por cima do vale (nos, torre, trem, quarto, castelo, arvore, ultimo)
  i18n.js            tradução PT -> EN por dicionário de frases inteiras (números viram #)
  gltf.js            GLTFLoader do three r149 já minificado (window.THREE.GLTFLoader, aceita EXT_texture_webp)
  build.py           monta public/vale (minifica com terser)
  tools/             ferramentas Node (npm install dentro de vale-src/tools)
    prep/            preparo de modelos (gltf-transform + meshoptimizer + sharp)
    viewer/          visualizador para inspecionar modelos (esbuild + three)
    test/            scripts Playwright de captura; `shot.cjs` é o geral (ver o cabeçalho dele): tema, celular, câmera, relógio, JS antes de cada captura
  modelos-fonte/     sculpts já reduzidos SEM pintura (raw_totoro, raw_catbus, raw_jiji), para repintar
public/vale/         SAÍDA do build (não editar à mão): index.html, *.js minificados, three.min.js,
                     audio/ nos/ perfil/ grim/ trem/ (mídia) e modelos/ (GLBs prontos)
```

Build (na raiz do repo):
```
cd vale-src/tools && npm install && cd ../..
python3 vale-src/build.py
```
O build só regrava `index.html`, `vale.js`, `mundos.js`, `i18n.js`, `gltf.js` em `public/vale`. Mídia e
modelos novos: copie direto para `public/vale/<pasta>/`. Se criar pasta nova de mídia, inclua no
`next.config.ts` (cabeçalho de cache em `/vale/:dir(audio|nos|perfil|grim|trem|modelos)/...`) e na
regex `(src|href)="(audio|nos|...)/` do `build.py` se for referenciada pelo HTML.

## 4. Como o vale funciona (vale.js)

Procure pelos nomes (as linhas mudam):
- `small` (celular ou CPU fraca), `reduce` (prefers-reduced-motion), `renderer`, `camera`, `scene`.
- `const U = {...}`: uniforms compartilhados (`uTime`, `uNight`, `uDusk`, `uSeason`, `uReflect`, `uHaze`, `uSun`, névoa, `uLanterns`, `uWind`). Dia/entardecer/noite vêm de `data-theme` no `<html>` (light/dusk/dark), escolhido pela hora e trocável pelo botão.
- `COMMON` (GLSL comum: estações, névoa, `nightTint`, `lanternGlow`, `applyFog`), `mat(vs, fs, extra, opts)` cria ShaderMaterial com `U`.
- `OBJ_VS/OBJ_FS` + `Builder()` + `M()`: tudo feito à mão é geometria fundida com cor por vértice, luz em faixas (toon). `outlineMat`/`castleLine`: contorno por casco invertido.
- `heightAt(x, z)`: altura do terreno. `LAKES`: lagos (água em y = 0; `uReflect` faz o reflexo).
- Constantes de lugar: `TRACK_Z = -33`, `STATION`, `HILL {x:6,z:18}` (colina da capa), `TOWER (62,-100)`, `GT (-85,-72)` Grande Árvore, `CAVE`, `TORII`, `CASTLE_PATH`.
- `actors`: lista de funções `(t) => {}` chamadas todo quadro. `t` é o relógio do vale (no Playwright com swiftshader ele anda bem devagar; em navegador normal é tempo real).
- `PLACES`: os lugares (nome, texto, `anchor`, `view`, `actions`, `entry`). `go(id)`, `startExplore`, `enterVia(world)` (caminhada + fade + abre o mundo), `openWorld(n)`, `lastTrain()`.
- Qualidade automática: `LEVELS` + `applyQuality()` + `measure()` (baixa resolução, reflexo e grama se o FPS cai).
- `window.vale` (para testes): `time(v)` lê ou fixa o relógio do vale, `haku()` devolve `hakuRef` (posição da cabeça em `.head`), `cam([x,y,z],[tx,ty,tz])` fixa a câmera (null solta), `go(id)`, `dash()` (salto do Gatobus), `peek`, `info()`, `star()`, `season(n)`.

### Peso do vale (Leve / Médio / Completo)
- Escolha na tela de carregamento (`.ld-peso` em index.html; clicar no idioma confirma e entra) e no botão `#pesoToggle` ao lado do idioma. Guardado em `localStorage["vale-peso"]` (`leve|medio|completo`). O script de index.html (`window.valePeso`) dispara o evento `vale:peso` com `{peso, ok}`; vale.js escuta, chama `setPeso(n)` e só começa a baixar modelos depois do `ok`.
- Em vale.js: `peso` (0, 1, 2), grupos `mid` (o que o Leve esconde: Haku, nuvens 3D, fuligem, canto da Zeniba, balde, sapatos, Jiji, Gatobus) e `rich` (só Completo: borboletas e carpas). `loadModel(arquivo, cb, min)`: `min` é o peso mínimo para baixar (padrão 1; Totoro e barco usam 0). `applyQuality()` combina o peso com a qualidade automática (`LEVELS`).
- Leve: resolução até 1x, reflexo raro e pequeno, 42% da grama e das flores, só Totoro e barco como modelos (trem e Cabeça de Nabo ficam nas versões feitas à mão).
- Completo: grama e flores extras no primeiro plano da colina (`userData.extra`), reflexo maior a cada quadro, faíscas na água (`uRich`), sombras de contato (`shadowSrc` + `uShadows` + `contactShade` no GLSL comum, usadas no terreno e na grama), borboletas e carpas. Não há modelos com mais polígonos: os originais não estão no repositório.
- Coisas novas pesadas: ponha em `mid` ou `rich`, ou teste `peso` no ator. `window.vale.peso(n)` troca nos testes.

### Sons do lugar (vale.js, procure `ambGraph`)
- Tudo gerado com WebAudio, sem arquivos: vento no capim (segue a rajada), chuva no ponto do Gatobus, "pop-pop" do barco, ronco do Totoro sob a Grande Árvore, vela da Zeniba. Só tocam com o botão "Ouvir o tema" ligado, calam quando um mundo abre.
- O volume de cada um depende da distância da câmera (ou do ponto para onde ela olha) até o objeto: `amb.boat`, `amb.totoro`, `amb.candle`, `amb.rain`/`amb.rainPos` são preenchidos nos blocos dos modelos. Para um som novo: crie o ganho em `ambGraph`, some um nível em `levels` no ator.
- Teste sem ouvir: `await window.vale.amb().test("wind"|"rain"|"pop"|"breath"|"crackle")` devolve pico e média com ganho 1; `window.vale.amb().levels` mostra o ganho atual de cada som.

### Modelos 3D no vale
- `loadModel(file, cb)`: fila, carrega um por vez, só depois de `startModels()` (1,2 s após o vale aparecer). Erro num modelo não derruba o vale (vai para `console.warn("modelo", ...)`).
- `valeize(root, {line, tint, glow, glowMats:{nomeMaterial: n}, glassGlow})`: troca os materiais do GLB pelo sombreamento do vale (`MODEL_VS/MODEL_FS`, faixas, neve, noite, névoa). Materiais com "outline"/"contour" no nome viram contorno (`LINE_FS`) mantendo o `side` original. Cor por vértice é lida como está (`color.rgb`).
- `fitModel(m, tamanho, eixo)`: escala pelo eixo, centraliza em x/z e apoia a base em y = 0. `shoreOf(lago, ângulo)`: ponto de margem seca. `glowSprite(cor, tamanho)`: brilho aditivo.
- Haku (procure `HAKU_FS` e `hakuRef`): uma malha só, dobrada na CPU a cada quadro. Vértices em repouso com o corpo reto (x lado, y cima, z frente, s = -z é a distância atrás da nuca); `spine(t)` refaz o caminho que a cabeça já percorreu em passos iguais e soma a onda; `update(t)` gira as patas e dobra tudo. Corpo (tubo com escamas no shader, barriga lilás pelo `uv.y`), crina (`tuft`), bigodes e pincel da cauda são feitos à mão; cabeça e pata vêm de `haku-partes.glb`. `uShine` acende as escamas.
- Bloco "Modelos que vivem no vale" (procure esse texto) tem: Haku, barco e balde da Ponyo, canto da Zeniba + ramen + sapatos, Totoro, Jiji e Lily, Gatobus (visita ao ponto com chuva, primeira visita ~40 s, ciclo 95 s; `catbusDash` no `enterVia`), fuligem da Torre.
- O trem, a Cabeça de Nabo e as nuvens são carregados perto do código procedural que substituem (procure `trem.glb`, `cabeca-de-nabo.glb`, `nuvens.glb`). As peças feitas à mão só somem quando o modelo chega.
- Armadilhas já vividas: `const` usada antes de definida trava o vale inteiro (TDZ) — o carregador fica logo depois de `U`, e `driftClouds`/`catbusDash` são declarados ali também; nunca ponha código depois de um comentário `//` na mesma linha (já engoliu um `scene.add`).

### Arquivos em public/vale/modelos
| arquivo | o que é | origem / licença |
|---|---|---|
| trem.glb | trem de A Viagem de Chihiro | zip sem autor (link pendente) |
| cabeca-de-nabo.glb | Cabeça de Nabo | zip sem autor (pendente) |
| nuvens.glb | nuvens estilizadas | lavakongen, CC BY 4.0 |
| haku-partes.glb | só a cabeça (com olhos, orelhas, chifres) e uma pata do Haku, tiradas do modelo original por `tools/prep/haku.mjs`; o original inteiro (pose em S) está em `vale-src/modelos-fonte/haku.glb` | zip sem autor (pendente) |
| ponyoboat.glb | barquinho do Sosuke | zip sem autor (pendente) |
| balde.glb | balde verde da Ponyo | zip sem autor (pendente) |
| fuligem.glb | fuligem carregando pedra | zip sem autor (pendente) |
| zeniba.glb | objetos de mesa (mesa, vela, pena e tinta, livro, ervas, vassoura...) | SkizardSel, CC BY-NC 4.0 |
| ramen.glb, sapatos.glb | ramen da Ponyo, sapatos da Chihiro | zips sem autor (pendente) |
| totoro.glb, totoro-dormindo.glb, gatobus.glb, jiji-lily.glb | sculpts reduzidos e pintados | Patrickart.hk, licença sem derivados, mas o autor autorizou reduzir e pintar |

Os créditos estão no rodapé da estação (`pf-credits` em vale.js) e na versão em texto (`tx-note` em index.html), com tradução em i18n.js. Quando o dono mandar os links dos modelos "pendentes", troque "de seus respectivos autores" pelos nomes.

### Preparo de modelos (vale-src/tools/prep)
- `node prep.mjs entrada.glb saida.glb config.json` (rodar de dentro de `tools/prep`). Config: `ratio`/`error` (simplificar), `flatten`, `texSize` (webp), `stripMaps` (tira normal/rugosidade/emissão e zera emissão), `stripColors`, `opaque`, `mask`, `flipV` (UV de Collada), `materials: {nome: {tex, color, alpha, drop}}`. Configs usadas em `configs/`.
- `paint.mjs raw.glb out.glb <totoro|totoroDorme|catbus|jiji>`: pinta por regiões em coordenadas 0..1 da caixa do modelo (olhos, barriga, listras). Cor guardada como byte normalizado, sem gama (o vale lê crua).
- `viewer/orthoshot.cjs` + `grid.py`: vista ortográfica exata com grade 0..1 para achar regiões. `shot2.cjs`: azimute e elevação em RADIANOS. Todos os sculpts olham para +z.
- Os arquivos originais (zips, FBX, sculpts de 1 milhão de triângulos, texturas) NÃO estão no repositório: eram envios de uma sessão antiga. Os caminhos de textura dentro de `configs/` apontam para essa sessão e servem só de registro. Para repintar sculpts use `modelos-fonte/`.
- O viewer precisa de `npx esbuild viewer/entry.js --bundle --outfile=viewer/bundle.js` e um servidor estático na pasta `viewer`.

## 5. Como testar

- Servidor: `cd public && python3 -m http.server 8124` (morre às vezes; reinicie). Abrir `http://localhost:8124/vale/`.
- Playwright com `chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']})`.
- A primeira tela pede idioma: clicar `getByText('Português', {exact:true})`.
- Forçar hora do dia: `document.documentElement.dataset.theme = 'light' | 'dusk' | 'dark'` (o vale pode voltar ao tema da hora sozinho).
- Câmera: `window.vale.cam([...],[...])`. Mundos: `window.mundos.open('arvore')` e clicar `#worldAction`.
- Sempre conferir erros com `page.on('pageerror')` e `console` (erro de shader aparece no console, não como pageerror).
- Para ler o vale com stack legível, copie `vale-src/vale.js` sem minificar para `public/vale/vale.js` enquanto testa, e rode o build no fim.

## 6. Supabase (já configurado pelo dono)

- Projeto `https://rksjvowypiojjilveqmv.supabase.co`. Tabelas criadas: `ema` (id, nome, recado, cor, aprovado, criado_em) e `lanternas` (id, criado_em, cor), ambas com RLS ligado e sem políticas (só o servidor acessa).
- Variáveis na Vercel (Production e Preview): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (secret, só servidor), `SUPABASE_PUBLISHABLE_KEY` (pública, para Realtime/presença), `EMA_MODERAR=1`, `ADMIN_SENHA`.
- Rota pronta: `app/api/ema/route.ts` (GET lista aprovadas, POST grava com filtro, armadilha de robô e limite por IP). O vale já tem mural de ema na estação com modo local quando a rota responde 503.
- A sessão não tem as chaves. Teste com mock; se precisar testar contra o banco real, peça a chave pela ferramenta de credencial (nunca pelo chat).
- Tabelas novas: escreva o SQL e peça para o dono rodar no SQL Editor (ele já sabe fazer), ou combine antes.

## 7. O que o dono pediu e ainda falta (nesta ordem)

Cada item: implementar, capturar de dia e de noite, desktop e celular (390 px), commit e push.

1. ~~Haku animado~~ FEITO (ver seção 4). Ficou com ~9 mil triângulos e 2 chamadas de desenho (antes ~28 mil e ~130).
2. ~~Entrada com idioma e peso~~ FEITO (ver "Peso do vale" na seção 4).
3. ~~Sons do lugar~~ FEITO (ver "Sons do lugar" na seção 4). Ninguém ouviu ainda: os volumes foram medidos por número, o dono precisa escutar e dizer se quer mais alto ou mais baixo.
4. ~~Confeitos para a fuligem~~ FEITO. `konpeito` em vale.js: `zones` (cada lugar registra onde o clique vale e a altura do chão), `claim()` para um bicho reservar um confeito, `eat()`. A fuligem da Torre tem modos (0 ronda, 1 corre, 2 come, 3 volta buscar a pedra); a pedra do modelo (9 mil triângulos) foi trocada por uma facetada feita à mão. Teste: `window.vale.konpeito()`.
5. ~~Haku descendo~~ FEITO. Clique/toque no Haku (`hakuRef.hit`) ou digitar "Kohaku" chama `hakuRef.dive(summon)`: a cabeça segue uma curva (`startDive`, pontos `P(frente, lado, altura)` relativos à câmera), o corpo continua passando por onde ela passou (`diveAt`), `uShine` acende as escamas e soltam faíscas. No fim ele retoma a rota (`uOff`). Não acontece no peso Leve (sem Haku) nem com movimento reduzido.
6. ~~Totoro com guarda-chuva~~ FEITO. `busRain(t)` (0 a 1) diz se a chuva do Gatobus está caindo. No bloco do Totoro: guarda-chuva feito à mão (`um`, `canopy`), `wet` (a árvore encharca e segue pingando ~26 s), gotas (`drops`, `spawn`), respingos, sons `amb.drop`/`amb.shower`. Clique nele (`konpeito.clickables`) = pulo; no tranco cai tudo (`burst`). Teste: `window.vale.amb().totoroJump()` e `vale.time(51)` para cair na chuva.
7. **Yubaba e o nome**: na entrada a Yubaba pede o nome e "rouba" parte dele (como Chihiro -> Sen). O vale chama a pessoa pelo pedaço que sobrou **sempre** (cartões, ema, bilhete do trem, mensagens). Na volta, reconhece ("Você voltou, Sen") e o que ela fez antes continua (ema escrita, lugares visitados). **Sem login**: tudo no `localStorage` daquele navegador; outro aparelho ou dados apagados = visitante novo. Tem que ter como pular e como trocar o nome depois. A Yubaba é feita à mão (não há modelo).
8. **Emas de verdade com a pena da Zeniba**: ao escrever o recado, a pena da mesa da Zeniba (no canto ao lado do porta-ema) escreve; a plaquinha é pendurada no porta-ema. As aprovadas aparecem para todos. Criar página **`/admin`** protegida por `ADMIN_SENHA` (verificação no servidor, cookie httpOnly) para aprovar e apagar emas.
9. **Lanternas no lago**: cada visita solta uma lanterna de papel no lago (uma por visitante por dia, controle no servidor e no navegador). À noite o lago fica cheio das lanternas de quem passou, as mais antigas indo para longe e se apagando. Tabela `lanternas`, rota no servidor com a service_role.
10. **Visitantes ao mesmo tempo**: quem está no vale agora aparece como um kodama ou fuligem andando pelo mapa, sem nome e sem dado nenhum (usar Supabase Realtime Presence com a chave publishable, entregue por uma rota tipo `/api/config`). Quando dois se encontram no mesmo lugar, se cumprimentam com o chacoalhar de cabeça dos kodamas.
11. **O mar do trem à noite**: em algumas noites a água sobe e cobre o vale (como na cena do trem em A Viagem de Chihiro), os postes ficam com metade dentro d'água, os passageiros do trem viram sombras transparentes. O **Sem Rosto** espera na plataforma, segue o cursor oferecendo ouro e, se a pessoa aceitar, embarca junto. O **barquinho do Sosuke** (ponyoboat.glb) navega pela água alta. Sem Rosto feito à mão.
12. **Mundo da Ponyo debaixo do lago**: mergulhar no lago abre uma sala nova no fundo do mar: irmãs da Ponyo, peixes antigos (devonianos), o barquinho passando lá em cima visto de baixo, o **barco do Fujimoto** e a **casa do Fujimoto** (a torre no fundo do mar). Tudo feito à mão. Novo mundo em `mundos.js` (seguir o padrão dos outros: `build/start/stop/update/render/resize`).
13. **Voo de vassoura com a Kiki**: modo de voo livre pelo vale, com o Jiji na garupa (o Jiji existe em `jiji-lily.glb`; separar pela região `u.x < 0.36` como em `paint.mjs`, ou fazer um Jiji simples). Computador: teclado + mouse. Celular: joystick na tela ou inclinar o aparelho (pedir permissão do giroscópio no iOS). Passar entre os galhos da Grande Árvore, rente ao lago, por cima do trem. Colisão simples com o terreno e os lugares. Kiki feita à mão.

Não há modelos para Kiki, Sem Rosto, Ponyo/irmãs, barco e casa do Fujimoto, Yubaba nem sons: tudo à mão, no estilo do vale (toon em faixas, contorno, cores Ghibli). O dono prefere qualidade; se algo ficar abaixo do resto do vale, avise.

## 8. Ideias apresentadas e NÃO escolhidas (não fazer sem ele pedir)
Clima real da cidade do visitante, calendário de festas (Tanabata, Obon, neve, sino de fim de ano), Totoro em realidade aumentada, passaporte de carimbos com mapa em névoa, Gatobus como transporte com placa de destino.

## 9. Pendências do dono
- Links dos modelos baixados em zip (trem, Cabeça de Nabo, Haku, fuligem, barco e balde da Ponyo, ramen, sapatos) para os créditos.
