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
    
    function checkIn() external onlyOwner {
        lastCheckIn = block.timestamp;
        emit CheckedIn(msg.sender, block.timestamp);
    }
    
    function deposit() external payable {
        require(msg.value > 0, "Amount must be > 0");
        emit Deposited(msg.sender, msg.value);
    }
    
    function withdraw() external onlyBeneficiary {
        require(isExpired(), "Not expired yet");
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        
        (bool success, ) = beneficiary.call{value: balance}("");
        require(success, "Transfer failed");
        
        emit Withdrawn(beneficiary, balance);
    }
    
    function setBeneficiary(address _newBeneficiary) external onlyOwner {
        require(_newBeneficiary != address(0), "Invalid address");
        require(_newBeneficiary != owner, "Cannot be owner");
        address old = beneficiary;
        beneficiary = _newBeneficiary;
        emit BeneficiaryChanged(old, _newBeneficiary);
    }
    
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        require(_newOwner != beneficiary, "Cannot be beneficiary");
        address oldOwner = owner;
        owner = _newOwner;
        lastCheckIn = block.timestamp;
        emit OwnershipTransferred(oldOwner, _newOwner);
    }
    
    function isExpired() public view returns (bool) {
        return block.timestamp > lastCheckIn + CHECK_IN_INTERVAL;
    }
    
    function getRemainingTime() public view returns (uint256) {
        uint256 deadline = lastCheckIn + CHECK_IN_INTERVAL;
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }
    
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    function getDeadline() public view returns (uint256) {
        return lastCheckIn + CHECK_IN_INTERVAL;
    }
    
    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }
}

/**
 * @title AreYouOKFactory
 * @dev 工厂合约 - 用户可以创建自己的死人开关实例
 */
contract AreYouOKFactory {
    mapping(address => address[]) public ownerSwitches;
    mapping(address => address[]) public beneficiarySwitches;
    address[] public allSwitches;
    
    struct SwitchInfo {
        address switchAddress;
        address owner;
        address beneficiary;
        uint256 createdAt;
    }
    
    mapping(address => SwitchInfo) public switchInfo;
    
    event SwitchCreated(
        address indexed switchAddress,
        address indexed owner,
        address indexed beneficiary,
        uint256 timestamp
    );
    
    function createSwitch(address _beneficiary) external payable returns (address) {
        require(_beneficiary != address(0), "Invalid beneficiary");
        require(_beneficiary != msg.sender, "Cannot be your own beneficiary");
        
        AreYouOK newSwitch = new AreYouOK(msg.sender, _beneficiary);
        address switchAddr = address(newSwitch);
        
        ownerSwitches[msg.sender].push(switchAddr);
        beneficiarySwitches[_beneficiary].push(switchAddr);
        allSwitches.push(switchAddr);
        
        switchInfo[switchAddr] = SwitchInfo({
            switchAddress: switchAddr,
            owner: msg.sender,
            beneficiary: _beneficiary,
            createdAt: block.timestamp
        });
        
        if (msg.value > 0) {
            (bool success, ) = switchAddr.call{value: msg.value}("");
            require(success, "Initial deposit failed");
        }
        
        emit SwitchCreated(switchAddr, msg.sender, _beneficiary, block.timestamp);
        return switchAddr;
    }
    
    function getOwnerSwitches(address _owner) external view returns (address[] memory) {
        return ownerSwitches[_owner];
    }
    
    function getBeneficiarySwitches(address _beneficiary) external view returns (address[] memory) {
        return beneficiarySwitches[_beneficiary];
    }
    
    function getTotalSwitches() external view returns (uint256) {
        return allSwitches.length;
    }
    
    function getSwitchInfo(address _switch) external view returns (SwitchInfo memory) {
        return switchInfo[_switch];
    }
}
