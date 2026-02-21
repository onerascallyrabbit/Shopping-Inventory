
import React from 'react';
import { signOut } from '../services/supabaseService';
import { Family } from '../types';
import { RefreshCw } from 'lucide-react';

interface HeaderProps {
  onSettingsClick: () => void;
  user?: any;
  activeFamily: Family | null;
  loading?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onSettingsClick, user, activeFamily, loading }) => {
  return (
    <header className="bg-white border-b border-slate-200 px-4 pt-6 pb-4 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="bg-indigo-600 p-2 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-lg font-black tracking-tight text-slate-900 leading-none uppercase italic">Aisle Be Back</h1>
            {activeFamily && (
              <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mt-0.5 truncate max-w-[120px]">
                {activeFamily.name} Hub
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <RefreshCw 
              className={`w-4 h-4 transition-all duration-500 ${
                loading 
                  ? 'text-slate-300 animate-spin' 
                  : 'text-emerald-500'
              }`} 
            />
          </div>

          <div className="flex items-center space-x-1">
            {user && (
              <div className="flex items-center space-x-3 pr-2 border-r border-slate-100 mr-1">
                <button 
                  onClick={() => {
                    if(confirm('Sign out?')) signOut();
                  }}
                  className="w-8 h-8 rounded-full overflow-hidden border-2 border-slate-50 active:scale-95 transition-transform"
                  title="Sign Out"
                >
                  <img 
                    src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}`} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                </button>
              </div>
            )}
            <button onClick={onSettingsClick} className="text-slate-400 hover:text-indigo-600 transition-colors p-2" title="Settings">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
