/* Moderação das emas (só com o cookie de /admin): GET lista todas, PATCH { id, aprovado } aprova ou esconde, DELETE { id } apaga. */
import { NextResponse } from "next/server";
import { autorizado, mesmaOrigem } from "../auth";

export const dynamic = "force-dynamic";

const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const headers = () => ({ apikey: KEY as string, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" });
const negado = () => NextResponse.json({ ok: false, motivo: "entrar" }, { status: 401 });
const semBanco = () => NextResponse.json({ ok: false, motivo: "sem-banco" }, { status: 503 });
const idValido = (id: unknown): id is number | string => (typeof id === "number" && Number.isFinite(id)) || (typeof id === "string" && /^[0-9a-f-]{1,40}$/i.test(id));

export async function GET(req: Request) {
  if (!autorizado(req)) return negado();
  if (!URL_BASE || !KEY) return semBanco();
  const r = await fetch(`${URL_BASE}/rest/v1/ema?select=id,nome,recado,cor,aprovado,criado_em&order=criado_em.desc&limit=300`, { headers: headers(), cache: "no-store" });
  if (!r.ok) return NextResponse.json({ ok: false, motivo: "erro-banco" }, { status: 502 });
  return NextResponse.json({ ok: true, emas: await r.json() });
}

async function mudar(req: Request, metodo: "PATCH" | "DELETE") {
  if (!autorizado(req)) return negado();
  if (!mesmaOrigem(req)) return NextResponse.json({ ok: false, motivo: "origem" }, { status: 403 });
  if (!URL_BASE || !KEY) return semBanco();
  let body: { id?: unknown; aprovado?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, motivo: "formato" }, { status: 400 }); }
  if (!idValido(body.id)) return NextResponse.json({ ok: false, motivo: "id" }, { status: 400 });
  const r = await fetch(`${URL_BASE}/rest/v1/ema?id=eq.${encodeURIComponent(String(body.id))}`, {
    method: metodo,
    headers: { ...headers(), Prefer: "return=minimal" },
    body: metodo === "PATCH" ? JSON.stringify({ aprovado: body.aprovado === true }) : undefined,
  });
  if (!r.ok) return NextResponse.json({ ok: false, motivo: "erro-banco" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
export const PATCH = (req: Request) => mudar(req, "PATCH");
export const DELETE = (req: Request) => mudar(req, "DELETE");
