import React, { useState, useEffect } from 'react';

interface KrogerStorePickerProps {
  zip: string;
  onSelect: (id: string, name: string) => void;
}

const KrogerStorePicker: React.FC<KrogerStorePickerProps> = ({ zip, onSelect }) => {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const findStores = async () => {
    if (!zip || zip.length < 5) {
      setError('Please enter a valid zip code in preferences first.');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/kroger/locations?zip=${zip}`);
      const data = await response.json();
      if (data.data) {
        setStores(data.data);
      } else {
        setStores([]);
        setError('No stores found in this area.');
      }
    } catch (err) {
      setError('Failed to fetch stores. Check Kroger API credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button 
        onClick={findStores}
        disabled={loading}
        className="w-full bg-slate-900 text-white font-black py-3 rounded-2xl uppercase text-[10px] tracking-widest flex items-center justify-center space-x-2 active:scale-95 transition-transform disabled:opacity-50"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span>Find Nearby Kroger Stores</span>
          </>
        )}
      </button>

      {error && <p className="text-[10px] text-red-500 font-bold text-center">{error}</p>}

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
        {stores.map(store => (
          <button 
            key={store.locationId}
            onClick={() => onSelect(store.locationId, store.name)}
            className="w-full text-left bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 rounded-2xl p-3 transition-all group"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-black text-slate-700 group-hover:text-indigo-700">{store.name}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase">{store.address.addressLine1}, {store.address.city}</p>
              </div>
              <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default KrogerStorePicker;
