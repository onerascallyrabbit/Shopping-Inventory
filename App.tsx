
import React, { useState } from 'react';
import { AppTab } from './types';
import Dashboard from './components/Dashboard';
import ItemBrowser from './components/ItemBrowser';
import ShoppingList from './components/ShoppingList';
import ShopPlan from './components/ShopPlan';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import AddItemModal from './components/AddItemModal';
import SettingsView from './components/SettingsView';
import InventoryView from './components/InventoryView';
import DiagnosticBanner from './components/DiagnosticBanner';
import { useAppData } from './hooks/useAppData';
import { signInWithGoogle, supabase } from './services/supabaseService';

const App: React.FC = () => {
  const { 
    user, loading, products, shoppingList, setShoppingList, inventory, 
    storageLocations, setStorageLocations, subLocations, setSubLocations,
    stores, setStores, vehicles, setVehicles, profile, 
    updateProfile, updateInventoryQty, addPriceRecord, addToList, 
    addToInventory, importBulkInventory, refresh 
  } = useAppData();

  const [isGuest, setIsGuest] = useState(() => localStorage.getItem('pricewise_is_guest') === 'true');
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [lastUsedStore, setLastUsedStore] = useState<string>('');

  if (!user && !isGuest) {
    return (
      <div className="flex flex-col h-screen bg-white items-center justify-center p-8 text-center overflow-y-auto">
        <div className="bg-indigo-600 p-6 rounded-[40px] shadow-2xl mb-8">
          <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Aisle Be Back</h1>
        <p className="text-slate-400 font-medium mb-12 max-w-[280px] leading-relaxed text-sm">Sign in to sync your prices and pantry stock across devices.</p>
        <div className="w-full max-w-xs space-y-4">
          <button disabled={!supabase} onClick={signInWithGoogle} className="w-full bg-slate-900 text-white font-black py-5 rounded-[24px] uppercase tracking-widest text-xs hover:bg-black transition-all">Connect Cloud Identity</button>
          <button onClick={() => { setIsGuest(true); localStorage.setItem('pricewise_is_guest', 'true'); }} className="w-full text-slate-400 font-black py-4 uppercase tracking-[0.2em] text-[10px] hover:text-indigo-600 transition-colors">Continue as Guest</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
      <DiagnosticBanner user={user} isGuest={isGuest} onExitGuest={() => { setIsGuest(false); localStorage.removeItem('pricewise_is_guest'); }} />
      <Header user={user} onSettingsClick={() => setActiveTab('settings')} />
      
      <main className="flex-1 overflow-y-auto pb-32 px-4 pt-6">
        {loading && <div className="text-center py-20 text-slate-300 font-black animate-pulse uppercase tracking-[0.2em] text-xs italic">Synchronizing Cloud Data...</div>}
        
        {activeTab === 'dashboard' && <Dashboard products={products} onAddToList={addToList} />}
        {activeTab === 'items' && <ItemBrowser products={products} categoryOrder={profile.categoryOrder} onAddToList={addToList} />}
        {activeTab === 'inventory' && (
          <InventoryView 
            inventory={inventory} locations={storageLocations} subLocations={subLocations} 
            products={products} categoryOrder={profile.categoryOrder} 
            onUpdateQty={updateInventoryQty} onAddToInventory={addToInventory} 
            onBulkAdd={importBulkInventory} 
          />
        )}
        {activeTab === 'list' && (
          <ShoppingList 
            items={shoppingList} products={products} 
            onToggle={(id) => setShoppingList(prev => prev.map(i => i.id === id ? {...i, isCompleted: !i.isCompleted} : i))} 
            onRemove={(id) => setShoppingList(prev => prev.filter(i => i.id !== id))} 
            onAdd={addToList} 
          />
        )}
        {activeTab === 'shop' && (
          <ShopPlan 
            items={shoppingList} products={products} stores={stores} 
            vehicles={vehicles} activeVehicleId={profile.activeVehicleId || ''} 
            gasPrice={profile.gasPrice} 
            onToggle={(id) => setShoppingList(prev => prev.map(i => i.id === id ? {...i, isCompleted: !i.isCompleted} : i))} 
            onOverrideStore={(id, s) => setShoppingList(prev => prev.map(i => i.id === id ? {...i, manualStore: s} : i))} 
          />
        )}
        {activeTab === 'settings' && (
          <SettingsView 
            user={user} profile={profile} onProfileChange={updateProfile}
            stores={stores} onStoresChange={setStores}
            vehicles={vehicles} onVehiclesChange={setVehicles}
            storageLocations={storageLocations} onStorageLocationsChange={setStorageLocations}
            subLocations={subLocations} onSubLocationsChange={setSubLocations}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} onAddClick={() => setIsAddModalOpen(true)} />
      
      {isAddModalOpen && (
        <AddItemModal 
          onClose={() => setIsAddModalOpen(false)} 
          onSubmit={(cat, item, variety, rec, brand, bar) => { addPriceRecord(cat, item, variety, rec, brand, bar); setLastUsedStore(rec.store); setIsAddModalOpen(false); }} 
          onSaveToList={addToList} 
          products={products} location={profile.locationLabel} savedStores={stores} lastUsedStore={lastUsedStore} 
        />
      )}
    </div>
  );
};

export default App;
