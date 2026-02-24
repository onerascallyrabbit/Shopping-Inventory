import React, { useState, useEffect } from 'react';
import { Profile } from '../types';

interface KrogerProductDetailsModalProps {
  product: any;
  profile: Profile;
  onClose: () => void;
  onConfirm: (product: any) => void;
}

const KrogerProductDetailsModal: React.FC<KrogerProductDetailsModalProps> = ({ 
  product, profile, onClose, onConfirm 
}) => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  useEffect(() => {
    const fetchCoupons = async () => {
      setLoadingCoupons(true);
      try {
        const response = await fetch(`/api/kroger/coupons?productId=${product.productId}&locationId=${profile.krogerStoreId}`);
        const data = await response.json();
        setCoupons(data.data || []);
      } catch (err) {
        console.error("Error fetching coupons:", err);
      } finally {
        setLoadingCoupons(false);
      }
    };

    if (product.productId && profile.krogerStoreId) {
      fetchCoupons();
    }
  }, [product.productId, profile.krogerStoreId]);

  const priceData = product.items?.[0]?.price;
  const inventory = product.items?.[0]?.inventory;
  const imageUrl = product.images?.find((img: any) => img.perspective === 'front')?.sizes?.find((s: any) => s.size === 'medium')?.url;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="relative h-48 bg-slate-50 flex items-center justify-center border-b border-slate-100">
          <img 
            src={imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400&h=400'} 
            alt={product.description} 
            className="h-full w-full object-contain p-4"
            referrerPolicy="no-referrer"
          />
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/80 backdrop-blur-md p-2 rounded-full text-slate-400 hover:text-red-500 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{product.brand || 'Generic'}</span>
              {inventory?.stockLevel === 'TEMPORARILY_OUT_OF_STOCK' ? (
                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Out of Stock</span>
              ) : (
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">In Stock</span>
              )}
            </div>
            <h3 className="text-xl font-black text-slate-900 leading-tight uppercase tracking-tight">{product.description}</h3>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase">{product.items?.[0]?.size || 'Standard Size'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Price</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-slate-900">${(priceData?.promo || priceData?.regular || 0).toFixed(2)}</span>
                {priceData?.promo && (
                  <span className="text-xs font-bold text-slate-400 line-through">${priceData.regular.toFixed(2)}</span>
                )}
              </div>
              {priceData?.promo && (
                <div className="mt-1 inline-block bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">
                  On Sale
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Store Info</p>
              <p className="text-sm font-black text-slate-800 truncate">{profile.krogerStoreName || 'Kroger'}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">ID: {profile.krogerStoreId}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Coupons</h4>
              {loadingCoupons && <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />}
            </div>
            
            {coupons.length > 0 ? (
              <div className="space-y-2">
                {coupons.map((coupon, idx) => (
                  <div key={idx} className="bg-amber-50 border border-amber-100 p-3 rounded-2xl flex items-start space-x-3">
                    <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4v-3a2 2 0 00-2-2H5z" /></svg>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-amber-900 leading-tight">{coupon.shortDescription}</p>
                      <p className="text-[9px] font-bold text-amber-700/60 uppercase mt-0.5">Expires: {new Date(coupon.expirationDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : !loadingCoupons && (
              <div className="bg-slate-50 p-4 rounded-2xl text-center border border-dashed border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase">No digital coupons found for this item.</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex space-x-3">
          <button 
            onClick={onClose}
            className="flex-1 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(product)}
            className="flex-[2] px-6 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all"
          >
            Confirm Match
          </button>
        </div>
      </div>
    </div>
  );
};

export default KrogerProductDetailsModal;
