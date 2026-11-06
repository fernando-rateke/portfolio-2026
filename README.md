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
