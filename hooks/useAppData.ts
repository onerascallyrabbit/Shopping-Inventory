
import { useState, useEffect, useCallback } from 'react';
import { 
  Product, ShoppingItem, InventoryItem, StorageLocation, 
  SubLocation, StoreLocation, Vehicle, Profile, Family 
} from '../types';
import { 
  fetchUserData, syncInventoryItem, syncStorageLocation, 
  deleteStorageLocation, syncSubLocation, deleteSubLocation,
  syncProfile, syncVehicle, deleteVehicle, syncStore,
  syncProduct, syncPriceRecord, supabase, bulkSyncInventory, fetchFamily,
  deleteInventoryItem
} from '../services/supabaseService';
import { DEFAULT_CATEGORIES, DEFAULT_STORAGE } from '../constants';

export const useAppData = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>(DEFAULT_STORAGE);
  const [subLocations, setSubLocations] = useState<SubLocation[]>([]);
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeFamily, setActiveFamily] = useState<Family | null>(null);
  const [profile, setProfile] = useState<Profile>({ 
    id: '', locationLabel: '', zip: '', gasPrice: 3.50, 
    categoryOrder: DEFAULT_CATEGORIES, sharePrices: false 
  });

  const loadAllData = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
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
        
        // Products
        setProducts(data.products || []);
        
        // Inventory
        if (data.inventory) {
          setInventory(data.inventory.map(i => ({
            id: i.id, productId: i.product_id, itemName: i.item_name, category: i.category,
            subCategory: i.sub_category,
            variety: i.variety, subLocation: i.sub_location, quantity: Number(i.quantity),
            unit: i.unit, locationId: i.location_id, updatedAt: i.updated_at, userId: i.user_id
          })));
        } else {
          setInventory([]);
        }

        // Locations
        if (data.storageLocations) setStorageLocations(data.storageLocations.map(s => ({ id: s.id, name: s.name })));
        if (data.subLocations) setSubLocations(data.subLocations.map(s => ({ id: s.id, locationId: s.location_id, name: s.name })));
        
        // Metadata
        if (data.stores) setStores(data.stores.map(s => ({ id: s.id, name: s.name, address: s.address, lat: Number(s.lat), lng: Number(s.lng), phone: s.phone, hours: s.hours, zip: s.zip })));
        if (data.vehicles) setVehicles(data.vehicles.map(v => ({ id: v.id, name: v.name, mpg: Number(v.mpg) })));
      }
    } catch (err) {
      console.error("Failed to load user data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadAllData();
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadAllData();
      else setLoading(false);
    });
    
    return () => subscription.unsubscribe();
  }, [loadAllData]);

  const updateProfile = async (updates: Partial<Profile>) => {
    const isFamilyChange = updates.familyId !== undefined && updates.familyId !== profile.familyId;
    
    try {
      if (user) await syncProfile(updates);
      
      // Update local profile state
      setProfile(prev => ({ ...prev, ...updates }));

      // If they joined or left a family, we must re-fetch EVERYTHING
      // because RLS now allows/denies access to a whole new set of records.
      if (isFamilyChange) {
        await loadAllData();
      } else if (updates.familyId === undefined && profile.familyId) {
         setActiveFamily(null);
      }
    } catch (e) {
      console.error("Profile update failed:", e);
      throw e;
    }
  };

  const updateInventoryQty = async (id: string, delta: number) => {
    setInventory(prev => {
      const updatedList = prev.map(item => {
        if (item.id === id) {
          const newQty = Math.max(0, item.quantity + delta);
          const updated = { ...item, quantity: newQty, updatedAt: new Date().toISOString(), userId: item.userId || user?.id };
          if (user) {
            if (newQty === 0) deleteInventoryItem(id);
            else syncInventoryItem(updated);
          }
          return updated;
        }
        return item;
      }).filter(item => item.quantity > 0);
      return updatedList;
    });
  };

  const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates, updatedAt: new Date().toISOString(), userId: item.userId || user?.id };
        if (user) syncInventoryItem(updated);
        return updated;
      }
      return item;
    }));
  };

  const removeInventoryItem = async (id: string) => {
    setInventory(prev => prev.filter(i => i.id !== id));
    if (user) await deleteInventoryItem(id);
  };

  const addPriceRecord = async (category: string, itemName: string, variety: string, record: any, brand?: string, barcode?: string, subCategory?: string) => {
    const newRecord = { ...record, id: crypto.randomUUID(), date: new Date().toISOString(), isPublic: profile.sharePrices };
    const existingProduct = products.find(p => (barcode && p.barcode === barcode) || (p.itemName.toLowerCase() === itemName.toLowerCase() && (p.variety || '').toLowerCase() === (variety || '').toLowerCase() && (p.brand || '').toLowerCase() === (brand || '').toLowerCase()));
    
    let productId = existingProduct?.id;
    if (user) {
      const syncedProduct = await syncProduct({ id: productId, category, itemName, variety, brand, barcode, subCategory });
      productId = syncedProduct.id;
      await syncPriceRecord(productId, newRecord, user.id);
    }

    setProducts(prev => {
      if (existingProduct) {
        return prev.map(p => p.id === existingProduct.id ? { ...p, history: [newRecord, ...p.history], brand: brand || p.brand, barcode: barcode || p.barcode, category, subCategory: subCategory || p.subCategory } : p);
      }
      return [...prev, { id: productId || crypto.randomUUID(), category, subCategory, itemName, variety, brand, barcode, history: [newRecord] }];
    });
  };

  const addToList = (name: string, qty: number, unit: string, productId?: string) => {
    setShoppingList(prev => [...prev, { 
      id: crypto.randomUUID(), productId: productId || 'manual', name, 
      neededQuantity: qty, unit, isCompleted: false, userId: user?.id 
    }]);
  };

  const addToInventory = async (productId: string, itemName: string, category: string, variety: string, qty: number, unit: string, locationId: string, subLocation: string, subCategory?: string) => {
    const newItem: InventoryItem = {
      id: crypto.randomUUID(), productId, itemName, category, subCategory, variety, subLocation, 
      quantity: qty, unit, locationId, updatedAt: new Date().toISOString(), userId: user?.id
    };
    setInventory(prev => [...prev, newItem]);
    if (user) await syncInventoryItem(newItem);
  };

  const importBulkInventory = async (items: Omit<InventoryItem, 'id' | 'updatedAt'>[]) => {
    const timestamp = new Date().toISOString();
    const newItems = items.map(i => ({
      ...i, id: crypto.randomUUID(), updatedAt: timestamp, userId: user?.id
    })) as InventoryItem[];
    
    setInventory(prev => [...prev, ...newItems]);
    if (user) await bulkSyncInventory(newItems);
  };

  return {
    user, loading, products, shoppingList, setShoppingList, inventory, 
    storageLocations, setStorageLocations, subLocations, setSubLocations,
    stores, setStores, vehicles, setVehicles, profile, activeFamily,
    updateProfile, updateInventoryQty, updateInventoryItem, removeInventoryItem, addPriceRecord, addToList, addToInventory, 
    importBulkInventory, refresh: loadAllData
  };
};
