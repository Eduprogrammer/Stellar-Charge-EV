import pkg from "@stellar/stellar-sdk";
const { Keypair, Networks, TransactionBuilder, BASE_FEE, Operation, Asset, Horizon } = pkg;

const server = new Horizon.Server("https://horizon-testnet.stellar.org");

async function createTestnetAccount() {
  // 1. Gerar novo keypair
  const keypair = Keypair.random();
  const publicKey = keypair.publicKey();
  const secretKey = keypair.secret();

  console.log("=== NOVA CONTA STELLAR TESTNET ===");
  console.log("Chave Pública:", publicKey);
  console.log("Chave Privada:", secretKey);
  console.log("(Guarde a chave privada com segurança!)");
  console.log("");

  // 2. Financiar via Friendbot
  console.log("Financiando conta via Friendbot...");
  const friendbotUrl = `https://friendbot.stellar.org?addr=${publicKey}`;
  const response = await fetch(friendbotUrl);
  const result = await response.json();

  if (!response.ok) {
    console.error("Erro ao financiar conta:", result);
    return;
  }

  const friendbotTxHash = result.hash;
  console.log("Conta financiada! Hash da transação Friendbot:", friendbotTxHash);
  console.log("");

  // 3. Fazer uma transação de pagamento para si mesmo (memo) para gerar hash próprio
  console.log("Criando transação de pagamento na testnet...");
  const account = await server.loadAccount(publicKey);

  // Criar um segundo keypair como destino
  const destKeypair = Keypair.random();
  const destPublicKey = destKeypair.publicKey();

  // Financiar o destino também
  await fetch(`https://friendbot.stellar.org?addr=${destPublicKey}`);

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: destPublicKey,
        asset: Asset.native(),
        amount: "10",
      })
    )
    .setTimeout(30)
    .build();

  transaction.sign(keypair);

  const txResult = await server.submitTransaction(transaction);
  const txHash = txResult.hash;

  console.log("=== TRANSAÇÃO CONFIRMADA ===");
  console.log("Hash da transação:", txHash);
  console.log("");
  console.log("=== DADOS PARA O FORMULÁRIO ===");
  console.log("Chave pública da conta:", publicKey);
  console.log("Hash da transação confirmada:", txHash);
  console.log("");
  console.log("Stellar Expert:", `https://stellar.expert/explorer/testnet/tx/${txHash}`);
}

createTestnetAccount().catch(console.error);
