import React, { useState, useEffect } from 'react';
import { 
  Beef, 
  Sparkles, 
  Scale, 
  Coins, 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Layers, 
  HelpCircle,
  Share2,
  Download,
  Flame,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  BookOpen,
  Sliders,
  DollarSign,
  ChevronRight,
  Percent,
  Calculator,
  Warehouse,
  Activity,
  LogOut,
  UserCheck,
  CloudUpload,
  CloudCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { DEFAULT_FEEDS, BREED_OPTIONS, PERIOD_STAGES } from './data/feedsData';
import { calculateRequirements, evaluateRation } from './utils/nutritionEngine';
import { generateSmartRationOptimization, getAiConsultantAdvice } from './utils/aiConsultant';
import { exportRationPdf } from './utils/pdfExport';
import AuthModal from './components/AuthModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('ration');

  // User Auth State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('rasyon_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('rasyon_token') || '');
  const [showAuthModal, setShowAuthModal] = useState(!currentUser);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'

  // Animal & Group State
  const [animal, setAnimal] = useState(() => {
    const saved = localStorage.getItem('rasyon_animal');
    return saved ? JSON.parse(saved) : {
      paddockName: 'Padok 1 - Simental İleri Besi',
      headCount: 40,
      weight: 420,
      targetAdg: 1.45,
      breedId: 'simmental',
      periodId: 'grower',
      targetDays: 90
    };
  });

  // Feeds Library State
  const [feedLibrary, setFeedLibrary] = useState(() => {
    const saved = localStorage.getItem('rasyon_feed_library');
    return saved ? JSON.parse(saved) : DEFAULT_FEEDS;
  });

  // Active Ration Feed Quantities (feedId -> kg as fed)
  const [rationAmounts, setRationAmounts] = useState(() => {
    const saved = localStorage.getItem('rasyon_amounts');
    if (saved) return JSON.parse(saved);
    const initial = {};
    DEFAULT_FEEDS.forEach(f => {
      initial[f.id] = f.defaultKg;
    });
    return initial;
  });

  const [showAddFeedModal, setShowAddFeedModal] = useState(false);
  const [newFeed, setNewFeed] = useState({
    name: '',
    category: 'Kaba Yem',
    dm: 88,
    cp: 14,
    me: 2.4,
    nem: 1.6,
    neg: 1.0,
    ndf: 40,
    price: 8.5,
    isRoughage: false
  });

  const [feedSearch, setFeedSearch] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('rasyon_animal', JSON.stringify(animal));
  }, [animal]);

  useEffect(() => {
    localStorage.setItem('rasyon_feed_library', JSON.stringify(feedLibrary));
  }, [feedLibrary]);

  useEffect(() => {
    localStorage.setItem('rasyon_amounts', JSON.stringify(rationAmounts));
  }, [rationAmounts]);

  // Load from Postgres on login
  useEffect(() => {
    if (currentUser && authToken) {
      loadUserDataFromCloud();
    }
  }, [authToken]);

  const loadUserDataFromCloud = async () => {
    try {
      setSyncStatus('syncing');
      const res = await fetch('/api/sync', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      
      if (data.ration) {
        setAnimal(prev => ({
          ...prev,
          paddockName: data.ration.paddock_name || prev.paddockName,
          headCount: Number(data.ration.head_count) || prev.headCount,
          weight: Number(data.ration.weight) || prev.weight,
          targetAdg: Number(data.ration.target_adg) || prev.targetAdg,
          breedId: data.ration.breed_id || prev.breedId,
          periodId: data.ration.period_id || prev.periodId,
        }));
        if (data.ration.amounts_json && Object.keys(data.ration.amounts_json).length > 0) {
          setRationAmounts(data.ration.amounts_json);
        }
      }

      if (data.feeds && data.feeds.length > 0) {
        // Merge or replace feeds
        setFeedLibrary(data.feeds);
      }
      setSyncStatus('synced');
    } catch (e) {
      console.warn("Bulut senkronizasyon okunamadı, yerel veriler kullanılıyor", e);
      setSyncStatus('idle');
    }
  };

  const syncToCloud = async () => {
    if (!authToken) return;
    try {
      setSyncStatus('syncing');
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          animal,
          rationAmounts,
          feedLibrary
        })
      });
      if (res.ok) {
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } else {
        setSyncStatus('error');
      }
    } catch (e) {
      setSyncStatus('error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('rasyon_token');
    localStorage.removeItem('rasyon_user');
    setCurrentUser(null);
    setAuthToken('');
    setShowAuthModal(true);
  };

  const requirements = calculateRequirements(animal);
  
  const activeFeedsWithAmounts = feedLibrary.map(f => ({
    ...f,
    amountKg: rationAmounts[f.id] !== undefined ? Number(rationAmounts[f.id]) : 0
  }));

  const evaluation = evaluateRation(activeFeedsWithAmounts, requirements);
  const aiAdvice = getAiConsultantAdvice(animal, evaluation, activeFeedsWithAmounts);

  const handleAmountChange = (feedId, val) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setRationAmounts(prev => ({ ...prev, [feedId]: num }));
  };

  const handlePriceChange = (feedId, val) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setFeedLibrary(prev => prev.map(f => f.id === feedId ? { ...f, price: num } : f));
  };

  const handleSmartOptimize = () => {
    setIsAiThinking(true);
    setTimeout(() => {
      const optimized = generateSmartRationOptimization(animal, feedLibrary);
      setRationAmounts(prev => ({
        ...prev,
        ...optimized
      }));
      setIsAiThinking(false);
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    }, 600);
  };

  const handleAddCustomFeed = (e) => {
    e.preventDefault();
    if (!newFeed.name.trim()) return;
    const feedItem = {
      ...newFeed,
      id: `custom-${Date.now()}`,
      maxPctDm: 50,
      defaultKg: 0,
      unit: 'kg'
    };
    setFeedLibrary(prev => [feedItem, ...prev]);
    setRationAmounts(prev => ({ ...prev, [feedItem.id]: 0 }));
    setShowAddFeedModal(false);
    setNewFeed({
      name: '',
      category: 'Kaba Yem',
      dm: 88,
      cp: 14,
      me: 2.4,
      nem: 1.6,
      neg: 1.0,
      ndf: 40,
      price: 8.5,
      isRoughage: false
    });
  };

  const handleDeleteFeed = (id) => {
    setFeedLibrary(prev => prev.filter(f => f.id !== id));
    const nextAmounts = { ...rationAmounts };
    delete nextAmounts[id];
    setRationAmounts(nextAmounts);
  };

  const handleDownloadPdf = () => {
    const breed = BREED_OPTIONS.find(b => b.id === animal.breedId);
    const period = PERIOD_STAGES.find(p => p.id === animal.periodId);
    exportRationPdf(
      {
        ...animal,
        breedName: breed ? breed.name : 'Melez',
        periodName: period ? period.name : 'Besi'
      },
      requirements,
      evaluation,
      activeFeedsWithAmounts,
      animal.headCount
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-24 flex flex-col items-center">
      {/* Auth Modal Trigger / Gate */}
      {showAuthModal && (
        <AuthModal 
          onAuthSuccess={(user, token) => {
            setCurrentUser(user);
            setAuthToken(token);
            setShowAuthModal(false);
          }} 
        />
      )}

      {/* Mobile Top App Header with Custom Bull Logo */}
      <header className="w-full max-w-md bg-emerald-950/90 text-white shadow-xl sticky top-0 z-40 px-4 py-3 backdrop-blur-lg border-b border-emerald-800/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Custom Generated Logo */}
            <div className="relative">
              <img 
                src="/cattle-logo.jpg" 
                alt="RasyonPro Logo" 
                className="w-11 h-11 rounded-2xl object-cover ring-2 ring-emerald-400/50 shadow-md shadow-emerald-950" 
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-emerald-950 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-black tracking-tight text-white leading-tight">
                  Rasyon<span className="text-emerald-400">Pro</span>
                </h1>
                <span className="text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.2 rounded uppercase">
                  Besi
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80 font-medium">
                {currentUser ? `${currentUser.farmName || currentUser.fullName}` : 'Büyükbaş Akıllı Besleme'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Cloud Sync Button */}
            <button
              onClick={syncToCloud}
              className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
                syncStatus === 'synced'
                  ? 'bg-emerald-600 border-emerald-400 text-white'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-600/80 border-amber-500 text-white animate-pulse'
                  : 'bg-emerald-900/80 border-emerald-700/50 text-emerald-200 hover:bg-emerald-800'
              }`}
              title="PostgreSQL Veritabanına Kaydet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleSmartOptimize}
              disabled={isAiThinking}
              className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 px-2.5 py-2 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAiThinking ? 'animate-spin' : ''}`} />
              <span>{isAiThinking ? '...' : 'Oto'}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="p-2 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/50 transition-colors"
              title="PDF İndir"
            >
              <Download className="w-4 h-4" />
            </button>

            {currentUser && (
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40 transition-colors"
                title="Çıkış Yap"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Live Top Stats Strip */}
        <div className="mt-2.5 pt-2 border-t border-emerald-800/40 grid grid-cols-3 text-center text-xs">
          <div>
            <span className="block text-[10px] text-emerald-300/70 font-medium">Günlük / Baş</span>
            <span className="font-extrabold text-sm text-white">{evaluation.totalCostTL} ₺</span>
          </div>
          <div className="border-x border-emerald-800/40">
            <span className="block text-[10px] text-emerald-300/70 font-medium">Tahmini Artış</span>
            <span className="font-extrabold text-sm text-emerald-400">+{evaluation.predictedAdg} kg</span>
          </div>
          <div>
            <span className="block text-[10px] text-emerald-300/70 font-medium">1 kg Et Maliyeti</span>
            <span className="font-extrabold text-sm text-amber-300">{evaluation.costPerKgGain} ₺</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-md px-3.5 pt-3 pb-6">

        {/* TAB 1: RASYON DÜZENLEME & BESİN DENGESİ */}
        {activeTab === 'ration' && (
          <div className="space-y-3.5">
            {/* Visual Cattle Feedlot Hero Card */}
            <div className="relative rounded-2xl overflow-hidden shadow-lg border border-slate-700/60 bg-slate-800">
              <img 
                src="/cattle-banner.jpg" 
                alt="Büyükbaş Besi Çiftliği" 
                className="w-full h-32 object-cover object-center filter brightness-90 hover:scale-105 transition-transform duration-700" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent flex flex-col justify-end p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 block">
                      Aktif Sürü Grubu
                    </span>
                    <h3 className="text-white font-black text-sm drop-shadow-md">
                      {animal.paddockName}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setActiveTab('paddock')}
                    className="bg-emerald-500/90 hover:bg-emerald-500 text-slate-950 text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-md transition-colors flex items-center gap-1"
                  >
                    <span>{animal.weight} kg</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Health & Asidosis Alert Card */}
            {evaluation.alerts.length > 0 && (
              <div className="space-y-2">
                {evaluation.alerts.map((al, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-2xl border flex items-start gap-2.5 text-xs shadow-sm ${
                      al.type === 'danger' 
                        ? 'bg-rose-950/40 border-rose-800/80 text-rose-200' 
                        : al.type === 'warning'
                        ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                        : 'bg-blue-950/40 border-blue-800/80 text-blue-200'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <div className="flex-1">
                      <p className="font-bold">{al.title}</p>
                      <p className="mt-0.5 opacity-90 leading-relaxed text-[11px]">{al.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Nutrient Balance Indicators */}
            <div className="bg-slate-800/90 rounded-2xl p-4 shadow-md border border-slate-700/70">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  NRC Besin Maddesi Dengesi
                </span>
                <span className="text-emerald-400/90 font-mono text-[10px]">KM Bazında</span>
              </h2>

              <div className="space-y-3">
                {/* 1. Kuru Madde */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-300">Kuru Madde Tüketimi (DMI)</span>
                    <span className="font-bold text-white">
                      {evaluation.totalDmKg} kg / <span className="text-slate-400">{requirements.dmiTarget} kg</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden flex">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        evaluation.totalDmKg < requirements.dmiTarget * 0.9 ? 'bg-amber-500' :
                        evaluation.totalDmKg > requirements.dmiTarget * 1.1 ? 'bg-blue-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (evaluation.totalDmKg / (requirements.dmiTarget || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* 2. Ham Protein (CP %) */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-300">Ham Protein (HP / KM%)</span>
                    <span className="font-bold text-white">
                      %{evaluation.cpPct} / <span className="text-slate-400">%{requirements.cpPctMin}</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        evaluation.cpPct < requirements.cpPctMin ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (evaluation.cpPct / (requirements.cpPctMin || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* 3. Kaba Yem Oranı */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-300">Kaba Yem Oranı (Rumen Sağlığı)</span>
                    <span className="font-bold text-white">
                      %{evaluation.roughageDmPct} / <span className="text-slate-400">Min %{requirements.minRoughageDmPct}</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        evaluation.roughageDmPct < requirements.minRoughageDmPct ? 'bg-rose-500' : 'bg-teal-500'
                      }`}
                      style={{ width: `${Math.min(100, (evaluation.roughageDmPct / 40) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* 4. Ca : P Oranı & Enerji */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/60 text-xs">
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block">Metabolik Enerji (ME)</span>
                    <span className="font-bold text-white">{evaluation.mePerKgDm} Mcal/kg KM</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block">Kalsiyum / Fosfor (Ca:P)</span>
                    <span className={`font-bold ${evaluation.caPRatio < 1.3 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {evaluation.caPRatio} : 1
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feeds In Ration List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Rasyondaki Yemler ({activeFeedsWithAmounts.filter(f => f.amountKg > 0).length} Çeşit)
                </h3>
                <span className="text-xs text-slate-300">
                  Doğal Tartım: <strong className="text-emerald-400 font-extrabold">{evaluation.totalAsFedKg} kg</strong>
                </span>
              </div>

              {feedLibrary.map(feed => {
                const currentKg = rationAmounts[feed.id] !== undefined ? rationAmounts[feed.id] : 0;
                const cost = (currentKg * feed.price).toFixed(2);
                const isSelected = currentKg > 0;

                return (
                  <div 
                    key={feed.id} 
                    className={`rounded-2xl p-3 border transition-all shadow-sm ${
                      isSelected 
                        ? 'bg-slate-800 border-emerald-500/60 ring-1 ring-emerald-500/20' 
                        : 'bg-slate-850 border-slate-750 opacity-60'
                    }`}
                    style={{ backgroundColor: isSelected ? '#1e293b' : '#182030' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-white">{feed.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            feed.isRoughage ? 'bg-amber-950 text-amber-300 border border-amber-800/40' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {feed.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 space-x-2">
                          <span>KM: %{feed.dm}</span>
                          <span>HP: %{feed.cp}</span>
                          <span className="text-emerald-400/90 font-medium">{feed.price} ₺/kg</span>
                        </div>
                      </div>

                      {/* Number Input Box */}
                      <div className="flex items-center gap-1.5">
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={currentKg}
                            onChange={(e) => handleAmountChange(feed.id, e.target.value)}
                            className="w-20 px-2 py-1.5 text-right font-extrabold text-white bg-slate-900 border border-slate-700 rounded-xl focus:border-emerald-500 focus:outline-none text-sm"
                          />
                          <span className="absolute left-2 top-2 text-[10px] text-slate-400 uppercase pointer-events-none">
                            kg
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stepper & Slider */}
                    <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAmountChange(feed.id, Math.max(0, currentKg - 0.5))}
                          className="w-7 h-7 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-lg text-white font-bold flex items-center justify-center transition-colors"
                        >
                          -
                        </button>
                        <button
                          onClick={() => handleAmountChange(feed.id, currentKg + 0.5)}
                          className="w-7 h-7 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-lg text-white font-bold flex items-center justify-center transition-colors"
                        >
                          +
                        </button>
                        <button
                          onClick={() => handleAmountChange(feed.id, 0)}
                          className="text-[11px] text-slate-400 hover:text-rose-400 ml-1 px-1.5 py-0.5 rounded transition-colors"
                        >
                          Sıfırla
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-slate-400 text-[11px]">Maliyet: </span>
                        <span className="font-extrabold text-emerald-400">{cost} ₺</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: YEM KÜTÜPHANESİ & FİYAT GÜNCELLEME */}
        {activeTab === 'feeds' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Yem Kütüphanesi</h2>
                <p className="text-xs text-slate-400">Ham madde fiyatları ve besin değerleri</p>
              </div>
              <button
                onClick={() => setShowAddFeedModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Yem Ekle</span>
              </button>
            </div>

            {/* Search Box */}
            <div className="bg-slate-800 rounded-xl p-2 border border-slate-700 shadow flex items-center gap-2">
              <input
                type="text"
                placeholder="Yem adı ile ara (arpa, silaj, küspe...)"
                value={feedSearch}
                onChange={(e) => setFeedSearch(e.target.value)}
                className="flex-1 bg-transparent px-2 py-1 text-xs text-white placeholder-slate-400 focus:outline-none"
              />
              {feedSearch && (
                <button onClick={() => setFeedSearch('')} className="text-slate-400 hover:text-white text-xs px-1">
                  ✕
                </button>
              )}
            </div>

            {/* Feeds Cards for Editing Prices */}
            <div className="space-y-2.5">
              {feedLibrary
                .filter(f => f.name.toLowerCase().includes(feedSearch.toLowerCase()))
                .map(feed => (
                  <div key={feed.id} className="bg-slate-800 rounded-2xl p-3.5 border border-slate-700 shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-white">{feed.name}</h4>
                        <span className="inline-block text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full mt-0.5 font-medium">
                          {feed.category}
                        </span>
                      </div>
                      {feed.id.startsWith('custom-') && (
                        <button
                          onClick={() => handleDeleteFeed(feed.id)}
                          className="text-slate-400 hover:text-rose-400 p-1 transition-colors"
                          title="Yemi Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 my-2.5 py-2 border-y border-slate-700/60 text-center text-xs">
                      <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-700/40">
                        <span className="text-[10px] text-slate-400 block">Kuru Madde</span>
                        <span className="font-semibold text-white">%{feed.dm}</span>
                      </div>
                      <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-700/40">
                        <span className="text-[10px] text-slate-400 block">Ham Protein</span>
                        <span className="font-semibold text-emerald-400">%{feed.cp}</span>
                      </div>
                      <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-700/40">
                        <span className="text-[10px] text-slate-400 block">ME Mcal</span>
                        <span className="font-semibold text-white">{feed.me}</span>
                      </div>
                      <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-700/40">
                        <span className="text-[10px] text-slate-400 block">NDF Lif</span>
                        <span className="font-semibold text-white">%{feed.ndf}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">Kilogram Satın Alma Fiyatı:</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={feed.price}
                          onChange={(e) => handlePriceChange(feed.id, e.target.value)}
                          className="w-20 px-2 py-1 text-right font-extrabold text-white bg-slate-900 border border-slate-600 rounded-lg focus:border-emerald-500 focus:outline-none"
                        />
                        <span className="font-bold text-slate-300">₺/kg</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 3: SÜRÜ & PADOK YÖNETİMİ */}
        {activeTab === 'paddock' && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h2 className="text-base font-bold text-white">Sürü & Padok Parametreleri</h2>
              <p className="text-xs text-slate-400">Hayvan ağırlığı, ırk özellikleri ve hedef kilo artışı</p>
            </div>

            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 shadow space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Padok / Grup İsmi</label>
                <input
                  type="text"
                  value={animal.paddockName}
                  onChange={(e) => setAnimal(a => ({ ...a, paddockName: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Padok Hayvan Sayısı</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={animal.headCount}
                      onChange={(e) => setAnimal(a => ({ ...a, headCount: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">Baş</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Ortalama Canlı Ağırlık</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="150"
                      max="900"
                      step="10"
                      value={animal.weight}
                      onChange={(e) => setAnimal(a => ({ ...a, weight: parseFloat(e.target.value) || 300 }))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">kg</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-300">Hedef Canlı Ağırlık Artışı (GDCA)</label>
                  <span className="text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded-full">
                    {animal.targetAdg} kg / gün
                  </span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="2.0"
                  step="0.05"
                  value={animal.targetAdg}
                  onChange={(e) => setAnimal(a => ({ ...a, targetAdg: parseFloat(e.target.value) }))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>0.8 kg (Yavaş)</span>
                  <span>1.4 kg (Standart)</span>
                  <span>2.0 kg (Yoğun Besi)</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Besi Irkı / Genotipi</label>
                <div className="grid grid-cols-1 gap-2">
                  {BREED_OPTIONS.map(br => (
                    <button
                      key={br.id}
                      onClick={() => setAnimal(a => ({ ...a, breedId: br.id }))}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                        animal.breedId === br.id 
                          ? 'border-emerald-500 bg-emerald-950/50 text-white font-semibold ring-1 ring-emerald-500' 
                          : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-white">{br.name}</div>
                        <div className="text-[11px] text-slate-400">{br.frameSize}</div>
                      </div>
                      {animal.breedId === br.id && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculated Requirements Table */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 shadow">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Bilimsel NRC İhtiyaç Hesapları
              </h3>
              <div className="divide-y divide-slate-700/60 text-xs">
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Maksimum İştah Kapasitesi (KM):</span>
                  <span className="font-bold text-white">{requirements.dmiTarget} kg KM / gün</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Gereken Ham Protein Miktarı:</span>
                  <span className="font-bold text-emerald-400">{requirements.cpReqGrams} g/gün (%{requirements.cpPctMin})</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Net Enerji Yaşama Payı (NEm):</span>
                  <span className="font-bold text-white">{requirements.nemReq} Mcal/gün</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Net Enerji Büyüme Payı (NEg):</span>
                  <span className="font-bold text-white">{requirements.negReq} Mcal/gün</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Kalsiyum (Ca) / Fosfor (P):</span>
                  <span className="font-bold text-white">{requirements.caReqGrams}g / {requirements.pReqGrams}g</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: YAPAY ZEKA DANIŞMANI */}
        {activeTab === 'ai' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 rounded-2xl p-4 text-white shadow-lg border border-emerald-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <h2 className="text-base font-bold">Akıllı Besi & Rasyon Danışmanı</h2>
              </div>
              <p className="text-xs text-emerald-100/90 leading-relaxed">
                Yapay zeka algoritması sürünüzün canlı ağırlığını, hedeflenen kilo artışını ve mevcut yem fiyatlarını analiz ederek profesyonel zooteknist tavsiyeleri üretir.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleSmartOptimize}
                  disabled={isAiThinking}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow active:scale-95 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>En Ucuz & Dengeli Rasyonu Oluştur</span>
                </button>
              </div>
            </div>

            {/* Advice Cards */}
            <div className="space-y-3">
              {aiAdvice.map((adv, idx) => (
                <div key={idx} className="bg-slate-800 rounded-2xl p-4 border border-slate-700 shadow">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center font-bold text-xs">
                      #{idx + 1}
                    </div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-white">{adv.category}</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed pl-9">{adv.text}</p>
                </div>
              ))}
            </div>

            {/* Mixing & TMR Guidance */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 shadow">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Besi Rasyonu Saha Kuralları</span>
              </h3>
              <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
                <li>Kesif yeme geçiş kademeli yapılmalı, en az 14 güne yayılmalıdır.</li>
                <li>Yemlikler her sabah boşaltılıp süpürülmeli, kızışmış silaj ve küflü yemler atılmalıdır.</li>
                <li>Tosun başına en az 8-10 cm yemlik boyu ve 24 saat kesintisiz taze su temin edilmelidir.</li>
                <li>Ahır içi havalandırma iyi olmalı, amonyak kokusu hayvanların ciğerlerini yormamalıdır.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 5: MALİYET & KÂRLILIK ANALİZİ & YEM KARMA */}
        {activeTab === 'economics' && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h2 className="text-base font-bold text-white">Maliyet & Karma Vagonu Hesabı</h2>
              <p className="text-xs text-slate-400">TMR Dağıtım reçetesi ve besi kârlılık projeksiyonu</p>
            </div>

            {/* Big Economics Card */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 shadow">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Ekonomik Göstergeler</h3>
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-emerald-900/40">
                  <span className="text-[11px] text-emerald-400 block font-medium">1 Hayvan Günlük Maliyet</span>
                  <span className="text-xl font-black text-white">{evaluation.totalCostTL} ₺</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Toplam yem masrafı</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-blue-900/40">
                  <span className="text-[11px] text-blue-400 block font-medium">Padok Günlük Toplam</span>
                  <span className="text-xl font-black text-white">
                    {(evaluation.totalCostTL * animal.headCount).toLocaleString('tr-TR')} ₺
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{animal.headCount} baş hayvan</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-amber-900/40">
                  <span className="text-[11px] text-amber-400 block font-medium">1 kg Canlı Kilo Maliyeti</span>
                  <span className="text-xl font-black text-amber-300">{evaluation.costPerKgGain} ₺</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Yem dönüşümü maliyeti</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-purple-900/40">
                  <span className="text-[11px] text-purple-400 block font-medium">Yemden Yararlanma (FCR)</span>
                  <span className="text-xl font-black text-white">{evaluation.fcr}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">kg KM Yem / kg Artış</span>
                </div>
              </div>
            </div>

            {/* Batch Mixer / TMR Mixing Wagon Recipe */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 shadow">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Yem Karma Makinesi (TMR) Reçetesi
                  </h3>
                  <p className="text-[11px] text-slate-400">{animal.headCount} baş hayvan için toplam tartım</p>
                </div>
                <button
                  onClick={handleDownloadPdf}
                  className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF Çıktı</span>
                </button>
              </div>

              <div className="divide-y divide-slate-700/60 text-xs">
                {activeFeedsWithAmounts
                  .filter(f => f.amountKg > 0)
                  .map(f => {
                    const batchAmount = (f.amountKg * animal.headCount).toFixed(1);
                    return (
                      <div key={f.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white">{f.name}</p>
                          <p className="text-[10px] text-slate-400">Hayvan başı: {f.amountKg} kg</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-emerald-400">{batchAmount} kg</span>
                          <span className="block text-[10px] text-slate-400">vagon tartımı</span>
                        </div>
                      </div>
                    );
                  })}

                <div className="py-3 flex items-center justify-between font-bold text-white bg-emerald-950/60 border border-emerald-800 px-3 rounded-xl mt-2">
                  <span>TOPLAM KARIŞIM TARTIMI:</span>
                  <span className="text-base font-black text-emerald-400">
                    {(evaluation.totalAsFedKg * animal.headCount).toFixed(1)} kg
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Floating Bottom Navigation Bar (Mobile Native Look) */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-2 py-2 flex items-center justify-around z-50 shadow-2xl">
        <button
          onClick={() => setActiveTab('ration')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'ration' 
              ? 'text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/40' 
              : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
        >
          <Scale className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Rasyon</span>
        </button>

        <button
          onClick={() => setActiveTab('feeds')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'feeds' 
              ? 'text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/40' 
              : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Yemler</span>
        </button>

        <button
          onClick={() => setActiveTab('paddock')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'paddock' 
              ? 'text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/40' 
              : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
        >
          <Beef className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Padok</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'ai' 
              ? 'text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/40' 
              : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
        >
          <Sparkles className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Yapay Zeka</span>
        </button>

        <button
          onClick={() => setActiveTab('economics')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            activeTab === 'economics' 
              ? 'text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/40' 
              : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
        >
          <Coins className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Maliyet</span>
        </button>
      </nav>

      {/* Add Custom Feed Modal */}
      {showAddFeedModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Özel Yem Ekle</h3>
              <button 
                onClick={() => setShowAddFeedModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomFeed} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Yem Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Pamuk Tohumu Küspesi"
                  value={newFeed.name}
                  onChange={(e) => setNewFeed(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Kategori</label>
                  <select
                    value={newFeed.category}
                    onChange={(e) => setNewFeed(f => ({ ...f, category: e.target.value, isRoughage: e.target.value === 'Kaba Yem' }))}
                    className="w-full px-2 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Kaba Yem">Kaba Yem</option>
                    <option value="Tane Yem (Enerji)">Tane Yem</option>
                    <option value="Protein Kaynağı">Protein Kaynağı</option>
                    <option value="Yan Ürün">Yan Ürün</option>
                    <option value="Sanayi Yemi">Sanayi Yemi</option>
                    <option value="Mineral / Katkı">Mineral / Katkı</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Fiyat (TL/kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newFeed.price}
                    onChange={(e) => setNewFeed(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Kuru Madde (%)</label>
                  <input
                    type="number"
                    value={newFeed.dm}
                    onChange={(e) => setNewFeed(f => ({ ...f, dm: parseFloat(e.target.value) || 88 }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Ham Protein (%)</label>
                  <input
                    type="number"
                    value={newFeed.cp}
                    onChange={(e) => setNewFeed(f => ({ ...f, cp: parseFloat(e.target.value) || 12 }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">ME (Mcal/kg KM)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={newFeed.me}
                    onChange={(e) => setNewFeed(f => ({ ...f, me: parseFloat(e.target.value) || 2.4 }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">NDF Lif (%)</label>
                  <input
                    type="number"
                    value={newFeed.ndf}
                    onChange={(e) => setNewFeed(f => ({ ...f, ndf: parseFloat(e.target.value) || 35 }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddFeedModal(false)}
                  className="w-1/2 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
