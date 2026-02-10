import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { InventoryItem, SubLocation, StorageLocation } from '../types';

/**
 * Robust environment variable discovery using literal access.
 * Bundlers like Vite/Webpack use static analysis to replace these strings.
 * Dynamic access like process.env[key] often fails in production builds.
 */
export const getEnv = (key: string): string => {
  const k = key.toUpperCase();
  
  // 1. SUPABASE URL - Literal checks for static replacement
  if (k === 'SUPABASE_URL') {
    try {
      const val = 
        // @ts-ignore
        (typeof process !== 'undefined' && process.env ? (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) : undefined) ||
        // @ts-ignore
        (import.meta.env ? (import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL) : undefined);
      if (val) return val;
    } catch (e) {}
  }
  
  // 2. SUPABASE ANON KEY - Literal checks for static replacement
  if (k === 'SUPABASE_ANON_KEY') {
    try {
      const val = 
        // @ts-ignore
        (typeof process !== 'undefined' && process.env ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY) : undefined) ||
        // @ts-ignore
        (import.meta.env ? (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY) : undefined);
      if (val) return val;
    } catch (e) {}
  }

  // 3. GEMINI API KEY - Literal checks for static replacement
  if (k === 'API_KEY') {
    try {
      const val = 
        // @ts-ignore
        (typeof process !== 'undefined' && process.env ? (process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || process.env.VITE_API_KEY) : undefined) ||
        // @ts-ignore
        (import.meta.env ? (import.meta.env.API_KEY || import.meta.env.NEXT_PUBLIC_API_KEY || import.meta.env.VITE_API_KEY) : undefined);
      if (val) return val;
    } catch (e) {}
  }

  // 4. Fallback: Try dynamic lookup for other keys
  try {
    const sources = [
      typeof process !== 'undefined' ? process.env : null,
      (import.meta as any).env,
      (window as any).process?.env,
      (window as any).ENV
    ].filter(Boolean);

    const prefixes = ['', 'NEXT_PUBLIC_', 'VITE_', 'REACT_APP_'];
    for (const source of sources) {
      for (const p of prefixes) {
        const val = (source as any)[p + k];
        if (typeof val === 'string' && val.length > 0) return val;
      }
    }
  } catch (e) {}
  
  return '';
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');

// Initialise only if keys exist
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!supabase) {
  console.warn("Supabase Config: Missing URL or Key. Check Vercel Environment Variables.");
}

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
