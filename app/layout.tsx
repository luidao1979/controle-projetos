import "./globals.css";
import type { Metadata, Viewport } from "next";
export const metadata: Metadata = { title: "Controle de Projetos" };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
