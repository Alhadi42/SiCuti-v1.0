import React, { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const PwaInstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const handler = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener("beforeinstallprompt", handler);

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
            console.log("User accepted the install prompt");
            toast({
                title: "Instalasi Berhasil",
                description: "Aplikasi sedang diinstall di perangkat Anda.",
            });
        } else {
            console.log("User dismissed the install prompt");
        }

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setIsInstallable(false);
    };

    if (!isInstallable) return null;

    return (
        <div className="px-3 pb-2 pt-1">
            <Button
                onClick={handleInstallClick}
                variant="outline"
                className="w-full justify-start text-blue-400 border-blue-500/30 hover:bg-blue-900/20 hover:text-blue-300"
            >
                <Download className="mr-2 h-4 w-4" />
                Install Aplikasi
            </Button>
        </div>
    );
};

export default PwaInstallPrompt;
