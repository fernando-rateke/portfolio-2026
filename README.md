# Portfólio 2026 — Fernando Rateke

Portfólio pessoal do Ensino Médio e Técnico em Análise e Desenvolvimento de Sistemas:
projetos, trajetória, galeria e o catálogo de atividades por matéria.

**Stack:** [Next.js](https://nextjs.org) (App Router) · React 19 · TypeScript · Three.js · CSS puro (com Tailwind v4 disponível) · ícones [Phosphor](https://phosphoricons.com)

## Rodando localmente

Requer Node.js 20.9 ou mais novo.

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

| Comando         | O que faz                              |
| --------------- | -------------------------------------- |
| `npm run dev`   | servidor de desenvolvimento            |
| `npm run build` | build de produção (todas as páginas estáticas) |
| `npm start`     | serve o build de produção              |
| `npm run lint`  | ESLint (Next, React, acessibilidade)   |

## Página inicial: o Vale

A raiz (`/`) serve a experiência nova, ainda em construção: `public/vale/index.html`,
com a cena 3D em `public/vale/vale.js` (Three.js r149, incluído em `public/vale/three.min.js`)
e os mundos de destaque em `public/vale/mundos.js`. O portfólio anterior continua em
`/antigo`, e as demais páginas (`/materias`, `/sobre`...) seguem nas rotas de sempre.

## Estrutura

```
app/
├── layout.tsx            # layout raiz: metadados, fontes, cursor e áudio globais
├── globals.css           # todos os estilos (tema "Sumi Ink")
├── antigo/page.tsx       # home anterior: hero, sobre, projetos, arquivos, galeria, portal
├── materias/             # catálogo de atividades por matéria e trimestre
├── sobre/ curriculo/ projeto/ galeria/
├── arquivo/ habilidades/ # páginas antigas, sem link no menu
├── components/           # Navbar, Footer, galeria, cenas 3D, aviso de entrada…
├── SculptureScene.tsx    # escultura 3D de fundo (muda conforme a seção)
├── AudioController.tsx   # música de fundo (só baixa ao dar play)
└── utils/a11y.ts         # helper de teclado para elementos clicáveis
public/                   # imagens, áudio, favicons e imagem de compartilhamento
```

O conteúdo das atividades fica em `app/materias/page.tsx` (array `allSubjects`).

## Deploy

Feito na [Vercel](https://vercel.com): importe o repositório e mantenha as configurações
padrão de Next.js. A URL usada nos metadados (imagem de compartilhamento) é detectada
automaticamente; para um domínio próprio, defina `NEXT_PUBLIC_SITE_URL` (veja `.env.example`).

## Mural de ema (livro de visitas)

Os recados da estação do fim da linha ficam numa tabela do Supabase, acessada só pela rota `app/api/ema/route.ts` (no servidor). Sem configuração, o mural funciona em modo local: cada visitante vê só os próprios recados, guardados no navegador.

Para ligar o mural público:

1. Crie um projeto no [Supabase](https://supabase.com) (o plano gratuito basta).
2. Em **SQL Editor**, rode o conteúdo de `docs/supabase-ema.sql`.
3. Em **Project Settings → API**, copie a **Project URL** e a chave **service_role**.
4. Na Vercel, em **Settings → Environment Variables**, crie:
   - `SUPABASE_URL` com a Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` com a chave service_role (ela fica só no servidor)
   - opcional: `EMA_MODERAR` = `1` para os recados só aparecerem depois que você marcar `aprovado = true` na tabela
5. Faça um novo deploy.

Para apagar um recado, use o Table Editor do Supabase. A rota já recusa links, alguns palavrões, recados com mais de 140 caracteres e mais de um envio a cada 30 segundos por IP.
