import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Label } from '@/components/ui/label';

// Simple card component for displaying statistics
const StatCard = ({ title, value, icon: Icon }) => (
  <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
    <div className="flex justify-between items-center mb-2">
      <h3 className="text-sm font-medium text-slate-400">{title}</h3>
      {Icon && <Icon className="h-4 w-4 text-blue-500" />}
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
  </div>
);

// Simple select component for unit filtering
const SimpleSelect = ({ value, onChange, options, placeholder, disabled }) => (
  <div className="relative w-full">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-md text-white appearance-none pr-10"
    >
      <option value="">{placeholder || 'Select...'}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const Dashboard = () => {
  const [selectedUnit, setSelectedUnit] = useState('');
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalLeaveRequests: 0,
  });

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('department')
          .not('department', 'is', null);

        if (error) throw error;

        // Get unique department names
        const uniqueDepartments = [...new Set(data.map(item => item.department))]
          .filter(Boolean)
          .map(dept => ({
            value: dept,
            label: dept
          }));

        setDepartments(uniqueDepartments);
      } catch (error) {
        console.error('Error fetching departments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  // Fetch stats when selectedUnit changes
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        
        // Fetch employee count
        let query = supabase
          .from('employees')
          .select('*', { count: 'exact' });

        if (selectedUnit) {
          query = query.eq('department', selectedUnit);
        }

        const { count: totalEmployees } = await query;

        // Fetch leave requests count
        let leaveQuery = supabase
          .from('leave_requests')
          .select('*', { count: 'exact' });

        if (selectedUnit) {
          // Get employee IDs for the selected department
          const { data: employees } = await supabase
            .from('employees')
            .select('id')
            .eq('department', selectedUnit);

          if (employees && employees.length > 0) {
            const employeeIds = employees.map(emp => emp.id);
            leaveQuery = leaveQuery.in('employee_id', employeeIds);
          } else {
            // No employees in this department
            setStats({
              totalEmployees: 0,
              totalLeaveRequests: 0,
            });
            return;
          }
        }


        const { count: totalLeaveRequests } = await leaveQuery;

        // Update stats
        setStats({
          totalEmployees: totalEmployees || 0,
          totalLeaveRequests: totalLeaveRequests || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [selectedUnit]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">
          {selectedUnit 
            ? `Menampilkan data untuk unit: ${selectedUnit}` 
            : 'Menampilkan data semua unit'}
        </p>
      </div>

      <div className="mb-8">
        <Label htmlFor="unit-filter" className="block text-sm font-medium text-slate-300 mb-2">
          Filter Berdasarkan Unit Penempatan
        </Label>
        <SimpleSelect
          value={selectedUnit}
          onChange={setSelectedUnit}
          options={departments}
          disabled={isLoading}
          placeholder="Pilih Unit Penempatan"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard 
          title="Total Pegawai" 
          value={stats.totalEmployees} 
        />
        <StatCard 
          title="Total Pengajuan Cuti" 
          value={stats.totalLeaveRequests} 
        />
      </div>
    </div>
  );
};

export default Dashboard;
