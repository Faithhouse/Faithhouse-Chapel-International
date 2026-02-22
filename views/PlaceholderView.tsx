
import React from 'react';

interface PlaceholderViewProps {
  title: string;
}

const PlaceholderView: React.FC<PlaceholderViewProps> = ({ title }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-10 animate-in fade-in duration-1000">
      <div className="relative group">
        <div className="absolute inset-0 bg-fh-gold blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
        <div className="relative w-32 h-32 bg-fh-green rounded-[3rem] flex items-center justify-center text-fh-gold shadow-2xl border border-fh-gold/20 transform hover:rotate-12 transition-all">
          <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 v2M7 7h10" />
          </svg>
        </div>
      </div>
      <div className="space-y-4">
        <h2 className="text-4xl font-extrabold text-fh-green tracking-tighter uppercase">{title}</h2>
        <p className="text-slate-500 max-w-md mx-auto text-lg font-medium leading-relaxed">
          The <span className="text-fh-gold font-bold">[{title}]</span> module is currently undergoing system initialization. Access will be provisioned in a future update.
        </p>
      </div>
      <button className="px-12 py-5 bg-fh-green text-fh-gold rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] hover:bg-black transition-all shadow-2xl shadow-fh-green/20 active:scale-95 border-b-4 border-fh-gold">
        Request Deployment
      </button>
    </div>
  );
};

export default PlaceholderView;
