
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="mt-auto bg-white/50 backdrop-blur-md border-t border-slate-200/60 py-10 px-10 md:px-16">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <p className="text-[10px] text-fh-green font-extrabold uppercase tracking-[0.4em]">
            © 2026 FaithfulHouse Chapel International
          </p>
          <div className="hidden md:block w-2 h-2 bg-fh-gold rounded-full opacity-30"></div>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em]">Institutional Management Suite v1.2.0-PRO</p>
        </div>
        <div className="flex items-center gap-12">
          <a href="#" className="text-[10px] text-slate-400 hover:text-fh-gold transition-all font-black uppercase tracking-widest hover:translate-y-[-1px]">Compliance</a>
          <a href="#" className="text-[10px] text-slate-400 hover:text-fh-gold transition-all font-black uppercase tracking-widest hover:translate-y-[-1px]">Security</a>
          <a href="#" className="text-[10px] text-slate-400 hover:text-fh-gold transition-all font-black uppercase tracking-widest hover:translate-y-[-1px]">Infrastructure</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
