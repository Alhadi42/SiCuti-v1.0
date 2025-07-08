
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, MoreHorizontal, Users2 } from 'lucide-react';

const EmployeeRow = ({ employee, onEdit, onDelete, onActionClick, index }) => (
  <motion.tr
    key={employee.id}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3, delay: index * 0.05 }}
    className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
  >
    <td className="py-3 px-4 text-slate-300 font-mono text-sm">{employee.nip}</td>
    <td className="py-3 px-4">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">
            {employee.name ? employee.name.charAt(0).toUpperCase() : 'N/A'}
          </span>
        </div>
        <span className="text-white font-medium">{employee.name}</span>
      </div>
    </td>
    <td className="py-3 px-4 text-slate-300">{employee.position_name || '-'}</td>
    <td className="py-3 px-4 text-slate-300">{employee.department || '-'}</td>
    <td className="py-3 px-4">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        employee.asn_status === 'PNS' ? 'bg-green-500/20 text-green-300' :
        employee.asn_status === 'PPPK' ? 'bg-yellow-500/20 text-yellow-300' :
        'bg-slate-500/20 text-slate-300'
      }`}>
        {employee.asn_status || 'N/A'}
      </span>
    </td>
    <td className="py-3 px-4 text-slate-300">{employee.rank_group || '-'}</td>
    <td className="py-3 px-4">
      <div className="flex items-center space-x-1">
        <Button size="icon" variant="ghost" onClick={() => onEdit(employee)} className="text-slate-400 hover:text-white w-8 h-8"><Edit className="w-4 h-4" /></Button>
        <Button size="icon" variant="ghost" onClick={() => onDelete(employee.id)} className="text-slate-400 hover:text-red-400 w-8 h-8"><Trash2 className="w-4 h-4" /></Button>
        <Button size="icon" variant="ghost" onClick={() => onActionClick("Menu Lainnya")} className="text-slate-400 hover:text-white w-8 h-8"><MoreHorizontal className="w-4 h-4" /></Button>
      </div>
    </td>
  </motion.tr>
);

const EmployeeTable = ({ employees, isLoading, searchTerm, onEdit, onDelete, onActionClick }) => {
  if (isLoading && employees.length === 0) {
    return <div className="text-center py-8 text-slate-300">{searchTerm ? "Mencari..." : "Memuat data pegawai..."}</div>;
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-8">
        <Users2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">{searchTerm ? "Tidak ada pegawai yang cocok dengan pencarian." : "Belum ada data pegawai."}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left py-3 px-4 text-slate-300 font-medium">NIP</th>
            <th className="text-left py-3 px-4 text-slate-300 font-medium">Nama</th>
            <th className="text-left py-3 px-4 text-slate-300 font-medium">Jabatan</th>
            <th className="text-left py-3 px-4 text-slate-300 font-medium">Unit Penempatan</th>
            <th className="text-left py-3 px-4 text-slate-300 font-medium">Status ASN</th>
            <th className="text-left py-3 px-4 text-slate-300 font-medium">Pangkat/Golongan</th>
            <th className="text-left py-3 px-4 text-slate-300 font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee, index) => (
            <EmployeeRow 
              key={employee.id} 
              employee={employee} 
              onEdit={onEdit} 
              onDelete={onDelete} 
              onActionClick={onActionClick} 
              index={index}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeTable;
