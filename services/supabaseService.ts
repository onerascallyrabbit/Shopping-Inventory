import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { InventoryItem, SubLocation, StorageLocation } from '../types';

/**
 * Hardened environment variable discovery.
 * Build tools look for these EXACT literal strings to perform static replacement.
 */
const discoverSupabaseUrl = (): string => {
  try {
    // 1. Check for NEXT_PUBLIC prefix (Vercel standard)
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL) return process.env.NEXT_PUBLIC_SUPABASE_URL;
    // 2. Check for standard name
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env.SUPABASE_URL) return process.env.SUPABASE_URL;
    // 3. Check import.meta (Vite standard)
    // @ts-ignore
    if (import.meta.env?.NEXT_PUBLIC_SUPABASE_URL) return import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
    // @ts-ignore
    if (import.meta.env?.SUPABASE_URL) return import.meta.env.SUPABASE_URL;
  } catch (e) {}
  return '';
};

const discoverSupabaseKey = (): string => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env.SUPABASE_ANON_KEY) return process.env.SUPABASE_ANON_KEY;
    // @ts-ignore
    if (import.meta.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) return import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    // @ts-ignore
    if (import.meta.env?.SUPABASE_ANON_KEY) return import.meta.env.SUPABASE_ANON_KEY;
  } catch (e) {}
  return '';
};

const discoverApiKey = (): string => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env.API_KEY) return process.env.API_KEY;
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_KEY) return process.env.NEXT_PUBLIC_API_KEY;
    // @ts-ignore
    if (import.meta.env?.API_KEY) return import.meta.env.API_KEY;
  } catch (e) {}
  return '';
};

const SUPABASE_URL = discoverSupabaseUrl();
const SUPABASE_ANON_KEY = discoverSupabaseKey();
const API_KEY = discoverApiKey();

export const getEnv = (key: string): string => {
  if (key === 'SUPABASE_URL') return SUPABASE_URL;
  if (key === 'SUPABASE_ANON_KEY') return SUPABASE_ANON_KEY;
  if (key === 'API_KEY') return API_KEY;
  return '';
};

// Initialize only if keys exist
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

/**
 * HEALTH CHECK
 */
export const testDatabaseConnection = async () => {
  if (!supabase) return { success: false, error: 'Supabase keys missing in environment' };
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No user session found. Please sign in.' };

    const { error } = await supabase.from('storage_locations').select('id').limit(1);
    
    if (error) {
      return { success: false, error: `${error.code}: ${error.message}` };
    }
    
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

/**
 * AUTH FUNCTIONS
 */
export const signInWithGoogle = async () => {
  if (!supabase) return;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
};

export const signOut = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
};

/**
 * FETCH FUNCTIONS
 */
export const fetchUserData = async () => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [inventory, storage, subs] = await Promise.all([
    supabase.from('inventory').select('*').eq('user_id', user.id),
    supabase.from('storage_locations').select('*').eq('user_id', user.id),
    supabase.from('sub_locations').select('*').eq('user_id', user.id)
  ]);

  return {
    inventory: inventory.data || [],
    storageLocations: storage.data || [],
    subLocations: subs.data || []
  };
};

/**
 * DATA FUNCTIONS
 */
export const syncInventoryItem = async (item: InventoryItem) => {
  if (!supabase || !item.userId) return;
  try {
    const { error } = await supabase
      .from('inventory')
      .upsert({
        id: item.id,
        product_id: item.productId,
        item_name: item.itemName,
        category: item.category,
        variety: item.variety,
        sub_location: item.subLocation,
        quantity: item.quantity,
        unit: item.unit,
        location_id: item.locationId,
        updated_at: item.updatedAt,
        user_id: item.userId 
      });
    if (error) throw error;
  } catch (err) {
    console.error('Supabase Inventory Sync Error:', err);
  }
};

export const bulkSyncInventory = async (items: InventoryItem[]) => {
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = items.map(item => ({
      id: item.id,
      product_id: item.productId,
      item_name: item.itemName,
      category: item.category,
      variety: item.variety,
      sub_location: item.subLocation,
      quantity: item.quantity,
      unit: item.unit,
      location_id: item.locationId,
      updated_at: item.updatedAt,
      user_id: user.id
    }));
    const { error } = await supabase.from('inventory').upsert(payload);
    if (error) throw error;
  } catch (err) {
    console.error('Supabase Bulk Inventory Sync Error:', err);
  }
};

export const syncStorageLocation = async (loc: StorageLocation) => {
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('storage_locations')
      .upsert({
        id: loc.id,
        name: loc.name,
        user_id: user.id
      });
    if (error) throw error;
  } catch (err) {
    console.error('Supabase Storage Location Sync Error:', err);
  }
};

export const deleteStorageLocation = async (id: string) => {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('storage_locations').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('Supabase Storage Location Delete Error:', err);
  }
};

export const syncSubLocation = async (sub: SubLocation) => {
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('sub_locations')
      .upsert({
        id: sub.id,
        location_id: sub.locationId,
        name: sub.name,
        user_id: user.id
      });
    if (error) throw error;
  } catch (err) {
    console.error('Supabase Sub-location Sync Error:', err);
  }
};

export const deleteSubLocation = async (id: string) => {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('sub_locations').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('Supabase Sub-location Delete Error:', err);
  }
};
