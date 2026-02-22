
import React from 'react';

interface StatsCardProps {
  label: string;
  value: string;
  trend: string;
  isPositive?: boolean;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}

const StatsCard: React.FC<StatsCardProps> = ({ label, value, trend, isPositive = true, icon, color, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`royal-card p-4 rounded-2xl relative overflow-hidden group ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className={`p-2.5 rounded-xl shadow-sm transition-all group-hover:scale-105 duration-500 bg-opacity-10 ${color}`}>
          <div className={`${color.replace('bg-', 'text-')} scale-75`}>
            {icon}
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${isPositive ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100'}`}>
          {isPositive ? '↑' : '↓'} {trend}
        </div>
      </div>
      
      <div className="relative z-10">
        <p className="text-slate-400 text-[8px] font-black uppercase tracking-[0.2em] mb-0.5">{label}</p>
        <h3 className="text-xl font-black text-fh-green tracking-tighter leading-none group-hover:text-fh-gold transition-colors">{value}</h3>
      </div>
    </div>
  );
};

export default StatsCard;
