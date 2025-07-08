
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Users, FileText, CheckSquare } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, delay }) => (
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
          </div>
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${color} flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const LeaveRequestStats = ({ requests }) => {
  const uniqueEmployees = new Set(requests.map(r => r.employee_id)).size;
  const totalLeaveDays = requests.reduce((sum, r) => sum + (r.days_requested || 0), 0);
  
  const statsData = [
    {
      title: "Total Data Cuti",
      value: requests.length.toString(),
      icon: FileText,
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Total Pegawai Cuti",
      value: uniqueEmployees.toString(),
      icon: Users,
      color: "from-yellow-500 to-orange-500"
    },
    {
      title: "Total Hari Cuti",
      value: totalLeaveDays.toString(),
      icon: Calendar,
      color: "from-green-500 to-emerald-500"
    },
    {
      title: "Rata-rata/Pegawai",
      value: uniqueEmployees > 0 ? (totalLeaveDays / uniqueEmployees).toFixed(1) + " hari" : "0 hari",
      icon: CheckSquare,
      color: "from-purple-500 to-pink-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => (
        <StatCard 
          key={stat.title}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          color={stat.color}
          delay={index * 0.1}
        />
      ))}
    </div>
  );
};

export default LeaveRequestStats;
