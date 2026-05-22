import { useState, useEffect } from "react";
import TelaLogin from "./pages/TelaLogin";
import PainelMotorista from "./pages/PainelMotorista";
import { obterUsuario, removerUsuario, type Usuario } from "./lib/auth";

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Ao iniciar o app, verifica se já tem usuário salvo
  useEffect(() => {
    const salvo = obterUsuario();
    setUsuario(salvo);
    setCarregando(false);
  }, []);

  function handleLogin(novoUsuario: Usuario) {
    setUsuario(novoUsuario);
  }

  function handleSair() {
    removerUsuario();
    setUsuario(null);
  }

  if (carregando) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          color: "#888",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        Carregando...
      </div>
    );
  }

  if (!usuario) {
    return <TelaLogin onLogin={handleLogin} />;
  }

  return <PainelMotorista usuario={usuario} onSair={handleSair} />;
}