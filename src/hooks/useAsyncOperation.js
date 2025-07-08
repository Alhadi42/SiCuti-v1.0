import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { formatErrorForToast } from "@/utils/errorUtils";
import { withErrorHandling } from "@/utils/errorHandler";

/**
 * Custom hook for handling async operations with loading states and error handling
 */
export const useAsyncOperation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const execute = useCallback(
    async (asyncFn, options = {}) => {
      const {
        showSuccessToast = false,
        successMessage = "Operasi berhasil",
        showErrorToast = true,
        onSuccess,
        onError,
        loadingDelay = 0,
      } = options;

      setIsLoading(true);
      setError(null);

      // Add a small delay to prevent flashing loading states
      if (loadingDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, loadingDelay));
      }

      try {
        const result = await withErrorHandling(asyncFn)();

        if (showSuccessToast) {
          toast({
            title: "Berhasil",
            description: successMessage,
            variant: "default",
          });
        }

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (error) {
        setError(error);

        if (showErrorToast) {
          const errorInfo = formatErrorForToast(error, "Operasi Gagal");
          toast(errorInfo);
        }

        if (onError) {
          onError(error);
        }

        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [toast],
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    execute,
    reset,
  };
};
