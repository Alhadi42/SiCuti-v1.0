/**
 * Excel utilities using ExcelJS (secure alternative to XLSX)
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Helper to sanitize strings for Excel
const sanitizeString = (str) => {
  if (str === null || str === undefined) return '';
  // Remove control characters (ASCII 0-31) except newlines/tabs
  // Also limit length to avoid Excel cell limits (32767 chars)
  return String(str)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .substring(0, 32000);
};

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

    // Validate request data before creating workbook
    if (!dataObj) {
      throw new Error('Data export tidak valid');
    }

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Data Pengajuan Cuti
    if (dataObj.leaveRequests && dataObj.leaveRequests.length > 0) {
      console.log('📝 Creating Sheet 1: Data Pengajuan Cuti');
      // Force NORMAL view with A1 selected to prevent scrolling/hiding issues
      const worksheet1 = workbook.addWorksheet('Data Pengajuan Cuti', {
        views: [{ state: 'normal', activeCell: 'A1', showGridLines: true }]
      });

      const leaveRequestHeaders = [
        'ID Pegawai', 'Nama Pegawai', 'NIP', 'Departemen', 'Jenis Cuti',
        'Tanggal Mulai', 'Tanggal Selesai', 'Jumlah Hari', 'Jatah Cuti Tahun',
        'Status', 'Alasan', 'Tanggal Pengajuan', 'Catatan'
      ];

      // Header
      const headerRow = worksheet1.addRow(leaveRequestHeaders);
      headerRow.font = { bold: true };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

      // Data
      dataObj.leaveRequests.forEach((request) => {
        const rowData = [
          sanitizeString(request.employee_id),
          sanitizeString(request.employee_name),
          sanitizeString(request.employee_nip),
          sanitizeString(request.employee_department),
          sanitizeString(request.leave_type),
          sanitizeString(request.start_date),
          sanitizeString(request.end_date),
          sanitizeString(request.days || request.days_requested),
          sanitizeString(request.leave_quota_year || request.start_date?.split('-')[0]),
          sanitizeString(request.status),
          sanitizeString(request.reason),
          sanitizeString(request.created_at),
          sanitizeString(request.notes)
        ];

        const row = worksheet1.addRow(rowData);
        // Force black text
        row.eachCell((cell) => {
          cell.font = { color: { argb: 'FF000000' } };
          cell.alignment = { vertical: 'top', wrapText: true };
        });
      });

      // Auto-fit with safe defaults and explicit unhide
      worksheet1.columns.forEach(column => {
        column.hidden = false; // Force visible
        let maxLength = 10;
        if (column.values) {
          column.values.forEach(v => {
            const len = v ? String(v).length : 0;
            if (len > maxLength) maxLength = len;
          });
        }
        // Cap max width to prevent giant columns
        column.width = Math.min(maxLength + 2, 50);
      });
    } else {
      console.log('⚠️ No leave requests data to export');
    }

    // Sheet 2: Data Penangguhan
    if (dataObj.deferrals && dataObj.deferrals.length > 0) {
      console.log('📝 Creating Sheet 2: Data Penangguhan');
      const worksheet2 = workbook.addWorksheet('Data Penangguhan', {
        views: [{ state: 'normal', activeCell: 'A1', showGridLines: true }]
      });

      const deferralHeaders = [
        'ID Pegawai', 'Nama Pegawai', 'NIP', 'Departemen', 'Tahun Penangguhan',
        'Jumlah Hari Ditangguhkan', 'Link Google Drive', 'Catatan', 'Tanggal Dibuat', 'Status'
      ];

      const headerRow2 = worksheet2.addRow(deferralHeaders);
      headerRow2.font = { bold: true };
      headerRow2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

      dataObj.deferrals.forEach((deferral) => {
        const rowData = [
          sanitizeString(deferral.employee_id),
          sanitizeString(deferral.employee_name),
          sanitizeString(deferral.employee_nip),
          sanitizeString(deferral.employee_department),
          sanitizeString(deferral.year),
          sanitizeString(deferral.days_deferred),
          sanitizeString(deferral.google_drive_link),
          sanitizeString(deferral.notes),
          sanitizeString(deferral.created_at),
          sanitizeString(deferral.status || 'Aktif')
        ];

        const row = worksheet2.addRow(rowData);
        row.eachCell((cell) => {
          cell.font = { color: { argb: 'FF000000' } };
          cell.alignment = { vertical: 'top', wrapText: true };
        });
      });

      // Auto-fit with safe defaults and explicit unhide
      worksheet2.columns.forEach(column => {
        column.hidden = false;
        let maxLength = 10;
        if (column.values) {
          column.values.forEach(v => {
            const len = v ? String(v).length : 0;
            if (len > maxLength) maxLength = len;
          });
        }
        column.width = Math.min(maxLength + 2, 50);
      });
    } else {
      console.log('⚠️ No deferrals data to export');
    }

    // Sheet 3: Saldo Cuti
    if (dataObj.leaveBalances && dataObj.leaveBalances.length > 0) {
      console.log('📝 Creating Sheet 3: Saldo Cuti');
      const worksheet3 = workbook.addWorksheet('Saldo Cuti', {
        views: [{ state: 'normal', activeCell: 'A1', showGridLines: true }]
      });

      const leaveBalanceHeaders = [
        'NIP', 'Nama Pegawai', 'Departemen', 'Tahun',
        'Jatah Cuti Tahun Berjalan', 'Digunakan Tahun Berjalan', 'Sisa Tahun Berjalan',
        'Jatah Penangguhan', 'Digunakan Penangguhan', 'Sisa Penangguhan'
      ];

      const headerRow3 = worksheet3.addRow(leaveBalanceHeaders);
      headerRow3.font = { bold: true };
      headerRow3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

      dataObj.leaveBalances.forEach((balance) => {
        const rowData = [
          sanitizeString(balance.employee_nip),
          sanitizeString(balance.employee_name),
          sanitizeString(balance.employee_department),
          sanitizeString(balance.year),
          sanitizeString(balance.jatah_tahun_berjalan || 0),
          sanitizeString(balance.digunakan_tahun_berjalan || 0),
          sanitizeString(balance.sisa_tahun_berjalan || 0),
          sanitizeString(balance.jatah_penangguhan || 0),
          sanitizeString(balance.digunakan_penangguhan || 0),
          sanitizeString(balance.sisa_penangguhan || 0)
        ];

        const row = worksheet3.addRow(rowData);
        row.eachCell((cell) => {
          cell.font = { color: { argb: 'FF000000' } };
          cell.alignment = { vertical: 'top', wrapText: true };
        });
      });

      // Auto-fit with safe defaults and explicit unhide
      worksheet3.columns.forEach(column => {
        column.hidden = false;
        let maxLength = 10;
        if (column.values) {
          column.values.forEach(v => {
            const len = v ? String(v).length : 0;
            if (len > maxLength) maxLength = len;
          });
        }
        column.width = Math.min(maxLength + 2, 50);
      });
    } else {
      console.log('⚠️ No leave balances data to export');
    }

    // Set workbook properties
    workbook.creator = 'SiCuti';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.lastModifiedBy = 'SiCuti Export';

    // Ensure all worksheets have at least 2 rows
    workbook.worksheets.forEach((ws) => {
      if (ws.rowCount === 1) {
        ws.addRow(Array(ws.columnCount).fill(''));
      }
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);

    return true;
  } catch (error) {
    console.error('❌ Error exporting to Excel with multiple sheets:', error);
    throw new Error('Gagal mengekspor data ke Excel');
  }
};

/**
 * Export employee data to Excel file
 */
