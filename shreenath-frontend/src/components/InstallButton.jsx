import React, { useState, useEffect } from "react";
import { FaDownload, FaMobileAlt, FaCheckCircle } from "react-icons/fa";
import "../styles/components/InstallButton.css";

const InstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installState, setInstallState] = useState("idle"); // 'idle' | 'prompting' | 'success'

  useEffect(() => {
    // 1. Check if already running in standalone (installed) mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      navigator.standalone;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Capture the native install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // 3. Mark as installed when the app is installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstallState("success");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setInstallState("prompting");
    deferredPrompt.prompt();

    try {
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
        setInstallState("success");
      } else {
        setInstallState("idle");
      }
    } catch (error) {
      console.error("Installation prompt failed:", error);
      setInstallState("idle");
    }
  };

  // Hide button if already installed OR if native prompt is not available
  if (isInstalled || !deferredPrompt) {
    return null;
  }

  return (
    <div className="pwa-install-wrapper">
      <button
        className={`pwa-install-btn ${installState}`}
        onClick={handleInstallClick}
        disabled={installState === "prompting"}
        aria-label="Install Shrinath Cycle Store Web App"
      >
        <span className="pwa-btn-icon-wrapper">
          {installState === "prompting" ? (
            <span className="pwa-spinner"></span>
          ) : installState === "success" ? (
            <FaCheckCircle className="pwa-icon success" />
          ) : (
            <FaDownload className="pwa-icon" />
          )}
        </span>
        <span className="pwa-btn-text">
          {installState === "prompting" ? "Installing..." : "Install App"}
        </span>
        <span className="pwa-badge">
          <FaMobileAlt /> Mobile App
        </span>
      </button>
    </div>
  );
};

export default InstallButton;
