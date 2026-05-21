# ⚡ Stellar Charge EV

> Protocolo de pagamento descentralizado para recarga de veículos elétricos, construído na blockchain Stellar.

## 🚀 Demo ao Vivo

**[👉 Testar o app agora](https://stellar-charge-ev-app.vercel.app)**

> Não precisa instalar nada. Acesse, clique em **Iniciar Recarga**, aguarde alguns segundos e clique em **Finalizar e Pagar**. O pagamento é executado em tempo real na Stellar Testnet.

---

## 🔗 Transações On-Chain (Stellar Testnet)

Todas as recargas são auditáveis publicamente na blockchain:

| | Link |
|---|---|
| 💰 **Operador** (recebe os pagamentos) | [Ver no Stellar Expert](https://stellar.expert/explorer/testnet/account/GDXD77AVGS32EI7HQE6IZHE4JVRKE2CZVKWEZSTBQXVAEJNY3EUQ7EXS) |
| 📋 **Contrato Soroban** (todas as sessões) | [Ver no Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBM2NQFIF3UHJKR5AF52PAX34KPJQYQT5VKXFMDH6QOJWCCWJ6SZFSJL) |

---

## 🎯 O Problema

Carregar um veículo elétrico no Brasil hoje exige:

- Baixar o app proprietário de cada operadora
- Ter cartão RFID vinculado à conta
- Aguardar D+15 a D+30 para o operador receber o pagamento

## 💡 A Solução

**1 QR Code. Pagamento em segundos. Sem intermediário.**

O motorista escaneia o QR Code → o sistema valida on-chain → a estação libera energia → o operador recebe em ~5 segundos diretamente na carteira.

---

## 🏗️ Arquitetura

Frontend (React + Vercel)
↕ REST API
Backend (Node.js + Railway)
↕ OCPP 1.6J (WebSocket)
Simulador EVSE
↕ Soroban RPC + Horizon
Smart Contract (Rust + Soroban — Stellar Testnet)

## 🛠️ Stack

| Camada | Tecnologia |
|---|---|
| Smart Contract | Rust + Soroban SDK |
| Protocolo EV | OCPP 1.6J (padrão industrial) |
| Backend | Node.js + TypeScript |
| Frontend | React + Vite |
| Pagamento | XLM nativo — Stellar Testnet |
| Deploy Backend | Railway |
| Deploy Frontend | Vercel |

---

## ▶️ Rodar Localmente

### Pré-requisitos
- Node.js 18+
- Rust + Stellar CLI (para o contrato)

### Backend
```bash
cd backend
npm install
cp .env.example .env  # preencher variáveis
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 📋 Smart Contract

- **Contract ID:** `CBM2NQFIF3UHJKR5AF52PAX34KPJQYQT5VKXFMDH6QOJWCCWJ6SZFSJL`
- **Rede:** Stellar Testnet
- **Funções:** `registrar_carregador`, `iniciar_sessao`, `atualizar_consumo`, `finalizar_sessao`, `consultar_sessao`

---

## 💼 Modelo de Negócio

- **Fee de protocolo:** 1–2% por sessão, cobrado automaticamente no smart contract
- **SaaS para operadores:** Licença mensal para habilitar Stellar nos EVSEs
- **x402:** Relatórios de sessão protegidos por micropagamento em USDC

---

## 🗺️ Roadmap

- [x] Smart contract deployado na testnet
- [x] Backend OCPP + Soroban
- [x] Frontend com QR Code
- [x] Integração x402
- [ ] Migrar pagamento para USDC on Stellar
- [ ] Piloto real com Voltbras
- [ ] Aplicar ao Stellar Community Fund (SCF)

---

## 📄 Licença

MIT

---

---

## 👤 Contato

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Stellar_Charge_EV-blue?logo=linkedin)](https://www.linkedin.com/in/stellar-charge-ev/)

*Construído no Stellar 37° · NearX · 2026*