import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  Download,
  Upload,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import ImportEmployeeDialog from '@/components/employees/ImportEmployeeDialog';
import EmployeeForm from '@/components/employees/EmployeeForm';
import EmployeeTable from '@/components/employees/EmployeeTable';
import { useEmployeeData } from '@/hooks/useEmployeeData';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';

const Employees = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedUnitPenempatan, setSelectedUnitPenempatan] = useState('ALL');
  const [selectedPositionType, setSelectedPositionType] = useState('ALL');
  const [selectedAsnStatus, setSelectedAsnStatus] = useState('ALL');
  const [selectedRankGroup, setSelectedRankGroup] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  
  const {
    displayedEmployees,
    totalEmployeeCount,
    overallTotalEmployeeCount,
    totalPages,
    isLoading,
    departments: unitPenempatanOptions,
    positionTypes,
    asnStatuses,
    rankGroups,
    refreshData
  } = useEmployeeData(
    debouncedSearchTerm,
    selectedUnitPenempatan,
    selectedPositionType,
    selectedAsnStatus,
    selectedRankGroup,
    currentPage
  );

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when search changes
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedUnitPenempatan, selectedPositionType, selectedAsnStatus, selectedRankGroup]);

  const handleRefreshData = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setSelectedUnitPenempatan('ALL');
    setSelectedPositionType('ALL');
    setSelectedAsnStatus('ALL');
    setSelectedRankGroup('ALL');
    setCurrentPage(1);
    refreshData();
  };

  const handleResetFilters = () => {
    setSelectedUnitPenempatan('ALL');
    setSelectedPositionType('ALL');
    setSelectedAsnStatus('ALL');
    setSelectedRankGroup('ALL');
    setCurrentPage(1);
  };

  const handleFeatureClick = (feature) => {
    toast({
      title: `🚀 ${feature}`,
      description: "🚧 Fitur ini belum diimplementasikan—tapi jangan khawatir! Anda bisa memintanya di prompt berikutnya! 🚀",
    });
  };

  const onImportSuccess = useCallback(() => {
    handleRefreshData();
  }, [refreshData]);

  const onFormSubmitSuccess = () => {
    setIsFormModalOpen(false);
    setEditingEmployee(null);
    handleRefreshData();
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setIsFormModalOpen(true);
  };

  const handleDeleteEmployee = async (employeeId) => {
    if(!window.confirm("Apakah Anda yakin ingin menghapus pegawai ini? Data terkait seperti riwayat cuti juga akan terpengaruh.")) return;
    
    try {
      const { error } = await supabase.from('employees').delete().eq('id', employeeId);
      if (error) throw error;
      toast({title: "✅ Pegawai Dihapus", description: "Data pegawai berhasil dihapus."});
      handleRefreshData();
    } catch (error) {
      toast({variant: "destructive", title: "❌ Gagal Menghapus Pegawai", description: error.message});
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Data Pegawai</h1>
          <p className="text-slate-300">Kelola data {overallTotalEmployeeCount} pegawai dan informasi cuti</p>
        </div>
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <Button onClick={() => setIsFormModalOpen(true)} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Pegawai
          </Button>
        </div>
      </motion.div>

      {/* Main Content */}
      <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
        <CardContent className="p-6">
          <div>
            {/* Search and Actions Row */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <Input
                    id="search-employees"
                    name="search-employees"
                    placeholder="Cari pegawai berdasarkan nama, NIP, unit, atau jabatan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-700/50 border-slate-600/50 text-white"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsImportModalOpen(true)}
                  className="border-slate-600 text-slate-300 hover:text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleFeatureClick('Export Data')}
                  className="border-slate-600 text-slate-300 hover:text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
            {/* Filter Fields Langsung Tampil */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filter-unit-penempatan" className="text-sm font-medium text-slate-300">Unit Penempatan</Label>
                <Input
                  id="filter-unit-penempatan"
                  name="unitPenempatan"
                  type="text"
                  placeholder="Ketik nama unit penempatan..."
                  className="w-full bg-slate-800 border-slate-700 text-slate-300"
                  value={selectedUnitPenempatan === 'ALL' ? '' : selectedUnitPenempatan}
                  onChange={e => setSelectedUnitPenempatan(e.target.value.trim() === '' ? 'ALL' : e.target.value)}
                  autoComplete="off"
                />
              </div>
              {/* Filter lain tetap Select */}
              <div className="space-y-2">
                <Label htmlFor="filter-jenis-jabatan" className="text-sm font-medium text-slate-300">Jenis Jabatan</Label>
                <Select value={selectedPositionType} onValueChange={setSelectedPositionType} name="jenisJabatan" id="filter-jenis-jabatan">
                  <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-slate-300" id="filter-jenis-jabatan-trigger" name="jenisJabatan">
                    <SelectValue placeholder="Semua Jenis Jabatan" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="ALL">Semua Jenis Jabatan</SelectItem>
                    {(positionTypes || []).map(opt =>
                      typeof opt === 'string'
                        ? <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        : <SelectItem key={opt.value} value={opt.value}>{opt.label ?? opt.value}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-status-asn" className="text-sm font-medium text-slate-300">Status ASN</Label>
                <Select value={selectedAsnStatus} onValueChange={setSelectedAsnStatus} name="statusASN" id="filter-status-asn">
                  <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-slate-300" id="filter-status-asn-trigger" name="statusASN">
                    <SelectValue placeholder="Semua Status ASN" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="ALL">Semua Status ASN</SelectItem>
                    {(asnStatuses || []).map(opt =>
                      typeof opt === 'string'
                        ? <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        : <SelectItem key={opt.value} value={opt.value}>{opt.label ?? opt.value}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-golongan" className="text-sm font-medium text-slate-300">Golongan</Label>
                <Select value={selectedRankGroup} onValueChange={setSelectedRankGroup} name="golongan" id="filter-golongan">
                  <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-slate-300" id="filter-golongan-trigger" name="golongan">
                    <SelectValue placeholder="Semua Golongan" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="ALL">Semua Golongan</SelectItem>
                    {(rankGroups || []).map(opt =>
                      typeof opt === 'string'
                        ? <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        : <SelectItem key={opt.value} value={opt.value}>{opt.label ?? opt.value}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Employee Table */}
            <EmployeeTable 
              employees={displayedEmployees}
              isLoading={isLoading}
              onEdit={handleEditEmployee}
              onDelete={handleDeleteEmployee}
              isSearchActive={!!debouncedSearchTerm || !!selectedUnitPenempatan || !!selectedPositionType || !!selectedAsnStatus || !!selectedRankGroup}
            />
          </div>
        </CardContent>
      </Card>

      {/* Import Modal */}
      <ImportEmployeeDialog
        isOpen={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImportSuccess={onImportSuccess}
      />

      {/* Form Modal */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-slate-800 text-slate-300 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">{editingEmployee ? 'Edit Pegawai' : 'Tambah Pegawai'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingEmployee ? 'Update informasi pegawai yang sudah ada' : 'Tambahkan data pegawai baru ke sistem'}
            </DialogDescription>
          </DialogHeader>
          <EmployeeForm
            employee={editingEmployee}
            onFormSubmit={onFormSubmitSuccess}
            onCancel={() => setIsFormModalOpen(false)}
            departments={unitPenempatanOptions || []}
            positionTypes={positionTypes || []}
            asnStatuses={asnStatuses || []}
            rankGroups={rankGroups || []}
            isLoadingDepartments={isLoading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;

// ErrorBoundary component
function ErrorBoundary({ children }) {
  const [error, setError] = React.useState(null);
  if (error) {
    return <div className="text-red-500 bg-slate-900 p-2 rounded">{error.toString()}</div>;
  }
  return React.Children.map(children, child => {
    try {
      return child;
    } catch (e) {
      setError(e);
      return null;
    }
  });
}
