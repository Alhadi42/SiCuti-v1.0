import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

const ConnectionStatus = ({ onRetry }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [supabaseStatus, setSupabaseStatus] = useState('checking');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const checkSupabaseConnection = async () => {
      try {
        // Simple ping to check if Supabase is reachable
        const response = await fetch(import.meta.env.VITE_SUPABASE_URL + '/rest/v1/', {
          method: 'HEAD',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        });
        
        setSupabaseStatus(response.ok ? 'connected' : 'error');
      } catch (error) {
        setSupabaseStatus('error');
      }
    };

    if (isOnline) {
      checkSupabaseConnection();
    } else {
      setSupabaseStatus('offline');
    }
  }, [isOnline]);

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        text: 'Offline',
        color: 'text-red-400',
        bgColor: 'bg-red-900/20',
        borderColor: 'border-red-700/50',
      };
    }

    switch (supabaseStatus) {
      case 'connected':
        return {
          icon: Wifi,
          text: 'Terhubung',
          color: 'text-green-400',
          bgColor: 'bg-green-900/20',
          borderColor: 'border-green-700/50',
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Error Koneksi',
          color: 'text-red-400',
          bgColor: 'bg-red-900/20',
          borderColor: 'border-red-700/50',
        };
      default:
        return {
          icon: Wifi,
          text: 'Mengecek...',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-900/20',
          borderColor: 'border-yellow-700/50',
        };
    }
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

  if (isOnline && supabaseStatus === 'connected') {
    return null; // Don't show anything when everything is working
  }

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${status.bgColor} ${status.borderColor}`}>
      <StatusIcon className={`w-4 h-4 ${status.color}`} />
      <span className={`text-sm ${status.color}`}>{status.text}</span>
      {(supabaseStatus === 'error' || !isOnline) && onRetry && (
        <button
          onClick={onRetry}
          className={`text-xs px-2 py-1 rounded ${status.color} hover:opacity-80`}
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default ConnectionStatus;
