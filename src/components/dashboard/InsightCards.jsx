import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Award, TrendingDown } from 'lucide-react';

const InsightCards = ({ mostFrequentLeaveTakers, mostPopularLeaveType, isLoading, currentYear }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Award className="w-5 h-5 mr-2 text-yellow-400" />
              Pegawai Paling Sering Cuti ({currentYear})
            </CardTitle>
            <p className="text-slate-400 text-xs">Top 3 pegawai dengan jumlah pengajuan cuti terbanyak tahun ini.</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-slate-400 text-center py-4">Memuat data...</p>
            ) : mostFrequentLeaveTakers.length > 0 ? (
              <ul className="space-y-3">
                {mostFrequentLeaveTakers.map((taker, index) => (
                  <li key={index} className="flex justify-between items-center p-3 bg-slate-700/30 rounded-md">
                    <span className="text-slate-200">{index + 1}. {taker.name}</span>
                    <span className="text-purple-400 font-semibold">{taker.count} kali</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400 text-center py-4">Belum ada data pengajuan cuti tahun ini.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <TrendingDown className="w-5 h-5 mr-2 text-cyan-400" />
              Jenis Cuti Terpopuler ({currentYear})
            </CardTitle>
            <p className="text-slate-400 text-xs">Jenis cuti yang paling banyak diajukan tahun ini.</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-slate-400 text-center py-4">Memuat data...</p>
            ) : mostPopularLeaveType ? (
              <div className="text-center p-4 bg-slate-700/30 rounded-md">
                <p className="text-2xl font-bold text-cyan-400">{mostPopularLeaveType.name}</p>
                <p className="text-slate-300">{mostPopularLeaveType.count} kali diajukan</p>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-4">Belum ada data pengajuan cuti tahun ini.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default InsightCards;