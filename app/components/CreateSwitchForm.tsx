"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, isAddress } from "viem";
import { AreYouOKFactoryABI, FACTORY_ADDRESS } from "@/contracts/abi";

interface CreateSwitchFormProps {
  onToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
  onSwitchCreated: () => void;
}

export function CreateSwitchForm({ onToast, onSwitchCreated }: CreateSwitchFormProps) {
  const [beneficiaryAddress, setBeneficiaryAddress] = useState("");
  const [initialDeposit, setInitialDeposit] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // 写入合约
  const { writeContract: createSwitch, data: createHash } = useWriteContract();

  // 等待交易确认
  const { isLoading: isConfirming, isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({
    hash: createHash,
  });

  // 处理创建成功
  useEffect(() => {
    if (isCreateSuccess) {
      onToast("🎉 死人开关创建成功！", "success");
      setIsCreating(false);
      setBeneficiaryAddress("");
      setInitialDeposit("");
      setIsExpanded(false);
      onSwitchCreated();
    }
  }, [isCreateSuccess, onToast, onSwitchCreated]);

  // 处理创建
  const handleCreate = async () => {
    // 验证地址
    if (!beneficiaryAddress) {
      onToast("⚠️ 请输入继承人地址", "warning");
      return;
    }

    if (!isAddress(beneficiaryAddress)) {
      onToast("❌ 无效的钱包地址", "error");
      return;
    }

    try {
      setIsCreating(true);
      onToast("⏳ 正在创建死人开关...", "info");
      
      const value = initialDeposit && parseFloat(initialDeposit) > 0 
        ? parseEther(initialDeposit) 
        : BigInt(0);

      createSwitch({
        address: FACTORY_ADDRESS,
        abi: AreYouOKFactoryABI,
        functionName: "createSwitch",
        args: [beneficiaryAddress as `0x${string}`],
        value,
      });
    } catch {
      onToast("❌ 创建失败", "error");
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
      {/* 折叠头部 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">➕</span>
          <div className="text-left">
            <p className="font-bold text-white">创建新的死人开关</p>
            <p className="text-sm text-gray-400">设置继承人，开始每日打卡</p>
          </div>
        </div>
        <span className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4 border-t border-slate-700">
          {/* 继承人地址输入 */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              👤 继承人钱包地址 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={beneficiaryAddress}
              onChange={(e) => setBeneficiaryAddress(e.target.value)}
              placeholder="0x..."
              className="w-full py-3 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              如果你连续3天没有打卡，这个地址将可以提取你的资金
            </p>
          </div>

          {/* 初始存款（可选） */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              💰 初始存款（可选）
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.001"
                min="0"
                value={initialDeposit}
                onChange={(e) => setInitialDeposit(e.target.value)}
                placeholder="0.0"
                className="flex-1 py-3 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <span className="text-gray-400 font-medium">ETH</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              创建时可以存入初始资金，也可以之后再存
            </p>
          </div>

          {/* 创建按钮 */}
          <button
            onClick={handleCreate}
            disabled={isCreating || isConfirming || !beneficiaryAddress}
            className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-500 disabled:to-gray-600 text-white text-lg font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed"
          >
            {isCreating || isConfirming
              ? "⏳ 正在创建..."
              : "🚀 创建死人开关"}
          </button>

          {/* 提示信息 */}
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-sm text-yellow-400">
              ⚠️ 注意：创建后你需要每天打卡。连续3天不打卡，继承人就可以提取你的资金！
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
