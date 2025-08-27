// SPDX-License-Identifier: Apache-2.0
pragma solidity =0.6.12;

import "../saucerswap/interfaces/IWHBAR.sol";
import "../saucerswap/hedera/SafeHederaTokenService.sol";

contract WHBAR is IWHBAR, SafeHederaTokenService {
    
    string public name = "Wrapped HBAR";
    string public symbol = "WHBAR";  
    uint8 public decimals = 8;
    
    address public override token;
    uint256 public totalWrapped;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Deposit(address indexed dst, uint wad);
    event Withdrawal(address indexed src, uint wad);
    event Transfer(address indexed src, address indexed dst, uint wad);
    event Approval(address indexed src, address indexed guy, uint wad);

    constructor(address /* _htsToken */) public {
        token = address(this);
    }


    fallback() external payable {
        deposit();
    }

    receive() external payable {
        deposit();
    }

    function deposit() public payable override {
        deposit(msg.sender, msg.sender);
    }
    
    function deposit(address src, address dst) public payable override {
        require(src == msg.sender, "WHBAR: INVALID_SENDER");
        
        if (msg.value == 0) {
            return;
        }
        
        balanceOf[dst] += msg.value;
        totalWrapped += msg.value;
        emit Deposit(dst, msg.value);
    }

    function withdraw(uint256 wad) external override {
        _withdraw(msg.sender, msg.sender, wad);
    }
    
    function withdraw(address src, address dst, uint256 wad) external override {
        _withdraw(src, dst, wad);
    }
    
    function _withdraw(address src, address dst, uint256 wad) internal {
        require(wad > 0, "WHBAR: ZERO_WITHDRAW");
        require(src == msg.sender, "WHBAR: INVALID_SENDER");
        require(totalWrapped >= wad, "WHBAR: INSUFFICIENT_WRAPPED");
        require(balanceOf[src] >= wad, "WHBAR: INSUFFICIENT_BALANCE");
        
        balanceOf[src] -= wad;
        totalWrapped -= wad;
        payable(dst).transfer(wad);
        
        emit Withdrawal(src, wad);
    }

    function transfer(address dst, uint wad) external returns (bool) {
        require(balanceOf[msg.sender] >= wad, "WHBAR: INSUFFICIENT_BALANCE");
        balanceOf[msg.sender] -= wad;
        balanceOf[dst] += wad;
        emit Transfer(msg.sender, dst, wad);
        return true;
    }

    function approve(address guy, uint wad) external returns (bool) {
        allowance[msg.sender][guy] = wad;
        emit Approval(msg.sender, guy, wad);
        return true;
    }

    function transferFrom(address src, address dst, uint wad) external returns (bool) {
        require(balanceOf[src] >= wad, "Insufficient balance");
        
        if (src != msg.sender) {
            require(allowance[src][msg.sender] >= wad, "Insufficient allowance");
            allowance[src][msg.sender] -= wad;
        }
        
        balanceOf[src] -= wad;
        balanceOf[dst] += wad;
        emit Transfer(src, dst, wad);
        return true;
    }

    function totalSupply() external view returns (uint256) {
        return totalWrapped;
    }
}