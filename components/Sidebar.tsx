
import React, { useState } from 'react';
import { NavItem, UserProfile } from '../types';
import { ChevronDown, ChevronRight, Baby, Zap, Shield, Users as UsersIcon, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  activeItem: NavItem | any;
  setActiveItem: (item: NavItem | any) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
}

interface MenuItem {
  name: string;
  icon: string | React.ReactNode;
  isHeader?: boolean;
  subItems?: MenuItem[];
  roles?: string[]; // Roles allowed to see this item
}

const menuItems: MenuItem[] = [
  { name: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { name: 'EXECUTIVE', icon: '', isHeader: true, roles: ['system_admin', 'general_overseer', 'admin', 'pastor'] },
  { name: 'General Overseer', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', roles: ['system_admin', 'general_overseer', 'admin', 'pastor'] },
  { name: 'CHURCH DETAILS', icon: '', isHeader: true },
  { 
    name: 'Church Leadership', 
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    roles: ['system_admin', 'general_overseer', 'admin', 'pastor']
  },
  { name: 'Members', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { name: 'Branches', icon: 'M19 21V5a2 2 0 00-2-2H7', roles: ['system_admin', 'general_overseer', 'admin', 'pastor', 'finance'] },
  { name: 'Attendance', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2', roles: ['system_admin', 'general_overseer', 'admin', 'pastor', 'worker'] },
  { name: 'OUTREACH', icon: '', isHeader: true, roles: ['system_admin', 'general_overseer', 'admin', 'pastor', 'media', 'worker'] },
  { name: 'WhatsApp Hub', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', roles: ['system_admin', 'general_overseer', 'admin', 'pastor', 'media'] },
  { name: 'FINANCE', icon: '', isHeader: true, roles: ['system_admin', 'general_overseer', 'admin', 'pastor', 'finance'] },
  { name: 'Finance', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2', roles: ['system_admin', 'general_overseer', 'admin', 'pastor', 'finance'] },
  { name: 'MINISTRIES', icon: '', isHeader: true },
  { name: 'Ministries', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16' },
  { 
    name: 'Youth & Children Ministry', 
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    subItems: [
      { name: 'Children Ministry', icon: 'Baby' },
      { name: 'Teens Ministry', icon: 'Zap' }
    ]
  },
  { name: 'Cell Meeting', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z' },
  { name: 'Upcoming Events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7' },
  { name: 'SYSTEM', icon: '', isHeader: true },
  { name: 'Recurring Tasks', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { name: 'Users', icon: <UsersIcon className="w-5 h-5" />, roles: ['system_admin', 'general_overseer', 'admin'] },
];

const Sidebar: React.FC<SidebarProps> = ({ activeItem, setActiveItem, isOpen, toggleSidebar, currentUser, onLogout }) => {
  // Direct download link format for Google Drive images
  const logoUrl = "https://lh3.googleusercontent.com/d/1la57sO6NOuNEZaqa9zDxuxRnWPBavkjH";

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.roles) return true;
    if (!currentUser) return false;
    const godRoles = ['system_admin', 'general_overseer'];
    return item.roles.includes(currentUser.role) || godRoles.includes(currentUser.role) || currentUser.email === 'systemadmin@faithhouse.church';
  });

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleSidebar}
      />

      <aside className={`fixed top-0 left-0 bottom-0 w-64 bg-cms-sidebar text-white z-50 transform transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          
          {/* LOGO & BRANDING SECTION */}
          <div className="p-6 flex items-center gap-3 border-b border-white/5 bg-[#2c3136]">
            <div className="bg-white p-1 rounded-lg shadow-lg flex-shrink-0 flex items-center justify-center">
              <img 
                src={logoUrl} 
                alt="FaithHouse Logo" 
                className="w-10 h-10 object-contain block"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=F&background=007bff&color=fff&bold=true';
                }}
              />
            </div>
            <div className="leading-tight overflow-hidden">
              <h1 className="text-sm font-black tracking-tight uppercase truncate">Faithhouse</h1>
              <p className="text-[10px] text-cms-blue font-bold uppercase tracking-widest">CMS v1.2</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-0.5">
              {filteredMenuItems.map((item, idx) => (
                <SidebarItem 
                  key={item.name} 
                  item={item} 
                  activeItem={activeItem} 
                  setActiveItem={setActiveItem} 
                  toggleSidebar={toggleSidebar} 
                />
              ))}
            </nav>
          </div>

          <div className="p-6 bg-[#2c3136] border-t border-white/5 space-y-4">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cms-accent flex items-center justify-center font-black text-xs border border-white/10 uppercase">
                  {currentUser?.full_name?.charAt(0) || 'F'}
                </div>
                <div className="overflow-hidden flex-1">
                   <p className="text-xs font-black truncate">{currentUser?.full_name || 'Faithhouse CMS'}</p>
                   <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{currentUser?.role?.replace('_', ' ') || 'Internal System'}</p>
                </div>
             </div>
             
             <button 
               onClick={onLogout}
               className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-rose-500/10 text-white/60 hover:text-rose-400 rounded-xl transition-all text-xs font-bold group"
             >
               <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
               <span className="uppercase tracking-widest">Sign Out</span>
             </button>
          </div>
        </div>
      </aside>
    </>
  );
};

const SidebarItem: React.FC<{
  item: MenuItem;
  activeItem: string;
  setActiveItem: (item: string) => void;
  toggleSidebar: () => void;
  isSubItem?: boolean;
}> = ({ item, activeItem, setActiveItem, toggleSidebar, isSubItem = false }) => {
  const hasSubItems = item.subItems && item.subItems.length > 0;
  const isChildActive = item.subItems?.some(sub => sub.name === activeItem);
  const [isExpanded, setIsExpanded] = useState(activeItem === item.name || isChildActive);
  const isActive = activeItem === item.name;

  // Sync expansion state if a child becomes active externally
  React.useEffect(() => {
    if (isChildActive) setIsExpanded(true);
  }, [isChildActive]);

  if (item.isHeader) {
    return (
      <div className="px-6 pt-6 pb-2 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
        {item.name}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => {
          if (hasSubItems) {
            setIsExpanded(!isExpanded);
          }
          setActiveItem(item.name);
          if (!hasSubItems && window.innerWidth < 1024) toggleSidebar();
        }}
        className={`w-full flex items-center justify-between px-6 py-3 text-xs font-bold transition-all ${
          isActive || (hasSubItems && isChildActive) ? 'sidebar-active' : 'text-white/60 hover:text-white hover:bg-white/5'
        } ${isSubItem ? 'pl-12' : ''}`}
      >
        <div className="flex items-center gap-4">
          {item.icon === 'Baby' ? (
            <Baby className={`w-5 h-5 ${isActive ? 'text-cms-blue' : 'text-white/30'}`} />
          ) : item.icon === 'Zap' ? (
            <Zap className={`w-5 h-5 ${isActive ? 'text-cms-blue' : 'text-white/30'}`} />
          ) : typeof item.icon === 'string' ? (
            <svg className={`w-5 h-5 ${isActive ? 'text-cms-blue' : 'text-white/30'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
          ) : (
            <span className={`${isActive ? 'text-cms-blue' : 'text-white/30'}`}>{item.icon}</span>
          )}
          <span className="uppercase tracking-wide">{item.name}</span>
        </div>
        {hasSubItems && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-white/30" />
          </motion.div>
        )}
      </button>

      <AnimatePresence>
        {hasSubItems && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {item.subItems?.map(sub => (
              <SidebarItem 
                key={sub.name} 
                item={sub} 
                activeItem={activeItem} 
                setActiveItem={setActiveItem} 
                toggleSidebar={toggleSidebar} 
                isSubItem={true}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Sidebar;
