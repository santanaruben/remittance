pragma solidity >=0.5.0 <0.6.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Remittance.sol";

contract TestRemittance {

    uint public initialBalance = 0.01 ether;
    uint public constant amountToSend = 0.01 ether;
    uint public constant feeMin = 0.001 ether;
    address bob = 0x4978887994118615d4738d90B75BBc6c495D217B;
    Remittance r = new Remittance(false);

    function testDeposit() public {
        bytes32 hash = r.hashIt(1, 1, bob);
        address owner = r.owner();
        // Bob Balance expected should be amount to send less feeMin (because feeExpected < feeMin)
        uint balanceBobExpected = amountToSend - feeMin;
        // Fee Balance expected should be feeMin
        uint feeBalanceExpected = feeMin;
        // Transaction
        r.deposit.value(amountToSend)(hash, bob, 1000);
        // Balances after the transaction
        (,uint balanceBobAfterTx,) = r.deposits(hash);
        uint feeBalanceAfterTx = r.feeBalance(owner);
        // Asserts
        Assert.equal(balanceBobAfterTx, balanceBobExpected, "Bob Balance should be amount sent less fee minimum");
        Assert.equal(feeBalanceAfterTx, feeBalanceExpected, "Fee Balance should be equal to fee minimum");
    }
}