
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
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface SettingsViewProps {
  currentUser: UserProfile | null;
}

const SettingsView: React.FC<SettingsViewProps> = ({ currentUser }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [slideshowImages, setSlideshowImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('id', 'login_slideshow')
        .single();
      
      if (data && Array.isArray(data.value)) {
        setSlideshowImages(data.value);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      toast.error('Failed to load system settings');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `slideshow/${fileName}`;

      // Upload to 'system-assets' bucket
      const { data, error: uploadError } = await supabase.storage
        .from('system-assets')
        .upload(filePath, file);

      if (uploadError) {
        // If bucket doesn't exist, we might need to create it or use public URL
        // In this environment, we'll try to use a public bucket if possible
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('system-assets')
        .getPublicUrl(filePath);

      setSlideshowImages([...slideshowImages, publicUrl]);
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image. Ensure "system-assets" bucket exists.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          id: 'login_slideshow',
          value: slideshowImages,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success('System settings updated successfully');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        
        <button
          onClick={handleSaveSettings}
          disabled={isSubmitting}
          className="px-8 py-4 bg-slate-900 text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

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
