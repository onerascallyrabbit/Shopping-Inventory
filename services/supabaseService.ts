
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { InventoryItem, SubLocation, StorageLocation, Profile, Vehicle, StoreLocation } from '../types';

// Environment variables handled by Vite/Vercel static replacement
// @ts-ignore
export const SUPABASE_URL = (import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '') || '';
// @ts-ignore
export const SUPABASE_ANON_KEY = (import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : '') || '';
// @ts-ignore
export const API_KEY = (import.meta.env?.VITE_API_KEY) || (typeof process !== 'undefined' ? process.env.VITE_API_KEY : '') || '';

export const getEnv = (key: string): string => {
  if (key === 'SUPABASE_URL') return SUPABASE_URL;
  if (key === 'SUPABASE_ANON_KEY') return SUPABASE_ANON_KEY;
  if (key === 'API_KEY') return API_KEY;
  return '';
};

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

/**
 * PROFILE & SETTINGS SYNC
 */
export const fetchProfile = async (): Promise<Profile | null> => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (error && error.code !== 'PGRST116') throw error;
  
  if (!data) {
    // Initialize profile if missing
    const initial = { id: user.id, location_label: '', zip: '', gas_price: 3.50, share_prices: false };
    await supabase.from('profiles').insert(initial);
    return { 
      id: user.id, 
      locationLabel: '', 
      zip: '', 
      gasPrice: 3.50, 
      sharePrices: false, 
      categoryOrder: ['Produce', 'Dairy', 'Meat', 'Seafood', 'Deli', 'Bakery', 'Frozen', 'Pantry', 'Beverages', 'Household', 'Personal Care', 'Baby', 'Pets', 'Other']
    };
  }

  return {
    id: data.id,
    locationLabel: data.location_label,
    zip: data.zip,
    gasPrice: Number(data.gas_price),
    categoryOrder: data.category_order,
    activeVehicleId: data.active_vehicle_id,
    sharePrices: data.share_prices,
    familyId: data.family_id
  };
};

export const syncProfile = async (profile: Partial<Profile>) => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const payload: any = {};
  if (profile.locationLabel !== undefined) payload.location_label = profile.locationLabel;
  if (profile.zip !== undefined) payload.zip = profile.zip;
  if (profile.gasPrice !== undefined) payload.gas_price = profile.gasPrice;
  if (profile.categoryOrder !== undefined) payload.category_order = profile.categoryOrder;
  if (profile.activeVehicleId !== undefined) payload.active_vehicle_id = profile.activeVehicleId;
  if (profile.sharePrices !== undefined) payload.share_prices = profile.sharePrices;
  if (profile.familyId !== undefined) payload.family_id = profile.familyId;

  await supabase.from('profiles').upsert({ id: user.id, ...payload });
};

/**
 * FAMILY HUB
 */
export const createFamily = async (name: string) => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data, error } = await supabase.from('families').insert({
    name,
    invite_code: inviteCode,
    created_by: user.id
  }).select().single();

  if (error) throw error;
  await syncProfile({ familyId: data.id });
  return data;
};

export const joinFamily = async (inviteCode: string) => {
  if (!supabase) return null;
  const { data, error } = await supabase.from('families').select('id').eq('invite_code', inviteCode.toUpperCase()).single();
  if (error) throw new Error('Invalid invite code');
  await syncProfile({ familyId: data.id });
  return data;
};

export const fetchFamilyMembers = async (familyId: string) => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('profiles').select('id, profiles(id)').eq('family_id', familyId);
  // This is a simplified fetch; in a real app, you'd join with auth.users if metadata is available via public.profiles
  return data || [];
};

/**
 * VEHICLE & STORE SYNC
 */
export const syncVehicle = async (v: Vehicle) => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('vehicles').upsert({ id: v.id, user_id: user.id, name: v.name, mpg: v.mpg });
};

export const deleteVehicle = async (id: string) => {
  if (!supabase) return;
  await supabase.from('vehicles').delete().eq('id', id);
};

export const syncStore = async (s: StoreLocation) => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('stores').upsert({ 
    id: s.id, user_id: user.id, name: s.name, address: s.address, 
    lat: s.lat, lng: s.lng, phone: s.phone, hours: s.hours, zip: s.zip 
  });
};

/**
 * DATA FETCHING
 */
export const fetchUserData = async () => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await fetchProfile();
  const familyId = profile?.familyId;

  // We fetch inventory and list items belonging to the user OR their family
  // The RLS policy handles the family security, but we can be explicit here too
  const [inventory, storage, subs, stores, vehicles] = await Promise.all([
    supabase.from('inventory').select('*'),
    supabase.from('storage_locations').select('*'),
    supabase.from('sub_locations').select('*'),
    supabase.from('stores').select('*'),
    supabase.from('vehicles').select('*')
  ]);

  return {
    profile,
    inventory: inventory.data || [],
    storageLocations: storage.data || [],
    subLocations: subs.data || [],
    stores: stores.data || [],
    vehicles: vehicles.data || []
  };
};

/**
 * LEGACY / DATA SYNC
 */
export const syncInventoryItem = async (item: InventoryItem) => {
  if (!supabase || !item.userId) return;
  await supabase.from('inventory').upsert({
    id: item.id, product_id: item.productId, item_name: item.itemName, category: item.category,
    variety: item.variety, sub_location: item.subLocation, quantity: item.quantity,
    unit: item.unit, location_id: item.locationId, updated_at: item.updatedAt, user_id: item.userId 
  });
};

// Fix: Corrected property mapping from InventoryItem (camelCase) to Supabase payload keys
export const bulkSyncInventory = async (items: InventoryItem[]) => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const payload = items.map(item => ({
    id: item.id, product_id: item.productId, item_name: item.itemName, category: item.category,
    variety: item.variety, sub_location: item.subLocation, quantity: item.quantity,
    unit: item.unit, location_id: item.locationId, updated_at: item.updatedAt, user_id: user.id
  }));
  await supabase.from('inventory').upsert(payload);
};

export const syncStorageLocation = async (loc: StorageLocation) => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('storage_locations').upsert({ id: loc.id, name: loc.name, user_id: user.id });
};

export const deleteStorageLocation = async (id: string) => {
  if (!supabase) return;
  await supabase.from('storage_locations').delete().eq('id', id);
};

export const syncSubLocation = async (sub: SubLocation) => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('sub_locations').upsert({ id: sub.id, location_id: sub.locationId, name: sub.name, user_id: user.id });
};

export const deleteSubLocation = async (id: string) => {
  if (!supabase) return;
  await supabase.from('sub_locations').delete().eq('id', id);
};

export const testDatabaseConnection = async () => {
  if (!supabase) return { success: false, error: 'No Supabase client' };
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return { success: !error, error: error?.message };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const signInWithGoogle = async () => {
  if (!supabase) return;
  await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
};

export const signOut = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
};
