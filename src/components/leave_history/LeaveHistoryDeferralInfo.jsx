
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { BookCopy } from 'lucide-react';

const LeaveHistoryDeferralInfo = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 backdrop-blur-xl border-blue-500/20">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <BookCopy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">Informasi Cuti Ditangguhkan (Admin)</h3>
              <p className="text-slate-300 text-sm mb-3">
                Admin dapat menambahkan sisa cuti tahunan dari tahun sebelumnya ke tahun berjalan.
              </p>
              <ul className="text-slate-300 text-sm space-y-1 list-disc list-inside">
                <li>Gunakan tombol "Tambah Penangguhan" pada kartu pegawai.</li>
                <li>Fitur ini hanya dapat digunakan satu kali untuk setiap pegawai per tahun.</li>
                <li>Cuti yang ditambahkan akan tercatat sebagai 'cuti ditangguhkan' pada saldo cuti tahunan pegawai di tahun berjalan.</li>
                <li>Contoh: Sisa 9 hari di 2024 ditambahkan oleh admin, maka total cuti tahunan 2025 menjadi 21 hari (12 hari kuota + 9 hari ditangguhkan).</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default LeaveHistoryDeferralInfo;
