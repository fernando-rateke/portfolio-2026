import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@phosphor-icons/web/regular";
import "./globals.css";
import CustomCursor from "./components/CustomCursor";
import GlobalAudio from "./components/GlobalAudio";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

// URL pública do site, usada para gerar links absolutos (ex.: imagem de
// compartilhamento). Na Vercel vem automaticamente; pode ser sobrescrita com
// NEXT_PUBLIC_SITE_URL (ex.: quando houver domínio próprio).
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const title = "Fernando Rateke | Portfólio 2026";
const description =
  "Estudante do Ensino Médio e Técnico em Análise e Desenvolvimento de Sistemas. Projetos, trajetória e experiências digitais.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    locale: "pt_BR",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Fernando Rateke — Portfólio 2026" }],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Noto Serif JP precisa dos glifos de kanji (marcas d'água), que o Google
            Fonts entrega sob demanda por unicode-range. A regra abaixo só vale
            para o diretório pages/, não para o App Router. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Serif+JP:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} dark-mode`}>
        <CustomCursor />
        <GlobalAudio />
        {children}
      </body>
    </html>
  );
}
