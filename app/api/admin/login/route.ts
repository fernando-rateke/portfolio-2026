/* Entrar e sair da página /admin. POST { senha } confere e entrega o cookie; GET diz se já está dentro; DELETE sai. */
import { NextResponse } from "next/server";
import { COOKIE, DURACAO, autorizado, mesmaOrigem, novoBilhete, senhaCerta, temSenha } from "../auth";

export const dynamic = "force-dynamic";

// no máximo 6 tentativas por IP a cada 10 minutos (enquanto a instância vive)
const tentativas = new Map<string, { n: number; desde: number }>();
const JANELA = 10 * 60 * 1000;

export async function GET(req: Request) {
  return NextResponse.json({ ok: true, dentro: autorizado(req), configurado: temSenha() });
}

export async function POST(req: Request) {
  if (!temSenha()) return NextResponse.json({ ok: false, motivo: "sem-senha" }, { status: 503 });
  if (!mesmaOrigem(req)) return NextResponse.json({ ok: false, motivo: "origem" }, { status: 403 });
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
  const agora = Date.now(), t = tentativas.get(ip);
  if (t && agora - t.desde < JANELA && t.n >= 6) return NextResponse.json({ ok: false, motivo: "espere" }, { status: 429 });
  let senha = "";
  try { senha = String((await req.json()).senha ?? ""); } catch { /* corpo inválido conta como senha errada */ }
  if (!senhaCerta(senha)) {
    tentativas.set(ip, t && agora - t.desde < JANELA ? { n: t.n + 1, desde: t.desde } : { n: 1, desde: agora });
    return NextResponse.json({ ok: false, motivo: "senha" }, { status: 401 });
  }
  tentativas.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, novoBilhete(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: DURACAO });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  return res;
}
