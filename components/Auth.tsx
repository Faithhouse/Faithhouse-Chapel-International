
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { Mail, Lock, User, ShieldCheck, ArrowRight, Loader2, Github } from 'lucide-react';

interface AuthProps {
  onAuthSuccess: (userId: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Validate origin
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === 'github') {
        const githubUser = event.data.user;
        
        // In a real app with Supabase, you'd use the access token to sign in.
        // For this implementation, we'll use the email to "bridge" the session.
        // We'll attempt to find or create a profile for this user.
        
        setGithubLoading(true);
        setError(null);

        try {
          // Check if user exists in profiles
          const { data: existingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', githubUser.email)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
          }

          if (existingProfile) {
            // User exists, log them in
            onAuthSuccess(existingProfile.id);
          } else {
            // User doesn't exist, we'll "simulate" a signup by creating a profile
            // Note: In production, you'd use supabase.auth.admin to create the user first
            // but here we'll just use a deterministic ID based on the github_id for the demo
            const simulatedUserId = `github_${githubUser.github_id}`;
            
            const { error: createError } = await supabase.from('profiles').upsert([
              {
                id: simulatedUserId,
                email: githubUser.email,
                first_name: githubUser.name.split(' ')[0] || 'GitHub',
                last_name: githubUser.name.split(' ').slice(1).join(' ') || 'User',
                role: 'General Admin',
                avatar_url: githubUser.avatar
              }
            ]);

            if (createError) throw createError;
            onAuthSuccess(simulatedUserId);
          }
        } catch (err: any) {
          console.error('GitHub Bridge Error:', err);
          setError('GitHub synchronization failed: ' + err.message);
        } finally {
          setGithubLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGithubBridge = async () => {
    setGithubLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/github/url');
      if (!response.ok) throw new Error('Failed to initialize GitHub bridge');
      const { url } = await response.json();

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const authWindow = window.open(
        url,
        'github_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }
    } catch (err: any) {
      setError(err.message);
      setGithubLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (loginError) throw loginError;
        if (data.user) onAuthSuccess(data.user.id);
      } else {
        const { data, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              role: 'General Admin', // Default role
            },
          },
        });
        if (signupError) throw signupError;
        if (data.user) {
          alert('Registration successful! Please check your email for verification.');
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fh-gold/5 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-12">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-24 h-24 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl backdrop-blur-xl overflow-hidden p-4"
          >
            <img 
              src="https://lh3.googleusercontent.com/d/1la57sO6NOuNEZaqa9zDxuxRnWPBavkjH" 
              alt="FaithHouse Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=F&background=007bff&color=fff&bold=true';
              }}
            />
          </motion.div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Faithhouse Chapel international</h1>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.4em]">Authorized Personnel Access</p>
        </div>

        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-3xl">
          <div className="flex bg-black/40 p-1.5 rounded-2xl mb-10 border border-white/5">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLogin ? 'bg-white/10 text-white shadow-lg' : 'text-white/30 hover:text-white/60'}`}
            >
              Authentication
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isLogin ? 'bg-white/10 text-white shadow-lg' : 'text-white/30 hover:text-white/60'}`}
            >
              Registration
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-2">First Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input 
                        required
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-xs font-bold focus:ring-2 focus:ring-fh-gold/20 outline-none transition-all"
                        placeholder="John"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-2">Last Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input 
                        required
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-xs font-bold focus:ring-2 focus:ring-fh-gold/20 outline-none transition-all"
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-2">Identity Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input 
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-xs font-bold focus:ring-2 focus:ring-fh-gold/20 outline-none transition-all"
                  placeholder="admin@faithhouse.church"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-2">
                <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">Access Key</label>
                {isLogin && (
                  <button type="button" className="text-[8px] font-black text-fh-gold uppercase tracking-widest hover:underline">Lost Key?</button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input 
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-xs font-bold focus:ring-2 focus:ring-fh-gold/20 outline-none transition-all"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-[10px] font-bold uppercase tracking-widest text-center"
              >
                {error}
              </motion.div>
            )}

            <button 
              disabled={loading}
              type="submit"
              className="w-full py-5 bg-fh-gold text-fh-green rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl shadow-fh-gold/10 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Initialize Session' : 'Create Identity'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-[8px] font-black uppercase tracking-widest">
                <span className="bg-[#121212] px-4 text-white/20">External Protocols</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGithubBridge}
              disabled={githubLoading}
              className="w-full py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {githubLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Github className="w-4 h-4" />
                  Bridge with GitHub
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-12 text-center">
          <p className="text-white/20 text-[8px] font-black uppercase tracking-[0.5em]">Faithhouse Chapel International • Global Systems</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
