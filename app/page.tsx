"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { brl, calc, hoje, n } from "@/lib/calc";
import type { Custo, Lancamento, Projeto } from "@/lib/types";
import Login from "@/components/Login";
import ProjetoView from "@/components/ProjetoView";
import CustosView from "@/components/CustosView";

const FILTROS = ["Todos", "Pessoal", "Lady", "Sistema", "Arte gráfica", "Ativo", "Pausado", "Concluído"];

export default function Home() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [P, setP] = useState<Projeto[]>([]);
  const [L, setL] = useState<Lancamento[]>([]);
  const [C, setC] = useState<Custo[]>([]);
  const [aba, setAba] = useState<"projetos" | "custos">("projetos");
  const [usd, setUsd] = useState(5.4);
  const [filtro, setFiltro] = useState("Todos");
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const carregar = useCallback(async () => {
    const [p, l, c, k] = await Promise.all([
      supabase.from("projetos").select("*").order("nome"),
      supabase.from("lancamentos").select("*").order("data", { ascending: false }),
      supabase.from("config").select("usd").maybeSingle(),
      supabase.from("custos").select("*").order("descricao"),
    ]);
    setC((k.data as Custo[]) || []);
    setP((p.data as Projeto[]) || []);
    setL((l.data as Lancamento[]) || []);
    if (c.data?.usd) setUsd(n(c.data.usd));
  }, []);

  useEffect(() => { if (session) carregar(); }, [session, carregar]);

  const vis = useMemo(
    () => P.filter((p) => filtro === "Todos" || p.tipo === filtro || p.status === filtro || p.conta === filtro),
    [P, filtro]
  );
  const t = useMemo(
    () => vis.map((p) => calc(p, L, usd, C)).reduce(
      (a, c) => ({ cm: a.cm + c.cm, rec: a.rec + c.rec, aRec: a.aRec + c.aRec, res: a.res + c.res }),
      { cm: 0, rec: 0, aRec: 0, res: 0 }
    ),
    [vis, L, usd, C]
  );

  if (session === undefined) return null;
  if (!session) return <Login />;

  const proj = sel ? P.find((p) => p.id === sel) : undefined;

  async function novo() {
    const { data } = await supabase.from("projetos")
      .insert({ conta: filtro === "Lady" ? "Lady" : "Pessoal", inicio: hoje() })
      .select().single();
    await carregar();
    setAba("projetos");
    if (data) setSel(data.id);
  }

  async function salvarUsd(v: string) {
    setUsd(n(v));
    await supabase.from("config").upsert({ owner_id: session!.user.id, usd: n(v) });
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-5 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Controle de Projetos</h1>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-[#5d6b68]">US$ 1 = R$
            <input className="inp w-20" type="number" step="0.01" defaultValue={usd} key={usd} onBlur={(e) => salvarUsd(e.target.value)} />
          </label>
          <button className="btn-pri" onClick={novo}>Novo projeto</button>
          <button className="btn" onClick={() => supabase.auth.signOut()}>Sair</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-[#dbe2e0] bg-white p-0.5">
          {(["projetos", "custos"] as const).map((a) => (
            <button key={a} onClick={() => { setAba(a); setSel(null); }}
              className={`rounded-md px-3.5 py-1.5 text-sm font-semibold ${aba === a ? "bg-accent text-white" : "text-[#5d6b68]"}`}>{a === "projetos" ? "Projetos" : "Custos mensais"}</button>
          ))}
        </div>
        {aba === "custos" && (
          <div className="flex gap-1.5">{["Todos", "Pessoal", "Lady"].map((f) => (
            <button key={f} onClick={() => setFiltro(f)} className={`rounded-full border px-3 py-1 text-sm ${f === filtro ? "border-[#14201e] bg-[#14201e] text-white" : "border-[#dbe2e0] bg-white"}`}>{f}</button>
          ))}</div>
        )}
      </div>

      {aba === "custos" ? (
        <CustosView P={P} L={L} C={C} usd={usd} filtro={filtro} recarregar={carregar} />
      ) : proj ? (
        <ProjetoView p={proj} L={L.filter((l) => l.projeto_id === proj.id)} C={C} usd={usd} voltar={() => setSel(null)} recarregar={carregar} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#dbe2e0] bg-[#dbe2e0] md:grid-cols-4">
            {[["Assinaturas / mês", t.cm], ["Recebido", t.rec], ["A receber", t.aRec], ["Resultado", t.res]].map(([k, v]) => (
              <div key={k as string} className="grid gap-0.5 bg-white px-4 py-3">
                <span className="text-[11px] uppercase tracking-wider text-[#5d6b68]">{k}</span>
                <b className={`num text-lg font-semibold ${k === "Resultado" ? ((v as number) < 0 ? "text-red-700" : "text-green-700") : ""}`}>{brl(v as number)}</b>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {FILTROS.map((f) => (
              <button key={f} onClick={() => setFiltro(f)}
                className={`rounded-full border px-3 py-1 text-sm ${f === filtro ? "border-[#14201e] bg-[#14201e] text-white" : "border-[#dbe2e0] bg-white"}`}>{f}</button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-[#dbe2e0] bg-white">
            <div className="hidden grid-cols-[2.2fr_1fr_1fr_1fr_1fr] gap-3 bg-[#f3f5f4] px-4 py-2 text-[11px] uppercase tracking-wider text-[#5d6b68] md:grid">
              <span>Projeto</span><span className="text-right">Custo/mês</span><span className="text-right">Preço sugerido</span><span className="text-right">Recebido</span><span className="text-right">Resultado</span>
            </div>
            {vis.length === 0 && (
              <p className="px-4 py-8 text-center text-[#5d6b68]">{P.length ? "Nenhum projeto neste filtro." : "Nenhum projeto ainda. Clique em Novo projeto."}</p>
            )}
            {vis.map((p) => {
              const c = calc(p, L, usd, C);
              return (
                <button key={p.id} onClick={() => setSel(p.id)}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-3 border-t border-[#dbe2e0] px-4 py-3 text-left first:border-t-0 hover:bg-soft md:grid-cols-[2.2fr_1fr_1fr_1fr_1fr]">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{p.nome}</div>
                    <div className="text-xs text-[#5d6b68]">
                      <span className="pill">{p.conta}</span> <span className="pill">{p.tipo}</span> {p.cliente || "sem cliente"} · {p.status}
                    </div>
                  </div>
                  <span className="num hidden text-right md:block">{brl(c.cm)}</span>
                  <span className="num hidden text-right md:block">{brl(c.preco)}{c.mensal > 0 && <div className="text-xs text-[#5d6b68]">+ {brl(c.mensal)}/mês</div>}</span>
                  <span className="num hidden text-right md:block">{brl(c.rec)}</span>
                  <span className={`num text-right ${c.res < 0 ? "text-red-700" : "text-green-700"}`}>{brl(c.res)}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
