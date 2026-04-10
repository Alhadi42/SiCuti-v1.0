import React, { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const PwaInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSBannerDismissed, setIsIOSBannerDismissed] = useState(false);
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Cek apakah sudah diinstall (standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (isStandalone) {
      setIsAlreadyInstalled(true);
      return;
    }

    // Cek iOS
    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    // Cek jika banner iOS sudah ditolak sebelumnya
    const dismissed = sessionStorage.getItem("pwa_ios_dismissed");
    if (dismissed) setIsIOSBannerDismissed(true);

    // Tangkap event beforeinstallprompt (Chrome/Android/desktop)
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Cek jika sudah terinstall lewat appinstalled event
    const installedHandler = () => {
      setIsAlreadyInstalled(true);
      setIsInstallable(false);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      toast({
        title: "✅ Instalasi Berhasil",
        description: "SiCuti berhasil diinstall di perangkat Anda.",
      });
      setIsAlreadyInstalled(true);
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handleIOSDismiss = () => {
    sessionStorage.setItem("pwa_ios_dismissed", "true");
    setIsIOSBannerDismissed(true);
  };

  // Jika sudah terinstall, jangan tampilkan apapun
  if (isAlreadyInstalled) return null;

  // iOS: tampilkan petunjuk share
  if (isIOS && !isIOSBannerDismissed) {
    return (
      <div className="px-3 pb-2 pt-1">
        <div className="rounded-lg bg-blue-900/30 border border-blue-500/30 p-3 text-xs text-blue-200 relative">
          <button
            onClick={handleIOSDismiss}
            className="absolute top-2 right-2 text-blue-400 hover:text-blue-200"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-3 h-3 text-blue-400 flex-shrink-0" />
            <span className="font-semibold text-blue-300">Install di iPhone/iPad</span>
          </div>
          <p className="text-blue-300/80 leading-relaxed">
            Ketuk tombol <span className="font-bold">Share ↑</span> lalu pilih{" "}
            <span className="font-bold">"Add to Home Screen"</span>
          </p>
        </div>
      </div>
    );
  }

  // Chrome/Android/Desktop: tampilkan tombol install
  if (isInstallable) {
    return (
      <div className="px-3 pb-2 pt-1">
        <Button
          onClick={handleInstallClick}
          variant="outline"
          size="sm"
          className="w-full justify-start text-blue-400 border-blue-500/30 hover:bg-blue-900/20 hover:text-blue-300 text-xs"
        >
          <Download className="mr-2 h-3 w-3" />
          Install Aplikasi
        </Button>
      </div>
    );
  }

  return null;
};

export default PwaInstallPrompt;
