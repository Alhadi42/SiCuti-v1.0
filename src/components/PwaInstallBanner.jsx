import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

/**
 * Banner instalasi PWA yang muncul di bagian bawah halaman
 * Terpisah dari sidebar prompt - ini untuk user yang belum install
 */
const PwaInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Jangan tampilkan jika sudah di mode standalone (installed)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    // Jangan tampilkan jika sudah ditolak
    const dismissed = localStorage.getItem("pwa_banner_dismissed");
    if (dismissed) return;

    // Cek iOS
    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    // iOS - tampilkan setelah delay
    if (ios) {
      setTimeout(() => setShow(true), 3000);
      return;
    }

    // Android/Desktop - tunggu event beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Tampilkan setelah beberapa detik
      setTimeout(() => setShow(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setShow(false));

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      toast({
        title: "✅ Instalasi Berhasil",
        description: "SiCuti berhasil diinstall. Cari ikonnya di layar utama!",
      });
    }
    setShow(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("pwa_banner_dismissed", "true");
  };

  if (!show) return null;

  // iOS Instructions
  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm">
        <div className="bg-slate-800 border border-blue-500/40 rounded-xl shadow-2xl p-4 flex gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white text-sm font-semibold mb-1">Install SiCuti</p>
            <p className="text-slate-400 text-xs leading-relaxed">
              Ketuk ikon <span className="text-blue-400 font-medium">Share ↑</span> lalu pilih{" "}
              <span className="text-blue-400 font-medium">"Add to Home Screen"</span>
            </p>
          </div>
          <button onClick={handleDismiss} className="text-slate-500 hover:text-slate-300 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Chrome/Desktop/Android
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm">
      <div className="bg-slate-800 border border-blue-500/40 rounded-xl shadow-2xl p-4 flex gap-3 items-center">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Monitor className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-white text-sm font-semibold">Install SiCuti</p>
          <p className="text-slate-400 text-xs">Akses lebih cepat dari layar utama</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            onClick={handleInstall}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 h-8"
          >
            <Download className="w-3 h-3 mr-1" />
            Install
          </Button>
          <button onClick={handleDismiss} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PwaInstallBanner;
