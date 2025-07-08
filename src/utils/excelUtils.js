/**
 * Excel utilities using ExcelJS (secure alternative to XLSX)
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Create and download Excel template
 */
export const createExcelTemplate = async (data, filename, sheetName = 'Sheet1') => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Add headers if data has items
    if (data && data.length > 0) {
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);
      
      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    }

    // Add data rows
    data.forEach(row => {
      worksheet.addRow(Object.values(row));
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = Math.max(
        column.header ? column.header.length : 10,
        ...column.values.map(v => String(v).length)
      );
    });

    // Set workbook properties for better compatibility
    workbook.creator = 'SiCuti';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.lastModifiedBy = 'SiCuti Export';

    // Ensure all worksheets have at least 2 rows (header + 1 data/dummy row)
    workbook.worksheets.forEach((ws) => {
      if (ws.rowCount === 1) {
        // Add dummy row with empty strings (jumlah kolom sesuai header)
        ws.addRow(Array(ws.columnCount).fill(''));
      }
    });

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, filename);

    return true;
  } catch (error) {
    console.error('Error creating Excel template:', error);
    throw new Error('Gagal membuat template Excel');
  }
};

/**
 * Read Excel file and return data
 */
export const readExcelFile = async (file) => {
  try {
    // Validate file
    if (!file) {
      throw new Error('File tidak ditemukan');
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File terlalu besar. Maksimal 10MB.');
    }

    // Check file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      throw new Error('Format file tidak didukung. Gunakan file Excel (.xlsx atau .xls).');
    }

    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error('Tidak ada worksheet yang ditemukan');
    }

    const data = [];
    const headers = [];

    // Get headers from first row
    const firstRow = worksheet.getRow(1);
    firstRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value ? String(cell.value).trim() : `Column${colNumber}`;
    });

    // Get data from remaining rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const rowData = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          rowData[header] = cell.value;
        }
      });

      // Only add row if it has data
      if (Object.keys(rowData).length > 0) {
        data.push(rowData);
      }
    });

    return data;
  } catch (error) {
    console.error('Error reading Excel file:', error);
    throw error;
  }
};

/**
 * Export data to Excel file
 */
export const exportToExcel = async (data, filename, sheetName = 'Data') => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Add headers
    if (data && data.length > 0) {
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);
      
      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    }

    // Add data rows
    data.forEach(row => {
      worksheet.addRow(Object.values(row));
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = Math.max(
        column.header ? column.header.length : 10,
        ...column.values.map(v => String(v).length)
      );
    });

    // Set workbook properties for better compatibility
    workbook.creator = 'SiCuti';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.lastModifiedBy = 'SiCuti Export';

    // Ensure all worksheets have at least 2 rows (header + 1 data/dummy row)
    workbook.worksheets.forEach((ws) => {
      if (ws.rowCount === 1) {
        // Add dummy row with empty strings (jumlah kolom sesuai header)
        ws.addRow(Array(ws.columnCount).fill(''));
      }
    });

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, filename);

    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Gagal mengekspor data ke Excel');
  }
};

/**
 * Export data to Excel file with multiple sheets
 */
