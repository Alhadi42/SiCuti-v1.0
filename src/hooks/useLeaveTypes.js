
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useLeaveTypes = () => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchLeaveTypes = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.from('leave_types').select('id, name, default_days, can_defer');
      if (error) {
        console.error("Error fetching leave types:", error);
        toast({ variant: "destructive", title: "Gagal memuat jenis cuti", description: error.message });
        setLeaveTypes([]);
      } else {
        setLeaveTypes(data || []);
      }
      setIsLoading(false);
    };
    fetchLeaveTypes();
  }, [toast]);

  return { leaveTypes, isLoadingLeaveTypes: isLoading };
};
