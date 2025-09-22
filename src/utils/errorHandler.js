/**
 * Centralized error handling utilities
 */

export class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const handleSupabaseError = (err) => {
  console.error('Supabase error:', err);
  
  // Common Supabase error codes
  const errorMappings = {
    '23505': 'Data sudah ada. Silakan gunakan data yang berbeda.',
    '23503': 'Data terkait tidak ditemukan.',
    '42501': 'Tidak memiliki izin untuk operasi ini.',
    'PGRST116': 'Data tidak ditemukan.',
    'PGRST301': 'Terlalu banyak baris yang dikembalikan.',
  };

  const message = errorMappings[err.code] || err.message || 'Terjadi kesalahan pada database';
  
  return new AppError(message, err.code, 400);
};

export const handleNetworkError = (err) => {
  console.error('Network error:', err);
  
  if (!navigator.onLine) {
    return new AppError('Tidak ada koneksi internet. Periksa koneksi Anda.', 'NETWORK_OFFLINE', 0);
  }
  
  return new AppError('Gagal terhubung ke server. Silakan coba lagi.', 'NETWORK_ERROR', 0);
};

export const withErrorHandling = (asyncFn) => {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (err) {
      if (err.name === 'AppError') {
        throw err;
      }
      
      // Handle different types of errors
      if (err.code && err.message) {
        throw handleSupabaseError(err);
      }
      
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw handleNetworkError(err);
      }
      
      // Generic error
      throw new AppError(
        err.message || 'Terjadi kesalahan yang tidak diketahui',
        'UNKNOWN_ERROR',
        500
      );
    }
  };
};

export const formatErrorMessage = (err) => {
  if (err instanceof AppError) {
    return {
      title: getErrorTitle(err.code),
      description: err.message,
      variant: getErrorVariant(err.statusCode)
    };
  }
  
  return {
    title: 'Terjadi Kesalahan',
    description: err.message || 'Kesalahan tidak diketahui',
    variant: 'destructive'
  };
};

const getErrorTitle = (code) => {
  const titles = {
    'NETWORK_OFFLINE': 'Tidak Ada Koneksi',
    'NETWORK_ERROR': 'Kesalahan Jaringan',
    'VALIDATION_ERROR': 'Data Tidak Valid',
    'PERMISSION_ERROR': 'Akses Ditolak',
    'NOT_FOUND': 'Data Tidak Ditemukan',
  };
  
  return titles[code] || 'Terjadi Kesalahan';
};

const getErrorVariant = (statusCode) => {
  if (statusCode >= 400 && statusCode < 500) {
    return 'destructive';
  }
  if (statusCode >= 500) {
    return 'destructive';
  }
  return 'default';
};