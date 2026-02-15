
import React from 'react';
import { signOut } from '../services/supabaseService';
import { Family } from '../types';

interface HeaderProps {
  onSettingsClick: () => void;
  user?: any;
  activeFamily: Family | null;
}

const Header: React.FC<HeaderProps> = ({ onSettingsClick, user, activeFamily }) => {
  return (
    <header className="bg-white border-b border-slate-200 px-4 pt-6 pb-4 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">Aisle Be Back</h1>
            {activeFamily && (
              <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mt-0.5 truncate max-w-[120px]">
                {activeFamily.name} Hub
              </span>
            )}
          </div>
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
    </header>
  );
};

export default Header;
