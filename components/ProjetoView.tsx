"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { brl, calc, hoje, n } from "@/lib/calc";
import type { Lancamento, Projeto } from "@/lib/types";

const TIPO_L = { assinatura: "Assinatura mensal", custo: "Custo único", receita: "Recebimento" };

type Props = { p: Projeto; L: Lancamento[]; usd: number; voltar: () => void; recarregar: () => Promise<void> };

export default function ProjetoView({ p, L, usd, voltar, recarregar }: Props) {
  const c = calc(p, L, usd);
  const [confirma, setConfirma] = useState(false);
  const [msg, setMsg] = useState("");

  const aviso = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 1800); };
  async function salvar(d: Partial<Projeto>) {
    const { error } = await supabase.from("projetos").update(d).eq("id", p.id);
    aviso(error ? "Não salvou: " + error.message : "Salvo");
    await recarregar();
  }
  const num = ["horas", "valor_hora", "margem", "manutencao", "valor_fechado"];
  const campo = (k: keyof Projeto, lab: string, type = "text") => (
    <label className="lbl">{lab}
      <input className="inp" type={type} step="any" defaultValue={String(p[k] ?? "")} key={p.id + k}
        onBlur={(e) => { const v = num.includes(k) ? n(e.target.value) : e.target.value || null; if (v !== p[k]) salvar({ [k]: v } as Partial<Projeto>); }} />
    </label>
  );
  const sel = (k: keyof Projeto, lab: string, ops: string[]) => (
    <label className="lbl">{lab}
      <select className="inp" value={String(p[k])} onChange={(e) => salvar({ [k]: e.target.value } as Partial<Projeto>)}>
        {ops.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );

  async function excluir() {
    if (!confirma) return setConfirma(true);
    await supabase.from("projetos").delete().eq("id", p.id);
    voltar(); await recarregar();
  }

  async function addLanc(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("lancamentos").insert({
      projeto_id: p.id, tipo: f.get("tipo"), descricao: String(f.get("descricao")).trim(),
      moeda: f.get("moeda"), valor: n(f.get("valor")), data: f.get("data") || hoje(),
    });
    if (!error) e.currentTarget.reset();
    aviso(error ? "Erro: " + error.message : "Lançamento adicionado");
    await recarregar();
  }
  async function toggle(l: Lancamento) {
    await supabase.from("lancamentos").update(l.ativo ? { ativo: false, fim: hoje() } : { ativo: true, fim: null }).eq("id", l.id);
    await recarregar();
  }
  async function delLanc(id: string) { await supabase.from("lancamentos").delete().eq("id", id); await recarregar(); }

  function addLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    salvar({ links: [...p.links, { label: String(f.get("label")), url: String(f.get("url")).trim() }] });
    e.currentTarget.reset();
  }
  function addAcesso(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    salvar({ acessos: [...p.acessos, { servico: String(f.get("servico")).trim(), login: String(f.get("login")).trim(), cofre: String(f.get("cofre")).trim() }] });
    e.currentTarget.reset();
  }

  const Linha = ({ k, v, big, cls = "" }: { k: string; v: string; big?: boolean; cls?: string }) => (
    <div className={`flex justify-between gap-3 ${big ? "border-t border-[#dbe2e0] pt-1.5 font-semibold" : ""}`}><span>{k}</span><span className={`num ${cls}`}>{v}</span></div>
  );
  const X = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="px-2 text-[#5d6b68] hover:text-red-700" aria-label="Excluir">✕</button>;

  return (
    <div className="grid gap-5">
      <button className="btn justify-self-start" onClick={voltar}>← Todos os projetos</button>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">{p.nome}</h2>
          <button onClick={excluir} className={`text-sm font-semibold ${confirma ? "text-red-700" : "text-[#5d6b68]"}`}>{confirma ? "Clique de novo para excluir" : "Excluir projeto"}</button>
        </div>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-6">
          {campo("nome", "Nome")}{campo("cliente", "Cliente")}
          {sel("conta", "Conta", ["Pessoal", "Lady"])}{sel("tipo", "Tipo", ["Sistema", "Arte gráfica"])}
          {sel("status", "Status", ["Ativo", "Pausado", "Concluído"])}{campo("inicio", "Início", "date")}
        </div>
        <label className="lbl">Observações
          <textarea className="inp" rows={2} defaultValue={p.obs} key={p.id + "obs"} onBlur={(e) => e.target.value !== p.obs && salvar({ obs: e.target.value })} />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2 md:items-start">
        <div className="card">
          <h3 className="h3">Quanto cobrar</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {campo("horas", "Horas trabalhadas", "number")}{campo("valor_hora", "Valor da hora (R$)", "number")}
            {campo("margem", "Margem (%)", "number")}{campo("manutencao", "Manutenção (R$/mês)", "number")}
            {campo("valor_fechado", "Valor fechado (R$)", "number")}
          </div>
          <div className="grid gap-1.5 border-t border-dashed border-[#dbe2e0] pt-2.5 text-sm">
            <Linha k="Mão de obra" v={brl(c.mo)} /><Linha k="Custos únicos" v={brl(c.cu)} />
            <Linha k="Preço do projeto" v={brl(c.preco)} big />
            <Linha k="Assinaturas ativas" v={brl(c.cm) + "/mês"} />
            <Linha k="Mensalidade a cobrar" v={brl(c.mensal) + "/mês"} big />
          </div>
          <div className="grid gap-1.5 border-t border-dashed border-[#dbe2e0] pt-2.5 text-sm">
            <Linha k="Gasto acumulado" v={brl(c.gasto)} /><Linha k="Recebido" v={brl(c.rec)} />
            <Linha k="A receber" v={brl(c.aRec)} />
            <Linha k="Resultado" v={brl(c.res)} big cls={c.res < 0 ? "text-red-700" : "text-green-700"} />
          </div>
          <p className="text-xs text-[#5d6b68]">Preço = (mão de obra + custos únicos) × margem. Mensalidade = assinaturas × margem + manutenção.</p>
        </div>

        <div className="card">
          <h3 className="h3">Custos e recebimentos</h3>
          <div>
            {L.length === 0 && <p className="text-xs text-[#5d6b68]">Cadastre assinaturas (Vercel, Supabase, domínio…), custos únicos e o que já recebeu.</p>}
            {L.map((l) => (
              <div key={l.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-t border-[#dbe2e0] py-2 first:border-t-0">
                <div className="min-w-0"><div className="truncate">{l.descricao}</div>
                  <div className="text-xs text-[#5d6b68]">{TIPO_L[l.tipo]} · {l.data}{l.tipo === "assinatura" && (l.ativo ? " · ativa" : ` · cancelada ${l.fim ?? ""}`)}</div></div>
                <span className={`num text-sm ${l.tipo === "receita" ? "text-green-700" : ""}`}>{l.moeda === "USD" ? "US$ " + n(l.valor).toFixed(2) : brl(n(l.valor))}</span>
                <span className="flex">{l.tipo === "assinatura" && <button onClick={() => toggle(l)} className="text-xs font-semibold text-[#5d6b68] hover:text-accent">{l.ativo ? "Cancelar" : "Reativar"}</button>}<X onClick={() => delLanc(l.id)} /></span>
              </div>
            ))}
          </div>
          <form onSubmit={addLanc} className="grid grid-cols-2 items-end gap-2 md:grid-cols-3">
            <label className="lbl">Tipo<select name="tipo" className="inp"><option value="assinatura">Assinatura mensal</option><option value="custo">Custo único</option><option value="receita">Recebimento</option></select></label>
            <label className="lbl">Descrição<input name="descricao" className="inp" required placeholder="Supabase Pro" /></label>
            <label className="lbl">Moeda<select name="moeda" className="inp"><option>BRL</option><option>USD</option></select></label>
            <label className="lbl">Valor<input name="valor" className="inp" type="number" step="0.01" required /></label>
            <label className="lbl">Data<input name="data" className="inp" type="date" defaultValue={hoje()} /></label>
            <button className="btn-pri">Adicionar</button>
          </form>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 md:items-start">
        <div className="card">
          <h3 className="h3">Links</h3>
          <div>
            {p.links.length === 0 && <p className="text-xs text-[#5d6b68]">Página, GitHub, Vercel, Supabase…</p>}
            {p.links.map((k, i) => (
              <div key={i} className="flex items-center justify-between gap-2 border-t border-[#dbe2e0] py-2 first:border-t-0">
                <div className="min-w-0"><div className="text-xs text-[#5d6b68]">{k.label}</div>
                  <a className="break-all text-sm text-accent underline" href={/^https?:/.test(k.url) ? k.url : "https://" + k.url} target="_blank" rel="noopener noreferrer">{k.url}</a></div>
                <X onClick={() => salvar({ links: p.links.filter((_, j) => j !== i) })} />
              </div>
            ))}
          </div>
          <form onSubmit={addLink} className="grid grid-cols-[auto_1fr_auto] items-end gap-2">
            <label className="lbl">Tipo<select name="label" className="inp">{["Site", "GitHub", "Vercel", "Supabase", "Domínio/DNS", "Arquivos", "Outro"].map((o) => <option key={o}>{o}</option>)}</select></label>
            <label className="lbl">URL<input name="url" className="inp" required /></label>
            <button className="btn-pri">Adicionar</button>
          </form>
        </div>

        <div className="card">
          <h3 className="h3">Acessos</h3>
          <div>
            {p.acessos.length === 0 && <p className="text-xs text-[#5d6b68]">Serviço e login de cada conta.</p>}
            {p.acessos.map((a, i) => (
              <div key={i} className="flex items-center justify-between gap-2 border-t border-[#dbe2e0] py-2 first:border-t-0">
                <div className="min-w-0"><div className="font-semibold">{a.servico}</div>
                  <div className="break-all text-xs text-[#5d6b68]">{a.login}{a.cofre && " · senha em: " + a.cofre}</div></div>
                <span className="flex shrink-0">
                  <button className="text-xs font-semibold text-[#5d6b68] hover:text-accent" onClick={() => navigator.clipboard.writeText(a.login).then(() => aviso("Login copiado"))}>Copiar</button>
                  <X onClick={() => salvar({ acessos: p.acessos.filter((_, j) => j !== i) })} />
                </span>
              </div>
            ))}
          </div>
          <form onSubmit={addAcesso} className="grid grid-cols-2 items-end gap-2 md:grid-cols-4">
            <label className="lbl">Serviço<input name="servico" className="inp" required placeholder="Vercel" /></label>
            <label className="lbl">Login<input name="login" className="inp" required /></label>
            <label className="lbl">Senha em<input name="cofre" className="inp" placeholder="Bitwarden" /></label>
            <button className="btn-pri">Adicionar</button>
          </form>
          <p className="text-xs text-[#5d6b68]">Senhas ficam no cofre (Bitwarden, 1Password, Google); aqui só onde estão.</p>
        </div>
      </div>

      {msg && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-[#14201e] px-3.5 py-2 text-sm text-white">{msg}</div>}
    </div>
  );
}
