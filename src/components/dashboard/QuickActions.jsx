import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { CalendarCheck, Users, FileText, TrendingUp } from 'lucide-react';

const QuickActions = ({ onNavigate }) => {
  const actions = [
    { label: "Input Data Cuti", path: "/leave-requests", icon: CalendarCheck, color: "from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700" },
    { label: "Kelola Data Pegawai", path: "/employees", icon: Users, color: "from-cyan-500 to-sky-600 hover:from-cyan-600 hover:to-sky-700" },
    { label: "Riwayat & Saldo Cuti", path: "/leave-history", icon: FileText, color: "from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700" },
    { label: "Pengaturan Sistem", path: "/settings", icon: TrendingUp, color: "from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50 h-full">
        <CardHeader>
          <CardTitle className="text-white">Aksi Cepat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {actions.map(action => (
            <Button 
              key={action.path}
              className={`w-full justify-start bg-gradient-to-r ${action.color}`}
              onClick={() => onNavigate(action.path)}
            >
              <action.icon className="w-4 h-4 mr-2" />
              {action.label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default QuickActions;