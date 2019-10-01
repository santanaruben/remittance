pragma solidity >=0.5.0 <0.6.0;

import "./SafeMath.sol";
import "./Killable.sol";

contract Remittance is Killable{

    event LogDeposited(bytes32 indexed hash, uint amount, address indexed alice, address indexed receiver, uint blockLimit, uint when);
    event LogWithdrawn(bytes32 indexed hash, uint amount, address indexed account, uint when);
    event LogReclaimed(bytes32 indexed hash, uint amount, address indexed account, uint when);
    event LogFeesClaimed(uint amount, address indexed account, uint when);

    using SafeMath for uint256;

    uint feeMax = 45000000000000000; // Less than the deployed contract value 0.0458 ether
    uint feeMin = 1000000000000000;  // 0.001 ether

    struct Deposit {
        address alice;
        uint amount;
        uint blockLimit;
    }

    mapping(bytes32 => Deposit) public deposits;
    uint feeBalance;

    constructor(bool _paused) Pausable(_paused) public {
    }

    function hashIt(uint passwordBob, uint passwordCarol, address receiver)
        public pure returns(bytes32 hash) 
    {
        return keccak256(abi.encodePacked(passwordBob, passwordCarol, receiver));
    }

    function deposit(uint passwordBob, uint passwordCarol, address receiver, uint daysLimit)
        public payable
        whenRunning whenAlive
    {
        require(msg.value > feeMin, "Must be greater than minimum fee");
        require(daysLimit > 0, "At least 1 day");
        bytes32 hash = hashIt(passwordBob, passwordCarol, receiver);
        Deposit storage d = deposits[hash];
        require(d.alice == address(0), "Already sent or you have to use another password");
        uint blockDaysLimit = daysLimit * 5760;
        uint blockLimit = block.number + blockDaysLimit;
        d.alice = msg.sender;
        d.amount = msg.value;
        d.blockLimit = blockLimit;
        emit LogDeposited(hash, msg.value, msg.sender, receiver, blockLimit, now);
    }

    function withdraw(uint passwordBob, uint passwordCarol)
        public
        whenRunning whenAlive
    {
        bytes32 hash = hashIt(passwordBob, passwordCarol, msg.sender);
        Deposit storage d = deposits[hash];
        uint amount = d.amount;
        require(amount > 0, "Not money to withdraw");
        require(d.blockLimit >= block.number, "Out of time");
        uint fee = amount.div(50); // fee = 2%
        if (fee < feeMin)
            fee = feeMin;
        else if (fee > feeMax)
            fee = feeMax;
        uint toTransfer = amount.sub(fee);
        d.amount = 0;
        d.blockLimit = 0;
        feeBalance = feeBalance.add(fee);
        emit LogWithdrawn(hash, toTransfer, msg.sender, now);
        (bool success, ) = msg.sender.call.value(toTransfer)("");
        require(success, "Transfer failed.");
    }

    function reclaim(bytes32 hash)
        public
        whenRunning whenAlive
    {
        Deposit storage d = deposits[hash];
        uint amount = d.amount;
        require(amount > 0, "Not money to withdraw");
        require(d.alice == msg.sender, "Not your money");
        require(d.blockLimit < block.number, "Out of time");
        d.amount = 0;
        d.blockLimit = 0;
        emit LogReclaimed(hash, amount, msg.sender, now);
        (bool success, ) = msg.sender.call.value(amount)("");
        require(success, "Transfer failed.");
    }

    function claimFees()
        public
        onlyOwner whenAlive
    {
        uint amount = feeBalance;
        require(amount > 0, "Not money to withdraw.");
        feeBalance = 0;
        emit LogFeesClaimed(amount, msg.sender, now);
        (bool success, ) = msg.sender.call.value(amount)("");
        require(success, "Transfer failed.");
    }

    function emergencyWithdraw()
        public
        onlyOwner whenDead
    {
        uint amount = address(this).balance;
        require(amount > 0, "Not money to withdraw.");
        emit LogWithdrawn(bytes32(0), amount, msg.sender, now);
        (bool success, ) = msg.sender.call.value(amount)("");
        require(success, "Transfer failed.");
    }

}