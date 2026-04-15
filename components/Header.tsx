
import React from 'react';
import { ArrowLeft, User, Shield } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  toggleSidebar: () => void;
  activeItem: string;
  onBack: () => void;
  hasHistory: boolean;
  currentUser: UserProfile | null;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, activeItem, onBack, hasHistory, currentUser }) => {
  // Direct download link format for Google Drive
  const logoUrl = "https://lh3.googleusercontent.com/d/1la57sO6NOuNEZaqa9zDxuxRnWPBavkjH";

  return (
    <header className="sticky top-0 z-30 px-4 md:px-10 py-3 md:py-4 flex items-center justify-between bg-white text-slate-800 shadow-sm border-b border-slate-200">
      
      {/* 1. LEFT: Navigation Controller */}
      <div className="flex-1 flex justify-start items-center gap-2 md:gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-2 md:p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg md:rounded-xl transition-all active:scale-90 border border-slate-200 text-slate-600"
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {hasHistory && activeItem !== 'Dashboard' && (
          <button 
            onClick={onBack}
            className="flex items-center gap-1.5 md:gap-2 p-2 md:p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg md:rounded-xl transition-all active:scale-90 border border-slate-200 text-slate-600"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline text-[8px] md:text-[10px] font-black uppercase tracking-widest">Back</span>
          </button>
        )}
        
      </div>

      {/* 2. CENTER: Branding Relay */}
      <div className="flex flex-[3] justify-center items-center gap-2 md:gap-3">
        <div className="p-0.5 md:p-1 bg-white rounded-md md:rounded-lg overflow-hidden flex-shrink-0">
          <img 
            src={logoUrl} 
            alt="FaithHouse Logo" 
            className="h-8 md:h-12 w-auto object-contain block"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=F&background=007bff&color=fff&bold=true';
            }}
          />
        </div>
        <div className="flex flex-col justify-center text-center md:text-left">
            <h1 className="text-[10px] md:text-sm font-black tracking-tighter uppercase leading-none text-slate-900">
                FaithHouse <span className="text-blue-600">Chapel</span> Int'l
            </h1>
            <p className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 md:mt-1">Management System</p>
        </div>
      </div>

      {/* 3. RIGHT: Profile Hub */}
      <div className="flex-1 flex justify-end items-center gap-3 md:gap-6">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'Profile' }))}
              className="text-right leading-none hidden sm:block hover:opacity-70 transition-opacity"
            >
              <p className="text-[10px] font-black uppercase text-slate-900">{currentUser?.full_name || 'Faithhouse CMS'}</p>
              <p className="text-[8px] font-bold text-fh-gold uppercase tracking-tighter mt-0.5 flex items-center justify-end gap-1">
                <Shield className="w-2 h-2" />
                {currentUser?.role?.replace('_', ' ') || 'System'}
              </p>
            </button>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'Profile' }))}
              className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-slate-900 text-fh-gold flex items-center justify-center text-[8px] md:text-[10px] font-black border border-slate-200 uppercase shadow-sm hover:scale-105 transition-transform"
            >
              {currentUser?.full_name?.charAt(0) || 'F'}
            </button>
          </div>
        </div>
      </div>

    </header>
  );
};

export default Header;
