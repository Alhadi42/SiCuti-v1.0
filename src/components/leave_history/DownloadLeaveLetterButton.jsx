import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

const DownloadLeaveLetterButton = ({ employee, leaveData }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  const generateDocument = async () => {
    if (!employee || !leaveData) return;

    try {
      // Format tanggal cuti
      const leaveDates = leaveData.leave_dates
        .map(date => formatDate(date).split(' ').join(' '))
        .join(' dan ');

      // Create a new PDF document
      const doc = new jsPDF();
      
      // Set document properties
      doc.setProperties({
        title: `Surat Izin Cuti - ${employee.name}`,
        subject: 'Surat Izin Cuti',
        author: 'Sistem Informasi Cuti',
        keywords: 'cuti, surat, izin',
        creator: 'SICUTI',
      });

      // Set font styles
      const titleStyle = { fontSize: 16, fontStyle: 'bold', align: 'center' };
      const headerStyle = { fontSize: 14, fontStyle: 'bold' };
      const normalStyle = { fontSize: 12 };
      const smallStyle = { fontSize: 10 };

      // Add content to PDF
      let yPos = 20;
      
      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('KEMENTERIAN KETENAGAKERJAAN RI', 105, yPos, { align: 'center' });
      yPos += 10;
      doc.text('DIREKTORAT JENDERAL', 105, yPos, { align: 'center' });
      yPos += 20;

      // Title
      doc.setFontSize(14);
      doc.text('SURAT IZIN CUTI', 105, yPos, { align: 'center' });
      yPos += 10;
      doc.setFontSize(12);
      doc.text('Nomor: .../.../...', 105, yPos, { align: 'center' });
      yPos += 30;

      // Content
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text('Yang bertanda tangan di bawah ini:', 20, yPos);
      yPos += 20;
      
      // Employee data
      doc.text(`Nama: ${employee.name}`, 30, yPos);
      yPos += 10;
      doc.text(`NIP: ${employee.nip || '-'}`, 30, yPos);
      yPos += 10;
      doc.text(`Jabatan: ${employee.position || '-'}`, 30, yPos);
      yPos += 10;
      doc.text(`Unit Kerja: ${employee.unit_kerja || '-'}`, 30, yPos);
      yPos += 20;
      
      // Leave information
      doc.text('Dengan ini mengajukan izin cuti pada:', 20, yPos);
      yPos += 10;
      doc.text(`Tanggal: ${leaveDates}`, 30, yPos);
      yPos += 10;
      doc.text(`Jenis Cuti: ${leaveData.leave_type || '-'}`, 30, yPos);
      yPos += 10;
      doc.text(`Keperluan: ${leaveData.purpose || '-'}`, 30, yPos);
      yPos += 20;
      
      // Approval section
      doc.text('Demikian surat ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.', 20, yPos);
      yPos += 30;
      
      // Signature
      doc.text('Hormat saya,', 20, yPos);
      yPos += 40;
      doc.text(`(${employee.name})`, 20, yPos);

      // Save the PDF
      const pdfBlob = doc.output('blob');
      saveAs(pdfBlob, `Surat Izin Cuti - ${employee.name}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Terjadi kesalahan saat membuat dokumen PDF. Silakan coba lagi.');
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generateDocument}
      disabled={!employee || !leaveData}
      className="bg-blue-600 hover:bg-blue-700 text-white"
    >
      <Download className="mr-2 h-4 w-4" />
      Unduh PDF
    </Button>
  );
};

export default DownloadLeaveLetterButton;
