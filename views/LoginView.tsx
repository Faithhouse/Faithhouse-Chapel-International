
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Mail, 
  Lock, 
  RefreshCw, 
  LogIn, 
  ShieldCheck,
  Zap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

const churchImages = [
  "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1548625361-195fe5772df8?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1477673332464-70cf35293696?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1523059623039-a240d06f214d?auto=format&fit=crop&q=80&w=1000"
];

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState<string[]>([
    "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80&w=1000",
    "https://images.unsplash.com/photo-1548625361-195fe5772df8?auto=format&fit=crop&q=80&w=1000",
    "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=1000",
    "https://images.unsplash.com/photo-1477673332464-70cf35293696?auto=format&fit=crop&q=80&w=1000",
    "https://images.unsplash.com/photo-1523059623039-a240d06f214d?auto=format&fit=crop&q=80&w=1000"
  ]);

  useEffect(() => {
    fetchSlideshowImages();
  }, []);

  const fetchSlideshowImages = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('id', 'login_slideshow')
        .single();
      
      if (data && Array.isArray(data.value)) {
        setImages(data.value);
      }
    } catch (err) {
      console.error('Error fetching slideshow images:', err);
    }
  };

  useEffect(() => {
    if (images.length === 0) return;
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [images]);

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

  // Direct download link format for Google Drive images
  const logoUrl = "https://lh3.googleusercontent.com/d/1la57sO6NOuNEZaqa9zDxuxRnWPBavkjH";

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0],
              role: 'system_admin'
            }
          }
        });
        if (error) throw error;
        toast.success('Account created! Please check your email for confirmation or try logging in.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Welcome back to FaithHouse CMS');
        onLoginSuccess();
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    // This is just a UI trigger, App.tsx handles the mock admin
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-6 font-sans overflow-hidden">
      {/* Fullscreen Background Slideshow */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <img
              src={images[currentImageIndex]}
              alt="Church Background"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* Dark Overlay with Gradient */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-transparent to-slate-900/80" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Login Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="bg-white/95 backdrop-blur-md rounded-[3rem] shadow-2xl overflow-hidden border border-white/20">
          <div className="p-10 text-center bg-slate-900/90 text-white relative overflow-hidden">
            {/* Background Accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-fh-gold/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            
            <div className="relative z-10">
              <div className="w-20 h-20 bg-white rounded-3xl p-2 mx-auto mb-6 shadow-xl flex items-center justify-center">
                <img 
                  src={logoUrl} 
                  alt="FaithHouse Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=F&background=007bff&color=fff&bold=true';
                  }}
                />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tighter">FaithHouse <span className="text-fh-gold">CMS</span></h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Management System v1.2</p>
            </div>
          </div>

          <div className="p-10">
            <div className="flex bg-slate-100/50 p-1 rounded-2xl mb-8">
              <button 
                onClick={() => setIsSignUp(false)}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Sign In
              </button>
              <button 
                onClick={() => setIsSignUp(true)}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Staff Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-fh-gold/20 focus:border-fh-gold transition-all font-medium text-slate-900"
                    placeholder="staff@faithhouse.church"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Key</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-fh-gold/20 focus:border-fh-gold transition-all font-medium text-slate-900"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-5 bg-slate-900 text-fh-gold rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    {isSignUp ? 'Creating Account...' : 'Authenticating...'}
                  </>
                ) : (
                  <>
                    {isSignUp ? <Zap className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                    {isSignUp ? 'Create Account' : 'Access System'}
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-slate-100 text-center">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Immediate Access</p>
              <button
                onClick={handleDemoLogin}
                className="w-full py-4 bg-fh-gold/10 text-fh-gold hover:bg-fh-gold/20 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                Continue as System Admin (Demo)
              </button>
            </div>
          </div>
        </div>

        {/* Branding Footer */}
        <div className="mt-12 text-center">
          <p className="text-white/60 font-black uppercase tracking-[0.4em] text-[10px] mb-2">FaithHouse Chapel International</p>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-8 bg-white/20" />
            <p className="text-fh-gold font-bold text-[8px] uppercase tracking-widest">Experience the Presence of God</p>
            <div className="h-px w-8 bg-white/20" />
          </div>
        </div>

        {/* Slideshow Controls (Floating) */}
        <div className="fixed bottom-8 right-8 flex gap-3">
          <button 
            onClick={prevImage}
            className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all border border-white/10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={nextImage}
            className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all border border-white/10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Indicators */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentImageIndex(idx)}
              className={`h-1 rounded-full transition-all ${idx === currentImageIndex ? 'w-8 bg-fh-gold' : 'w-2 bg-white/30 hover:bg-white/50'}`}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default LoginView;
