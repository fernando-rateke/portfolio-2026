/*
 * Mural de ema (livro de visitas) da estação do fim da linha.
 * Guarda os recados numa tabela do Supabase, pela API REST, só no servidor.
 *
 * Variáveis de ambiente (Vercel → Settings → Environment Variables):
 *   SUPABASE_URL               https://<projeto>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  chave service_role (nunca vai para o navegador)
 *   EMA_MODERAR                "1" para só mostrar recados aprovados (coluna aprovado)
 * Sem as variáveis, a rota responde 503 e a página usa o modo local.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MODERAR = process.env.EMA_MODERAR === "1";

const headers = () => ({
  apikey: KEY as string,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
});

// filtro simples: palavrões comuns e links ficam de fora
const BLOQUEADAS = ["porra", "caralho", "merda", "puta", "foda", "fdp", "buceta", "cu ", "viado", "vagabund", "arrombad", "otario", "otário"];
const temLink = (t: string) => /(https?:\/\/|www\.|\.com\b|\.br\b)/i.test(t);
const limpo = (t: string) => {
  const s = ` ${t.toLowerCase()} `;
  return !BLOQUEADAS.some((b) => s.includes(b)) && !temLink(t);
};

// limite por IP enquanto a instância vive (um recado a cada 30 s)
const ultimos = new Map<string, number>();

export async function GET() {
  if (!URL_BASE || !KEY) return NextResponse.json({ ok: false, motivo: "sem-banco" }, { status: 503 });
  const filtro = MODERAR ? "&aprovado=eq.true" : "";
  const r = await fetch(`${URL_BASE}/rest/v1/ema?select=id,nome,recado,cor,criado_em${filtro}&order=criado_em.desc&limit=60`, { headers: headers(), cache: "no-store" });
  if (!r.ok) return NextResponse.json({ ok: false, motivo: "erro-banco" }, { status: 502 });
  return NextResponse.json({ ok: true, moderado: MODERAR, emas: await r.json() });
}

export async function POST(req: Request) {
  if (!URL_BASE || !KEY) return NextResponse.json({ ok: false, motivo: "sem-banco" }, { status: 503 });
  let body: { nome?: unknown; recado?: unknown; cor?: unknown; site?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, motivo: "formato" }, { status: 400 }); }
  if (typeof body.site === "string" && body.site.length > 0) return NextResponse.json({ ok: true }); // armadilha para robôs
  const nome = String(body.nome ?? "").trim().slice(0, 30) || "Visitante";
  const recado = String(body.recado ?? "").trim().slice(0, 140);
  const cor = ["madeira", "vermelho", "azul", "verde"].includes(String(body.cor)) ? String(body.cor) : "madeira";
  if (recado.length < 2) return NextResponse.json({ ok: false, motivo: "curto" }, { status: 400 });
  if (!limpo(nome) || !limpo(recado)) return NextResponse.json({ ok: false, motivo: "filtro" }, { status: 400 });
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
  const agora = Date.now();
  if (agora - (ultimos.get(ip) ?? 0) < 30_000) return NextResponse.json({ ok: false, motivo: "espere" }, { status: 429 });
  ultimos.set(ip, agora);
  const r = await fetch(`${URL_BASE}/rest/v1/ema`, {
    method: "POST",
    headers: { ...headers(), Prefer: "return=representation" },
    body: JSON.stringify({ nome, recado, cor, aprovado: !MODERAR }),
  });
  if (!r.ok) return NextResponse.json({ ok: false, motivo: "erro-banco" }, { status: 502 });
  const [ema] = await r.json();
  return NextResponse.json({ ok: true, moderado: MODERAR, ema });
}
