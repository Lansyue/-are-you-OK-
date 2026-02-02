// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./AreYouOK.sol";

/**
 * @title AreYouOKFactory
 * @dev 工厂合约 - 用户可以创建自己的死人开关实例
 */
contract AreYouOKFactory {
    // 用户创建的所有开关（作为 owner）
    mapping(address => address[]) public ownerSwitches;
    
    // 用户作为受益人的所有开关
    mapping(address => address[]) public beneficiarySwitches;
    
    // 所有已创建的开关
    address[] public allSwitches;
    
    // 开关信息
    struct SwitchInfo {
        address switchAddress;
        address owner;
        address beneficiary;
        uint256 createdAt;
    }
    
    // 开关地址 => 信息
    mapping(address => SwitchInfo) public switchInfo;
    
    event SwitchCreated(
        address indexed switchAddress,
        address indexed owner,
        address indexed beneficiary,
        uint256 timestamp
    );
    
    /**
     * @dev 创建新的死人开关
     * @param _beneficiary 受益人地址
     */
    function createSwitch(address _beneficiary) external payable returns (address) {
        require(_beneficiary != address(0), "Invalid beneficiary");
        require(_beneficiary != msg.sender, "Cannot be your own beneficiary");
        
        // 部署新的 AreYouOK 合约，直接指定 owner 和 beneficiary
        AreYouOK newSwitch = new AreYouOK(msg.sender, _beneficiary);
        
        address switchAddr = address(newSwitch);
        
        // 记录开关信息
        ownerSwitches[msg.sender].push(switchAddr);
        beneficiarySwitches[_beneficiary].push(switchAddr);
        allSwitches.push(switchAddr);
        
        switchInfo[switchAddr] = SwitchInfo({
            switchAddress: switchAddr,
            owner: msg.sender,
            beneficiary: _beneficiary,
            createdAt: block.timestamp
        });
        
        // 如果有初始存款，转入新合约
        if (msg.value > 0) {
            (bool success, ) = switchAddr.call{value: msg.value}("");
            require(success, "Initial deposit failed");
        }
        
        emit SwitchCreated(switchAddr, msg.sender, _beneficiary, block.timestamp);
        
        return switchAddr;
    }
    
    /**
     * @dev 获取用户作为 owner 的所有开关
     */
    function getOwnerSwitches(address _owner) external view returns (address[] memory) {
        return ownerSwitches[_owner];
    }
    
    /**
     * @dev 获取用户作为受益人的所有开关
     */
    function getBeneficiarySwitches(address _beneficiary) external view returns (address[] memory) {
        return beneficiarySwitches[_beneficiary];
    }
    
    /**
     * @dev 获取所有开关数量
     */
    function getTotalSwitches() external view returns (uint256) {
        return allSwitches.length;
    }
    
    /**
     * @dev 获取开关详细信息
     */
    function getSwitchInfo(address _switch) external view returns (SwitchInfo memory) {
        return switchInfo[_switch];
    }
}
