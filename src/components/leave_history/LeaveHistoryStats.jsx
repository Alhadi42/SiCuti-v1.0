import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Users, CalendarDays, Archive, TrendingUp } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, change, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50 card-hover">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            <p className="text-slate-500 text-xs mt-1">{change}</p>
          </div>
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${color} flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const LeaveHistoryStats = ({ totalEmployees, averageLeaveUsed, employeesWithDeferredLeave, totalAnnualLeaveUsed, selectedYear }) => {
  const stats = [
    {
      title: "Total Pegawai",
      value: totalEmployees.toString(),
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      change: `Tahun ${selectedYear}`
    },
    {
      title: "Rata-rata Cuti Terpakai",
      value: `${averageLeaveUsed} hari`,
      icon: CalendarDays,
      color: "from-green-500 to-emerald-500",
      change: "Cuti tahunan"
    },
    {
      title: "Pgw dgn Penangguhan",
      value: employeesWithDeferredLeave.toString(),
      icon: Archive,
      color: "from-yellow-500 to-orange-500",
      change: "Cuti tahunan ditambahkan"
    },
    {
      title: "Total Hari Cuti Tahunan",
      value: totalAnnualLeaveUsed.toString(),
      icon: TrendingUp,
      color: "from-purple-500 to-pink-500",
      change: "Sudah digunakan"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <StatCard 
          key={stat.title}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          color={stat.color}
          change={stat.change}
          delay={index * 0.1}
        />
      ))}
    </div>
  );
};

export default LeaveHistoryStats;