import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Download, 
  BarChart3,
  Users,
  RefreshCw,
  CalendarCheck,
  Briefcase,
  Award,
  TrendingDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { useToast } from '@/components/ui/use-toast';
import { useLeaveTypes } from '@/hooks/useLeaveTypes';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useDepartments } from '@/hooks/useDepartments';
import DashboardStatCard from '@/components/dashboard/DashboardStatCard';

const Reports = () => {
  const { toast } = useToast();
  const currentDefaultYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentDefaultYear.toString());
  const [selectedUnitPenempatanFilter, setSelectedUnitPenempatanFilter] = useState(''); 

  const { leaveTypes, isLoadingLeaveTypes } = useLeaveTypes();
  const { departments: unitPenempatanOptions, isLoadingDepartments } = useDepartments();
  
  const { dashboardStats, isLoadingStats, refreshStats } = useDashboardStats(
    leaveTypes, 
    isLoadingLeaveTypes, 
    parseInt(selectedYear),
    selectedUnitPenempatanFilter 
  );

  const years = Array.from({ length: 5 }, (_, i) => (currentDefaultYear - i).toString());

  useEffect(() => {
    refreshStats(); 
  }, [selectedYear, selectedUnitPenempatanFilter, refreshStats]);

  const handleExportReport = (format) => {
    let unitFilterText = selectedUnitPenempatanFilter && selectedUnitPenempatanFilter !== '' ? ` untuk Unit Penempatan ${unitPenempatanOptions.find(o=>o.value === selectedUnitPenempatanFilter)?.label || selectedUnitPenempatanFilter}` : '';
    toast({
      title: `📊 Export ${format.toUpperCase()}`,
      description: `Laporan untuk tahun ${selectedYear}${unitFilterText} (format ${format}) sedang disiapkan. Fitur ini belum sepenuhnya aktif.`,
    });
  };
  
  const handleRefresh = () => {
    setSelectedYear(currentDefaultYear.toString());
    setSelectedUnitPenempatanFilter('');
  }

  const mainStatsCards = [
    {
      title: "Total Pegawai",
      value: dashboardStats.totalEmployees.toLocaleString(),
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      subValue: selectedUnitPenempatanFilter && selectedUnitPenempatanFilter !== '' ? `Di Unit Penempatan terpilih` : `Terdaftar di sistem`
    },
    {
      title: `Total Pengajuan Cuti (${selectedYear})`,
      value: dashboardStats.totalLeaveRequestsThisYear.toLocaleString(),
      icon: FileText,
      color: "from-purple-500 to-pink-500",
      subValue: `Semua jenis cuti tahun ${selectedYear}`
    },
    ...Object.entries(dashboardStats.asnStatusCounts).map(([status, count]) => ({
      title: `Pegawai ${status}`,
      value: count.toLocaleString(),
      icon: Briefcase,
      color: status === 'PNS' ? "from-green-500 to-emerald-500" : status === 'PPPK' ? "from-yellow-500 to-orange-500" : "from-slate-500 to-gray-600",
      subValue: status === 'Tidak Diketahui' ? 'Ada data pegawai yang status ASN-nya kosong/invalid. Periksa master data pegawai.' : `Status Kepegawaian`
    })),
  ];
  
  const leaveTypeStatCards = Object.entries(dashboardStats.leaveRequestsByTypeThisYear)
    .sort(([,a],[,b]) => b-a) 
    .map(([typeName, count]) => ({
      title: `Cuti ${typeName} (${selectedYear})`,
      value: count.toLocaleString(),
      icon: CalendarCheck,
      color: "from-teal-500 to-cyan-600",
      subValue: `Total pengajuan tahun ${selectedYear}`
    }));

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Laporan Cuti</h1>
          <p className="text-slate-300">Analisis dan laporan penggunaan cuti pegawai untuk tahun {selectedYear}</p>
        </div>
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <Button 
            onClick={() => handleExportReport('pdf')}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button 
            onClick={() => handleExportReport('excel')}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <Label htmlFor="report-year" className="text-slate-300 text-sm font-medium mb-2 block">Pilih Tahun Laporan</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger id="report-year" className="bg-slate-700/50 border-slate-600/50 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {years.map((year) => (
                      <SelectItem key={year} value={year} className="text-white hover:bg-slate-600">{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-full">
                <Label htmlFor="unit-penempatan-filter" className="text-slate-300 text-sm font-medium mb-2 block">Cari Unit Penempatan</Label>
                <Combobox
                  options={[
                    { value: '', label: 'Semua Unit Penempatan' },
                    ...unitPenempatanOptions
                  ]}
                  value={selectedUnitPenempatanFilter}
                  onValueChange={setSelectedUnitPenempatanFilter}
                  placeholder="Ketik nama unit..."
                  searchPlaceholder="Cari unit penempatan..."
                  notFoundMessage="Unit penempatan tidak ditemukan"
                  triggerClassName="w-full bg-slate-700/50 border-slate-600/50 text-white hover:bg-slate-700/70"
                />
              </div>
              
              <div className="flex items-end">
                <Button 
                  onClick={handleRefresh}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  disabled={isLoadingStats || isLoadingLeaveTypes || isLoadingDepartments}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${(isLoadingStats || isLoadingLeaveTypes) ? 'animate-spin' : ''}`} />
                  {(isLoadingStats || isLoadingLeaveTypes) ? 'Memuat...' : 'Tampilkan Laporan'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Ringkasan Statistik - Tahun {selectedYear} {selectedUnitPenempatanFilter && selectedUnitPenempatanFilter !== '' ? `(${unitPenempatanOptions.find(o => o.value === selectedUnitPenempatanFilter)?.label || ''})` : ''}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {mainStatsCards.map((stat, index) => (
          <DashboardStatCard 
            key={`main-${index}`}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            subValue={stat.subValue}
            isLoading={isLoadingStats || isLoadingLeaveTypes}
            delay={index * 0.05}
          />
        ))}
      </div>
      
      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Statistik Pengajuan Cuti per Jenis - Tahun {selectedYear} {selectedUnitPenempatanFilter && selectedUnitPenempatanFilter !== '' ? `(${unitPenempatanOptions.find(o => o.value === selectedUnitPenempatanFilter)?.label || ''})` : ''}</h2>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {(isLoadingStats || isLoadingLeaveTypes) && leaveTypeStatCards.length === 0 ? (
            Array(3).fill(0).map((_,idx) => <DashboardStatCard key={`ltload-report-${idx}`} title="Memuat Jenis Cuti..." value="0" icon={CalendarCheck} color="from-slate-500 to-gray-600" isLoading={true} delay={idx * 0.05}/>)
        ) : leaveTypeStatCards.length > 0 ? (
            leaveTypeStatCards.map((stat, index) => (
              <DashboardStatCard 
                key={`lt-report-${index}`}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
                subValue={stat.subValue}
                isLoading={isLoadingStats || isLoadingLeaveTypes}
                delay={index * 0.05}
              />
            ))
        ) : (
          <p className="text-slate-400 col-span-full text-center py-4">Belum ada data pengajuan cuti untuk tahun {selectedYear}.</p>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
                <CardHeader>
                    <CardTitle className="text-white flex items-center">
                        <Award className="w-5 h-5 mr-2 text-yellow-400" />
                        Pegawai Paling Sering Cuti ({selectedYear}) {selectedUnitPenempatanFilter && selectedUnitPenempatanFilter !== '' ? `(${unitPenempatanOptions.find(o => o.value === selectedUnitPenempatanFilter)?.label || ''})` : ''}
                    </CardTitle>
                     <p className="text-slate-400 text-xs">Top 3 pegawai dengan jumlah pengajuan cuti terbanyak tahun {selectedYear}.</p>
                </CardHeader>
                <CardContent>
                    {isLoadingStats || isLoadingLeaveTypes ? (
                        <p className="text-slate-400 text-center py-4">Memuat data...</p>
                    ) : dashboardStats.mostFrequentLeaveTakersThisYear.length > 0 ? (
                        <ul className="space-y-3">
                            {dashboardStats.mostFrequentLeaveTakersThisYear.map((taker, index) => (
                                <li key={index} className="flex justify-between items-center p-3 bg-slate-700/30 rounded-md">
                                    <span className="text-slate-200">{index + 1}. {taker.name}</span>
                                    <span className="text-purple-400 font-semibold">{taker.count} kali</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-slate-400 text-center py-4">Belum ada data pengajuan cuti tahun {selectedYear}.</p>
                    )}
                </CardContent>
            </Card>
        </motion.div>
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
        >
            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
                <CardHeader>
                    <CardTitle className="text-white flex items-center">
                        <TrendingDown className="w-5 h-5 mr-2 text-cyan-400" />
                        Jenis Cuti Terpopuler ({selectedYear}) {selectedUnitPenempatanFilter && selectedUnitPenempatanFilter !== '' ? `(${unitPenempatanOptions.find(o => o.value === selectedUnitPenempatanFilter)?.label || ''})` : ''}
                    </CardTitle>
                    <p className="text-slate-400 text-xs">Jenis cuti yang paling banyak diajukan tahun {selectedYear}.</p>
                </CardHeader>
                <CardContent>
                     {isLoadingStats || isLoadingLeaveTypes ? (
                        <p className="text-slate-400 text-center py-4">Memuat data...</p>
                    ) : dashboardStats.mostPopularLeaveTypeThisYear ? (
                        <div className="text-center p-4 bg-slate-700/30 rounded-md">
                            <p className="text-2xl font-bold text-cyan-400">{dashboardStats.mostPopularLeaveTypeThisYear.name}</p>
                            <p className="text-slate-300">{dashboardStats.mostPopularLeaveTypeThisYear.count} kali diajukan</p>
                        </div>
                    ) : (
                        <p className="text-slate-400 text-center py-4">Belum ada data pengajuan cuti tahun {selectedYear}.</p>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Grafik & Detail Laporan (Segera Hadir)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <p className="text-slate-300 mb-2">Visualisasi data dan tabel detail akan tersedia di sini.</p>
                <p className="text-slate-500 text-xs">Fitur ini sedang dalam pengembangan.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Reports;
