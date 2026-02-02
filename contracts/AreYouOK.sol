// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AreYouOK
 * @dev Dead Man's Switch - 3天不打卡，ETH归继承人
 */
contract AreYouOK {
    address public owner;
    address public beneficiary;
    uint256 public lastCheckIn;
    uint256 public constant CHECK_IN_INTERVAL = 3 days;
    
    event CheckedIn(address indexed owner, uint256 timestamp);
    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed beneficiary, uint256 amount);
    event BeneficiaryChanged(address indexed oldBeneficiary, address indexed newBeneficiary);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyBeneficiary() {
        require(msg.sender == beneficiary, "Only beneficiary");
        _;
    }
    
    constructor(address _owner, address _beneficiary) {
        require(_owner != address(0), "Invalid owner");
        require(_beneficiary != address(0), "Invalid beneficiary");
        require(_owner != _beneficiary, "Owner cannot be beneficiary");
        owner = _owner;
        beneficiary = _beneficiary;
        lastCheckIn = block.timestamp;
    }
    
    /// @dev 打卡续命
    function checkIn() external onlyOwner {
        lastCheckIn = block.timestamp;
        emit CheckedIn(msg.sender, block.timestamp);
    }
    
    /// @dev 存款
    function deposit() external payable {
        require(msg.value > 0, "Amount must be > 0");
        emit Deposited(msg.sender, msg.value);
    }
    
    /// @dev 继承人提款（仅在超时后）
    function withdraw() external onlyBeneficiary {
        require(isExpired(), "Not expired yet");
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        
        (bool success, ) = beneficiary.call{value: balance}("");
        require(success, "Transfer failed");
        
        emit Withdrawn(beneficiary, balance);
    }
    
    /// @dev 更换继承人
    function setBeneficiary(address _newBeneficiary) external onlyOwner {
        require(_newBeneficiary != address(0), "Invalid address");
        require(_newBeneficiary != owner, "Cannot be owner");
        address old = beneficiary;
        beneficiary = _newBeneficiary;
        emit BeneficiaryChanged(old, _newBeneficiary);
    }
    
    /// @dev 转移所有权
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        require(_newOwner != beneficiary, "Cannot be beneficiary");
        address oldOwner = owner;
        owner = _newOwner;
        lastCheckIn = block.timestamp; // 重置打卡时间
        emit OwnershipTransferred(oldOwner, _newOwner);
    }
    
    /// @dev 是否已超时
    function isExpired() public view returns (bool) {
        return block.timestamp > lastCheckIn + CHECK_IN_INTERVAL;
    }
    
    /// @dev 剩余时间（秒）
    function getRemainingTime() public view returns (uint256) {
        uint256 deadline = lastCheckIn + CHECK_IN_INTERVAL;
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }
    
    /// @dev 合约余额
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    /// @dev 截止时间戳
    function getDeadline() public view returns (uint256) {
        return lastCheckIn + CHECK_IN_INTERVAL;
    }
    
    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }
}
