import WebSocket from "ws";

const BACKEND_URL = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `wss://${process.env.RAILWAY_PUBLIC_DOMAIN}/ocpp/EVSE_001`
  : "ws://localhost:3001/ocpp/EVSE_001";

let ws: WebSocket;
let meterValue = 0;
let meterInterval: NodeJS.Timeout | null = null;

export function conectarSimulador() {
  ws = new WebSocket(BACKEND_URL, ["ocpp1.6"]);

  ws.on("open", () => {
    console.log("[EVSE] Conectado ao backend OCPP");
    enviarBootNotification();
  });

  ws.on("message", (data: string) => {
    const msg = JSON.parse(data.toString());
    const [tipo, msgId, action, payload] = msg;

    console.log(`[EVSE] Recebido:`, JSON.stringify(msg));

    if (tipo === 2) {
      handleAction(msgId, action, payload);
    }
  });

  ws.on("close", () => {
    console.log("[EVSE] Desconectado. Reconectando em 3s...");
    setTimeout(conectarSimulador, 3000);
  });

  ws.on("error", (err) => {
    console.error("[EVSE] Erro:", err.message);
  });
}

function enviar(msg: any) {
  ws.send(JSON.stringify(msg));
}

function enviarBootNotification() {
  enviar([2, "boot-001", "BootNotification", {
    chargePointModel: "EVSE-SIM-001",
    chargePointVendor: "StellarChargeEV",
  }]);
}

function enviarStatusNotification(status: string) {
  enviar([2, `status-${Date.now()}`, "StatusNotification", {
    connectorId: 1,
    errorCode: "NoError",
    status,
  }]);
}

function handleAction(msgId: string, action: string, payload: any) {
  switch (action) {
    case "BootNotification":
      enviarStatusNotification("Available");
      break;

    case "RemoteStartTransaction":
      enviar([3, msgId, { status: "Accepted" }]);
      enviarStatusNotification("Charging");
      iniciarMedicao();
      setTimeout(() => {
        enviar([2, `start-${Date.now()}`, "StartTransaction", {
          connectorId: 1,
          idTag: "STELLAR-USER",
          meterStart: 0,
          timestamp: new Date().toISOString(),
        }]);
      }, 500);
      break;

    case "RemoteStopTransaction":
      enviar([3, msgId, { status: "Accepted" }]);
      pararMedicao();
      enviarStatusNotification("Finishing");
      setTimeout(() => {
        enviar([2, `stop-${Date.now()}`, "StopTransaction", {
          transactionId: 1,
          meterStop: meterValue,
          timestamp: new Date().toISOString(),
          reason: "Remote",
        }]);
        meterValue = 0;
        enviarStatusNotification("Available");
      }, 500);
      break;

    default:
      enviar([3, msgId, {}]);
  }
}

function iniciarMedicao() {
  meterInterval = setInterval(() => {
    meterValue += 100; // +0.1 kWh a cada 5 segundos
    enviar([2, `meter-${Date.now()}`, "MeterValues", {
      connectorId: 1,
      transactionId: 1,
      meterValue: [{
        timestamp: new Date().toISOString(),
        sampledValue: [{
          value: String(meterValue),
          unit: "Wh",
          measurand: "Energy.Active.Import.Register",
        }],
      }],
    }]);
    console.log(`[EVSE] MeterValue enviado: ${meterValue} Wh`);
  }, 5000);
}

function pararMedicao() {
  if (meterInterval) {
    clearInterval(meterInterval);
    meterInterval = null;
  }
}