export const exportEmployeesToExcel = async (employees, filename) => {
  try {
    console.log('📊 Starting Employee Excel export with count:', employees?.length);

    if (!employees || employees.length === 0) {
      throw new Error('Tidak ada data pegawai untuk diexport');
    }

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Data Pegawai
    console.log('📝 Creating Sheet: Data Pegawai');
    // Force NORMAL view with A1 selected to prevent scrolling/hiding issues
    const worksheet = workbook.addWorksheet('Data Pegawai', {
      views: [{ state: 'normal', activeCell: 'A1', showGridLines: true }]
    });

    const headers = [
      'ID', 'NIP', 'Nama Lengkap', 'Unit Kerja',
      'Jabatan', 'Jenis Jabatan', 'Status ASN', 'Golongan'
    ];

    // Header
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    // Data
    employees.forEach((emp) => {
      const rowData = [
        sanitizeString(emp.id),
        sanitizeString(emp.nip),
        sanitizeString(emp.name),
        sanitizeString(emp.department),
        sanitizeString(emp.position_name),
        sanitizeString(emp.position_type),
        sanitizeString(emp.asn_status),
        sanitizeString(emp.rank_group)
      ];

      const row = worksheet.addRow(rowData);
      // Force black text
      row.eachCell((cell) => {
        cell.font = { color: { argb: 'FF000000' } };
        cell.alignment = { vertical: 'top', wrapText: true };
      });
    });

    // Auto-fit with safe defaults and explicit unhide
    worksheet.columns.forEach(column => {
      column.hidden = false;
      let maxLength = 10;
      if (column.values) {
        column.values.forEach(v => {
          const len = v ? String(v).length : 0;
          if (len > maxLength) maxLength = len;
        });
      }
      // Cap max width
      column.width = Math.min(maxLength + 2, 50);
    });

    // Set workbook properties
    workbook.creator = 'SiCuti';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.lastModifiedBy = 'SiCuti Export';

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);

    return true;
  } catch (error) {
    console.error('❌ Error exporting employees to Excel:', error);
    throw new Error('Gagal mengekspor data pegawai');
  }
};

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
  exportEmployeesToExcel,
  validateExcelFile
}; 