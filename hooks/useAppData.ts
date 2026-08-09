
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Product, ShoppingItem, InventoryItem, StorageLocation, 
  SubLocation, StoreLocation, Vehicle, Profile, Family, CustomCategory, CustomSubCategory, MealIdea, CellarItem, ConsumptionLog
} from '../types';
import { 
  fetchUserData, syncInventoryItem, 
  syncProfile, 
  syncProduct, syncPriceRecord, supabase, bulkSyncInventory, fetchFamily,
  deleteInventoryItem, syncShoppingItem, deleteShoppingItem,
  syncCustomCategory, deleteCustomCategory, syncCustomSubCategory, deleteCustomSubCategory,
  bulkSyncStorageLocations, bulkSyncMealIdeas, updateMealStats, saveMealRating,
  syncCellarItem, deleteCellarItem, syncConsumptionLog, syncSubLocation, deleteSubLocation, setCachedUserId,
  patchInventoryItem
} from '../services/supabaseService';
import { generateMealIdeas } from '../services/geminiService';
import { showToast } from '../services/notifications';
import { DEFAULT_CATEGORIES, DEFAULT_STORAGE } from '../constants';

export const useAppData = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [mealIdeas, setMealIdeas] = useState<MealIdea[]>([]);
  const [cellarItems, setCellarItems] = useState<CellarItem[]>([]);
  const [consumptionLogs, setConsumptionLogs] = useState<ConsumptionLog[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>(DEFAULT_STORAGE.map((s, i) => ({ ...s, sortOrder: i })));
  const [subLocations, setSubLocations] = useState<SubLocation[]>([]);
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [customSubCategories, setCustomSubCategories] = useState<CustomSubCategory[]>([]);
  const [activeFamily, setActiveFamily] = useState<Family | null>(null);
  const [profile, setProfile] = useState<Profile>(() => {
    const saved = localStorage.getItem('aisle_be_back_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved profile", e);
      }
    }
    return { 
      id: '', locationLabel: '', zip: '', gasPrice: 3.50, 
      categoryOrder: DEFAULT_CATEGORIES, sharePrices: false,
      enableKroger: false
    };
  });

  useEffect(() => {
    if (!user) {
      localStorage.setItem('aisle_be_back_profile', JSON.stringify(profile));
    }
  }, [profile, user]);

  const isSyncingReorder = useRef(false);
  const realtimeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAllData = useCallback(async (silent = false) => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    if (silent && isSyncingReorder.current) {
      return;
    }

    if (!silent) setLoading(true);
    try {
      const data = await fetchUserData();
      if (data) {
        if (data.profile) {
          setProfile(data.profile);
          if (data.profile.familyId) {
            const familyDetails = await fetchFamily(data.profile.familyId);
            setActiveFamily(familyDetails);
          } else {
            setActiveFamily(null);
          }
        }
        
        setProducts(data.products || []);
        setShoppingList(data.shoppingList || []);
        setCustomCategories(data.customCategories || []);
        setCustomSubCategories(data.customSubCategories || []);
        setMealIdeas(data.mealIdeas || []);
        setCellarItems(data.cellarItems || []);
        setConsumptionLogs(data.consumptionLogs || []);
        
        if (data.inventory) {
          setInventory(data.inventory.map(i => ({
            id: i.id, 
            productId: i.product_id, 
            itemName: i.item_name, 
            category: i.category,
            subCategory: i.sub_category,
            variety: i.variety, 
            brand: i.brand,
            grade: i.grade,
            style: i.style,
            origin: i.origin,
            subLocation: i.sub_location, 
            quantity: Number(i.quantity),
            unit: i.unit, 
            locationId: i.location_id, 
            purchaseDate: i.purchase_date,
            expirationDate: i.expiration_date,
            openedDate: i.opened_date,
            notes: i.notes,
            barcode: i.barcode,
            imageUrl: i.image_url,
            createdAt: i.created_at,
            updatedAt: i.updated_at, 
            userId: i.user_id
          })));
        }

        if (data.storageLocations) {
            setStorageLocations(data.storageLocations.map(s => ({ 
                id: s.id, 
                name: s.name, 
                sortOrder: s.sort_order ?? 0 
            })));
        }
        if (data.subLocations) setSubLocations(data.subLocations.map(s => ({ id: s.id, locationId: s.location_id, name: s.name })));
        if (data.stores) setStores(data.stores.map(s => ({ id: s.id, name: s.name, address: s.address, lat: Number(s.lat), lng: Number(s.lng), phone: s.phone, hours: s.hours, zip: s.zip })));
        if (data.vehicles) setVehicles(data.vehicles.map(v => ({ id: v.id, name: v.name, mpg: Number(v.mpg) })));
      }
    } catch (err) {
      console.error("Failed to load user data:", err);
    } finally {
      setSyncedAt(Date.now());
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase || !user) return;

    const scheduleReload = () => {
      if (realtimeTimer.current) clearTimeout(realtimeTimer.current);
      realtimeTimer.current = setTimeout(() => {
        realtimeTimer.current = null;
        loadAllData(true);
      }, 300);
    };

    const channel = supabase
      .channel('family-changes')
      .on('postgres_changes', { event: '*', table: 'inventory', schema: 'public' }, scheduleReload)
      .on('postgres_changes', { event: '*', table: 'shopping_list', schema: 'public' }, scheduleReload)
      .on('postgres_changes', { event: '*', table: 'custom_categories', schema: 'public' }, scheduleReload)
      .on('postgres_changes', { event: '*', table: 'custom_sub_categories', schema: 'public' }, scheduleReload)
      .on('postgres_changes', { event: '*', table: 'meal_ideas', schema: 'public' }, scheduleReload)
      .on('postgres_changes', { event: '*', table: 'storage_locations', schema: 'public' }, scheduleReload)
      .on('postgres_changes', { event: '*', table: 'cellar_items', schema: 'public' }, scheduleReload)
      .on('postgres_changes', { event: '*', table: 'consumption_logs', schema: 'public' }, scheduleReload)
      .subscribe();

    return () => {
      if (realtimeTimer.current) clearTimeout(realtimeTimer.current);
      realtimeTimer.current = null;
      supabase?.removeChannel(channel);
    };
  }, [supabase, user, loadAllData]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      setCachedUserId(u?.id ?? null);
      if (u) loadAllData();
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setCachedUserId(u?.id ?? null);
      if (u) loadAllData();
      else setLoading(false);
    });
    
    return () => subscription.unsubscribe();
  }, [loadAllData]);

  const refreshMeals = useCallback(async (focus?: string) => {
    if (!activeFamily) {
      showToast("No active Family Hub. Join or create a Hub in Settings to enable shared meal planning.", 'info');
      return;
    }
    if (inventory.length === 0) {
      showToast("Your stock is empty! Add items to your inventory so the AI can suggest recipes.", 'info');
      return;
    }

    setLoading(true);
    try {
      const newMeals = await generateMealIdeas(inventory, focus);
      if (newMeals && newMeals.length > 0) {
        await bulkSyncMealIdeas(activeFamily.id, newMeals);
        await loadAllData(true);
      } else {
        showToast("The AI was unable to suggest meals. Check your inventory items or API limits.", 'error');
      }
    } catch (err: any) {
      console.error("Meal Generation Failure:", err);
      showToast(`AI Error: ${err.message || 'Failed to generate meals. Try again.'}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [activeFamily, inventory]);

  const cookMeal = useCallback(async (mealId: string) => {
    const meal = mealIdeas.find(m => m.id === mealId);
    if (!meal) return;
    const updates = { 
      cook_count: (meal.cookCount || 0) + 1, 
      last_cooked: new Date().toISOString() 
    };
    await updateMealStats(mealId, updates);
    loadAllData(true);
  }, [mealIdeas]);

  const rateMeal = useCallback(async (mealId: string, rating: number) => {
    await saveMealRating(mealId, rating);
    loadAllData(true);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    const oldProfile = { ...profile };
    setProfile(prev => ({ ...prev, ...updates }));
    try {
      if (user) await syncProfile(updates);
      if (updates.familyId !== undefined) await loadAllData();
    } catch (e) {
      console.error("Profile update failed:", e);
      setProfile(oldProfile);
      showToast("Failed to save profile changes. Please check your connection.", 'error');
    }
  }, [profile, user]);

  const updateInventoryQty = useCallback(async (id: string, delta: number) => {
    const target = inventory.find(i => i.id === id);
    if (!target) return;
    const newQty = Math.max(0, target.quantity + delta);
    const updatedItem = { ...target, quantity: newQty, updatedAt: new Date().toISOString() };
    setInventory(prev => newQty === 0 ? prev.filter(i => i.id !== id) : prev.map(i => i.id === id ? updatedItem : i));
    if (user) {
        try {
            if (newQty === 0) await deleteInventoryItem(id);
            else await patchInventoryItem(id, { quantity: newQty });
        } catch (err) { loadAllData(); }
    }
  }, [inventory, user]);

  const updateInventoryItem = useCallback(async (id: string, updates: Partial<InventoryItem>) => {
    const target = inventory.find(i => i.id === id);
    if (!target) return;
    const updated = { ...target, ...updates, updatedAt: new Date().toISOString() };
    setInventory(prev => prev.map(item => item.id === id ? updated : item));
    if (user) try { await patchInventoryItem(id, updates); } catch (err) { loadAllData(); }
  }, [inventory, user]);

  const removeInventoryItem = useCallback(async (id: string) => {
    setInventory(prev => prev.filter(i => i.id !== id));
    if (user) try { await deleteInventoryItem(id); } catch (err) { loadAllData(); }
  }, [user]);

  const addPriceRecord = useCallback(async (category: string, itemName: string, variety: string, record: any, brand?: string, barcode?: string, subCategory?: string, origin?: string, grade?: string, style?: string, notes?: string, unitSize?: number, unitMeasure?: string, container?: string) => {
    const newRecord = { ...record, id: crypto.randomUUID(), date: new Date().toISOString(), isPublic: profile.sharePrices };
    const existingProduct = products.find(p => (barcode && p.barcode === barcode) || (p.itemName.toLowerCase() === itemName.toLowerCase() && (p.variety || '').toLowerCase() === (variety || '').toLowerCase() && (p.brand || '').toLowerCase() === (brand || '').toLowerCase()));
    let productId = existingProduct?.id;
    if (user) {
      try {
        const syncedProduct = await syncProduct({ id: productId, category, itemName, variety, brand, barcode, subCategory, origin, grade, style, notes, unitSize, unitMeasure, container });
        if (syncedProduct && syncedProduct.id) {
          productId = syncedProduct.id;
          await syncPriceRecord(productId as string, newRecord, user.id);
        }
      } catch (err) { console.error(err); }
    }
    setProducts(prev => {
      if (existingProduct) return prev.map(p => p.id === existingProduct.id ? { ...p, history: [newRecord, ...p.history] } : p);
      return [...prev, { id: productId || crypto.randomUUID(), category, subCategory, itemName, variety, brand, barcode, origin, grade, style, notes, unitSize, unitMeasure, container, history: [newRecord] }];
    });
  }, [products, profile, user]);

  const addToList = useCallback(async (name: string, qty: number, unit: string, productId?: string, category?: string) => {
    const newItem: ShoppingItem = { id: crypto.randomUUID(), productId: productId || 'manual', name, neededQuantity: qty, unit, isCompleted: false, userId: user?.id, category };
    setShoppingList(prev => [newItem, ...prev]);
    if (user) try { await syncShoppingItem(newItem); } catch (e) { console.error(e); }
  }, [user]);

  const toggleListItem = useCallback(async (id: string) => {
    const item = shoppingList.find(i => i.id === id);
    if (!item) return;
    const updated = { ...item, isCompleted: !item.isCompleted };
    setShoppingList(prev => prev.map(i => i.id === id ? updated : i));
    if (user) try { await syncShoppingItem(updated); } catch (e) { console.error(e); }
  }, [shoppingList, user]);

  const removeListItem = useCallback(async (id: string) => {
    setShoppingList(prev => prev.filter(i => i.id !== id));
    if (user) try { await deleteShoppingItem(id); } catch (e) { console.error(e); }
  }, [user]);

  const updateShoppingItem = useCallback(async (id: string, updates: Partial<ShoppingItem>) => {
    const item = shoppingList.find(i => i.id === id);
    if (!item) return;
    const updated = { ...item, ...updates };
    setShoppingList(prev => prev.map(i => i.id === id ? updated : i));
    if (user) try { await syncShoppingItem(updated); } catch (e) { console.error(e); }
  }, [shoppingList, user]);

  const overrideStoreForListItem = useCallback(async (id: string, store: string | undefined) => {
    const item = shoppingList.find(i => i.id === id);
    if (!item) return;
    const updated = { ...item, manualStore: store };
    setShoppingList(prev => prev.map(i => i.id === id ? updated : i));
    if (user) try { await syncShoppingItem(updated); } catch (e) { console.error(e); }
  }, [shoppingList, user]);

  const addToInventory = useCallback(async (itemData: Partial<InventoryItem>) => {
    const newItem: InventoryItem = { 
      id: crypto.randomUUID(), 
      productId: itemData.productId || 'manual', 
      itemName: itemData.itemName || '', 
      category: itemData.category || 'Other', 
      subCategory: itemData.subCategory, 
      variety: itemData.variety, 
      brand: itemData.brand,
      grade: itemData.grade,
      style: itemData.style,
      origin: itemData.origin,
      subLocation: itemData.subLocation, 
      quantity: itemData.quantity || 0, 
      unit: itemData.unit || 'pc', 
      locationId: itemData.locationId || '', 
      purchaseDate: itemData.purchaseDate,
      expirationDate: itemData.expirationDate,
      openedDate: itemData.openedDate,
      notes: itemData.notes,
      barcode: itemData.barcode,
      imageUrl: itemData.imageUrl,
      updatedAt: new Date().toISOString(), 
      userId: user?.id || '' 
    };
    setInventory(prev => [...prev, newItem]);
    if (user) try { await syncInventoryItem(newItem); } catch (err) { loadAllData(); }
  }, [user]);

  const importBulkInventory = useCallback(async (items: Omit<InventoryItem, 'id' | 'updatedAt'>[]) => {
    const timestamp = new Date().toISOString();
    const newItems = items.map(i => ({ ...i, id: crypto.randomUUID(), updatedAt: timestamp, userId: user?.id || '' })) as InventoryItem[];
    setInventory(prev => [...prev, ...newItems]);
    if (user) try { await bulkSyncInventory(newItems); } catch (err) { loadAllData(); throw err; }
  }, [user]);

  const updateCellarQty = useCallback(async (id: string, delta: number) => {
    const target = cellarItems.find(i => i.id === id);
    if (!target) return;
    const newQty = Math.max(0, target.quantity + delta);
    const updated = { ...target, quantity: newQty, updatedAt: new Date().toISOString() };
    setCellarItems(prev => prev.map(i => i.id === id ? updated : i));
    if (user) try { await syncCellarItem(updated); } catch (err) { loadAllData(); }
  }, [cellarItems, user]);

  const addCellarItem = useCallback(async (item: Omit<CellarItem, 'id' | 'updatedAt' | 'userId'>) => {
    const newItem: CellarItem = { 
      ...item, 
      id: crypto.randomUUID(), 
      userId: user?.id || '', 
      updatedAt: new Date().toISOString() 
    };
    setCellarItems(prev => [...prev, newItem]);
    if (user) try { await syncCellarItem(newItem); } catch (err) { loadAllData(); }
  }, [user]);

  const updateCellarItem = useCallback(async (id: string, updates: Partial<CellarItem>) => {
    const target = cellarItems.find(i => i.id === id);
    if (!target) return;
    const updated = { ...target, ...updates, updatedAt: new Date().toISOString() };
    setCellarItems(prev => prev.map(i => i.id === id ? updated : i));
    if (user) try { await syncCellarItem(updated); } catch (err) { loadAllData(); }
  }, [cellarItems, user]);

  const removeCellarItem = useCallback(async (id: string) => {
    setCellarItems(prev => prev.filter(i => i.id !== id));
    if (user) try { await deleteCellarItem(id); } catch (err) { loadAllData(); }
  }, [user]);

  const logConsumption = useCallback(async (itemId: string, quantity: number, occasion?: string, notes?: string) => {
    const newLog: ConsumptionLog = {
      id: crypto.randomUUID(),
      itemId,
      quantity,
      date: new Date().toISOString(),
      occasion,
      notes
    };
    setConsumptionLogs(prev => [newLog, ...prev]);
    if (user) try { await syncConsumptionLog(newLog); } catch (err) { loadAllData(); }
  }, [user]);

  const reorderStorageLocations = useCallback(async (newOrder: StorageLocation[]) => {
    const ordered = newOrder.map((l, i) => ({ ...l, sortOrder: i }));
    setStorageLocations(ordered);
    if (user) {
        isSyncingReorder.current = true;
        try {
            await bulkSyncStorageLocations(ordered);
            setTimeout(() => { isSyncingReorder.current = false; }, 1500);
        } catch (e) {
            console.error("Reorder sync failed:", e);
            isSyncingReorder.current = false;
            loadAllData(true);
        }
    }
  }, [user]);

  const addCategory = useCallback(async (name: string) => {
    if (!activeFamily) return;
    await syncCustomCategory({ familyId: activeFamily.id, name });
    loadAllData(true);
  }, [activeFamily]);

  const removeCategory = useCallback(async (id: string) => {
    const cat = customCategories.find(c => c.id === id);
    if (!cat) return;
    const inUse = inventory.some(i => i.category === cat.name) || products.some(p => p.category === cat.name);
    if (inUse) {
        showToast("Cannot delete category: It is currently assigned to items in your stock or price history.", 'error');
        return;
    }
    await deleteCustomCategory(id);
    loadAllData(true);
  }, [customCategories, inventory, products]);

  const addSubCategory = useCallback(async (categoryName: string, name: string) => {
    if (!activeFamily) return;
    await syncCustomSubCategory({ familyId: activeFamily.id, categoryId: categoryName, name });
    loadAllData(true);
  }, [activeFamily]);

  const removeSubCategory = useCallback(async (id: string) => {
    const sub = customSubCategories.find(s => s.id === id);
    if (!sub) return;
    const inUse = inventory.some(i => i.subCategory === sub.name) || products.some(p => p.subCategory === sub.name);
    if (inUse) {
        showToast("Cannot delete sub-category: It is currently assigned to items in your stock or price history.", 'error');
        return;
    }
    await deleteCustomSubCategory(id);
    loadAllData(true);
  }, [customSubCategories, inventory, products]);

  const addSubLocation = useCallback(async (locId: string, name: string) => {
    const newSub: SubLocation = { id: crypto.randomUUID(), locationId: locId, name };
    setSubLocations(prev => [...prev, newSub]);
    if (user) try { await syncSubLocation(newSub); } catch (err) { loadAllData(); }
  }, [user]);

  const removeSubLocation = useCallback(async (id: string) => {
    setSubLocations(prev => prev.filter(s => s.id !== id));
    if (user) try { await deleteSubLocation(id); } catch (err) { loadAllData(); }
  }, [user]);

  const value = useMemo(() => ({
    user, loading, syncedAt, products, shoppingList, inventory, mealIdeas, cellarItems, consumptionLogs,
    storageLocations, setStorageLocations, subLocations, setSubLocations,
    stores, setStores, vehicles, setVehicles, profile, activeFamily,
    customCategories, customSubCategories,
    addCategory, removeCategory, addSubCategory, removeSubCategory,
    addSubLocation, removeSubLocation,
    updateProfile, updateInventoryQty, updateInventoryItem, removeInventoryItem, 
    addPriceRecord, addToList, toggleListItem, removeListItem, updateShoppingItem, overrideStoreForListItem, 
    addToInventory, importBulkInventory, reorderStorageLocations, refresh: loadAllData,
    refreshMeals, cookMeal, rateMeal,
    updateCellarQty, addCellarItem, updateCellarItem, removeCellarItem, logConsumption
  }), [
    user, loading, syncedAt, products, shoppingList, inventory, mealIdeas, cellarItems, consumptionLogs,
    storageLocations, subLocations, stores, vehicles, profile, activeFamily,
    customCategories, customSubCategories,
    addCategory, removeCategory, addSubCategory, removeSubCategory,
    addSubLocation, removeSubLocation,
    updateProfile, updateInventoryQty, updateInventoryItem, removeInventoryItem,
    addPriceRecord, addToList, toggleListItem, removeListItem, updateShoppingItem, overrideStoreForListItem,
    addToInventory, importBulkInventory, reorderStorageLocations, loadAllData,
    refreshMeals, cookMeal, rateMeal,
    updateCellarQty, addCellarItem, updateCellarItem, removeCellarItem, logConsumption
  ]);

  return value;
};
