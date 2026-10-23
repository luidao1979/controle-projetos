"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { brl, calc, conv, hoje, n } from "@/lib/calc";
import type { Custo, Lancamento, Projeto, Rateio } from "@/lib/types";

type Props = { P: Projeto[]; L: Lancamento[]; C: Custo[]; usd: number; filtro: string; recarregar: () => Promise<void> };

export default function CustosView({ P, L, C, usd, filtro, recarregar }: Props) {
  const [msg, setMsg] = useState("");
  const aviso = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 1800); };
  const conta = filtro === "Lady" || filtro === "Pessoal" ? filtro : null;
  const custos = C.filter((c) => !conta || c.conta === conta);
  const projetos = P.filter((p) => p.status !== "Concluído" && (!conta || p.conta === conta));

  const total = custos.filter((c) => c.ativo).reduce((s, c) => s + conv(c.valor, c.moeda, usd), 0);
  const rateado = custos.filter((c) => c.ativo).reduce((s, c) => s + conv(c.valor, c.moeda, usd) * c.rateio.reduce((a, r) => a + n(r.pct), 0) / 100, 0);

  async function upd(id: string, d: Partial<Custo>) {
    const { error } = await supabase.from("custos").update(d).eq("id", id);
    aviso(error ? "Não salvou: " + error.message : "Salvo");
    await recarregar();
  }
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, f = new FormData(form);
    const { error } = await supabase.from("custos").insert({
      descricao: String(f.get("descricao")).trim(), conta: f.get("conta"), moeda: f.get("moeda"),
      valor: n(f.get("valor")), data: f.get("data") || hoje(),
    });
    if (!error) form.reset();
    aviso(error ? "Erro: " + error.message : "Custo adicionado");
    await recarregar();
  }
  const igual = (ids: string[]): Rateio[] => ids.map((id) => ({ projeto_id: id, pct: Math.round((10000 / ids.length)) / 100 }));
  function marcar(c: Custo, pid: string, on: boolean) {
    const ids = c.rateio.map((r) => r.projeto_id).filter((x) => x !== pid);
    upd(c.id, { rateio: igual(on ? [...ids, pid] : ids) });
  }
  function pct(c: Custo, pid: string, v: string) {
    upd(c.id, { rateio: c.rateio.map((r) => (r.projeto_id === pid ? { ...r, pct: n(v) } : r)) });
  }
  async function excluir(id: string) { await supabase.from("custos").delete().eq("id", id); await recarregar(); }

  return (
    <div className="grid gap-5">
      <div className="card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="h3">Quanto cobrar por mês{conta ? ` · ${conta}` : ""}</h3>
          <span className="text-sm text-[#5d6b68]">Custos ativos <b className="num text-[#14201e]">{brl(total)}</b> · não rateado <b className={`num ${total - rateado > 0.01 ? "text-red-700" : "text-[#14201e]"}`}>{brl(total - rateado)}</b></span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#5d6b68]">
              <th className="py-1.5 font-medium">Projeto</th><th className="py-1.5 text-right font-medium">Custo rateado/mês</th>
              <th className="py-1.5 text-right font-medium">Margem</th><th className="py-1.5 text-right font-medium">Cobrar/mês</th></tr></thead>
            <tbody>
              {projetos.map((p) => {
                const c = calc(p, L, usd, C);
                return (
                  <tr key={p.id} className="border-t border-[#dbe2e0]">
                    <td className="py-2">{p.nome} <span className="text-xs text-[#5d6b68]">{p.cliente}</span></td>
                    <td className="num py-2 text-right">{brl(c.cm)}</td>
                    <td className="num py-2 text-right">{n(p.margem)}%</td>
                    <td className="num py-2 text-right font-semibold">{brl(c.mensal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[#5d6b68]">Cobrar/mês = custo rateado × margem do projeto + manutenção do projeto.</p>
      </div>

      <form onSubmit={add} className="card grid grid-cols-2 items-end gap-2 md:grid-cols-6">
        <h3 className="h3 col-span-2 md:col-span-6">Novo custo mensal</h3>
        <label className="lbl col-span-2">Descrição<input name="descricao" className="inp" required placeholder="Supabase Pro" /></label>
        <label className="lbl">Conta<select name="conta" className="inp" defaultValue={conta ?? "Pessoal"}><option>Pessoal</option><option>Lady</option></select></label>
        <label className="lbl">Moeda<select name="moeda" className="inp"><option>BRL</option><option>USD</option></select></label>
        <label className="lbl">Valor/mês<input name="valor" className="inp" type="number" step="0.01" required /></label>
        <label className="lbl">Desde<input name="data" className="inp" type="date" defaultValue={hoje()} /></label>
        <button className="btn-pri col-span-2 md:col-span-6 md:justify-self-end">Adicionar</button>
      </form>

      {custos.length === 0 && <p className="text-center text-sm text-[#5d6b68]">Nenhum custo mensal. Cadastre Vercel, Supabase, domínios, Claude…</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {custos.map((c) => {
          const soma = c.rateio.reduce((a, r) => a + n(r.pct), 0);
          const vb = conv(c.valor, c.moeda, usd);
          return (
            <div key={c.id} className={`card ${c.ativo ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold">{c.descricao}</div>
                  <div className="text-xs text-[#5d6b68]"><span className="pill">{c.conta}</span> desde {c.data}{!c.ativo && ` · cancelado ${c.fim ?? ""}`}</div>
                </div>
                <div className="text-right">
                  <div className="num font-semibold">{c.moeda === "USD" ? `US$ ${n(c.valor).toFixed(2)}` : brl(n(c.valor))}</div>
                  {c.moeda === "USD" && <div className="num text-xs text-[#5d6b68]">{brl(vb)}</div>}
                </div>
              </div>
              <div className="grid gap-1">
                {projetos.filter((p) => p.conta === c.conta).map((p) => {
                  const r = c.rateio.find((x) => x.projeto_id === p.id);
                  return (
                    <div key={p.id} className="grid grid-cols-[auto_1fr_5rem_6rem] items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!r} onChange={(e) => marcar(c, p.id, e.target.checked)} className="h-4 w-4 accent-[#0d6b5f]" aria-label={p.nome} />
                      <span className="truncate">{p.nome}</span>
                      {r ? <input className="inp num text-right" type="number" step="any" defaultValue={r.pct} key={c.id + p.id + r.pct} onBlur={(e) => n(e.target.value) !== r.pct && pct(c, p.id, e.target.value)} aria-label="%" /> : <span />}
                      <span className="num text-right text-xs text-[#5d6b68]">{r ? brl(vb * n(r.pct) / 100) : ""}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#dbe2e0] pt-2 text-xs">
                <span className={Math.abs(soma - 100) > 0.05 && c.rateio.length ? "font-semibold text-red-700" : "text-[#5d6b68]"}>
                  Rateado {soma.toFixed(2)}%{c.rateio.length === 0 && " · marque os projetos"}
                </span>
                <span className="flex gap-3 font-semibold text-[#5d6b68]">
                  {c.rateio.length > 1 && <button onClick={() => upd(c.id, { rateio: igual(c.rateio.map((r) => r.projeto_id)) })} className="hover:text-accent">Dividir igual</button>}
                  <button onClick={() => upd(c.id, c.ativo ? { ativo: false, fim: hoje() } : { ativo: true, fim: null })} className="hover:text-accent">{c.ativo ? "Cancelar" : "Reativar"}</button>
                  <button onClick={() => excluir(c.id)} className="hover:text-red-700">Excluir</button>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {msg && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-[#14201e] px-3.5 py-2 text-sm text-white">{msg}</div>}
    </div>
  );
}
