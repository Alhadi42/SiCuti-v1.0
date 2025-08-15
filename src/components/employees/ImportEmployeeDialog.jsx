import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileSpreadsheet, Upload, Loader2, TestTube } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { readExcelFile, createExcelTemplate, validateExcelFile } from '@/utils/excelUtils';
import { testSupabaseConnection, testEmployeeInsert, testEmployeesTableStructure, fixNonAsnNip } from '@/utils/supabaseTest';

const REQUIRED_EMPLOYEE_HEADERS = ["Type Jabatan", "Nama Jabatan", "Nama Pegawai", "Kriteria ASN", "NIP", "Pangkat/Golongan", "Unit Penempatan"];

const ImportEmployeeDialog = ({ isOpen, onOpenChange, onImportSuccess }) => {
  const { toast } = useToast();
  const [excelFile, setExcelFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setExcelFile(file);
      setFileName(file.name);
    }
  };

  const downloadTemplate = async () => {
    try {
      const exampleData = [
        ["Jabatan Struktural", "Kepala Bagian IT", "Ahmad Wijaya", "PNS", "198501012010011001", "IV/a", "Teknologi Informasi"],
        ["Jabatan Fungsional", "Analis Sistem", "Siti Nurhaliza", "PPPK", "198703152012012002", "Ahli Muda", "Teknologi Informasi"],
        ["Jabatan Pelaksana", "Staf Administrasi", "Budi Santoso", "Non ASN", "", "-", "Human Resources"],
        ["Outsourcing", "Tenaga Kebersihan", "Dewi Lestari", "Non ASN", "", "-", "Umum"],
        ["Outsourcing", "Security", "Joko Widodo", "Non ASN", "", "-", "Keamanan"],
      ];
      const templateData = [REQUIRED_EMPLOYEE_HEADERS, ...exampleData].map(row => {
        const obj = {};
        REQUIRED_EMPLOYEE_HEADERS.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });
      
      await createExcelTemplate(templateData, "Template_Import_Pegawai.xlsx", "Template Pegawai");
      toast({
        title: "Template Diunduh",
        description: "Template Excel untuk import pegawai berhasil diunduh. Contoh untuk Non ASN/Outsourcing tanpa NIP sudah disertakan.",
      });
    } catch (error) {
      toast({
        title: "Gagal Mengunduh Template",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleImportExcel = async () => {
    if (!excelFile) {
      toast({
        variant: "destructive",
        title: "File Excel Belum Dipilih",
        description: "Silakan pilih file Excel untuk diimport.",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Validate file using new utility
      validateExcelFile(excelFile);

      // Read Excel file using new utility
      const jsonData = await readExcelFile(excelFile);
      
      if (jsonData.length < 1) {
        throw new Error("File Excel kosong atau tidak memiliki data. Pastikan file memiliki header dan minimal satu baris data.");
      }
      
      const headers = Object.keys(jsonData[0]);
      
      console.log("Headers found:", headers);
      
      const missingHeaders = REQUIRED_EMPLOYEE_HEADERS.filter(eh => !headers.includes(eh));
      if (missingHeaders.length > 0) {
        throw new Error(`Header kolom tidak sesuai. Kolom yang hilang: ${missingHeaders.join(', ')}. Pastikan header sesuai template.`);
      }
      
      const employeesToInsert = jsonData.map((row, rowIndex) => {
        const employee = {};
        headers.forEach((header) => {
          const value = row[header] ? row[header].toString().trim() : null;
          if (header === "Type Jabatan") employee.position_type = value;
          else if (header === "Nama Jabatan") employee.position_name = value;
          else if (header === "Nama Pegawai") employee.name = value;
          else if (header === "Kriteria ASN") employee.asn_status = value;
          else if (header === "NIP") employee.nip = value;
          else if (header === "Pangkat/Golongan") employee.rank_group = value;
          else if (header === "Unit Penempatan") employee.department = value;
        });
        
        // Nama Pegawai wajib ada
        if (!employee.name) {
          console.warn(`Baris ${rowIndex + 2} dilewati karena Nama Pegawai kosong:`, employee);
          return null;
        }
        
        // Untuk Non ASN/Outsourcing, NIP dikosongkan
        if (!employee.nip) {
          if (employee.asn_status === "Non ASN" || employee.position_type === "Outsourcing") {
            employee.nip = null;
            console.log(`NIP dikosongkan untuk Non ASN/Outsourcing: ${employee.name}`);
          } else {
            // Untuk PNS/PPPK harus memiliki NIP
            console.warn(`Baris ${rowIndex + 2} dilewati karena PNS/PPPK harus memiliki NIP:`, employee);
            return null;
          }
        }
        
        return employee;
      }).filter(emp => emp !== null);

      if (employeesToInsert.length === 0) {
        throw new Error("Tidak ada data pegawai valid untuk diimport. Pastikan setiap baris memiliki Nama Pegawai. Untuk PNS/PPPK, NIP wajib diisi. Untuk Non ASN/Outsourcing tanpa NIP, sistem akan generate NIPK otomatis.");
      }

      console.log("Employees to insert:", employeesToInsert);

      const { error } = await supabase.from('employees').upsert(employeesToInsert, { onConflict: 'nip' });

      if (error) {
        console.error("Supabase error:", error);
        if (error.message.includes("violates unique constraint")) {
           throw new Error("Gagal mengimpor: Terdapat duplikasi NIP yang tidak dapat diatasi secara otomatis. Periksa data Anda.");
        }
        throw new Error(`Database error: ${error.message}`);
      }

      toast({
        title: "Sukses Import Data",
        description: `${employeesToInsert.length} data pegawai berhasil diimport/diperbarui.`,
      });
      onImportSuccess();
      onOpenChange(false);
      setExcelFile(null);
      setFileName('');
    } catch (error) {
      console.error("Error importing Excel:", error);
      toast({
        variant: "destructive",
        title: "Gagal Import Data",
        description: error.message || "Terjadi kesalahan saat mengimport data.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const testConnection = async () => {
    try {
      const result = await testSupabaseConnection();
      if (result.success) {
        toast({
          title: "✅ Koneksi Berhasil",
          description: `Database terhubung. Struktur tabel: ${result.tableStructure.join(', ')}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "❌ Koneksi Gagal",
          description: typeof result.error === 'string' ? result.error : JSON.stringify(result.error),
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "❌ Test Gagal",
        description: error.message,
      });
    }
  };

  const testInsert = async () => {
    try {
      // Test case 1: Employee with NIP
      const testEmployee1 = {
        position_type: "Test Jabatan",
        position_name: "Test Nama Jabatan",
        name: "Test Pegawai PNS",
        asn_status: "PNS",
        nip: "TEST" + Date.now(),
        rank_group: "Test Golongan",
        department: "Test Unit"
      };
      
      // Test case 2: Employee without NIP (Non ASN)
      const testEmployee2 = {
        position_type: "Outsourcing",
        position_name: "Test Outsourcing",
        name: "Test Pegawai Outsourcing",
        asn_status: "Non ASN",
        nip: null, // Will be generated automatically
        rank_group: "Test Golongan",
        department: "Test Unit"
      };
      
      // Generate NIPK for test employee 2
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      testEmployee2.nip = `NIPK${timestamp}${random}`;
      
      const result1 = await testEmployeeInsert(testEmployee1);
      const result2 = await testEmployeeInsert(testEmployee2);
      
      if (result1.success && result2.success) {
        toast({
          title: "✅ Test Insert Berhasil",
          description: "Database dapat menerima data pegawai dengan dan tanpa NIP.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "❌ Test Insert Gagal",
          description: result1.error || result2.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "❌ Test Gagal",
        description: error.message,
      });
    }
  };

  const testTableStructure = async () => {
    try {
      const result = await testEmployeesTableStructure();
      if (result.success) {
        toast({
          title: "✅ Struktur Tabel",
          description: `Kolom: ${result.columns.join(', ')}. NIP column: ${result.hasNipColumn ? 'Ada' : 'Tidak ada'}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "❌ Test Struktur Gagal",
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "❌ Test Gagal",
        description: error.message,
      });
    }
  };

  const fixNipNonAsn = async () => {
    try {
      const result = await fixNonAsnNip();
      if (result.success) {
        toast({
          title: '✅ Update NIP Non ASN/Outsourcing',
          description: `Berhasil update ${result.updated ? result.updated.length : 0} data.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: '❌ Update Gagal',
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '❌ Update Gagal',
        description: error.message,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isUploading) { onOpenChange(open); if(!open) {setExcelFile(null); setFileName('');}} }}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>Import Data Pegawai dari Excel</DialogTitle>
          <DialogDescription>
            Pastikan file Excel Anda sesuai dengan template yang disediakan. Nama Pegawai wajib diisi. Untuk PNS/PPPK, NIP wajib diisi. Untuk Non ASN/Outsourcing tanpa NIP, sistem akan generate NIPK otomatis.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Button onClick={downloadTemplate} variant="outline" className="w-full border-slate-600 text-slate-300 hover:text-white">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Download Template
          </Button>
          
          {/* Debug buttons */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button onClick={testConnection} variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:text-white">
                <TestTube className="w-4 h-4 mr-2" />
                Test Koneksi
              </Button>
              <Button onClick={testTableStructure} variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:text-white">
                <TestTube className="w-4 h-4 mr-2" />
                Test Struktur
              </Button>
            </div>
            <Button onClick={testInsert} variant="outline" className="w-full border-slate-600 text-slate-300 hover:text-white">
              <TestTube className="w-4 h-4 mr-2" />
              Test Insert (dengan & tanpa NIP)
            </Button>
          </div>
          
          <div className="flex items-center justify-center w-full">
            <Label htmlFor="excel-file-employee-import" className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-700/50 hover:bg-slate-700">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-4 text-slate-400" />
                <p className="mb-2 text-sm text-slate-400"><span className="font-semibold">Klik untuk unggah</span> atau seret file</p>
                <p className="text-xs text-slate-500">XLSX, XLS (MAKS. 5MB)</p>
              </div>
              <Input 
                id="excel-file-employee-import" 
                name="excel-file-employee-import"
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleFileChange}
                className="hidden"
              />
            </Label>
          </div>
          {fileName && <p className="text-sm text-center text-slate-300">File terpilih: {fileName}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => {if (!isUploading) {onOpenChange(false); setExcelFile(null); setFileName('');}}} className="text-slate-300 hover:text-white" disabled={isUploading}>Batal</Button>
          <Button 
            onClick={handleImportExcel} 
            disabled={isUploading || !excelFile}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {isUploading ? "Mengunggah..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportEmployeeDialog;
