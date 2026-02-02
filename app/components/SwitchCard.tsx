"use client";

import { useState, useEffect } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { AreYouOKABI } from "@/contracts/abi";

interface SwitchCardProps {
  switchAddress: `0x${string}`;
  userAddress: `0x${string}`;
  role: "owner" | "beneficiary";
  onToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

// 倒计时组件
function Countdown({ remainingSeconds, isExpired }: { remainingSeconds: number; isExpired: boolean }) {
  const [time, setTime] = useState(remainingSeconds);

  useEffect(() => {
    setTime(remainingSeconds);
  }, [remainingSeconds]);

  useEffect(() => {
    if (time <= 0) return;
    const timer = setInterval(() => {
      setTime((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [time]);

  const days = Math.floor(time / 86400);
  const hours = Math.floor((time % 86400) / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = time % 60;

  if (isExpired || time <= 0) {
    return (
      <div className="text-center">
        <p className="text-xl font-bold text-red-500 animate-pulse">
          💀 已过期
        </p>
      </div>
    );
  }

  if (days < 1) {
    return (
      <div className="text-center">
        <p className="text-sm text-orange-400 mb-1">🔥 紧急！</p>
        <p className="text-lg font-mono font-bold text-orange-500">
          {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-sm text-green-400 mb-1">⏰ 剩余时间</p>
      <p className="text-lg font-mono font-bold text-green-500">
        {days}天 {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}
      </p>
    </div>
  );
}

export function SwitchCard({ switchAddress, userAddress, role, onToast }: SwitchCardProps) {
  const [depositAmount, setDepositAmount] = useState("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);

  // 读取合约数据
  const { data: owner } = useReadContract({
    address: switchAddress,
    abi: AreYouOKABI,
    functionName: "owner",
  });

  const { data: beneficiary } = useReadContract({
    address: switchAddress,
    abi: AreYouOKABI,
    functionName: "beneficiary",
  });

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: switchAddress,
    abi: AreYouOKABI,
    functionName: "getBalance",
  });

  const { data: remainingTime, refetch: refetchRemainingTime } = useReadContract({
    address: switchAddress,
    abi: AreYouOKABI,
    functionName: "getRemainingTime",
  });

  const { data: isExpired, refetch: refetchIsExpired } = useReadContract({
    address: switchAddress,
    abi: AreYouOKABI,
    functionName: "isExpired",
  });

  // 写入合约
  const { writeContract: checkIn, data: checkInHash } = useWriteContract();
  const { writeContract: withdraw, data: withdrawHash } = useWriteContract();
  const { writeContract: deposit, data: depositHash } = useWriteContract();

  // 等待交易确认
  const { isLoading: isCheckInConfirming, isSuccess: isCheckInSuccess } = useWaitForTransactionReceipt({
    hash: checkInHash,
  });

  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({
    hash: withdrawHash,
  });

  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

  // 处理交易结果
  useEffect(() => {
    if (isCheckInSuccess) {
      onToast("✅ 打卡成功！", "success");
      setIsCheckingIn(false);
      refetchRemainingTime();
      refetchIsExpired();
    }
  }, [isCheckInSuccess, onToast, refetchRemainingTime, refetchIsExpired]);

  useEffect(() => {
    if (isWithdrawSuccess) {
      onToast("🎉 提款成功！", "success");
      setIsWithdrawing(false);
      refetchBalance();
    }
  }, [isWithdrawSuccess, onToast, refetchBalance]);

  useEffect(() => {
    if (isDepositSuccess) {
      onToast("💰 存款成功！", "success");
      setIsDepositing(false);
      setDepositAmount("");
      refetchBalance();
    }
  }, [isDepositSuccess, onToast, refetchBalance]);

  // 判断用户角色
  const isOwner = userAddress && owner && userAddress.toLowerCase() === owner.toLowerCase();
  const isBeneficiary = userAddress && beneficiary && userAddress.toLowerCase() === beneficiary.toLowerCase();

  // 处理打卡
  const handleCheckIn = async () => {
    try {
      setIsCheckingIn(true);
      onToast("⏳ 正在打卡...", "info");
      checkIn({
        address: switchAddress,
        abi: AreYouOKABI,
        functionName: "checkIn",
      });
    } catch {
      onToast("❌ 打卡失败", "error");
      setIsCheckingIn(false);
    }
  };

  // 处理提款
  const handleWithdraw = async () => {
    try {
      setIsWithdrawing(true);
      onToast("⏳ 正在提款...", "info");
      withdraw({
        address: switchAddress,
        abi: AreYouOKABI,
        functionName: "withdraw",
      });
    } catch {
      onToast("❌ 提款失败", "error");
      setIsWithdrawing(false);
    }
  };

  // 处理存款
  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      onToast("⚠️ 请输入有效金额", "warning");
      return;
    }
    try {
      setIsDepositing(true);
      onToast("⏳ 正在存款...", "info");
      deposit({
        address: switchAddress,
        abi: AreYouOKABI,
        functionName: "deposit",
        value: parseEther(depositAmount),
      });
    } catch {
      onToast("❌ 存款失败", "error");
      setIsDepositing(false);
    }
  };

  // 格式化地址显示
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
      {/* 头部：角色标签 + 合约地址 */}
      <div className="flex items-center justify-between mb-3">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          role === "owner" 
            ? "bg-green-500/20 text-green-400" 
            : "bg-purple-500/20 text-purple-400"
        }`}>
          {role === "owner" ? "👤 我的开关" : "🎯 我是继承人"}
        </span>
        <span className="text-xs text-gray-500 font-mono">
          {formatAddress(switchAddress)}
        </span>
      </div>

      {/* 余额 */}
      <div className="text-center mb-3 p-3 bg-slate-900/50 rounded-lg">
        <p className="text-sm text-gray-400">💰 余额</p>
        <p className="text-xl font-bold text-yellow-400">
          {balance ? formatEther(balance) : "0"} ETH
        </p>
      </div>

      {/* 对方地址 */}
      <div className="text-center mb-3 p-2 bg-slate-900/30 rounded-lg">
        <p className="text-xs text-gray-500">
          {role === "owner" ? "继承人" : "所有者"}
        </p>
        <p className="text-sm font-mono text-gray-400">
          {role === "owner" 
            ? (beneficiary ? formatAddress(beneficiary) : "未知")
            : (owner ? formatAddress(owner) : "未知")
          }
        </p>
      </div>

      {/* 倒计时 */}
      <div className="mb-4 p-3 bg-slate-900/50 rounded-lg">
        <Countdown
          remainingSeconds={remainingTime ? Number(remainingTime) : 0}
          isExpired={isExpired ?? false}
        />
      </div>

      {/* 操作按钮 */}
      <div className="space-y-2">
        {isOwner && (
          <button
            onClick={handleCheckIn}
            disabled={isCheckingIn || isCheckInConfirming}
            className="w-full py-2 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-medium rounded-lg transition-all text-sm"
          >
            {isCheckingIn || isCheckInConfirming ? "⏳ 打卡中..." : "👌 打卡续命"}
          </button>
        )}

        {isBeneficiary && (
          <button
            onClick={handleWithdraw}
            disabled={!isExpired || isWithdrawing || isWithdrawConfirming}
            className={`w-full py-2 px-4 text-white font-medium rounded-lg transition-all text-sm ${
              isExpired
                ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
                : "bg-gray-600 cursor-not-allowed"
            }`}
          >
            {isWithdrawing || isWithdrawConfirming
              ? "⏳ 提款中..."
              : isExpired
              ? "🤑 提款"
              : "⏳ 等待过期..."}
          </button>
        )}

        {/* 存款功能（所有人可用） */}
        <div className="flex gap-2">
          <input
            type="number"
            step="0.001"
            min="0"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="ETH"
            className="flex-1 py-2 px-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
          />
          <button
            onClick={handleDeposit}
            disabled={isDepositing || isDepositConfirming || !depositAmount}
            className="py-2 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-medium rounded-lg transition-all text-sm"
          >
            {isDepositing || isDepositConfirming ? "⏳" : "💸 存"}
          </button>
        </div>
      </div>
    </div>
  );
}
