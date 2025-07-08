import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, ExternalLink, Trash2, Edit, Search, RefreshCw, FileText } from 'lucide-react';

const DeferredLeaveInputDialog = ({ isOpen, onOpenChange, onSuccess }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [existingDeferrals, setExistingDeferrals] = useState([]);
  
  // Form states
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [deferredYear, setDeferredYear] = useState('');
  const [deferredDays, setDeferredDays] = useState('');
  const [googleDriveLink, setGoogleDriveLink] = useState('');
  const [notes, setNotes] = useState('');
  
  // Edit states
  const [editingDeferral, setEditingDeferral] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Search states
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [showEmployeeResults, setShowEmployeeResults] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  useEffect(() => {
    if (isOpen) {
      console.log('Dialog opened, fetching data...');
      fetchEmployees();
      fetchLeaveTypes();
      fetchExistingDeferrals();
    }
  }, [isOpen]);

  const fetchEmployees = async () => {
    try {
      console.log('Fetching employees...');
      
      let allEmployees = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      // Fetch employees in batches to handle large datasets
      while (hasMore) {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .order('name')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allEmployees = [...allEmployees, ...data];
          page++;
          
          // If we got less than pageSize, we've reached the end
          if (data.length < pageSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      
      console.log('Employees fetched:', allEmployees.length, 'employees');
      console.log('Sample employee data:', allEmployees.slice(0, 3));
      
      setEmployees(allEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal memuat data pegawai",
      });
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setLeaveTypes(data || []);
    } catch (error) {
      console.error('Error fetching leave types:', error);
    }
  };

  const fetchExistingDeferrals = async () => {
    try {
      console.log('Fetching existing deferrals...');
      const { data, error } = await supabase
        .from('leave_deferrals')
        .select(`
          *,
          employees (name, nip, department)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log('Existing deferrals fetched:', data?.length || 0, 'deferrals');
      console.log('Sample deferral data:', data?.slice(0, 2));
      
      setExistingDeferrals(data || []);
    } catch (error) {
      console.error('Error fetching deferrals:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal memuat data penangguhan",
      });
    }
  };

  const resetForm = () => {
    setSelectedEmployee('');
    setDeferredYear('');
    setDeferredDays('');
    setGoogleDriveLink('');
    setNotes('');
    setEditingDeferral(null);
    setIsEditing(false);
    setEmployeeSearchTerm('');
    setFilteredEmployees([]);
    setShowEmployeeResults(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedEmployee || !deferredYear || !deferredDays || !googleDriveLink) {
      toast({
        variant: "destructive",
        title: "Data tidak lengkap",
        description: "Semua field wajib diisi",
      });
      return;
    }

    setIsLoading(true);

    try {
      const deferralData = {
        employee_id: selectedEmployee,
        year: parseInt(deferredYear),
        days_deferred: parseInt(deferredDays),
        google_drive_link: googleDriveLink,
        notes: notes || null,
      };

      if (isEditing && editingDeferral) {
        // Update existing deferral
        const { error } = await supabase
          .from('leave_deferrals')
          .update(deferralData)
          .eq('id', editingDeferral.id);
        
        if (error) throw error;
        
        toast({
          title: "✅ Berhasil",
          description: "Data penangguhan berhasil diperbarui",
        });
      } else {
        // Insert new deferral
        const { error } = await supabase
          .from('leave_deferrals')
          .insert(deferralData);
        
        if (error) throw error;
        
        toast({
          title: "✅ Berhasil",
          description: "Data penangguhan berhasil ditambahkan",
        });
      }

      resetForm();
      fetchExistingDeferrals(); // Refresh the list after saving
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving deferral:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (deferral) => {
    setEditingDeferral(deferral);
    setSelectedEmployee(deferral.employee_id);
    setDeferredYear(deferral.year.toString());
    setDeferredDays(deferral.days_deferred.toString());
    setGoogleDriveLink(deferral.google_drive_link || '');
    setNotes(deferral.notes || '');
    setIsEditing(true);
    
    // Set employee search term to show selected employee
    const employee = employees.find(emp => emp.id === deferral.employee_id);
    if (employee) {
      const displayName = `${employee.name || 'Nama tidak tersedia'}`;
      setEmployeeSearchTerm(displayName);
    }
  };

  const handleDelete = async (deferralId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data penangguhan ini?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('leave_deferrals')
        .delete()
        .eq('id', deferralId);
      
      if (error) throw error;
      
      toast({
        title: "✅ Berhasil",
        description: "Data penangguhan berhasil dihapus",
      });
      
      fetchExistingDeferrals();
      onSuccess();
    } catch (error) {
      console.error('Error deleting deferral:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal menghapus data penangguhan",
      });
    }
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  const selectedEmployeeData = employees.find(emp => emp.id === selectedEmployee);
  
  // Debug: Log employees state when it changes
  useEffect(() => {
    console.log('Employees state updated:', employees.length, 'employees');
    if (employees.length > 0) {
      console.log('First few employees:', employees.slice(0, 3));
    }
  }, [employees]);
  
  const getEmployeeDisplayName = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.name || 'Nama tidak tersedia'}` : '';
  };

  // Filter employees based on search term
  useEffect(() => {
    console.log('Filtering employees. Search term:', employeeSearchTerm);
    console.log('Total employees available:', employees.length);
    
    if (employeeSearchTerm.trim() === '') {
      setFilteredEmployees([]);
      setShowEmployeeResults(false);
      return;
    }

    const searchTerm = employeeSearchTerm.toLowerCase().trim();
    console.log('Searching for term:', searchTerm);
    console.log('Total employees to search through:', employees.length);
    
    // If no search term, show first 50 employees for browsing
    if (searchTerm.length === 0) {
      const limitedResults = employees.slice(0, 50);
      console.log('Showing first 50 employees for browsing');
      setFilteredEmployees(limitedResults);
      setShowEmployeeResults(true);
      return;
    }
    
    const filtered = employees.filter(employee => {
      if (!employee) return false;
      
      const name = (employee.name || '').toLowerCase();
      const department = (employee.department || '').toLowerCase();
      
      // Simple substring search - more reliable
      const nameMatch = name.includes(searchTerm);
      const departmentMatch = department.includes(searchTerm);
      
      return nameMatch || departmentMatch;
    });
    
    console.log('Filtered employees:', filtered.length);
    console.log('Sample filtered results:', filtered.slice(0, 3));
    
    // Debug: Show some sample employee names to understand the data
    if (filtered.length === 0 && searchTerm.length > 0) {
      console.log('No results found for search term:', searchTerm);
      console.log('Sample of all employee names:', employees.slice(0, 20).map(emp => emp?.name).filter(Boolean));
      
      // Also check if there are any employees with similar names
      const similarNames = employees.filter(emp => {
        const name = (emp?.name || '').toLowerCase();
        return name.includes(searchTerm.substring(0, 3)) || name.includes(searchTerm.substring(0, 2));
      }).slice(0, 5);
      
      if (similarNames.length > 0) {
        console.log('Similar names found:', similarNames.map(emp => emp?.name));
      }
    }
    
    setFilteredEmployees(filtered);
    setShowEmployeeResults(true);
  }, [employeeSearchTerm, employees]);

  // Auto-fill form fields when employee is selected and has existing deferrals
  useEffect(() => {
    if (selectedEmployee && existingDeferrals.length > 0) {
      const employeeDeferrals = existingDeferrals.filter(deferral => deferral.employee_id === selectedEmployee);
      
      if (employeeDeferrals.length > 0) {
        // Get the most recent deferral for this employee
        const mostRecentDeferral = employeeDeferrals.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        )[0];
        
        console.log('Auto-filling form with existing deferral data:', mostRecentDeferral);
        
        // Auto-fill the form fields
        setDeferredYear(mostRecentDeferral.year.toString());
        setDeferredDays(mostRecentDeferral.days_deferred.toString());
        setGoogleDriveLink(mostRecentDeferral.google_drive_link || '');
        setNotes(mostRecentDeferral.notes || '');
        
        // Set editing mode
        setEditingDeferral(mostRecentDeferral);
        setIsEditing(true);
      }
    }
  }, [selectedEmployee, existingDeferrals]);

  const handleEmployeeSelect = (employee) => {
    if (employee && employee.id) {
      setSelectedEmployee(employee.id);
      setEmployeeSearchTerm(employee.name || '');
      setShowEmployeeResults(false);
    }
  };

  const handleEmployeeSearchChange = (e) => {
    const value = e.target.value;
    setEmployeeSearchTerm(value);
    
    // If user clears the search, also clear the selected employee
    if (value === '') {
      setSelectedEmployee('');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const searchContainer = document.getElementById('employee-search-container');
      if (searchContainer && !searchContainer.contains(event.target)) {
        setShowEmployeeResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Data Penangguhan' : 'Input Data Penangguhan'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Edit data penangguhan cuti pegawai'
              : 'Input data penangguhan cuti pegawai dengan dokumen pendukung'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative" id="employee-search-container">
                <Label htmlFor="employee-search">Pilih Pegawai</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="employee-search"
                    type="text"
                    value={employeeSearchTerm}
                    onChange={handleEmployeeSearchChange}
                    placeholder="Ketik nama pegawai..."
                    className="pl-10 bg-slate-700/50 border-slate-600/50 text-white placeholder-slate-400"
                    onFocus={() => {
                      setShowEmployeeResults(true);
                    }}
                  />
                </div>
                
                {/* Search Results Dropdown */}
                {showEmployeeResults && filteredEmployees.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-slate-700 border border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="px-3 py-2 text-xs text-slate-400 border-b border-slate-600">
                      {employeeSearchTerm.trim() === '' 
                        ? `Menampilkan 50 pegawai pertama (dari ${employees.length} total)`
                        : `Hasil pencarian: ${filteredEmployees.length} pegawai`
                      }
                    </div>
                    {filteredEmployees.map((employee) => (
                      employee && employee.id && (
                        <div
                          key={employee.id}
                          onClick={() => handleEmployeeSelect(employee)}
                          className="px-4 py-2 hover:bg-slate-600 cursor-pointer text-white border-b border-slate-600 last:border-b-0"
                        >
                          <div className="font-medium">{employee.name || 'Nama tidak tersedia'}</div>
                          <div className="text-xs text-slate-400">{employee.department || 'Departemen tidak tersedia'}</div>
                        </div>
                      )
                    ))}
                  </div>
                )}
                
                {showEmployeeResults && filteredEmployees.length === 0 && employeeSearchTerm.trim() !== '' && (
                  <div className="absolute z-50 w-full mt-1 bg-slate-700 border border-slate-600 rounded-md shadow-lg">
                    <div className="px-4 py-2 text-slate-400 text-center">
                      Tidak ada pegawai ditemukan
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="deferred-year">Tahun Penangguhan</Label>
                <select
                  id="deferred-year"
                  name="deferred-year"
                  value={deferredYear}
                  onChange={(e) => setDeferredYear(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-slate-700/50 border border-slate-600/50 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Pilih tahun...</option>
                  {years.map((year) => (
                    <option key={year} value={year.toString()} className="bg-slate-700 text-white">
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="deferred-days">Jumlah Hari Ditangguhkan</Label>
                <Input
                  id="deferred-days"
                  type="number"
                  value={deferredDays}
                  onChange={(e) => setDeferredDays(e.target.value)}
                  placeholder="Contoh: 5"
                  min="0"
                  required
                  className="bg-slate-700/50 border-slate-600/50"
                />
              </div>

              <div>
                <Label htmlFor="google-drive-link">Link Google Drive Dokumen</Label>
                <Input
                  id="google-drive-link"
                  type="url"
                  value={googleDriveLink}
                  onChange={(e) => setGoogleDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  required
                  className="bg-slate-700/50 border-slate-600/50"
                />
              </div>

              <div>
                <Label htmlFor="notes">Catatan (Opsional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tambahkan catatan jika diperlukan..."
                  className="bg-slate-700/50 border-slate-600/50"
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCancel} className="border-slate-600 text-slate-300">
                  Batal
                </Button>
                <Button type="submit" disabled={isLoading} className="bg-gradient-to-r from-blue-500 to-purple-600">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? 'Update' : 'Simpan'}
                </Button>
              </div>
            </form>
          </div>

          {/* Existing Data Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Data Penangguhan Terdaftar</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchExistingDeferrals}
                className="h-8 px-3 border-slate-600 text-slate-300"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {existingDeferrals
                .filter(deferral => !selectedEmployee || deferral.employee_id === selectedEmployee)
                .length > 0 ? (
                existingDeferrals
                  .filter(deferral => !selectedEmployee || deferral.employee_id === selectedEmployee)
                  .map((deferral) => (
                    <div key={deferral.id} className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-white">
                            {deferral.employees?.name || 'Nama tidak tersedia'}
                          </h4>
                          <p className="text-sm text-slate-300">
                            Tahun: {deferral.year} | Hari: {deferral.days_deferred}
                          </p>
                          <p className="text-xs text-slate-400">
                            NIP: {deferral.employees?.nip || 'NIP tidak tersedia'}
                          </p>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(deferral)}
                            className="h-8 w-8 p-0 border-slate-600"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(deferral.id)}
                            className="h-8 w-8 p-0 border-red-600 text-red-400 hover:bg-red-600/20"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {deferral.google_drive_link && (
                        <div className="flex items-center space-x-2">
                          <ExternalLink className="h-3 w-3 text-blue-400" />
                          <a
                            href={deferral.google_drive_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-400 hover:underline truncate"
                          >
                            Lihat Dokumen
                          </a>
                        </div>
                      )}
                      {deferral.notes && (
                        <p className="text-xs text-slate-400 mt-1">{deferral.notes}</p>
                      )}
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <div className="mb-2">
                    <FileText className="h-8 w-8 mx-auto text-slate-500" />
                  </div>
                  <p className="font-medium">
                    {selectedEmployee 
                      ? 'Belum ada data penangguhan untuk pegawai ini'
                      : 'Belum ada data penangguhan'
                    }
                  </p>
                  <p className="text-sm">
                    {selectedEmployee 
                      ? 'Data penangguhan untuk pegawai yang dipilih akan muncul di sini'
                      : 'Data penangguhan cuti akan muncul di sini setelah ditambahkan'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeferredLeaveInputDialog; 