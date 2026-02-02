"use client";

import { useState, useCallback } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract } from "wagmi";
import { AreYouOKFactoryABI, FACTORY_ADDRESS } from "@/contracts/abi";
import { SwitchCard } from "./components/SwitchCard";
import { CreateSwitchForm } from "./components/CreateSwitchForm";

// Toast 组件
interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: number) => void }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type} text-white font-medium cursor-pointer`}
          onClick={() => removeToast(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

// 主页面组件
export default function Home() {
  const { address, isConnected } = useAccount();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<"my" | "beneficiary">("my");

  // 添加 Toast
  const addToast = useCallback((message: string, type: Toast["type"]) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 读取用户作为 owner 的所有开关
  const { data: ownerSwitches, refetch: refetchOwnerSwitches } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: AreYouOKFactoryABI,
    functionName: "getOwnerSwitches",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // 读取用户作为 beneficiary 的所有开关
  const { data: beneficiarySwitches, refetch: refetchBeneficiarySwitches } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: AreYouOKFactoryABI,
    functionName: "getBeneficiarySwitches",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // 刷新所有开关列表
  const handleSwitchCreated = useCallback(() => {
    refetchOwnerSwitches();
    refetchBeneficiarySwitches();
  }, [refetchOwnerSwitches, refetchBeneficiarySwitches]);

  const mySwitches = ownerSwitches || [];
  const inheritSwitches = beneficiarySwitches || [];

  return (
    <main className="min-h-screen flex flex-col">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* 头部标题区 */}
      <header className="text-center py-8 md:py-12 px-4">
        <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
          🙋‍♂️ Are You OK?
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-2">
          死人开关 DApp：3天不打卡，你的 ETH 就归继承人了
        </p>
        <p className="text-sm text-gray-500">
          设置你的继承人，每天打卡证明你还活着
        </p>
      </header>

      {/* 钱包连接 */}
      <div className="flex justify-center mb-8">
        <ConnectButton label="连接钱包" />
      </div>

      {/* 主内容区 */}
      <section className="flex-1 px-4 pb-8 max-w-4xl mx-auto w-full">
        {!isConnected ? (
          <div className="text-center py-12">
            <p className="text-2xl text-gray-400 mb-4">👆 请先连接钱包</p>
            <p className="text-gray-500">连接钱包后可以创建和管理你的死人开关</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 创建新开关表单 */}
            <CreateSwitchForm onToast={addToast} onSwitchCreated={handleSwitchCreated} />

            {/* Tab 切换 */}
            <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl">
              <button
                onClick={() => setActiveTab("my")}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                  activeTab === "my"
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                👤 我的开关 ({mySwitches.length})
              </button>
              <button
                onClick={() => setActiveTab("beneficiary")}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                  activeTab === "beneficiary"
                    ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                🎯 我是继承人 ({inheritSwitches.length})
              </button>
            </div>

            {/* 开关列表 */}
            <div className="space-y-4">
              {activeTab === "my" ? (
                mySwitches.length === 0 ? (
                  <div className="text-center py-12 bg-slate-800/30 rounded-xl">
                    <p className="text-4xl mb-4">🔒</p>
                    <p className="text-gray-400 mb-2">你还没有创建任何死人开关</p>
                    <p className="text-sm text-gray-500">点击上方「创建新的死人开关」开始</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {mySwitches.map((switchAddr) => (
                      <SwitchCard
                        key={switchAddr}
                        switchAddress={switchAddr}
                        userAddress={address!}
                        role="owner"
                        onToast={addToast}
                      />
                    ))}
                  </div>
                )
              ) : (
                inheritSwitches.length === 0 ? (
                  <div className="text-center py-12 bg-slate-800/30 rounded-xl">
                    <p className="text-4xl mb-4">👀</p>
                    <p className="text-gray-400 mb-2">还没有人把你设为继承人</p>
                    <p className="text-sm text-gray-500">当有人创建开关并指定你为继承人时，会显示在这里</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {inheritSwitches.map((switchAddr) => (
                      <SwitchCard
                        key={switchAddr}
                        switchAddress={switchAddr}
                        userAddress={address!}
                        role="beneficiary"
                        onToast={addToast}
                      />
                    ))}
                  </div>
                )
              )}
            </div>

            {/* 使用说明 */}
            <div className="mt-8 p-6 bg-slate-800/30 rounded-xl border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">📖 使用说明</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-400">
                <div>
                  <p className="font-medium text-green-400 mb-2">👤 作为所有者：</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>创建开关时指定继承人地址</li>
                    <li>可以随时存入 ETH</li>
                    <li>每天点击「打卡续命」重置倒计时</li>
                    <li>连续3天不打卡 = 资金归继承人</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-purple-400 mb-2">🎯 作为继承人：</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>等待所有者连续3天不打卡</li>
                    <li>倒计时归零后可以提款</li>
                    <li>也可以给开关存入 ETH</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 底部版权区 */}
      <footer className="text-center py-6 text-gray-500 text-sm border-t border-slate-800">
        <p>Made with ❤️ for SPARK AI Hackathon</p>
        <p className="mt-1">请勿用于非法用途，仅供学习娱乐</p>
      </footer>
    </main>
  );
}
