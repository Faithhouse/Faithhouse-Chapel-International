
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserRole } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const LoginView: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const logoUrl = "https://lh3.googleusercontent.com/d/1la57sO6NOuNEZaqa9zDxuxRnWPBavkjH";

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'signup') {
        // 1. Sign Up
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { first_name: firstName, last_name: lastName }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          // 2. Create Profile
          const { error: profileError } = await supabase.from('profiles').upsert([
            {
              id: authData.user.id,
              email,
              first_name: firstName,
              last_name: lastName,
              role: 'General Admin' as UserRole // Default role for new signups
            }
          ]);
          if (profileError) console.error("Profile creation failed:", profileError);
        }

        if (authData.user && !authData.session) {
          setSuccess("Account Created. Please check your email inbox to verify your account. Once verified, you can sign in.");
          // Don't auto-switch, let them see the message
        } else {
          setSuccess("Account Verified. Synchronizing Database...");
        }
      } else {
        // 1. Sign In
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          if (authError.message.includes("Email not confirmed")) {
            setError("ACCESS DENIED: Your account has not been verified via email yet. Please check your inbox or click below to resend.");
            return;
          }
          throw authError;
        }

        // 2. Auto-Repair Profile if missing
        if (authData.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', authData.user.id)
            .single();

          if (profileError || !profile) {
            console.warn("Missing profile detected. Synchronizing...");
            await supabase.from('profiles').upsert([
              {
                id: authData.user.id,
                email,
                first_name: 'Admin',
                last_name: 'User',
                role: 'System Administrator' as UserRole
              }
            ]);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 font-sans selection:bg-white selection:text-black">
      {/* Immersive Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-block p-3 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 mb-6"
          >
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="w-12 h-12 object-contain"
              onError={(e) => (e.currentTarget.src = 'https://ui-avatars.com/api/?name=F&background=000&color=fff')}
            />
          </motion.div>
          <h1 className="text-xl font-black text-white uppercase tracking-tighter mb-2">
            Faithhouse Chapel International
          </h1>
          <p className="text-white/40 text-[9px] font-bold uppercase tracking-[0.4em]">
            Authorized Staff Access
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-[11px] font-bold uppercase tracking-wider text-center space-y-4"
              >
                <p>{error}</p>
                {error.includes("verified via email") && (
                  <button 
                    onClick={async () => {
                      setLoading(true);
                      const { error: resendError } = await supabase.auth.resend({
                        type: 'signup',
                        email: email,
                      });
                      setLoading(false);
                      if (resendError) setError(resendError.message);
                      else setSuccess("Verification email resent. Please check your inbox.");
                    }}
                    className="block w-full py-2 bg-rose-500/20 hover:bg-rose-500/30 rounded-xl transition-all"
                  >
                    Resend Verification Email
                  </button>
                )}
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-[11px] font-bold uppercase tracking-wider text-center space-y-4"
              >
                <p>{success}</p>
                {mode === 'signup' && (
                  <button 
                    onClick={() => { setMode('login'); setSuccess(null); }}
                    className="block w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-xl transition-all"
                  >
                    Proceed to Login
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleAuth} className="space-y-6">
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-4">First Name</label>
                  <input 
                    required 
                    value={firstName} 
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:bg-white/10 focus:border-white/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-4">Last Name</label>
                  <input 
                    required 
                    value={lastName} 
                    onChange={e => setLastName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:bg-white/10 focus:border-white/20 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-4">Email Address</label>
              <input 
                type="email"
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                placeholder=""
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:bg-white/10 focus:border-white/20 outline-none transition-all placeholder:text-white/10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-4">Access Key</label>
              <input 
                type="password"
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:bg-white/10 focus:border-white/20 outline-none transition-all placeholder:text-white/10"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-blue-500 hover:text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/20 border-t-black animate-spin rounded-full"></div>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <button 
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-[10px] font-bold text-white/30 uppercase tracking-widest hover:text-white transition-colors"
            >
              {mode === 'login' ? "Need access? Request Account" : "Already registered? Return to Login"}
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.6em]">
            Faithhouse Chapel International • CMS v2.0
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginView;
