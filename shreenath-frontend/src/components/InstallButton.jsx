import React, { useState, useEffect } from "react";
import { FaDownload, FaMobileAlt, FaCheckCircle, FaTimes, FaShareSquare, FaEllipsisV } from "react-icons/fa";
import "../styles/components/InstallButton.css";

const InstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installState, setInstallState] = useState("idle"); // 'idle' | 'prompting' | 'success' | 'cancelled'
  const [showInstructions, setShowInstructions] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({ isIOS: false, isMobile: false, isChrome: false });

  useEffect(() => {
    // 1. Check if running in standalone (installed) mode
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Detect browser and OS info for instructions
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isMobile = /mobile|android|iphone|ipad/.test(ua);
    const isChrome = /chrome|crios/.test(ua) && !/edge|opr/.test(ua);
    setDeviceInfo({ isIOS, isMobile, isChrome });

    // 3. Listen for native beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // 4. Listen for native appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstallState("success");
      setShowInstructions(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setInstallState("prompting");
      deferredPrompt.prompt();
      try {
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setIsInstalled(true);
          setDeferredPrompt(null);
          setInstallState("success");
        } else {
          setInstallState("cancelled");
          setTimeout(() => setInstallState("idle"), 3000);
        }
      } catch (error) {
        console.error("Installation prompted failed:", error);
        setInstallState("idle");
      }
    } else {
      // Toggle instructions popup
      setShowInstructions(true);
    }
  };

  // If already installed, hide the button
  if (isInstalled) {
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

      {/* ── Instruction Popup Modal ── */}
      {showInstructions && (
        <div className="pwa-instruction-overlay" onClick={() => setShowInstructions(false)}>
          <div className="pwa-instruction-card" onClick={(e) => e.stopPropagation()}>
            <button className="pwa-close-btn" onClick={() => setShowInstructions(false)}>
              <FaTimes />
            </button>
            <h3>How to Install Shrinath App</h3>
            <p className="pwa-intro">
              Follow these simple steps to install the app on your home screen for an app-like experience.
            </p>

            <div className="pwa-steps">
              {deviceInfo.isIOS ? (
                // iOS Safari Steps
                <>
                  <div className="pwa-step">
                    <span className="step-num">1</span>
                    <p>
                      Tap the <strong>Share</strong> button <FaShareSquare className="step-inline-icon share" /> in Safari's bottom navigation bar.
                    </p>
                  </div>
                  <div className="pwa-step">
                    <span className="step-num">2</span>
                    <p>
                      Scroll down the share sheet menu and select <strong>"Add to Home Screen"</strong>.
                    </p>
                  </div>
                  <div className="pwa-step">
                    <span className="step-num">3</span>
                    <p>
                      Tap <strong>Add</strong> in the top right corner. The app icon will appear on your device home screen!
                    </p>
                  </div>
                </>
              ) : deviceInfo.isMobile ? (
                // Android Chrome / Other mobile browsers
                <>
                  <div className="pwa-step">
                    <span className="step-num">1</span>
                    <p>
                      Tap the menu button <FaEllipsisV className="step-inline-icon" /> (three dots) in your browser's top-right corner.
                    </p>
                  </div>
                  <div className="pwa-step">
                    <span className="step-num">2</span>
                    <p>
                      Select <strong>"Install App"</strong> or <strong>"Add to Home Screen"</strong> from the menu options.
                    </p>
                  </div>
                  <div className="pwa-step">
                    <span className="step-num">3</span>
                    <p>
                      Confirm the installation in the prompt. The app will be added to your home screen!
                    </p>
                  </div>
                </>
              ) : (
                // Desktop Browser Steps (Chrome, Edge, Brave)
                <>
                  <div className="pwa-step">
                    <span className="step-num">1</span>
                    <p>
                      Look at your browser's address bar at the top of the screen.
                    </p>
                  </div>
                  <div className="pwa-step">
                    <span className="step-num">2</span>
                    <p>
                      Click the **Install Icon** (looks like a monitor with a download arrow <FaDownload className="step-inline-icon" />) next to the URL.
                    </p>
                  </div>
                  <div className="pwa-step">
                    <span className="step-num">3</span>
                    <p>
                      Alternatively, click the browser menu (three dots) and select <strong>"Install Shrinath Cycle Store..."</strong>.
                    </p>
                  </div>
                </>
              )}
            </div>
            <button className="pwa-ok-btn" onClick={() => setShowInstructions(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstallButton;
