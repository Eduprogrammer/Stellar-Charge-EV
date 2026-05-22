import { useState } from "react";
import {
  salvarUsuario,
  nomeAPartirDoEmail,
  criarUsuarioPasskeyMock,
  type Usuario,
} from "../lib/auth";

interface TelaLoginProps {
  onLogin: (usuario: Usuario) => void;
}

export default function TelaLogin({ onLogin }: TelaLoginProps) {
  const [modo, setModo] = useState<"escolha" | "email">("escolha");
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrarComPasskey() {
    setCarregando(true);
    // Mock: simula delay do Face ID / digital
    await new Promise((r) => setTimeout(r, 1200));
    const usuario = criarUsuarioPasskeyMock();
    salvarUsuario(usuario);
    onLogin(usuario);
  }

  async function entrarComEmail() {
    if (!email.includes("@")) {
      alert("Digite um email válido");
      return;
    }
    setCarregando(true);
    // Mock: simula envio/verificação
    await new Promise((r) => setTimeout(r, 800));
    const usuario: Usuario = {
      nome: nomeAPartirDoEmail(email),
      email,
      metodo: "email",
      criadoEm: new Date().toISOString(),
    };
    salvarUsuario(usuario);
    onLogin(usuario);
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>⚡ Stellar Charge EV</h1>
          <p style={styles.subtitle}>
            Recarregue seu veículo elétrico de forma simples e segura
          </p>
        </div>

        {modo === "escolha" && (
          <>
            <button
              style={styles.btnPrimario}
              onClick={entrarComPasskey}
              disabled={carregando}
            >
              {carregando ? "Verificando..." : "👆 Continuar com Face ID / Digital"}
            </button>

            <div style={styles.divisor}>
              <span style={styles.divisorTexto}>ou</span>
            </div>

            <button
              style={styles.btnSecundario}
              onClick={() => setModo("email")}
              disabled={carregando}
            >
              ✉️ Continuar com email
            </button>

            <p style={styles.rodape}>
              É a primeira vez? A conta é criada automaticamente.
              <br />
              Já tem conta? Entra com o mesmo método de antes.
            </p>
          </>
        )}

        {modo === "email" && (
          <>
            <label style={styles.label}>Seu email</label>
            <input
              type="email"
              placeholder="voce@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              disabled={carregando}
              autoFocus
            />

            <button
              style={styles.btnPrimario}
              onClick={entrarComEmail}
              disabled={carregando || !email.includes("@")}
            >
              {carregando ? "Entrando..." : "Continuar"}
            </button>

            <button
              style={styles.btnVoltar}
              onClick={() => setModo("escolha")}
              disabled={carregando}
            >
              ← Voltar
            </button>
          </>
        )}

        <div style={styles.aviso}>
          🧪 Demo do hackathon Stellar 37° · NearX · 2026
          <br />
          Rodando na Stellar Testnet
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#ffffff",
    fontFamily: "'Inter', sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  card: {
    background: "#1a1a1a",
    borderRadius: "16px",
    padding: "40px 32px",
    border: "1px solid #2a2a2a",
    width: "100%",
    maxWidth: "420px",
  },
  header: {
    textAlign: "center",
    marginBottom: "32px",
  },
  title: {
    fontSize: "1.8rem",
    fontWeight: 700,
    color: "#f97316",
    margin: 0,
  },
  subtitle: {
    color: "#888",
    marginTop: "12px",
    fontSize: "0.95rem",
    lineHeight: 1.5,
  },
  btnPrimario: {
    width: "100%",
    padding: "14px",
    background: "#f97316",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "1rem",
    marginBottom: "12px",
  },
  btnSecundario: {
    width: "100%",
    padding: "14px",
    background: "transparent",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: "10px",
    fontWeight: 500,
    cursor: "pointer",
    fontSize: "1rem",
  },
  btnVoltar: {
    width: "100%",
    padding: "10px",
    background: "transparent",
    color: "#888",
    border: "none",
    cursor: "pointer",
    fontSize: "0.9rem",
    marginTop: "8px",
  },
  divisor: {
    display: "flex",
    alignItems: "center",
    margin: "20px 0",
    color: "#444",
  },
  divisorTexto: {
    margin: "0 auto",
    padding: "0 12px",
    background: "#1a1a1a",
    color: "#666",
    fontSize: "0.85rem",
  },
  label: {
    display: "block",
    color: "#aaa",
    fontSize: "0.85rem",
    marginBottom: "8px",
  },
  input: {
    width: "100%",
    padding: "12px",
    background: "#0a0a0a",
    color: "#fff",
    border: "1px solid #333",
    borderRadius: "8px",
    fontSize: "1rem",
    marginBottom: "16px",
    boxSizing: "border-box",
  },
  rodape: {
    color: "#666",
    fontSize: "0.8rem",
    textAlign: "center",
    marginTop: "20px",
    lineHeight: 1.6,
  },
  aviso: {
    marginTop: "32px",
    padding: "12px",
    background: "#0a0a0a",
    borderRadius: "8px",
    color: "#666",
    fontSize: "0.75rem",
    textAlign: "center",
    lineHeight: 1.6,
  },
};