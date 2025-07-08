import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const RecentLeaveEntries = ({ entries, isLoading, onNavigate }) => {
  return (
    <motion.div
      className="lg:col-span-2"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50 h-full">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>Entri Cuti Terbaru</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onNavigate("/leave-requests")}
              className="border-slate-600 text-slate-300 hover:text-white"
            >
              Lihat Semua
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            Array(3).fill(0).map((_, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg mb-4 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-slate-600 rounded-full"></div>
                  <div>
                    <div className="h-4 w-32 bg-slate-600 rounded mb-1"></div>
                    <div className="h-3 w-24 bg-slate-600 rounded mb-1"></div>
                    <div className="h-3 w-20 bg-slate-600 rounded"></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-3 w-20 bg-slate-600 rounded mb-1"></div>
                  <div className="h-3 w-28 bg-slate-600 rounded"></div>
                </div>
              </div>
            ))
          ) : entries.length > 0 ? (
            <div className="space-y-4">
              {entries.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">
                        {request.employees?.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{request.employees?.name || 'N/A'}</p>
                      <p className="text-slate-400 text-sm">{request.employees?.nip || 'N/A'}</p>
                      <p className="text-slate-500 text-xs">{request.leave_types?.name || 'Jenis Cuti Tidak Diketahui'} • {request.days_requested} hari</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-300 text-sm">
                      {new Date(request.start_date).toLocaleDateString('id-ID')} - {new Date(request.end_date).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-4">Belum ada entri cuti.</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RecentLeaveEntries;