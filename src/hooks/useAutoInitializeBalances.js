import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { initializeYearBalances } from '@/utils/leaveBalanceCalculator';

/**
 * Hook to automatically initialize leave balances for the current year
 * Runs once when component mounts and detects a new year
 * Should be used in a top-level component like App or Layout
 */
export const useAutoInitializeBalances = () => {
  const initializedRef = useRef(false);
  const lastCheckedYearRef = useRef(null);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    
    // Only run if we haven't initialized for this year yet
    if (lastCheckedYearRef.current === currentYear && initializedRef.current) {
      return;
    }

    // Check if initialization is needed
    const checkAndInitialize = async () => {
      try {
        // Check if any balances exist for current year
        const { data: existingBalances, error } = await supabase
          .from('leave_balances')
          .select('id')
          .eq('year', currentYear)
          .limit(1);

        if (error) {
          console.error('Error checking balances:', error);
          return;
        }

        // If no balances exist for current year, initialize them
        if (!existingBalances || existingBalances.length === 0) {
          console.log(`🔄 Initializing leave balances for year ${currentYear}...`);
          
          const result = await initializeYearBalances(supabase, currentYear);
          
          console.log(`✅ Initialized ${result.initialized} balance records for year ${currentYear}`);
          
          if (result.errors.length > 0) {
            console.warn(`⚠️ ${result.errors.length} errors during initialization:`, result.errors);
          }
          
          initializedRef.current = true;
        } else {
          console.log(`✅ Leave balances for year ${currentYear} already exist`);
        }
        
        lastCheckedYearRef.current = currentYear;
      } catch (error) {
        console.error('Error initializing balances:', error);
      }
    };

    // Run initialization check
    checkAndInitialize();

    // Also set up a check for year change (runs daily)
    const checkInterval = setInterval(() => {
      const now = new Date().getFullYear();
      if (now !== lastCheckedYearRef.current) {
        initializedRef.current = false;
        checkAndInitialize();
      }
    }, 24 * 60 * 60 * 1000); // Check once per day

    return () => {
      clearInterval(checkInterval);
    };
  }, []);

  return {
    isInitialized: initializedRef.current,
    lastCheckedYear: lastCheckedYearRef.current,
  };
};

export default useAutoInitializeBalances;
