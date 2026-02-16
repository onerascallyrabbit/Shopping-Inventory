
import React, { useState, useEffect, useMemo } from 'react';
import { StoreLocation, Vehicle, StorageLocation, SubLocation, Profile, Family, CustomCategory, CustomSubCategory } from '../types';
import { createFamily, joinFamily } from '../services/supabaseService';
import StorageLocationsModal from './StorageLocationsModal';
import TaxonomyModal from './TaxonomyModal';

interface SettingsViewProps {
  user?: any;
  profile: Profile;
  activeFamily: Family | null;
  onProfileChange: (updates: Partial<Profile>) => void;
  stores: StoreLocation[];
  onStoresChange: (stores: StoreLocation[]) => void;
  vehicles: Vehicle[];
  onVehiclesChange: (v: Vehicle[]) => void;
  storageLocations: StorageLocation[];
  onStorageLocationsChange: (locs: StorageLocation[]) => void;
  subLocations: SubLocation[];
  onSubLocationsChange: (subs: SubLocation[]) => void;
  customCategories: CustomCategory[];
  customSubCategories: CustomSubCategory[];
  onAddCategory: (name: string) => void;
  onRemoveCategory: (id: string) => void;
  onAddSubCategory: (catName: string, name: string) => void;
  onRemoveSubCategory: (id: string) => void;
  onReorderStorageLocations?: (locs: StorageLocation[]) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  user, profile, activeFamily, onProfileChange,
  storageLocations, onStorageLocationsChange,
  customCategories, customSubCategories,
  onAddCategory, onRemoveCategory, onAddSubCategory, onRemoveSubCategory,
  onReorderStorageLocations
}) => {
  const [familyInviteCode, setFamilyInviteCode] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [copied, setCopied] = useState(false);

  // Modal Visibility States
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [isTaxonomyModalOpen, setIsTaxonomyModalOpen] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const checkInstallable = () => {
      // @ts-ignore
      setIsInstallable(!!window.deferredPrompt);
    };
    window.addEventListener('app-installable', checkInstallable);
    checkInstallable();
    return () => window.removeEventListener('app-installable', checkInstallable);
  }, []);

  const handleInstall = async () => {
    // @ts-ignore
    const promptEvent = window.deferredPrompt;
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    // @ts-ignore
    window.deferredPrompt = null;
    setIsInstallable(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite && !profile.familyId) setFamilyInviteCode(invite.toUpperCase());
  }, [profile.familyId]);

  const handleCreateFamily = async () => {
    if (!familyName) return;
    try { await createFamily(familyName); alert('Family Hub created!'); window.location.reload(); }
    catch (e: any) { alert(`Creation failed: ${e.message}`); }
  };

  const handleJoinFamily = async () => {
    if (!familyInviteCode) return;
    try { await joinFamily(familyInviteCode); alert('Successfully joined family!'); window.location.reload(); }
    catch (e: any) { alert(`Join failed: ${e.message}`); }
  };

  const shareInviteLink = () => {
    if (!activeFamily) return;
    const url = `${window.location.origin}${window.location.pathname}?invite=${activeFamily.invite_code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      <h2 className="text-2xl font-black text-slate-900 px-1">Settings</h2>

      {/* Installation Prompt */}
      {isInstallable && (
        <section className="bg-indigo-600 p-6 rounded-[32px] shadow-lg shadow-indigo-100 text-white animate-bounce-subtle">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 p-3 rounded-2xl">
              <img src="cart_logo.png" className="w-8 h-8 object-contain" alt="App Logo" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black uppercase tracking-tight">Add to Home Screen</h3>
              <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest mt-0.5">Install for quick access & offline use</p>
            </div>
            <button 
              onClick={handleInstall}
              className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-sm active:scale-95 transition-transform"
            >
              Install
            </button>
          </div>
        </section>
      )}

      {/* Hub Status */}
      {user && (
        <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Account & Hub</h3>
          {activeFamily ? (
            <div className="p-5 bg-emerald-50 rounded-[28px] border border-emerald-100 flex flex-col items-center text-center space-y-4">
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Active Hub</p>
                <p className="text-lg font-black text-slate-800">{activeFamily.name}</p>
              </div>
              <button onClick={shareInviteLink} className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>
                {copied ? 'Copied Link' : 'Invite Family'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold" placeholder="Invite Code..." value={familyInviteCode} onChange={e => setFamilyInviteCode(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleJoinFamily} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black uppercase text-[10px]">Join Family</button>
                <button onClick={() => { const name = prompt('Family Name?'); if(name) { setFamilyName(name); handleCreateFamily(); } }} className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-black uppercase text-[10px]">Create Hub</button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Main Settings Menu */}
      <section className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-1">
          {/* Storage Row */}
          <button 
            onClick={() => setIsStorageModalOpen(true)}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors rounded-[28px]"
          >
            <div className="flex items-center space-x-4 text-left">
              <div className="bg-amber-100 p-2.5 rounded-2xl text-amber-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Stock Locations</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{storageLocations.length} Custom Aisles Defined</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
          </button>

          <div className="h-px bg-slate-50 mx-6"></div>

          {/* Taxonomy Row */}
          <button 
            onClick={() => setIsTaxonomyModalOpen(true)}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors rounded-[28px]"
          >
            <div className="flex items-center space-x-4 text-left">
              <div className="bg-indigo-100 p-2.5 rounded-2xl text-indigo-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Household Taxonomy</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{customCategories.length + customSubCategories.length} Custom Tags</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </section>

      {/* Fuel Settings */}
      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Location & Fuel</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Zip Code</label>
            <input type="text" className="w-full bg-slate-50 border rounded-2xl px-4 py-3 text-sm font-bold" value={profile.zip} onChange={(e) => onProfileChange({ zip: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Gas Price</label>
            <input type="number" step="0.01" className="w-full bg-slate-50 border rounded-2xl px-4 py-3 text-sm font-bold" value={profile.gasPrice} onChange={(e) => onProfileChange({ gasPrice: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
      </section>

      {/* Management Modals */}
      {isStorageModalOpen && (
        <StorageLocationsModal 
          user={user}
          storageLocations={storageLocations}
          onClose={() => setIsStorageModalOpen(false)}
          onStorageLocationsChange={onStorageLocationsChange}
          onReorderStorageLocations={onReorderStorageLocations}
        />
      )}

      {isTaxonomyModalOpen && (
        <TaxonomyModal 
          activeFamily={activeFamily}
          customCategories={customCategories}
          customSubCategories={customSubCategories}
          onClose={() => setIsTaxonomyModalOpen(false)}
          onAddCategory={onAddCategory}
          onRemoveCategory={onRemoveCategory}
          onAddSubCategory={onAddSubCategory}
          onRemoveSubCategory={onRemoveSubCategory}
        />
      )}
    </div>
  );
};

export default SettingsView;
