pragma solidity >=0.5.0 <0.6.0;

import "./SafeMath.sol";
import "./Killable.sol";

contract Remittance is Killable{

    event LogDeposited(bytes32 indexed hash, uint amount, address indexed alice, address indexed receiver, uint blockLimit);
    event LogWithdrawn(bytes32 indexed hash, uint amount, address indexed account);
    event LogReclaimed(bytes32 indexed hash, uint amount, address indexed account);
    event LogFeesClaimed(uint amount, address indexed account);

    using SafeMath for uint256;

    uint constant maxBlockDaysLimit = 7 * 86400 / 15;    // One week of blocks limit
    uint constant feeMax = 45000000000000000;   // Less than the deployed contract value 0.0458 ether
    uint constant feeMin = 1000000000000000;    // 0.001 ether
    uint constant feeDiv = 50;                  // fee Divisor. Indicate in how much we´re going to divide the deposit amount to take as fee. 2% equivalent.


    struct Deposit {
        address alice;
        uint amount;
        uint blockLimit;
    }

    mapping(bytes32 => Deposit) public deposits;
    mapping(address => uint) public feeBalance;

    constructor(bool _paused) Pausable(_paused) public {
    }

    function hashIt(bytes32 passwordBob, bytes32 passwordCarol, address receiver)
        public view returns(bytes32 hash) 
    {
        return keccak256(abi.encodePacked(passwordBob, passwordCarol, receiver, address(this)));
    }

    function deposit(bytes32 hash, address receiver, uint blockDaysLimit)
        public payable
        whenRunning whenAlive
    {
        uint feeMinimum = feeMin;
        uint feeMaximum = feeMax;
        uint amount = msg.value;
        require(amount > feeMinimum, "Must be greater than minimum fee");
        require(maxBlockDaysLimit >= blockDaysLimit, "Too much days");
        Deposit storage d = deposits[hash];
        require(d.alice == address(0), "Already sent or you have to use another password");
        uint blockLimit = block.number + blockDaysLimit;
        d.alice = msg.sender;
        uint fee = amount.div(feeDiv);
        if (fee < feeMinimum)
            fee = feeMinimum;
        else if (fee > feeMaximum)
            fee = feeMaximum;
        address currentOwner = owner();
        d.amount = amount.sub(fee);
        feeBalance[currentOwner] = feeBalance[currentOwner].add(fee);
        d.blockLimit = blockLimit;
        emit LogDeposited(hash, msg.value, msg.sender, receiver, blockLimit);
    }

    function withdraw(bytes32 passwordBob, bytes32 passwordCarol)
        public
        whenRunning whenAlive
    {
        bytes32 hash = hashIt(passwordBob, passwordCarol, msg.sender);
        Deposit storage d = deposits[hash];
        uint amount = d.amount;
        require(amount > 0, "Not money to withdraw");
        d.amount = 0;
        d.blockLimit = 0;
        emit LogWithdrawn(hash, amount, msg.sender);
        (bool success, ) = msg.sender.call.value(amount)("");
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
        require(d.blockLimit < block.number, "Still not out of time");
        d.amount = 0;
        d.blockLimit = 0;
        emit LogReclaimed(hash, amount, msg.sender);
        (bool success, ) = msg.sender.call.value(amount)("");
        require(success, "Transfer failed.");
    }

    function claimFees()
        public
        whenAlive
    {
        uint amount = feeBalance[msg.sender];
        require(amount > 0, "Not money to withdraw.");
        feeBalance[msg.sender] = 0;
        emit LogFeesClaimed(amount, msg.sender);
        (bool success, ) = msg.sender.call.value(amount)("");
        require(success, "Transfer failed.");
    }

    function emergencyWithdraw()
        public
        onlyOwner whenDead
    {
        uint amount = address(this).balance;
        require(amount > 0, "Not money to withdraw.");
        emit LogWithdrawn(bytes32(0), amount, msg.sender);
        (bool success, ) = msg.sender.call.value(amount)("");
        require(success, "Transfer failed.");
    }

}