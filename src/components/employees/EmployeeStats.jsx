import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

const StatCard = ({ title, value, iconBgClass, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-lg ${iconBgClass} flex items-center justify-center`}>
            <Users className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const EmployeeStats = ({ totalEmployees, activeEmployees, onLeaveToday }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard 
        title="Total Pegawai" 
        value={totalEmployees} 
        iconBgClass="bg-gradient-to-r from-blue-500 to-cyan-500" 
        delay={0.2} 
      />
      <StatCard 
        title="Aktif" 
        value={activeEmployees} 
        iconBgClass="bg-gradient-to-r from-green-500 to-emerald-500" 
        delay={0.3} 
      />
      <StatCard 
        title="Cuti Hari Ini" 
        value={onLeaveToday} 
        iconBgClass="bg-gradient-to-r from-yellow-500 to-orange-500" 
        delay={0.4} 
      />
    </div>
  );
};

export default EmployeeStats;