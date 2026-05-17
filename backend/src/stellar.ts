import * as StellarSdk from "@stellar/stellar-sdk";
import * as dotenv from "dotenv";
dotenv.config();

const rpcUrl = "https://soroban-testnet.stellar.org";
const horizonUrl = "https://horizon-testnet.stellar.org";

export const server = new StellarSdk.rpc.Server(rpcUrl);
export const horizon = new StellarSdk.Horizon.Server(horizonUrl);

export const CONTRACT_ID = process.env.CONTRACT_ID!;
export const OPERATOR_SECRET = process.env.OPERATOR_SECRET!;
export const OPERATOR_PUBLIC = process.env.OPERATOR_PUBLIC!;
export const USER_SECRET = process.env.USER_SECRET!;
export const USER_PUBLIC = process.env.USER_PUBLIC!;
export const CHARGER_ID = process.env.CHARGER_ID!;
export const PRECO_KWH_STROOPS = BigInt(process.env.PRECO_KWH_STROOPS!);

const operadorKeypair = StellarSdk.Keypair.fromSecret(OPERATOR_SECRET);
const usuarioKeypair = StellarSdk.Keypair.fromSecret(USER_SECRET);

// Mutex simples para serializar transações
let txQueue = Promise.resolve();

function serializarTx<T>(fn: () => Promise<T>): Promise<T> {
  const next = txQueue.then(() => fn());
  txQueue = next.then(() => {}, () => {});
  return next;
}

async function invokeContract(
  functionName: string,
  args: StellarSdk.xdr.ScVal[],
  signerKeypair: StellarSdk.Keypair
) {
  const account = await server.getAccount(signerKeypair.publicKey());

  const contract = new StellarSdk.Contract(CONTRACT_ID);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(contract.call(functionName, ...args))
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(signerKeypair);

  const result = await server.sendTransaction(prepared);

  if (result.status === "ERROR") {
    throw new Error(`Contrato erro: ${JSON.stringify(result)}`);
  }

  let response = await server.getTransaction(result.hash);
  let attempts = 0;
  while (response.status === "NOT_FOUND" && attempts < 20) {
    await new Promise((r) => setTimeout(r, 1000));
    response = await server.getTransaction(result.hash);
    attempts++;
  }

  if (response.status === "SUCCESS") {
    return response;
  }

  throw new Error(`Transação falhou: ${response.status}`);
}

export async function iniciarSessao(
  usuarioPublic: string,
  carregadorId: string
): Promise<number> {
  return serializarTx(async () => {
    const args = [
      new StellarSdk.Address(usuarioPublic).toScVal(),
      StellarSdk.xdr.ScVal.scvSymbol(carregadorId),
    ];

    const response = await invokeContract("iniciar_sessao", args, usuarioKeypair);

    const resultVal = response.returnValue;
    if (resultVal) {
      return Number(resultVal.u64());
    }
    throw new Error("Sessao ID nao retornado");
  });
}

export async function atualizarConsumo(
  sessaoId: number,
  custoIncremento: bigint
): Promise<bigint> {
  return serializarTx(async () => {
    const args = [
      StellarSdk.xdr.ScVal.scvU64(
        new StellarSdk.xdr.Uint64(sessaoId)
      ),
      StellarSdk.xdr.ScVal.scvI128(
        new StellarSdk.xdr.Int128Parts({
          hi: new StellarSdk.xdr.Int64(0),
          lo: new StellarSdk.xdr.Uint64(Number(custoIncremento)),
        })
      ),
      new StellarSdk.Address(OPERATOR_PUBLIC).toScVal(),
    ];

    await invokeContract("atualizar_consumo", args, operadorKeypair);
    return custoIncremento;
  });
}

export async function finalizarSessao(sessaoId: number): Promise<bigint> {
  return serializarTx(async () => {
    const args = [
      StellarSdk.xdr.ScVal.scvU64(new StellarSdk.xdr.Uint64(sessaoId)),
      new StellarSdk.Address(OPERATOR_PUBLIC).toScVal(),
    ];

    const response = await invokeContract(
      "finalizar_sessao",
      args,
      operadorKeypair
    );

    const resultVal = response.returnValue;
    if (resultVal) {
      const hi = BigInt(resultVal.i128().hi().toBigInt());
      const lo = BigInt(resultVal.i128().lo().toBigInt());
      const custoTotal = (hi << BigInt(64)) + lo;

      await executarPagamento(custoTotal);

      return custoTotal;
    }
    throw new Error("Custo total nao retornado");
  });
}

async function executarPagamento(custoStroops: bigint) {
  const account = await horizon.loadAccount(USER_PUBLIC);

  const xlmAmount = (Number(custoStroops) / 10_000_000).toFixed(7);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: OPERATOR_PUBLIC,
        asset: StellarSdk.Asset.native(),
        amount: xlmAmount,
      })
    )
    .setTimeout(30)
    .build();

  tx.sign(usuarioKeypair);
  await horizon.submitTransaction(tx);

  console.log(`💰 Pagamento de ${xlmAmount} XLM enviado ao operador`);
}