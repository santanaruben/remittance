const Remittance = artifacts.require("Remittance.sol");
const {
  toBN,
  toWei,
  fromAscii
} = web3.utils;

advanceBlock = () => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_mine',
      id: new Date().getTime()
    }, (err, result) => {
      if (err) {
        return reject(err)
      }
      return resolve(result)
    })
  })
}

contract('Remittance', (accounts) => {
  let remittanceInstance, hash;
  const [alice, bob, carol] = accounts;
  const bobPassword = fromAscii(Math.random());
  const carolPassword = fromAscii(Math.random());
  const amount = toBN(toWei('0.01'));
  const feeMin = toBN(toWei('0.001'));
  const blockLimit = 100;
  const theZeroAccount = '0x0000000000000000000000000000000000000000';

  beforeEach("deploy a new Remittance and create a hash", async function () {
    remittanceInstance = await Remittance.new(false, {
      from: alice
    });

    const _hash = await remittanceInstance.hashIt(bobPassword, carolPassword, bob);
    hash = _hash;
  });

  it('should deposit the amount in the contract', async function () {
    // Calculate balances expected.
    const balanceContractBefore = toBN(await web3.eth.getBalance(remittanceInstance.address));
    const balanceContractExpected = balanceContractBefore.add(amount);

    // Transaction.
    const tx = await remittanceInstance.deposit(hash, bob, blockLimit, {
      value: amount,
      from: alice
    });

    // Get balance of contract account after transaction.
    const balanceContractAfterTx = await web3.eth.getBalance(remittanceInstance.address);

    // Check
    assert.strictEqual(balanceContractAfterTx, balanceContractExpected.toString(10), "Balance error in contract account")
  });

  it("should store deposit variables in the contract", async function () {
    // Check values before Tx
    const check1 = await remittanceInstance.deposits(hash);
    assert.strictEqual(check1.alice, theZeroAccount, "Error in Alice account Before Tx")
    assert.strictEqual(check1.amount.toString(10), (0).toString(10), "Error in amount Before Tx")
    assert.strictEqual(check1.blockLimit.toString(10), (0).toString(10), "Error in blockLimit Before Tx")

    // Transaction
    const tx = await remittanceInstance.deposit(hash, bob, blockLimit, {
      from: alice,
      value: amount
    });

    const amountExpected = amount.sub(feeMin);
    const blockLimitExpected = blockLimit + tx.receipt.blockNumber;

    // Check values after Tx
    const check2 = await remittanceInstance.deposits(hash);
    assert.strictEqual(check2.alice, alice, "Error in Alice account After Tx")
    assert.strictEqual(check2.amount.toString(10), amountExpected.toString(10), "Error in amount After Tx")
    assert.strictEqual(check2.blockLimit.toString(10), blockLimitExpected.toString(10), "Error in blockLimit After Tx")
  });

  it('should emit the LogDeposited event', async function () {
    // Transaction
    const tx = await remittanceInstance.deposit(hash, bob, blockLimit, {
      from: alice,
      value: amount
    });

    const log = tx.logs[0].args;
    const blockLimitExpected = blockLimit + tx.receipt.blockNumber;

    // Checks
    assert.strictEqual(log.hash, hash);
    assert.strictEqual(log.amount.toString(10), amount.toString(10));
    assert.strictEqual(log.alice, alice);
    assert.strictEqual(log.receiver, bob);
    assert.strictEqual(log.blockLimit.toString(10), blockLimitExpected.toString(10));
    assert.strictEqual(tx.logs[0].event, 'LogDeposited');
  });

  it('should withdraw the amount', async function () {
    // Calculate balances.
    const balanceBobBefore = toBN(await web3.eth.getBalance(bob));

    // Transaction 1.
    const tx1 = await remittanceInstance.deposit(hash, bob, blockLimit, {
      value: amount,
      from: alice
    });

    // Transaction 2.
    const tx2 = await remittanceInstance.withdraw(bobPassword, carolPassword, {
      from: bob
    });

    // Bob Balance (without tx2 gas cost) should be amount to send less feeMin (because feeExpected < feeMin)
    const balanceBobWithoutGasCost = toBN(balanceBobBefore.add(amount.sub(feeMin)));

    // Get gas cost from tx2
    const transaction = await web3.eth.getTransaction(tx2.tx);
    const gasPrice = transaction.gasPrice;
    const gasUsed = toBN(tx2.receipt.gasUsed);
    const gasCost = gasUsed.mul(toBN(gasPrice));

    // Calculate Bob balance expected (with tx2 gas cost).
    const balanceBobExpected = balanceBobWithoutGasCost.sub(toBN(gasCost));

    // Get balance of Bob account after transactions.
    const balanceBobAfterTx = await web3.eth.getBalance(bob);

    // Check
    assert.strictEqual(balanceBobAfterTx, balanceBobExpected.toString(10), "Balance error in Bob account")
  });

  it('should withdraw, check storage and event', async function () {
    // Transaction 1.
    const tx1 = await remittanceInstance.deposit(hash, bob, blockLimit, {
      value: amount,
      from: alice
    });

    // Transaction 2.
    const tx2 = await remittanceInstance.withdraw(bobPassword, carolPassword, {
      from: bob
    });

    const log = tx2.logs[0].args;
    const amountExpected = toBN(amount.sub(feeMin));

    // Check storage values after Tx2.
    const check = await remittanceInstance.deposits(hash);
    assert.strictEqual(check.alice, alice, "Error in Alice account After Tx")
    assert.strictEqual(check.amount.toString(10), (0).toString(10), "Error in amount After Tx")
    assert.strictEqual(check.blockLimit.toString(10), (0).toString(10), "Error in blockLimit After Tx")

    // Check emitted event.
    assert.strictEqual(log.hash, hash);
    assert.strictEqual(log.amount.toString(10), amountExpected.toString(10));
    assert.strictEqual(log.account, bob);
    assert.strictEqual(tx2.logs[0].event, 'LogWithdrawn');
  });

  it('should claim the fees', async function () {
    // Transaction 1.
    const tx1 = await remittanceInstance.deposit(hash, bob, blockLimit, {
      value: amount,
      from: alice
    });

    // Calculate Alice balance.
    const balanceAliceBefore = toBN(await web3.eth.getBalance(alice));

    // Transaction 2.
    const tx2 = await remittanceInstance.claimFees({
      from: alice
    });

    // Get gas cost from tx2
    const transaction = await web3.eth.getTransaction(tx2.tx);
    const gasPrice = transaction.gasPrice;
    const gasUsed = toBN(tx2.receipt.gasUsed);
    const gasCost = gasUsed.mul(toBN(gasPrice));

    // Alice Balance (with amount expected)(without tx2 gas cost)
    const balanceAliceWithoutGasCost = toBN(balanceAliceBefore.add(feeMin));

    // Calculate Alice balance expected (with tx2 gas cost).
    const balanceAliceExpected = balanceAliceWithoutGasCost.sub(toBN(gasCost));

    // Get balance of Alice account after transactions.
    const balanceAliceAfterTx = await web3.eth.getBalance(alice);

    // Check
    assert.strictEqual(balanceAliceAfterTx, balanceAliceExpected.toString(10), "Balance error in Alice account")
  });


  it('should reclaim the amount', async function () {
    // Transaction 1.
    const tx1 = await remittanceInstance.deposit(hash, bob, 1, {
      value: amount,
      from: alice
    });

    // Transaction 2. (For the blockLimit to expire)
    const tx2 = await advanceBlock();

    // Calculate Alice balance.
    const balanceAliceBefore = toBN(await web3.eth.getBalance(alice));

    // Transaction 3.
    const tx3 = await remittanceInstance.reclaim(hash, {
      from: alice
    });

    // Get gas cost from tx3
    const transaction = await web3.eth.getTransaction(tx3.tx);
    const gasPrice = transaction.gasPrice;
    const gasUsed = toBN(tx3.receipt.gasUsed);
    const gasCost = gasUsed.mul(toBN(gasPrice));

    // Alice Balance (with amount expected)(without tx3 gas cost)
    const balanceAliceWithoutGasCost = toBN(balanceAliceBefore.add(amount).sub(feeMin));

    // Calculate Alice balance expected (with tx3 gas cost).
    const balanceAliceExpected = balanceAliceWithoutGasCost.sub(toBN(gasCost));

    // Get balance of Alice account after transactions.
    const balanceAliceAfterTx = await web3.eth.getBalance(alice);

    // Check
    assert.strictEqual(balanceAliceAfterTx, balanceAliceExpected.toString(10), "Balance error in Alice account")
  });

  it('should kill the contract and withdraw the funds', async function () {
    // Calculate Alice balance.
    const balanceAliceBefore = toBN(await web3.eth.getBalance(alice));

    // Transaction 1.
    const tx1 = await remittanceInstance.deposit(hash, bob, blockLimit, {
      value: amount,
      from: alice
    });

    // Get gas cost from tx1
    const transaction1 = await web3.eth.getTransaction(tx1.tx);
    const gasPrice1 = transaction1.gasPrice;
    const gasUsed1 = toBN(tx1.receipt.gasUsed);
    const gasCost1 = gasUsed1.mul(toBN(gasPrice1));

    // Transaction 2.
    const tx2 = await remittanceInstance.pause({
      from: alice
    });

    // Get gas cost from tx2
    const transaction2 = await web3.eth.getTransaction(tx2.tx);
    const gasPrice2 = transaction2.gasPrice;
    const gasUsed2 = toBN(tx2.receipt.gasUsed);
    const gasCost2 = gasUsed2.mul(toBN(gasPrice2));

    // Transaction 3.
    const tx3 = await remittanceInstance.kill({
      from: alice
    });

    // Get gas cost from tx3
    const transaction3 = await web3.eth.getTransaction(tx3.tx);
    const gasPrice3 = transaction3.gasPrice;
    const gasUsed3 = toBN(tx3.receipt.gasUsed);
    const gasCost3 = gasUsed3.mul(toBN(gasPrice3));

    // Transaction 4.
    const tx4 = await remittanceInstance.emergencyWithdraw({
      from: alice
    });

    // Get gas cost from tx4
    const transaction4 = await web3.eth.getTransaction(tx4.tx);
    const gasPrice4 = transaction4.gasPrice;
    const gasUsed4 = toBN(tx4.receipt.gasUsed);
    const gasCost4 = gasUsed4.mul(toBN(gasPrice4));

    // Get gas cost from all txs
    const gasCost = toBN(gasCost1.add(gasCost2).add(gasCost3).add(gasCost4));

    // Calculate Alice balance expected (with txs gas costs).
    const balanceAliceExpected = balanceAliceBefore.sub(gasCost);

    // Get balance of Alice account after transactions.
    const balanceAliceAfterTx = await web3.eth.getBalance(alice);

    // Check
    assert.strictEqual(balanceAliceAfterTx, balanceAliceExpected.toString(10), "Balance error in Alice account")
  });

});