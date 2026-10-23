export type Link = { label: string; url: string };
export type Acesso = { servico: string; login: string; cofre: string };
export type Projeto = {
  id: string; nome: string; cliente: string; conta: "Pessoal" | "Lady";
  tipo: "Sistema" | "Arte gráfica"; status: "Ativo" | "Pausado" | "Concluído";
  inicio: string | null; horas: number; valor_hora: number; margem: number;
  manutencao: number; valor_fechado: number; obs: string; links: Link[]; acessos: Acesso[];
};
export type Lancamento = {
  id: string; projeto_id: string; tipo: "assinatura" | "custo" | "receita"; descricao: string;
  moeda: "BRL" | "USD"; valor: number; data: string; ativo: boolean; fim: string | null;
};
