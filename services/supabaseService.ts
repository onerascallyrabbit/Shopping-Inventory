import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { InventoryItem, SubLocation } from '../types';

/**
 * Robust environment variable access. 
 * Checks for standard, Next.js, and Vercel-specific prefixes.
 */
const getEnv = (key: string): string => {
  const prefixes = ['', 'NEXT_PUBLIC_', 'SUPABASE_PUBLISHABLE_', 'REACT_APP_'];
  try {
    if (typeof process !== 'undefined' && process.env) {
      for (const prefix of prefixes) {
        const val = process.env[prefix + key];
        if (val) return val;
      }
    }
  } catch (e) {}
  return '';
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!supabase) {
  console.warn("Supabase Service: Initialisation failed. Keys not found in process.env.");
}

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
    console.error('Supabase Sync Error:', err);
  }
};

export const syncSubLocation = async (sub: SubLocation) => {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('sub_locations')
      .upsert({
        id: sub.id,
        location_id: sub.locationId,
        name: sub.name,
        user_id: (await supabase.auth.getUser()).data.user?.id
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

export const bulkSyncInventory = async (items: InventoryItem[]) => {
  if (!supabase) return;
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

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
      user_id: userId
    }));
    const { error } = await supabase.from('inventory').upsert(payload);
    if (error) throw error;
  } catch (err) {
    console.error('Supabase Bulk Sync Error:', err);
  }
};
