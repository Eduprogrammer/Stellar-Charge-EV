import { Router } from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import * as dotenv from "dotenv";
dotenv.config();

const router = Router();

const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://channels.openzeppelin.com/x402/testnet",
  createAuthHeaders: async () => {
    const headers = { Authorization: `Bearer ${process.env.X402_API_KEY}` };
    return {
      verify: headers,
      settle: headers,
      supported: headers,
    };
  },
});

const resourceServer = new x402ResourceServer(facilitatorClient).register(
  "stellar:testnet",
  new ExactStellarScheme()
);

// Endpoint protegido por x402
// Operador paga $0.001 USDC para acessar o relatório de uma sessão
router.use(
  paymentMiddleware(
    {
      "GET /relatorio/:sessaoId": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.001",
            network: "stellar:testnet",
            payTo: process.env.OPERATOR_PUBLIC!,
          },
        ],
        description: "Relatório detalhado da sessão de recarga",
        mimeType: "application/json",
      },
    },
    resourceServer
  )
);

router.get("/relatorio/:sessaoId", (req, res) => {
  const { sessaoId } = req.params;
  res.json({
    sessaoId: Number(sessaoId),
    protocolo: "OCPP 1.6J + Soroban",
    rede: "Stellar Testnet",
    contrato: process.env.CONTRACT_ID,
    preco_kwh: "0.5 XLM",
    status: "FINALIZADA",
    mensagem: `Relatório da sessão #${sessaoId} — pago via x402 na Stellar Testnet`,
    timestamp: new Date().toISOString(),
  });
});

export default router;
