/*
 * Configuração pública para o navegador: o endereço do Supabase e a chave publishable (feita para ficar
 * no navegador; não abre nenhuma tabela, só o canal em tempo real do controle pelo celular).
 * A chave secreta (SUPABASE_SERVICE_ROLE_KEY) nunca sai do servidor.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, motivo: "sem-config" }, { status: 503 });
  return NextResponse.json({ ok: true, url, key }, { headers: { "Cache-Control": "no-store" } });
}
