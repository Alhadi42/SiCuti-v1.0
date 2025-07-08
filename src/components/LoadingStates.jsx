import React from "react";
import { Loader2, Database, Upload, Download, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Skeleton components for better loading UX
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex space-x-4">
        {Array.from({ length: columns }).map((_, j) => (
          <div
            key={j}
            className="h-4 bg-slate-700/50 rounded animate-pulse flex-1"
          />
        ))}
      </div>
    ))}
  </div>
);

export const CardSkeleton = ({ count = 3 }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="h-4 bg-slate-700/50 rounded animate-pulse w-3/4" />
            <div className="h-8 bg-slate-700/50 rounded animate-pulse w-1/2" />
            <div className="h-3 bg-slate-700/50 rounded animate-pulse w-full" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export const FormSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="h-4 bg-slate-700/50 rounded animate-pulse w-1/4" />
        <div className="h-10 bg-slate-700/50 rounded animate-pulse w-full" />
      </div>
    ))}
  </div>
);

// Specialized loading indicators
export const DatabaseLoader = ({ message = "Memuat data..." }) => (
  <div className="flex flex-col items-center justify-center p-8 text-slate-400">
    <div className="relative">
      <Database className="w-8 h-8 mb-3" />
      <Loader2 className="w-4 h-4 absolute -top-1 -right-1 animate-spin" />
    </div>
    <p className="text-sm">{message}</p>
  </div>
);

export const UploadLoader = ({ progress = 0, message = "Mengunggah..." }) => (
  <div className="flex flex-col items-center justify-center p-8 text-slate-400">
    <Upload className="w-8 h-8 mb-3 animate-pulse" />
    <p className="text-sm mb-2">{message}</p>
    {progress > 0 && (
      <div className="w-full max-w-xs bg-slate-700 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    )}
  </div>
);

export const DownloadLoader = ({ message = "Mengunduh..." }) => (
  <div className="flex flex-col items-center justify-center p-8 text-slate-400">
    <Download className="w-8 h-8 mb-3 animate-bounce" />
    <p className="text-sm">{message}</p>
  </div>
);

export const SearchLoader = ({ message = "Mencari..." }) => (
  <div className="flex flex-col items-center justify-center p-8 text-slate-400">
    <Search className="w-8 h-8 mb-3 animate-spin" />
    <p className="text-sm">{message}</p>
  </div>
);

// General purpose loading spinner
export const LoadingSpinner = ({
  size = "default",
  message = null,
  className = "",
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    default: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Loader2 className={`animate-spin text-blue-500 ${sizeClasses[size]}`} />
      {message && <p className="text-slate-400 text-sm mt-2">{message}</p>}
    </div>
  );
};

// Full page loading overlay
export const LoadingOverlay = ({ message = "Memuat..." }) => (
  <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-700">
      <LoadingSpinner size="xl" message={message} />
    </div>
  </div>
);

// Page loading component
export const PageLoader = ({ message = "Memuat halaman..." }) => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="xl" message={message} />
  </div>
);

export default {
  TableSkeleton,
  CardSkeleton,
  FormSkeleton,
  DatabaseLoader,
  UploadLoader,
  DownloadLoader,
  SearchLoader,
  LoadingSpinner,
  LoadingOverlay,
  PageLoader,
};
