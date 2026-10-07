import React, { useState } from 'react';
import { Mail, Lock, User, Home, ArrowRight, Beef, ShieldCheck, AlertCircle } from 'lucide-react';

export default function AuthModal({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const endpoint = isLogin ? '/api/login' : '/api/register';
    const payload = isLogin 
      ? { email, password }
      : { email, password, fullName, farmName };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'İşlem başarısız oldu');
      }

      // Save token and user info
      localStorage.setItem('rasyon_token', data.token);
      localStorage.setItem('rasyon_user', JSON.stringify(data.user));

      if (onAuthSuccess) {
        onAuthSuccess(data.user, data.token);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden">
        
        {/* Glow decoration */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-950/70 border border-emerald-800/50 shadow-inner mb-3">
            <img 
              src="/cattle-logo.jpg" 
              alt="RasyonPro" 
              className="w-12 h-12 rounded-xl object-cover" 
            />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Rasyon<span className="text-emerald-400">Pro</span> Girişi
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Büyükbaş Besi & Rasyon Sistemi Veritabanı
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl mb-5 border border-slate-800">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setErrorMsg(''); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              isLogin 
                ? 'bg-emerald-600 text-white shadow' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setErrorMsg(''); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              !isLogin 
                ? 'bg-emerald-600 text-white shadow' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Kayıt Ol
          </button>
        </div>

        {/* Error notice */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Ad Soyad</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Ahmet Yılmaz"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Çiftlik / İşletme Adı</label>
                <div className="relative">
                  <Home className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Bereket Besi Çiftliği"
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">E-Posta Adresi</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="ciftlik@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Şifre</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70"
          >
            <span>{loading ? 'İşleniyor...' : (isLogin ? 'Güvenli Giriş Yap' : 'Kayıt Ol ve Başla')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>Vercel PostgreSQL ile bulut üzerinde güvenli saklanır</span>
          </p>
        </div>
      </div>
    </div>
  );
}
