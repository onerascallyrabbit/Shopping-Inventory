
import React, { useState, useEffect } from 'react';
import { Share, Download, X, Smartphone, ArrowUpCircle } from 'lucide-react';

const InstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    
    setIsStandalone(isStandaloneMode);

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Listen for the custom event from index.tsx
    const handleInstallable = () => {
      if (!isStandaloneMode) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('app-installable', handleInstallable);

    // If it's iOS and not standalone, show prompt after a short delay
    if (isIOSDevice && !isStandaloneMode) {
      const timer = setTimeout(() => {
        // Only show if they haven't dismissed it this session
        if (!sessionStorage.getItem('install_prompt_dismissed')) {
          setShowPrompt(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener('app-installable', handleInstallable);
  }, [isStandalone]);

  const handleInstallClick = async () => {
    const deferredPrompt = (window as any).deferredPrompt;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      (window as any).deferredPrompt = null;
      setShowPrompt(false);
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    sessionStorage.setItem('install_prompt_dismissed', 'true');
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 p-5 flex flex-col space-y-4 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-50 rounded-full opacity-50 blur-2xl" />
        
        <button 
          onClick={dismissPrompt}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
        >
          <X size={18} strokeWidth={3} />
        </button>

        <div className="flex items-start space-x-4">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200 shrink-0">
            <Smartphone className="text-white w-6 h-6" strokeWidth={2.5} />
          </div>
          <div className="flex-1 pr-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Install Aisle Be Back</h3>
            <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">
              Add to your home screen for a faster, full-screen experience and offline access.
            </p>
          </div>
        </div>

        {isIOS ? (
          <div className="bg-slate-50 rounded-2xl p-4 flex flex-col space-y-3">
            <div className="flex items-center space-x-3">
              <div className="bg-white p-1.5 rounded-lg shadow-sm border border-slate-100">
                <Share className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                1. Tap the Share button
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-white p-1.5 rounded-lg shadow-sm border border-slate-100">
                <ArrowUpCircle className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                2. Select "Add to Home Screen"
              </p>
            </div>
          </div>
        ) : (
          <button 
            onClick={handleInstallClick}
            className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center space-x-2"
          >
            <Download size={14} strokeWidth={3} />
            <span>Install Now</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default InstallPrompt;
