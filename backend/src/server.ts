import express from "express";
import x402Router from "./x402";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import * as http from "http";
import * as dotenv from "dotenv";
import {
  iniciarSessao,
  atualizarConsumo,
  finalizarSessao,
  CHARGER_ID,
  PRECO_KWH_STROOPS,
  USER_PUBLIC,
} from "./stellar";
import { conectarSimulador } from "./ocpp/simulator";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/x402", x402Router);

const server = http.createServer(app);

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  if (req.url?.startsWith("/ocpp")) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

let sessaoAtiva: {
  sessaoId: number;
  meterStart: number;
  ws: WebSocket;
} | null = null;

wss.on("connection", (ws, req) => {
  const chargerId = req.url?.split("/ocpp/")[1] || "EVSE_001";
  console.log(`[OCPP] EVSE conectado: ${chargerId}`);

  ws.on("message", async (data) => {
    const msg = JSON.parse(data.toString());
    const [tipo, msgId, action, payload] = msg;

    console.log(`[OCPP] Recebido: ${action}`);

    switch (action) {
      case "BootNotification":
        ws.send(JSON.stringify([3, msgId, {
          status: "Accepted",
          currentTime: new Date().toISOString(),
          interval: 300,
        }]));
        break;

      case "StatusNotification":
        ws.send(JSON.stringify([3, msgId, {}]));
        console.log(`[OCPP] Status: ${payload.status}`);
        break;

      case "StartTransaction":
        ws.send(JSON.stringify([3, msgId, {
          transactionId: 1,
          idTagInfo: { status: "Accepted" },
        }]));
        break;

      case "MeterValues":
        ws.send(JSON.stringify([3, msgId, {}]));
        if (sessaoAtiva) {
          const whAtual = Number(
            payload.meterValue?.[0]?.sampledValue?.[0]?.value || 0
          );
          const whAnterior = sessaoAtiva.meterStart;
          const incrementoWh = whAtual - whAnterior;
          sessaoAtiva.meterStart = whAtual;

          if (incrementoWh > 0) {
            const kWh = incrementoWh / 1000;
            const custoIncremento = BigInt(
              Math.round(kWh * Number(PRECO_KWH_STROOPS))
            );

            console.log(`[OCPP] +${incrementoWh}Wh = ${custoIncremento} stroops`);

            try {
              await atualizarConsumo(sessaoAtiva.sessaoId, custoIncremento);
            } catch (err) {
              console.error("[Soroban] Erro ao atualizar consumo:", err);
            }
          }
        }
        break;

      case "StopTransaction":
        ws.send(JSON.stringify([3, msgId, {
          idTagInfo: { status: "Accepted" },
        }]));
        break;

      default:
        ws.send(JSON.stringify([3, msgId, {}]));
    }
  });

  ws.on("close", () => {
    console.log("[OCPP] EVSE desconectado");
  });
});

app.post("/api/sessao/iniciar", async (req, res) => {
  try {
    console.log("[API] Iniciando sessão...");

    const sessaoId = await iniciarSessao(USER_PUBLIC, CHARGER_ID);
    console.log(`[Soroban] Sessão iniciada: ${sessaoId}`);

    const evseWs = [...wss.clients][0] as WebSocket;
    if (evseWs && evseWs.readyState === WebSocket.OPEN) {
      evseWs.send(JSON.stringify([
        2,
        `rstart-${Date.now()}`,
        "RemoteStartTransaction",
        { connectorId: 1, idTag: "STELLAR-USER" },
      ]));

      sessaoAtiva = { sessaoId, meterStart: 0, ws: evseWs };
    }

    res.json({ ok: true, sessaoId });
  } catch (err: any) {
    console.error("[API] Erro ao iniciar sessão:", err.message);
    res.status(500).json({ ok: false, erro: err.message });
  }
});

app.post("/api/sessao/finalizar", async (req, res) => {
  try {
    if (!sessaoAtiva) {
      return res.status(400).json({ ok: false, erro: "Nenhuma sessão ativa" });
    }

    console.log("[API] Finalizando sessão...");

    const evseWs = sessaoAtiva.ws;
    if (evseWs && evseWs.readyState === WebSocket.OPEN) {
      evseWs.send(JSON.stringify([
        2,
        `rstop-${Date.now()}`,
        "RemoteStopTransaction",
        { transactionId: 1 },
      ]));
    }

    await new Promise((r) => setTimeout(r, 2000));

    const sessaoId = sessaoAtiva.sessaoId;
    const custoTotal = await finalizarSessao(sessaoId);
    const xlmTotal = (Number(custoTotal) / 10_000_000).toFixed(7);

    sessaoAtiva = null;

    res.json({ ok: true, sessaoId, custoTotal: custoTotal.toString(), xlmTotal });
  } catch (err: any) {
    console.error("[API] Erro ao finalizar sessão:", err.message);
    res.status(500).json({ ok: false, erro: err.message });
  }
});

app.get("/api/sessao/status", (req, res) => {
  res.json({
    ativa: !!sessaoAtiva,
    sessaoId: sessaoAtiva?.sessaoId || null,
    meterAtual: sessaoAtiva?.meterStart || 0,
  });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 Stellar Charge EV Backend rodando na porta ${PORT}`);
  console.log(`   REST API: http://localhost:${PORT}/api`);
  console.log(`   OCPP WS:  ws://localhost:${PORT}/ocpp\n`);

  setTimeout(() => {
    console.log("[EVSE] Iniciando simulador...");
    conectarSimulador();
  }, 1000);
});