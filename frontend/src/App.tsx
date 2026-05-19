import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import axios from "axios";

const API = "https://stellar-charge-ev-production.up.railway.app/api";
const CHARGER_URL = `https://stellar-charge-ev-production.up.railway.app/charge?charger=EVSE_001`;
const STELLAR_EXPERT_URL = "https://stellar.expert/explorer/testnet/account/GDXD77AVGS32EI7HQE6IZHE4JVRKE2CZVKWEZSTBQXVAEJNY3EUQ7EXS";

type Estado = "idle" | "carregando" | "finalizado" | "erro";

interface SessaoInfo {
  sessaoId: number;
  custoTotal?: string;
  xlmTotal?: string;
}

export default function App() {
  const [estado, setEstado] = useState<Estado>("idle");
  const [sessao, setSessao] = useState<SessaoInfo | null>(null);
  const [meterAtual, setMeterAtual] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [erro, setErro] = useState("");

  const addLog = (msg: string) => {
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  useEffect(() => {
    if (estado !== "carregando") return;
    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get(`${API}/sessao/status`);
        setMeterAtual(data.meterAtual);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [estado]);

  async function iniciarSessao() {
    try {
      setEstado("carregando");
      setErro("");
      addLog("Iniciando sessão on-chain...");
      const { data } = await axios.post(`${API}/sessao/iniciar`);
      setSessao({ sessaoId: data.sessaoId });
      addLog(`✅ Sessão ${data.sessaoId} iniciada na testnet Stellar`);
      addLog("⚡ EVSE em modo Charging — acumulando energia...");
    } catch (err: any) {
      setEstado("erro");
      setErro(err.response?.data?.erro || err.message);
      addLog(`❌ Erro: ${err.message}`);
    }
  }

  async function finalizarSessao() {
    try {
      addLog("Finalizando sessão e executando pagamento...");
      const { data } = await axios.post(`${API}/sessao/finalizar`);
      setSessao((prev) => ({
        ...prev!,
        custoTotal: data.custoTotal,
        xlmTotal: data.xlmTotal,
      }));
      setEstado("finalizado");
      addLog(`✅ Sessão ${data.sessaoId} finalizada`);
      addLog(`💰 Pagamento de ${data.xlmTotal} XLM enviado ao operador`);
      addLog("🔗 Transação confirmada na Stellar Testnet");
    } catch (err: any) {
      setEstado("erro");
      setErro(err.response?.data?.erro || err.message);
      addLog(`❌ Erro: ${err.message}`);
    }
  }

  function reiniciar() {
    setEstado("idle");
    setSessao(null);
    setMeterAtual(0);
    setErro("");
    setLog([]);
  }

  const kwh = (meterAtual / 1000).toFixed(2);
  const custoEstimado = ((meterAtual / 1000) * 0.5).toFixed(4);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>⚡ Stellar Charge EV</h1>
        <p style={styles.subtitle}>Pagamento descentralizado para recarga de veículos elétricos</p>
      </div>

      <div style={styles.content}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>📍 Estação EVSE_001</h2>
          <div style={styles.qrContainer}>
            <QRCodeSVG value={CHARGER_URL} size={180} />
          </div>
          <p style={styles.qrLabel}>Escaneie para iniciar a recarga</p>
          <code style={styles.code}>0,5 XLM / kWh</code>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>🎛️ Painel do Motorista</h2>

          <div style={{
            ...styles.statusBadge,
            background: estado === "carregando" ? "#1a4a1a" :
                        estado === "finalizado" ? "#1a3a4a" :
                        estado === "erro" ? "#4a1a1a" : "#2a2a2a"
          }}>
            {estado === "idle" && "🔌 Aguardando início"}
            {estado === "carregando" && "⚡ Carregando..."}
            {estado === "finalizado" && "✅ Sessão finalizada"}
            {estado === "erro" && "❌ Erro"}
          </div>

          {estado === "carregando" && (
            <div style={styles.metricas}>
              <div style={styles.metrica}>
                <span style={styles.metricaLabel}>Energia</span>
                <span style={styles.metricaValor}>{kwh} kWh</span>
              </div>
              <div style={styles.metrica}>
                <span style={styles.metricaLabel}>Custo estimado</span>
                <span style={styles.metricaValor}>{custoEstimado} XLM</span>
              </div>
              {sessao && (
                <div style={styles.metrica}>
                  <span style={styles.metricaLabel}>Sessão on-chain</span>
                  <span style={styles.metricaValor}>#{sessao.sessaoId}</span>
                </div>
              )}
            </div>
          )}

          {estado === "finalizado" && sessao && (
            <div style={styles.resultado}>
              <p>🔋 Sessão <strong>#{sessao.sessaoId}</strong></p>
              <p>💰 Total pago: <strong>{sessao.xlmTotal} XLM</strong></p>
              <p style={styles.onchain}>✅ Confirmado on-chain na Stellar Testnet</p>
              <a              
                href={STELLAR_EXPERT_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.link}
              >
                🔗 Ver transação no Stellar Expert
              </a>
            </div>
          )}

          {erro && <p style={styles.erro}>{erro}</p>}

          <div style={styles.botoes}>
            {estado === "idle" && (
              <button style={styles.btnIniciar} onClick={iniciarSessao}>
                ⚡ Iniciar Recarga
              </button>
            )}
            {estado === "carregando" && (
              <button style={styles.btnFinalizar} onClick={finalizarSessao}>
                🛑 Finalizar e Pagar
              </button>
            )}
            {(estado === "finalizado" || estado === "erro") && (
              <button style={styles.btnReiniciar} onClick={reiniciar}>
                🔄 Nova Sessão
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📋 Log da Sessão</h2>
        <div style={styles.logContainer}>
          {log.length === 0 && (
            <p style={styles.logVazio}>Aguardando ações...</p>
          )}
          {log.map((line, i) => (
            <p key={i} style={styles.logLine}>{line}</p>
          ))}
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
    padding: "24px",
    maxWidth: "900px",
    margin: "0 auto",
  },
  header: {
    textAlign: "center",
    marginBottom: "32px",
  },
  title: {
    fontSize: "2rem",
    fontWeight: 700,
    color: "#f97316",
    margin: 0,
  },
  subtitle: {
    color: "#888",
    marginTop: "8px",
  },
  content: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
    marginBottom: "24px",
  },
  card: {
    background: "#1a1a1a",
    borderRadius: "12px",
    padding: "24px",
    border: "1px solid #2a2a2a",
  },
  cardTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    marginBottom: "16px",
    color: "#f97316",
  },
  qrContainer: {
    display: "flex",
    justifyContent: "center",
    padding: "16px",
    background: "#ffffff",
    borderRadius: "8px",
    marginBottom: "12px",
  },
  qrLabel: {
    textAlign: "center",
    color: "#888",
    fontSize: "0.85rem",
    marginBottom: "8px",
  },
  code: {
    display: "block",
    textAlign: "center",
    color: "#f97316",
    fontSize: "0.9rem",
  },
  statusBadge: {
    padding: "12px",
    borderRadius: "8px",
    textAlign: "center",
    marginBottom: "16px",
    fontSize: "0.95rem",
  },
  metricas: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "16px",
  },
  metrica: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 12px",
    background: "#2a2a2a",
    borderRadius: "6px",
  },
  metricaLabel: {
    color: "#888",
    fontSize: "0.85rem",
  },
  metricaValor: {
    color: "#f97316",
    fontWeight: 600,
  },
  resultado: {
    background: "#1a3a1a",
    padding: "16px",
    borderRadius: "8px",
    marginBottom: "16px",
    lineHeight: 1.8,
  },
  onchain: {
    color: "#4ade80",
    fontSize: "0.85rem",
  },
  link: {
    display: "block",
    marginTop: "8px",
    color: "#f97316",
    fontSize: "0.85rem",
    textDecoration: "none",
  },
  erro: {
    color: "#f87171",
    fontSize: "0.85rem",
    marginBottom: "12px",
    padding: "8px",
    background: "#2a1a1a",
    borderRadius: "6px",
  },
  botoes: {
    display: "flex",
    gap: "8px",
  },
  btnIniciar: {
    flex: 1,
    padding: "12px",
    background: "#f97316",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "1rem",
  },
  btnFinalizar: {
    flex: 1,
    padding: "12px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "1rem",
  },
  btnReiniciar: {
    flex: 1,
    padding: "12px",
    background: "#374151",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "1rem",
  },
  logContainer: {
    background: "#0a0a0a",
    borderRadius: "8px",
    padding: "12px",
    maxHeight: "200px",
    overflowY: "auto",
    fontFamily: "monospace",
  },
  logVazio: {
    color: "#444",
    fontSize: "0.85rem",
    textAlign: "center",
  },
  logLine: {
    margin: "2px 0",
    fontSize: "0.8rem",
    color: "#aaa",
  },
};

