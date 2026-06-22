import React, { useState, useEffect } from "react";
import { FaDownload, FaMobileAlt, FaCheckCircle } from "react-icons/fa";
import "../styles/components/InstallButton.css";

const InstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installState, setInstallState] = useState("idle"); // 'idle' | 'prompting' | 'success' | 'cancelled'
  const [message, setMessage] = useState("");

  useEffect(() => {
    // 1. Check if already running in standalone/installed mode
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the default mini-infobar on mobile Chrome
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
    };

    // 3. Listen for appinstalled event (fired when installation is completed)
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstallState("success");
      setMessage("Shrinath Cycle Store has been installed successfully!");
      setTimeout(() => setMessage(""), 5000);
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
    setMessage("");

    // Show the native browser install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    try {
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        console.log("User accepted the install prompt");
        setInstallState("success");
        setIsInstalled(true);
        setDeferredPrompt(null);
      } else {
        console.log("User dismissed the install prompt");
        setInstallState("cancelled");
        setMessage("Installation cancelled.");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error) {
      console.error("Installation prompt failed:", error);
      setInstallState("idle");
    }
  };

  // If already installed or installation prompt is not available, render nothing
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
          {installState === "prompting"
            ? "Installing App..."
            : "Install Shrinath App"}
        </span>
        <span className="pwa-badge">
          <FaMobileAlt /> Mobile App
        </span>
      </button>
      {message && (
        <div className={`pwa-install-toast ${installState}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default InstallButton;
