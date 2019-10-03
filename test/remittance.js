const Remittance = artifacts.require("Remittance.sol");
const { toWei, fromAscii } = web3.utils;

contract('Remittance', (accounts) => {
  const BN = web3.utils.toBN;
  let remittanceInstance, alice, bob, carol;
  [alice, bob, carol] = accounts;
  beforeEach("deploy new Remittance", function () {
    return Remittance.new(false, {from: alice})
      .then(instance => remittanceInstance = instance);
  });

  it('should deposit and withdraw the amount correctly', async () => {
    // Calculate balances expected.
    const amount = BN(toWei('0.01'));
    const amountToSend = BN(toWei('0.01'));
    const feeMin = BN(toWei('0.001'));

    const hash = await remittanceInstance.hashIt(1, 1, bob);

    const balanceBobBefore = new BN(await web3.eth.getBalance(bob));

    // Transaction 1.
    const tx1 = await remittanceInstance.deposit(hash, bob, 1000, {
      value: amount,
      from: alice
    });

    // Transaction 2.
    const tx2 = await remittanceInstance.withdraw(1, 1, {
      from: bob
    });

    // Bob Balance (without tx2 gas cost) should be amount to send less feeMin (because feeExpected < feeMin)
    const balanceBobWithoutGasCost = new BN(balanceBobBefore.add(amountToSend.sub(feeMin)));

    // Get gas cost from tx2
    const transaction = await web3.eth.getTransaction(tx2.tx);
    const gasPrice = transaction.gasPrice;
    const gasUsed = new BN(tx2.receipt.gasUsed);
    const gasCost = gasUsed.mul(new BN(gasPrice));

    // Calculate Bob balance expected (with tx2 gas cost).
    const balanceBobExpected = balanceBobWithoutGasCost.sub(new BN(gasCost));

    // Get balance of Bob account after the transactions.
    const balanceBobAfterTx = await web3.eth.getBalance(bob);

    // Check
    assert.equal(balanceBobAfterTx.toString(10), balanceBobExpected.toString(10), "Balance error in Bob account")
  });
});