
import React, { useState, useEffect } from 'react';
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
import MealPlanner from './components/MealPlanner';
import DiagnosticBanner from './components/DiagnosticBanner';
import { useAppData } from './hooks/useAppData';
import { signInWithGoogle, supabase } from './services/supabaseService';

const App: React.FC = () => {
  const { 
    user, loading, products, shoppingList, inventory, mealIdeas,
    storageLocations, setStorageLocations, subLocations, setSubLocations,
    stores, setStores, vehicles, setVehicles, profile, activeFamily,
    customCategories, customSubCategories, addCategory, removeCategory, addSubCategory, removeSubCategory,
    updateProfile, updateInventoryQty, updateInventoryItem, removeInventoryItem, 
    addPriceRecord, addToList, toggleListItem, removeListItem, overrideStoreForListItem,
    addToInventory, importBulkInventory, reorderStorageLocations, refresh,
    refreshMeals, cookMeal, rateMeal
  } = useAppData();

  const [isGuest, setIsGuest] = useState(() => localStorage.getItem('pricewise_is_guest') === 'true');
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalMode, setAddModalMode] = useState<'type' | 'barcode' | 'product' | 'tag'>('type');
  const [lastUsedStore, setLastUsedStore] = useState<string>('');

  useEffect(() => {
    const handleOpenAddModal = (e: any) => {
      if (e.detail?.mode) {
        setAddModalMode(e.detail.mode);
      } else {
        setAddModalMode('type');
      }
      setIsAddModalOpen(true);
    };

    document.addEventListener('openAddModal', handleOpenAddModal);
    return () => document.removeEventListener('openAddModal', handleOpenAddModal);
  }, []);

  const openAddModal = (mode: 'type' | 'barcode' | 'product' | 'tag' = 'type') => {
    setAddModalMode(mode);
    setIsAddModalOpen(true);
  };

  if (!user && !isGuest) {
    return (
      <div className="flex flex-col h-screen bg-white items-center justify-center p-8 text-center overflow-y-auto">
        <div className="bg-indigo-600 p-6 rounded-[40px] shadow-2xl mb-8 flex items-center justify-center">
          <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Aisle Be Back</h1>
        <p className="text-slate-400 font-medium mb-12 max-w-[280px] leading-relaxed text-sm">Sign in to sync your prices and household inventory with your family.</p>
        <div className="w-full max-w-xs space-y-4">
          <button disabled={!supabase} onClick={signInWithGoogle} className="w-full bg-white border-2 border-slate-100 text-slate-900 font-black py-4 rounded-[24px] uppercase tracking-widest text-xs hover:bg-slate-50 transition-all flex items-center justify-center space-x-3 shadow-sm active:scale-95">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            <span>Sign in with Google</span>
          </button>
          <button onClick={() => { setIsGuest(true); localStorage.setItem('pricewise_is_guest', 'true'); }} className="w-full text-slate-400 font-black py-4 uppercase tracking-[0.2em] text-[10px] hover:text-indigo-600 transition-colors">Continue as Guest</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
      <DiagnosticBanner user={user} isGuest={isGuest} onExitGuest={() => { setIsGuest(false); localStorage.removeItem('pricewise_is_guest'); }} />
      <Header user={user} onSettingsClick={() => setActiveTab('settings')} activeFamily={activeFamily} loading={loading} />
      
      <main className="flex-1 overflow-y-auto pb-32 px-4 pt-6">
        
        {activeTab === 'dashboard' && <Dashboard products={products} onAddToList={addToList} />}
        {activeTab === 'items' && <ItemBrowser products={products} categoryOrder={profile.categoryOrder} onAddToList={addToList} />}
        {activeTab === 'inventory' && (
          <InventoryView 
            inventory={inventory} locations={storageLocations} subLocations={subLocations} 
            products={products} categoryOrder={profile.categoryOrder} 
            customCategories={customCategories} customSubCategories={customSubCategories}
            onUpdateQty={updateInventoryQty} onUpdateItem={updateInventoryItem} onRemoveItem={removeInventoryItem}
            onAddToInventory={addToInventory} onBulkAdd={importBulkInventory} onAddToList={addToList}
          />
        )}
        {activeTab === 'meals' && (
          <MealPlanner 
            mealIdeas={mealIdeas} loading={loading} activeFamily={activeFamily}
            onRefresh={refreshMeals} onCook={cookMeal} onRate={rateMeal} onAddToList={addToList}
          />
        )}
        {activeTab === 'list' && <ShoppingList items={shoppingList} products={products} storageLocations={storageLocations} subLocations={subLocations} onToggle={toggleListItem} onRemove={removeListItem} onAdd={addToList} onAddToInventory={addToInventory} activeFamily={activeFamily} />}
        {activeTab === 'shop' && <ShopPlan items={shoppingList} products={products} stores={stores} vehicles={vehicles} activeVehicleId={profile.activeVehicleId || ''} gasPrice={profile.gasPrice} storageLocations={storageLocations} subLocations={subLocations} onToggle={toggleListItem} onRemove={removeListItem} onOverrideStore={overrideStoreForListItem} onAddToInventory={addToInventory} />}
        {activeTab === 'settings' && (
          <SettingsView 
            user={user} profile={profile} activeFamily={activeFamily} onProfileChange={updateProfile}
            stores={stores} onStoresChange={setStores} vehicles={vehicles} onVehiclesChange={setVehicles}
            storageLocations={storageLocations} onStorageLocationsChange={setStorageLocations} subLocations={subLocations} onSubLocationsChange={setSubLocations}
            customCategories={customCategories} customSubCategories={customSubCategories}
            onAddCategory={addCategory} onRemoveCategory={removeCategory} onAddSubCategory={addSubCategory} onRemoveSubCategory={removeSubCategory}
            onReorderStorageLocations={reorderStorageLocations}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} onAddClick={() => openAddModal('type')} />
      
      <div className="fixed bottom-24 right-4 z-40">
        <button 
          onClick={() => openAddModal('type')}
          className="bg-indigo-600 text-white rounded-full p-4 shadow-xl active:scale-95 transition-transform border-4 border-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>

      {isAddModalOpen && (
        <AddItemModal 
          onClose={() => setIsAddModalOpen(false)} 
          onSubmit={(cat, item, variety, rec, brand, bar) => { addPriceRecord(cat, item, variety, rec, brand, bar); setLastUsedStore(rec.store); setIsAddModalOpen(false); }} 
          onSaveToList={addToList} 
          initialMode={addModalMode}
          products={products} location={profile.locationLabel} savedStores={stores} lastUsedStore={lastUsedStore}
          customCategories={customCategories} customSubCategories={customSubCategories}
        />
      )}
    </div>
  );
};

export default App;
