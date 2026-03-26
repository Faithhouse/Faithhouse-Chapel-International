
import React from 'react';
import { UserProfile } from '../types';
import { ArrowLeft } from 'lucide-react';

interface HeaderProps {
  toggleSidebar: () => void;
  userProfile: UserProfile | null;
  activeItem: string;
  onBack: () => void;
  hasHistory: boolean;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, userProfile, activeItem, onBack, hasHistory }) => {
  // Direct download link format for Google Drive
  const logoUrl = "https://lh3.googleusercontent.com/d/1la57sO6NOuNEZaqa9zDxuxRnWPBavkjH";

  return (
    <header className="sticky top-0 z-30 px-6 md:px-10 py-4 flex items-center justify-between bg-white text-slate-800 shadow-sm border-b border-slate-200">
      
      {/* 1. LEFT: Navigation Controller */}
      <div className="flex-1 flex justify-start items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all active:scale-90 border border-slate-200 text-slate-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {hasHistory && activeItem !== 'Dashboard' && (
          <button 
            onClick={onBack}
            className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all active:scale-90 border border-slate-200 text-slate-600"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Back</span>
          </button>
        )}
        
      </div>

      {/* 2. CENTER: Branding Relay */}
      <div className="hidden md:flex flex-[3] justify-center items-center gap-3">
        <div className="p-1 bg-white rounded-lg overflow-hidden">
          <img 
            src={logoUrl} 
            alt="FaithHouse Chapel International Logo" 
            className="h-12 w-auto object-contain block" // Adjusted height for better visibility
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=F&background=007bff&color=fff&bold=true';
            }}
          />
        </div>
        <div className="flex flex-col justify-center">
            <h1 className="text-sm font-black tracking-tighter uppercase leading-none text-slate-900">
                FaithHouse <span className="text-blue-600">Chapel</span> Int'l
            </h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Management System</p>
        </div>
      </div>

      {/* 3. RIGHT: Profile Hub */}
      <div className="flex-1 flex justify-end items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="text-right leading-none">
              <p className="text-[10px] font-black uppercase text-slate-900">{userProfile?.first_name} {userProfile?.last_name}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200 uppercase shadow-sm">
              {userProfile?.first_name?.[0]}{userProfile?.last_name?.[0]}
            </div>
          </div>
        </div>
      </div>

    </header>
  );
};

export default Header;
