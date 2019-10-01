pragma solidity >=0.5.0 <0.6.0;

import "./Ownable.sol";

contract Pausable is Ownable {
    bool private _paused;
    event LogPaused(address indexed account);
    event LogResumed(address indexed account);

    constructor (bool paused) public {
        _paused = paused;
    }

    function isPaused() public view returns (bool) {
        return _paused;
    }

    function pause() public onlyOwner whenRunning  {
        _paused = true;
        emit LogPaused(msg.sender);
    }

    function resume() public onlyOwner whenPaused {
        _paused = false;
        emit LogResumed(msg.sender);
    }

    modifier whenRunning () {
        require(!_paused, "Contract is paused");
        _;
    }

    modifier whenPaused() {
        require(_paused, "Contract not paused");
        _;
    }
}
