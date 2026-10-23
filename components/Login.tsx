"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [load, setLoad] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoad(true); setErro("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) setErro("E-mail ou senha incorretos.");
    setLoad(false);
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form onSubmit={entrar} className="card w-full max-w-sm">
        <h1 className="text-xl font-bold">Controle de Projetos</h1>
        <label className="lbl">E-mail<input className="inp" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="lbl">Senha<input className="inp" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} /></label>
        {erro && <p className="text-sm text-red-700">{erro}</p>}
        <button className="btn-pri" disabled={load}>{load ? "Entrando…" : "Entrar"}</button>
      </form>
    </main>
  );
}