export const exportToExcelWithMultipleSheets = async (dataObj, filename) => {
  try {
    console.log('📊 Starting Excel export with data:', dataObj);
    console.log('📋 Leave requests count:', dataObj.leaveRequests?.length || 0);
    console.log('📋 Deferrals count:', dataObj.deferrals?.length || 0);
    console.log('📋 Leave balances count:', dataObj.leaveBalances?.length || 0);
    
    const workbook = new ExcelJS.Workbook();
    
    // Debug: Check if dataObj has the expected structure
    console.log('🔍 Debug - dataObj structure:', {
      hasLeaveRequests: !!dataObj.leaveRequests,
      leaveRequestsLength: dataObj.leaveRequests?.length,
      hasDeferrals: !!dataObj.deferrals,
      deferralsLength: dataObj.deferrals?.length,
      hasLeaveBalances: !!dataObj.leaveBalances,
      leaveBalancesLength: dataObj.leaveBalances?.length,
      leaveRequestsType: typeof dataObj.leaveRequests,
      deferralsType: typeof dataObj.deferrals,
      leaveBalancesType: typeof dataObj.leaveBalances
    });
    
    if (dataObj.leaveRequests && dataObj.leaveRequests.length > 0) {
      console.log('🔍 Debug - First leave request:', dataObj.leaveRequests[0]);
    }
    
    if (dataObj.deferrals && dataObj.deferrals.length > 0) {
      console.log('🔍 Debug - First deferral:', dataObj.deferrals[0]);
    }

    if (dataObj.leaveBalances && dataObj.leaveBalances.length > 0) {
      console.log('🔍 Debug - First leave balance:', dataObj.leaveBalances[0]);
    }
    
    // Sheet 1: Data Pengajuan Cuti
    if (dataObj.leaveRequests && dataObj.leaveRequests.length > 0) {
      console.log('📝 Creating Sheet 1: Data Pengajuan Cuti');
      const worksheet1 = workbook.addWorksheet('Data Pengajuan Cuti');
      
      // Add headers for leave requests with new "Jatah Cuti Tahun" column
      const leaveRequestHeaders = [
        'ID Pegawai',
        'Nama Pegawai',
        'NIP',
        'Departemen',
        'Jenis Cuti',
        'Tanggal Mulai',
        'Tanggal Selesai',
        'Jumlah Hari',
        'Jatah Cuti Tahun',
        'Status',
        'Alasan',
        'Tanggal Pengajuan',
        'Catatan'
      ];
      
      // Add header row
      const headerRow = worksheet1.addRow(leaveRequestHeaders);
      console.log('✅ Header row added to worksheet 1, row number:', headerRow.number);
      
      // Style header row
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      // Add data rows
      dataObj.leaveRequests.forEach((request, index) => {
        console.log(`📝 Processing leave request ${index + 1}:`, request);
        
        const rowData = [
          String(request.employee_id || ''),
          String(request.employee_name || ''),
          String(request.employee_nip || ''),
          String(request.employee_department || ''),
          String(request.leave_type || ''),
          String(request.start_date || ''),
          String(request.end_date || ''),
          String(request.days || request.days_requested || ''),
          String(request.leave_quota_year || request.start_date?.split('-')[0] || ''),
          String(request.status || ''),
          String(request.reason || ''),
          String(request.created_at || ''),
          String(request.notes || '')
        ];
        
        console.log(`📝 Row data for leave request ${index + 1}:`, rowData);
        
        // Add row to worksheet
        const addedRow = worksheet1.addRow(rowData);
        console.log(`✅ Row ${index + 1} added to worksheet 1, row number:`, addedRow.number);
        
        // Verify the row was added correctly
        const actualRow = worksheet1.getRow(addedRow.number);
        console.log(`🔍 Verification - Row ${addedRow.number} has ${actualRow.cellCount} cells`);
      });
      
      console.log(`📊 Total rows in worksheet 1: ${worksheet1.rowCount}`);
      console.log('✅ Sheet 1 completed');
      
      // Auto-fit columns for worksheet 1
      worksheet1.columns.forEach(column => {
        column.width = Math.max(
          column.header ? column.header.length : 10,
          ...column.values.map(v => String(v).length)
        );
      });
    } else {
      console.log('⚠️ No leave requests data to export');
    }
    
    // Sheet 2: Data Penangguhan
    if (dataObj.deferrals && dataObj.deferrals.length > 0) {
      console.log('📝 Creating Sheet 2: Data Penangguhan');
      const worksheet2 = workbook.addWorksheet('Data Penangguhan');
      
      // Add headers for deferrals
      const deferralHeaders = [
        'ID Pegawai',
        'Nama Pegawai',
        'NIP',
        'Departemen',
        'Tahun Penangguhan',
        'Jumlah Hari Ditangguhkan',
        'Link Google Drive',
        'Catatan',
        'Tanggal Dibuat',
        'Status'
      ];
      
      // Add header row
      const headerRow2 = worksheet2.addRow(deferralHeaders);
      console.log('✅ Header row added to worksheet 2, row number:', headerRow2.number);
      
      // Style header row
      headerRow2.font = { bold: true };
      headerRow2.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      // Add data rows
      dataObj.deferrals.forEach((deferral, index) => {
        console.log(`📝 Processing deferral ${index + 1}:`, deferral);
        
        const rowData = [
          String(deferral.employee_id || ''),
          String(deferral.employee_name || ''),
          String(deferral.employee_nip || ''),
          String(deferral.employee_department || ''),
          String(deferral.year || ''),
          String(deferral.days_deferred || ''),
          String(deferral.google_drive_link || ''),
          String(deferral.notes || ''),
          String(deferral.created_at || ''),
          String(deferral.status || 'Aktif')
        ];
        
        console.log(`📝 Row data for deferral ${index + 1}:`, rowData);
        
        // Add row to worksheet
        const addedRow = worksheet2.addRow(rowData);
        console.log(`✅ Row ${index + 1} added to worksheet 2, row number:`, addedRow.number);
        
        // Verify the row was added correctly
        const actualRow = worksheet2.getRow(addedRow.number);
        console.log(`🔍 Verification - Row ${addedRow.number} has ${actualRow.cellCount} cells`);
      });
      
      console.log(`📊 Total rows in worksheet 2: ${worksheet2.rowCount}`);
      console.log('✅ Sheet 2 completed');
      
      // Auto-fit columns for worksheet 2
      worksheet2.columns.forEach(column => {
        column.width = Math.max(
          column.header ? column.header.length : 10,
          ...column.values.map(v => String(v).length)
        );
      });
    } else {
      console.log('⚠️ No deferrals data to export');
    }

    // Sheet 3: Saldo Cuti (only for employees with leave requests)
    if (dataObj.leaveBalances && dataObj.leaveBalances.length > 0) {
      console.log('📝 Creating Sheet 3: Saldo Cuti');
      const worksheet3 = workbook.addWorksheet('Saldo Cuti');
      
      // Add headers untuk saldo cuti tahunan breakdown
      const leaveBalanceHeaders = [
        'NIP',
        'Nama Pegawai',
        'Departemen',
        'Tahun',
        'Jatah Cuti Tahun Berjalan',
        'Digunakan Tahun Berjalan',
        'Sisa Tahun Berjalan',
        'Jatah Penangguhan',
        'Digunakan Penangguhan',
        'Sisa Penangguhan'
      ];
      
      // Add header row
      const headerRow3 = worksheet3.addRow(leaveBalanceHeaders);
      console.log('✅ Header row added to worksheet 3, row number:', headerRow3.number);
      
      // Style header row
      headerRow3.font = { bold: true };
      headerRow3.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      // Add data rows
      dataObj.leaveBalances.forEach((balance, index) => {
        console.log(`📝 Processing leave balance ${index + 1}:`, balance);
        
        const rowData = [
          String(balance.employee_nip || ''),
          String(balance.employee_name || ''),
          String(balance.employee_department || ''),
          String(balance.year || ''),
          String(balance.jatah_tahun_berjalan || 0),
          String(balance.digunakan_tahun_berjalan || 0),
          String(balance.sisa_tahun_berjalan || 0),
          String(balance.jatah_penangguhan || 0),
          String(balance.digunakan_penangguhan || 0),
          String(balance.sisa_penangguhan || 0)
        ];
        
        console.log(`📝 Row data for leave balance ${index + 1}:`, rowData);
        
        // Add row to worksheet
        const addedRow = worksheet3.addRow(rowData);
        console.log(`✅ Row ${index + 1} added to worksheet 3, row number:`, addedRow.number);
        
        // Verify the row was added correctly
        const actualRow = worksheet3.getRow(addedRow.number);
        console.log(`🔍 Verification - Row ${addedRow.number} has ${actualRow.cellCount} cells`);
      });
      
      console.log(`📊 Total rows in worksheet 3: ${worksheet3.rowCount}`);
      console.log('✅ Sheet 3 completed');
      
      // Auto-fit columns for worksheet 3
      worksheet3.columns.forEach(column => {
        column.width = Math.max(
          column.header ? column.header.length : 10,
          ...column.values.map(v => String(v).length)
        );
      });
    } else {
      console.log('⚠️ No leave balances data to export');
    }
    
    console.log('📦 Generating Excel file...');
    console.log('📊 Workbook worksheets count:', workbook.worksheets.length);
    workbook.worksheets.forEach((ws, index) => {
      console.log(`📊 Worksheet ${index + 1}: "${ws.name}" with ${ws.rowCount} rows`);
    });
    
    // Set workbook properties for better compatibility
    workbook.creator = 'SiCuti';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.lastModifiedBy = 'SiCuti Export';

    // Ensure all worksheets have at least 2 rows (header + 1 data/dummy row)
    workbook.worksheets.forEach((ws) => {
      if (ws.rowCount === 1) {
        // Add dummy row with empty strings (jumlah kolom sesuai header)
        ws.addRow(Array(ws.columnCount).fill(''));
      }
    });

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    console.log('📦 Buffer generated, size:', buffer.byteLength);
    
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    console.log('📦 Blob created, size:', blob.size);
    
    saveAs(blob, filename);

    console.log('✅ Excel file generated and downloaded:', filename);
    return true;
  } catch (error) {
    console.error('❌ Error exporting to Excel with multiple sheets:', error);
    throw new Error('Gagal mengekspor data ke Excel');
  }
};

/**
 * Validate Excel file before processing
 */
export const validateExcelFile = (file) => {
  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File terlalu besar. Maksimal 10MB.');
  }
  
  // Check file type
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
    throw new Error('Format file tidak didukung. Gunakan file Excel (.xlsx atau .xls).');
  }
  
  return true;
};

export default {
  createExcelTemplate,
  readExcelFile,
  exportToExcel,
  exportToExcelWithMultipleSheets,
  validateExcelFile
}; 