/*
 * Entrada da página /admin: a senha (ADMIN_SENHA) é conferida só no servidor.
 * Quem acerta recebe um cookie httpOnly assinado, que vale 8 horas. O navegador nunca vê a senha
 * guardada nem a chave do Supabase.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const SENHA = process.env.ADMIN_SENHA || "";
const SEGREDO = `${SENHA}|${process.env.SUPABASE_SERVICE_ROLE_KEY || ""}|vale-admin`;
export const COOKIE = "vale_admin";
export const DURACAO = 8 * 60 * 60; // segundos

const assina = (texto: string) => createHmac("sha256", SEGREDO).update(texto).digest("hex");
const igual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export const temSenha = () => SENHA.length > 0;
// compara pelo resumo, para o tempo de resposta não revelar o tamanho nem o começo da senha
export const senhaCerta = (tentativa: string) => temSenha() && igual(assina(`senha:${tentativa}`), assina(`senha:${SENHA}`));
export const novoBilhete = () => {
  const ate = String(Date.now() + DURACAO * 1000);
  return `${ate}.${assina(`bilhete:${ate}`)}`;
};
export const bilheteValido = (valor: string | undefined) => {
  if (!valor || !temSenha()) return false;
  const [ate, sig] = valor.split(".");
  if (!ate || !sig || !/^\d+$/.test(ate) || Number(ate) < Date.now()) return false;
  return igual(sig, assina(`bilhete:${ate}`));
};
export const lerCookie = (req: Request) => {
  const bruto = req.headers.get("cookie") || "";
  const par = bruto.split(";").map((p) => p.trim()).find((p) => p.startsWith(`${COOKIE}=`));
  return par ? decodeURIComponent(par.slice(COOKIE.length + 1)) : undefined;
};
export const autorizado = (req: Request) => bilheteValido(lerCookie(req));
// só aceita pedidos que vêm da própria página (protege os botões de aprovar e apagar)
export const mesmaOrigem = (req: Request) => {
  const origem = req.headers.get("origin");
  if (!origem) return true;
  try { return new URL(origem).host === (req.headers.get("x-forwarded-host") || req.headers.get("host")); } catch { return false; }
};
