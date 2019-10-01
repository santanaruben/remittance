pragma solidity >=0.5.0 <0.6.0;

import "./Pausable.sol";

contract Killable is Pausable {
    bool private _killed;
    event LogKilled(address indexed account);

    constructor () public {
        _killed = false;
    }

    function isKilled() public view returns (bool) {
        return _killed;
    }

    function kill() public onlyOwner whenPaused whenAlive {
        _killed = true;
        emit LogKilled(msg.sender);
    }

    modifier whenAlive() {
        require(!_killed, "Contract is dead");
        _;
    }

    modifier whenDead() {
        require(_killed, "Contract is alive");
        _;
    }
}
