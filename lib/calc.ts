import type { Lancamento, Projeto } from "./types";
export const n = (v: unknown) => parseFloat(String(v ?? "").replace(",", ".")) || 0;
export const brl = (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const hoje = () => new Date().toISOString().slice(0, 10);
export function meses(ini?: string | null, fim?: string | null) {
  if (!ini) return 1;
  const a = new Date(ini), b = fim ? new Date(fim) : new Date();
  return Math.max(1, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() + 1);
}
export function calc(p: Projeto, L: Lancamento[], usd: number) {
  const val = (l: Lancamento) => n(l.valor) * (l.moeda === "USD" ? usd : 1);
  const ls = L.filter((l) => l.projeto_id === p.id);
  const ass = ls.filter((l) => l.tipo === "assinatura");
  const cm = ass.filter((l) => l.ativo).reduce((s, l) => s + val(l), 0);
  const gastoAss = ass.reduce((s, l) => s + val(l) * meses(l.data, l.ativo ? null : l.fim), 0);
  const cu = ls.filter((l) => l.tipo === "custo").reduce((s, l) => s + val(l), 0);
  const rec = ls.filter((l) => l.tipo === "receita").reduce((s, l) => s + val(l), 0);
  const mo = n(p.horas) * n(p.valor_hora), mg = 1 + n(p.margem) / 100;
  const preco = (cu + mo) * mg, mensal = cm * mg + n(p.manutencao);
  const fechado = n(p.valor_fechado) || preco, gasto = cu + gastoAss;
  return { cm, cu, rec, mo, preco, mensal, gasto, res: rec - gasto, aRec: Math.max(0, fechado - rec) };
}
