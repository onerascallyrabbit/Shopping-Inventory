
import React, { useState, useEffect, useRef } from 'react';
import { StorageLocation } from '../types';
import { syncStorageLocation, deleteStorageLocation } from '../services/supabaseService';

interface StorageLocationsModalProps {
  user: any;
  storageLocations: StorageLocation[];
  onClose: () => void;
  onStorageLocationsChange: (locs: StorageLocation[]) => void;
  onReorderStorageLocations?: (locs: StorageLocation[]) => void;
}

const StorageLocationsModal: React.FC<StorageLocationsModalProps> = ({
  user, storageLocations, onClose, onStorageLocationsChange, onReorderStorageLocations
}) => {
  const [newStorageName, setNewStorageName] = useState('');
  const [localLocations, setLocalLocations] = useState<StorageLocation[]>(storageLocations);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!saveTimeoutRef.current) {
      setLocalLocations(storageLocations);
    }
  }, [storageLocations]);

  const moveLocation = (index: number, direction: 'up' | 'down') => {
    const newLocs = [...localLocations];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newLocs.length) return;
    
    [newLocs[index], newLocs[targetIndex]] = [newLocs[targetIndex], newLocs[index]];
    setLocalLocations(newLocs);

    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      if (onReorderStorageLocations) {
        onReorderStorageLocations(newLocs);
      }
      saveTimeoutRef.current = null;
    }, 800);
  };

  const handleAddLocation = () => {
    if (!newStorageName) return;
    const newLoc = { id: crypto.randomUUID(), name: newStorageName, sortOrder: localLocations.length };
    const updated = [...localLocations, newLoc];
    setLocalLocations(updated);
    onStorageLocationsChange(updated);
    if (user) syncStorageLocation(newLoc);
    setNewStorageName('');
  };

  const handleDeleteLocation = async (loc: StorageLocation) => {
    if (!confirm(`Delete ${loc.name}? This will affect items stored here.`)) return;
    const updated = localLocations.filter(l => l.id !== loc.id);
    setLocalLocations(updated);
    onStorageLocationsChange(updated);
    if (user) await deleteStorageLocation(loc.id);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-[40px] sm:rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
        <div className="p-6 border-b flex justify-between items-center bg-white shrink-0">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase">Aisle Order</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Organize your home storage</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex space-x-2">
            <input 
              className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold placeholder:text-slate-300" 
              placeholder="e.g. Garage Chest Freezer..." 
              value={newStorageName} 
              onChange={e => setNewStorageName(e.target.value)} 
            />
            <button 
              onClick={handleAddLocation}
              className="px-6 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-transform"
            >
              Add
            </button>
          </div>

          <div className="space-y-3">
            {localLocations.length > 0 ? localLocations.map((loc, idx) => (
              <div key={loc.id} className="flex items-center justify-between bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm transition-all">
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col space-y-1 bg-slate-50 rounded-xl p-1 shrink-0">
                    <button 
                      onClick={() => moveLocation(idx, 'up')}
                      disabled={idx === 0}
                      className={`p-2 rounded-lg transition-all ${idx === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600 hover:bg-white active:scale-90'}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 15l7-7 7 7"/></svg>
                    </button>
                    <button 
                      onClick={() => moveLocation(idx, 'down')}
                      disabled={idx === localLocations.length - 1}
                      className={`p-2 rounded-lg transition-all ${idx === localLocations.length - 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600 hover:bg-white active:scale-90'}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{loc.name}</span>
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Priority {idx + 1}</span>
                  </div>
                </div>
                <button onClick={() => handleDeleteLocation(loc)} className="text-slate-200 hover:text-red-500 p-3 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            )) : (
              <div className="py-12 text-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No custom locations added</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 bg-slate-50 border-t shrink-0">
          <button 
            onClick={onClose}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-[20px] uppercase text-xs tracking-[0.2em] shadow-lg active:scale-95 transition-all"
          >
            Done Organizing
          </button>
        </div>
      </div>
    </div>
  );
};

export default StorageLocationsModal;
