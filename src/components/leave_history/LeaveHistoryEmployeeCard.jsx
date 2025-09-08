import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  History,
  PlusCircle,
  Briefcase,
  Download,
} from "lucide-react";
import DownloadLeaveLetterButton from "./DownloadLeaveLetterButton";

const LeaveBalanceBar = ({ typeConfig, balance, year }) => {
  if (!typeConfig || !balance) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const isCurrentYear = year === currentYear;

  // Debug logging untuk melihat data balance yang diterima
  if (typeConfig.name === "Cuti Tahunan") {
    console.log(`🔍 LeaveBalanceBar Debug - ${typeConfig.name}:`, {
      balance,
      used_current: balance.used_current,
      used_deferred: balance.used_deferred,
      total: balance.total,
      deferred: balance.deferred,
      remaining: balance.remaining,
    });
  }

  // FIXED: Gunakan data yang sudah dihitung dengan benar dari LeaveHistoryPage
  // Pastikan menggunakan data yang benar untuk perhitungan saldo tahun berjalan
  const totalCurrentYear = balance.total || 0;
  const totalDeferred = balance.deferred || 0;
  const totalAvailableBalance = totalCurrentYear + totalDeferred;

  // Hitung total used dari balance.used atau fallback ke perhitungan manual
  const totalUsedFromBalance =
    balance.used || (balance.used_current || 0) + (balance.used_deferred || 0);

  // Jika total sisa sudah benar (11), maka total used = total available - total remaining
  const calculatedTotalUsed = totalAvailableBalance - (balance.remaining || 0);

  // Gunakan perhitungan yang konsisten dengan total sisa yang benar
  const actualTotalUsed =
    calculatedTotalUsed > 0 ? calculatedTotalUsed : totalUsedFromBalance;

  // Distribusi penggunaan: prioritas ke saldo penangguhan dulu, baru tahun berjalan
  const usedDeferred = Math.min(actualTotalUsed, totalDeferred);
  const usedCurrentYear = Math.max(0, actualTotalUsed - usedDeferred);

  const currentYearBalance = {
    total: totalCurrentYear,
    used: usedCurrentYear,
    remaining: Math.max(0, totalCurrentYear - usedCurrentYear),
  };

  // Debug logging untuk verifikasi
  if (typeConfig.name === "Cuti Tahunan") {
    console.log(`🔍 FIXED CALCULATION - ${typeConfig.name}:`, {
      totalCurrentYear,
      totalDeferred,
      totalAvailableBalance,
      actualTotalUsed,
      usedCurrentYear,
      usedDeferred,
      currentYearRemaining: currentYearBalance.remaining,
      originalBalance: balance,
    });
  }

  const deferredBalance =
    totalDeferred > 0
      ? {
          total: totalDeferred,
          used: usedDeferred, // Menggunakan perhitungan yang sudah diperbaiki
          remaining: Math.max(0, totalDeferred - usedDeferred),
        }
      : null;

  // FIXED: Gunakan total used yang sudah dihitung dengan splitting logic yang diperbaiki
  const totalUsed = actualTotalUsed;
  const totalAvailable = totalAvailableBalance;
  const usagePercentage =
    totalAvailable > 0 ? (totalUsed / totalAvailable) * 100 : 0;

  // Debug logging untuk perhitungan
  if (typeConfig.name === "Cuti Tahunan") {
    console.log(`🔍 LeaveBalanceBar Final Calculations - ${typeConfig.name}:`, {
      currentYearBalance,
      deferredBalance,
      totalUsed,
      totalAvailable,
      usagePercentage,
      expectedTotalRemaining: totalAvailable - totalUsed,
    });
  }

  // Progress bar color based on usage percentage
  const getProgressColor = () => {
    if (usagePercentage >= 90) return "from-red-500 to-red-600";
    if (usagePercentage >= 75) return "from-orange-500 to-orange-600";
    if (usagePercentage >= 50) return "from-yellow-500 to-yellow-600";
    return "from-blue-500 to-cyan-500";
  };

  return (
    <div className="bg-slate-600/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-white text-sm font-medium">{typeConfig.name}</h4>
        {balance.remaining <= 2 && typeConfig.can_defer && (
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-slate-400">Total Terpakai</span>
          <span className="text-white font-medium">
            {totalUsed}/{totalAvailable}
          </span>
        </div>

        {/* Simple Progress Bar */}
        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
          <motion.div
            className={`h-2 rounded-full bg-gradient-to-r ${getProgressColor()}`}
            initial={{ width: 0 }}
            animate={{ width: `${usagePercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {/* Current Year Balance */}
        <div className="border-t border-slate-600 pt-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Saldo {currentYear}</span>
            <span className="text-white font-medium">
              {currentYearBalance.remaining} hari
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Terpakai: {currentYearBalance.used}</span>
            <span>Total: {currentYearBalance.total}</span>
          </div>
        </div>

        {/* Deferred Balance */}
        {deferredBalance && (
          <div className="border-t border-slate-600 pt-2">
            <div className="flex justify-between text-xs">
              <span className="text-blue-300">Saldo Penangguhan</span>
              <span className="text-blue-300 font-medium">
                {deferredBalance.remaining} hari
              </span>
            </div>
            <div className="flex justify-between text-xs text-blue-400/70">
              <span>Terpakai: {deferredBalance.used}</span>
              <span>Total: {deferredBalance.total}</span>
            </div>
          </div>
        )}

        {/* Total Remaining */}
        <div className="border-t border-slate-600 pt-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-green-300">Total Sisa</span>
            <span className="text-green-300">
              {Math.max(0, totalAvailable - totalUsed)} hari
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const LeaveHistoryEmployeeCard = ({
  employee,
  index,
  leaveTypesConfig,
  onAddDeferredLeave,
  onViewHistory,
}) => {
  if (!employee || !leaveTypesConfig) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="p-6 bg-slate-700/30 rounded-lg border border-slate-600/30"
    >
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
        <div className="flex items-center space-x-4 mb-4 lg:mb-0">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl font-bold">
              {employee.employeeName
                ? employee.employeeName.charAt(0).toUpperCase()
                : "?"}
            </span>
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">
              {employee.employeeName}
            </h3>
            <p className="text-slate-400 text-sm font-mono">{employee.nip}</p>
            <div className="flex flex-col space-y-1 text-slate-500 text-xs mt-1">
              <div className="flex items-center">
                <Briefcase className="w-3 h-3 mr-1.5 flex-shrink-0" />
                <span className="truncate">{employee.department || "N/A"}</span>
              </div>
              {employee.rank_group && (
                <div className="flex items-center">
                  <span className="w-3 h-3 mr-1.5 flex-shrink-0 inline-flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-2.5 h-2.5"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </span>
                  <span className="truncate">{employee.rank_group}</span>
                </div>
              )}
              {employee.position_name && (
                <div className="flex items-center">
                  <span className="w-3 h-3 mr-1.5 flex-shrink-0 inline-flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-2.5 h-2.5"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </span>
                  <span className="truncate">{employee.position_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Penangguhan indicator - use global Input Data Penangguhan for edits */}
          {employee.deferralLog ? (
            <div className="px-3 py-1 rounded-md bg-yellow-900/10 text-yellow-300 text-sm flex items-center">
              <PlusCircle className="w-4 h-4 mr-2" />
              Penangguhan tersimpan
            </div>
          ) : null}

          {/* View History Button - Always shown */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewHistory(employee)}
            className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700/50"
          >
            <History className="w-4 h-4 mr-1.5" />
            Lihat Riwayat
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {Object.values(leaveTypesConfig).map((typeConfig) => {
          const balance = employee.balances[typeConfig.key];
          if (!balance) return null; // Don't render if balance for this type doesn't exist
          return (
            <LeaveBalanceBar
              key={typeConfig.key}
              typeConfig={typeConfig}
              balance={balance}
              year={employee.year}
            />
          );
        })}
      </div>
    </motion.div>
  );
};

export default LeaveHistoryEmployeeCard;
