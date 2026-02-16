
import React from 'react';
import { AppTab } from '../types';

interface BottomNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onAddClick: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, onAddClick }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 safe-bottom z-40">
      <div className="flex items-center justify-around h-16">
        <button 
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter">Home</span>
        </button>

        <button 
          onClick={() => onTabChange('inventory')}
          className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === 'inventory' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter">Stock</span>
        </button>

        <button 
          onClick={() => onTabChange('meals')}
          className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === 'meals' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter">Meals</span>
        </button>

        <button 
          onClick={() => onTabChange('list')}
          className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === 'list' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter">List</span>
        </button>

        <button 
          onClick={() => onTabChange('shop')}
          className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === 'shop' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter">Shop</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
