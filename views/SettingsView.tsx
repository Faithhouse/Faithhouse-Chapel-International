
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';
import { 
  Settings, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw,
  ExternalLink,
  Layout,
  Upload,
  Loader2,
  ShieldAlert,
  Navigation
} from 'lucide-react';
import { toast } from 'sonner';

interface SettingsViewProps {
  currentUser: UserProfile | null;
}

const SettingsView: React.FC<SettingsViewProps> = ({ currentUser }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [slideshowImages, setSlideshowImages] = useState<string[]>([]);
  const [dashboardBgs, setDashboardBgs] = useState({
    main: '',
    executive: '',
    youth: ''
  });
  const [bypassMaps, setBypassMaps] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const bgInputRef = React.useRef<HTMLInputElement>(null);
  const [activeBgTarget, setActiveBgTarget] = useState<'main' | 'executive' | 'youth' | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Fetch Login Slideshow
      const { data: slideshowData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('id', 'login_slideshow')
        .single();
      
      if (slideshowData && Array.isArray(slideshowData.value)) {
        setSlideshowImages(slideshowData.value);
      }

      // Fetch Dashboard Backgrounds
      const { data: bgData } = await supabase
        .from('system_settings')
        .select('id, value')
        .in('id', ['dashboard_bg_main', 'dashboard_bg_executive', 'dashboard_bg_youth', 'bypass_maps']);
      
      if (bgData) {
        const bgs = { ...dashboardBgs };
        bgData.forEach(item => {
          if (item.id === 'dashboard_bg_main') bgs.main = item.value;
          if (item.id === 'dashboard_bg_executive') bgs.executive = item.value;
          if (item.id === 'dashboard_bg_youth') bgs.youth = item.value;
          if (item.id === 'bypass_maps') setBypassMaps(item.value === true);
        });
        setDashboardBgs(bgs);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      toast.error('Failed to load system settings');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'slideshow' | 'main' | 'executive' | 'youth' = 'slideshow') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${target}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('system-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('system-assets')
        .getPublicUrl(filePath);

      if (target === 'slideshow') {
        setSlideshowImages([...slideshowImages, publicUrl]);
      } else {
        setDashboardBgs(prev => ({ ...prev, [target]: publicUrl }));
      }
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (bgInputRef.current) bgInputRef.current.value = '';
    }
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    if (!newImageUrl.startsWith('http')) {
      toast.error('Please enter a valid image URL');
      return;
    }
    setSlideshowImages([...slideshowImages, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    setSlideshowImages(slideshowImages.filter((_, i) => i !== index));
  };

  const handleSaveSettings = async () => {
    setIsSubmitting(true);
    try {
      // Save Slideshow
      const { error: sErr } = await supabase
        .from('system_settings')
        .upsert({
          id: 'login_slideshow',
          value: slideshowImages,
          updated_at: new Date().toISOString()
        });
      if (sErr) throw sErr;

      // Save Dashboard BGs & Map Settings
      const bgPromises = [
        supabase.from('system_settings').upsert({ id: 'dashboard_bg_main', value: dashboardBgs.main, updated_at: new Date().toISOString() }),
        supabase.from('system_settings').upsert({ id: 'dashboard_bg_executive', value: dashboardBgs.executive, updated_at: new Date().toISOString() }),
        supabase.from('system_settings').upsert({ id: 'dashboard_bg_youth', value: dashboardBgs.youth, updated_at: new Date().toISOString() }),
        supabase.from('system_settings').upsert({ id: 'bypass_maps', value: bypassMaps, updated_at: new Date().toISOString() })
      ];
      
      const results = await Promise.all(bgPromises);
      const firstError = results.find(r => r.error);
      if (firstError) throw firstError.error;

      toast.success('System settings updated successfully');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [showRepair, setShowRepair] = useState(false);

  const repairSQL = `-- 1. CREATE SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. CREATE STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public)
VALUES ('system-assets', 'system-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. ALLOW PUBLIC STORAGE ACCESS (For Internal Login System)
DROP POLICY IF EXISTS "Public View" ON storage.objects;
CREATE POLICY "Public View" ON storage.objects FOR SELECT TO public USING ( bucket_id = 'system-assets' );

DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT TO public WITH CHECK ( bucket_id = 'system-assets' );

DROP POLICY IF EXISTS "Public Update" ON storage.objects;
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE TO public USING ( bucket_id = 'system-assets' );

DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE TO public USING ( bucket_id = 'system-assets' );

-- 3. ALLOW PUBLIC SETTINGS ACCESS
DROP POLICY IF EXISTS "Allow public read settings" ON system_settings;
CREATE POLICY "Allow public read settings" ON system_settings FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public manage settings" ON system_settings;
CREATE POLICY "Allow public manage settings" ON system_settings FOR ALL TO public USING (true) WITH CHECK (true);`;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-900 text-fh-gold flex items-center justify-center text-2xl shadow-xl">
            <Settings className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Settings</h1>
            <p className="text-slate-500 font-medium">Configure global application assets and behavior</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowRepair(!showRepair)}
            className="px-6 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-100 transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${showRepair ? 'rotate-180' : ''} transition-transform`} />
            Database Repair
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={isSubmitting}
            className="px-8 py-4 bg-slate-900 text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {showRepair && (
        <div className="bg-rose-50 border-2 border-rose-100 rounded-[2.5rem] p-10 animate-in zoom-in-95 duration-300">
          <div className="flex items-start gap-6 mb-8">
            <div className="w-14 h-14 bg-rose-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-rose-900 uppercase tracking-tight">Fix Permissions (RLS Error)</h2>
              <p className="text-rose-600 font-bold text-sm mt-1 leading-relaxed">
                If you see "new row violates row-level security policy", your database is blocking guest uploads. 
                Since you are using the internal login system, you must grant public access to the storage bucket.
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-xs font-black text-rose-400 uppercase tracking-widest ml-1">Run this script in Supabase SQL Editor:</p>
            <pre className="bg-slate-900 text-fh-gold-pale p-8 rounded-3xl text-[11px] font-mono overflow-x-auto shadow-inner border border-rose-200/20 leading-relaxed">
              {repairSQL}
            </pre>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(repairSQL);
                toast.success('Repair script copied to clipboard!');
              }}
              className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-rose-600 transition-all active:scale-[0.98]"
            >
              Copy Repair Script
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Login Slideshow Management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                <Layout className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">Login Slideshow</h2>
                <p className="text-xs text-slate-500 font-medium">Manage the fullscreen background images on the login page</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Add New Image */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Paste image URL here..."
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-fh-gold/20 focus:border-fh-gold transition-all font-medium text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddImage}
                    className="flex-1 sm:flex-none px-6 py-4 bg-slate-900 text-fh-gold rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add URL
                  </button>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    accept="image/*"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex-1 sm:flex-none px-6 py-4 bg-fh-gold text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-fh-gold/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Import Image
                  </button>
                </div>
              </div>

              {/* Image List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {slideshowImages.map((url, index) => (
                  <div key={index} className="group relative aspect-video rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                    <img 
                      src={url} 
                      alt={`Slideshow ${index + 1}`} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/30 transition-all"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button 
                        onClick={() => handleRemoveImage(index)}
                        className="p-2 bg-rose-500/20 backdrop-blur-md rounded-lg text-rose-200 hover:bg-rose-500/40 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/40 backdrop-blur-sm rounded text-[8px] text-white font-black uppercase tracking-widest">
                      Image {index + 1}
                    </div>
                  </div>
                ))}
                
                {slideshowImages.length === 0 && (
                  <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                    <ImageIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">No images added yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Backgrounds Management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-fh-gold/10 text-fh-gold flex items-center justify-center">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">Dashboard Backgrounds</h2>
                <p className="text-xs text-slate-500 font-medium">Customize the faded background images for each module</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {([
                { id: 'main', label: 'Main Dashboard', current: dashboardBgs.main },
                { id: 'executive', label: 'Executive Oversight', current: dashboardBgs.executive },
                { id: 'youth', label: 'Youth & Children', current: dashboardBgs.youth }
              ] as const).map((bg) => (
                <div key={bg.id} className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{bg.label}</p>
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 group">
                    {bg.current ? (
                      <img src={bg.current} alt={bg.label} className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/40">
                      <button 
                        onClick={() => {
                          setActiveBgTarget(bg.id);
                          bgInputRef.current?.click();
                        }}
                        className="p-3 bg-white text-slate-900 rounded-xl shadow-xl hover:scale-110 transition-all"
                      >
                        <Upload className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={bg.current}
                    onChange={(e) => setDashboardBgs(prev => ({ ...prev, [bg.id]: e.target.value }))}
                    placeholder="Image URL..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-medium focus:ring-2 focus:ring-fh-gold/20"
                  />
                </div>
              ))}
            </div>
            <input 
              type="file" 
              ref={bgInputRef} 
              onChange={(e) => activeBgTarget && handleFileUpload(e, activeBgTarget)} 
              className="hidden" 
              accept="image/*"
            />
          </div>

          {/* Map Bypass Setting */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Map System Lock Bypass</h2>
                  <p className="text-xs text-slate-500 font-medium">Enable this if you encounter "navigator lockmanager" errors when loading maps</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={bypassMaps} 
                  onChange={(e) => setBypassMaps(e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-fh-gold"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl">
            <h3 className="text-fh-gold font-black uppercase tracking-widest text-xs mb-4">Configuration Guide</h3>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-fh-gold/20 flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
                  Use high-quality landscape images (at least 1920x1080) for the best fullscreen experience.
                </p>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-fh-gold/20 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
                  Direct image links from Unsplash, Google Drive (direct link), or your church website work best.
                </p>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-fh-gold/20 flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
                  Changes take effect immediately on the login page for all users once saved.
                </p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
