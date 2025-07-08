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
import { Loader2, ExternalLink } from 'lucide-react';

const AddDeferredLeaveDialog = ({ isOpen, onOpenChange, employee, year, onSuccess, leaveTypes, deferralLog }) => {
  const { toast } = useToast();
  const [deferredDays, setDeferredDays] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [annualLeaveTypeId, setAnnualLeaveTypeId] = useState(null);
  const previousYear = year - 1;

  useEffect(() => {
    if (leaveTypes && leaveTypes.length > 0) {
      const annualType = leaveTypes.find(lt => lt.name === 'Cuti Tahunan');
      if (annualType) {
        setAnnualLeaveTypeId(annualType.id);
      } else {
        console.error("Jenis cuti 'Cuti Tahunan' tidak ditemukan di database.");
        toast({
          variant: "destructive",
          title: "Konfigurasi Error",
          description: "Jenis cuti 'Cuti Tahunan' tidak terdefinisi. Hubungi administrator.",
        });
      }
    }
    if (deferralLog && deferralLog.days_deferred) {
      setDeferredDays(deferralLog.days_deferred.toString());
    } else {
      setDeferredDays('');
    }
  }, [leaveTypes, toast, deferralLog]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employee || deferredDays === '' || isNaN(Number(deferredDays))) {
      toast({
        variant: "destructive",
        title: "Input tidak valid",
        description: "Pastikan jumlah hari terisi dengan benar.",
      });
      return;
    }
    if (!annualLeaveTypeId) {
        toast({
            variant: "destructive",
            title: "Konfigurasi Error",
            description: "ID Jenis Cuti Tahunan tidak ditemukan. Tidak dapat melanjutkan.",
        });
        return;
    }
    
    setIsLoading(true);
    const days = parseInt(deferredDays, 10);

    try {
      if (deferralLog && deferralLog.id) {
        const { error: updateError } = await supabase
          .from('leave_deferrals')
          .update({ days_deferred: days })
          .eq('id', deferralLog.id);
        if (updateError) throw updateError;
        const { error: updateBalanceError } = await supabase
          .from('leave_balances')
          .update({ deferred_days: days })
          .eq('employee_id', employee.id)
          .eq('leave_type_id', annualLeaveTypeId)
          .eq('year', year);
        if (updateBalanceError) throw updateBalanceError;
        toast({
          title: "✅ Berhasil",
          description: `Berhasil mengubah penangguhan menjadi ${days} hari untuk ${employee.employeeName}.`,
        });
      } else {
        const { data: balance, error: balanceError } = await supabase
          .from('leave_balances')
          .select('id, deferred_days, total_days')
          .eq('employee_id', employee.id)
          .eq('leave_type_id', annualLeaveTypeId)
          .eq('year', year)
          .single();

        if (balanceError && balanceError.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw balanceError;
        }
        let newTotalDays;
        if (balance) {
          newTotalDays = balance.total_days; // Keep existing total_days if balance record exists
          const { error: updateError } = await supabase
            .from('leave_balances')
            .update({ deferred_days: (balance.deferred_days || 0) + days })
            .eq('id', balance.id);
          if (updateError) throw updateError;
        } else {
          // Fetch default days for Cuti Tahunan if creating new balance
          const annualType = leaveTypes.find(lt => lt.id === annualLeaveTypeId);
          newTotalDays = annualType ? annualType.default_days : 12; // Fallback default

          const { error: insertError } = await supabase
            .from('leave_balances')
            .insert({
              employee_id: employee.id,
              leave_type_id: annualLeaveTypeId,
              year: year,
              total_days: newTotalDays, 
              used_days: 0,
              deferred_days: days,
            });
          if (insertError) throw insertError;
        }
        const { error: deferralLogError } = await supabase
          .from('leave_deferrals')
          .insert({
            employee_id: employee.id,
            year: previousYear,
            days_deferred: days
          });
        if (deferralLogError) {
           console.warn("Gagal mencatat log penangguhan, tapi saldo berhasil diperbarui.", deferralLogError);
           toast({
              variant: "warning",
              title: "Peringatan",
              description: "Saldo berhasil diperbarui, namun gagal mencatat log penangguhan.",
            });
        }
        toast({
          title: "✅ Berhasil",
          description: `Berhasil menambahkan ${days} hari cuti ditangguhkan untuk ${employee.employeeName}.`,
        });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding/editing deferred leave:", error);
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan Cuti",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
      setDeferredDays('');
    }
  };

  if (!isOpen || !employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>{deferralLog ? 'Edit' : 'Tambah'} Cuti Ditangguhkan</DialogTitle>
          <DialogDescription>
            {deferralLog
              ? `Ubah jumlah sisa cuti tahunan ${employee.employeeName} dari tahun ${previousYear}.`
              : `Input sisa cuti tahunan ${employee.employeeName} dari tahun ${previousYear} yang akan ditambahkan ke tahun ${year}.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="employee-name">Nama Pegawai</Label>
              <Input id="employee-name" name="employee-name" value={employee.employeeName} disabled className="bg-slate-700" />
            </div>
            <div>
              <Label htmlFor="deferred-days">Jumlah Hari Ditangguhkan dari {previousYear}</Label>
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
            {deferralLog && deferralLog.google_drive_link && (
              <div>
                <Label>Dokumen Penangguhan</Label>
                <div className="flex items-center space-x-2 p-2 bg-slate-700/30 rounded border border-slate-600/50">
                  <ExternalLink className="h-4 w-4 text-blue-400" />
                  <a
                    href={deferralLog.google_drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline text-sm"
                  >
                    Lihat Dokumen Penangguhan
                  </a>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-slate-600 text-slate-300">
              Batal
            </Button>
            <Button type="submit" disabled={isLoading || !annualLeaveTypeId} className="bg-gradient-to-r from-blue-500 to-purple-600">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddDeferredLeaveDialog;
