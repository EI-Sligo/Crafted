import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  Phone,
  MapPin,
  Briefcase,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Wrench,
  Zap,
  Play,
  CheckCircle2,
  AlertTriangle,
  Database,
  Key,
  RefreshCw,
  Globe,
  Navigation,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { authService } from '../services/authService';
import { storageService } from '../services/storage';
import { UserProfile, TradeType, GENERATION_APPRENTICESHIP_SECTORS, GeoLocation } from '../types';
import { IRISH_LOCATIONS, GLOBAL_LOCATIONS } from '../data/seedData';
import { useTheme } from '../context/ThemeContext';
import { autoDetectLocation } from '../services/locationService';
import { APP_CONFIG } from '../config/appConfig';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { isDark } = useTheme();
  const [appMode, setAppMode] = useState<'demo' | 'live'>(APP_CONFIG.EDITION);
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regTrade, setRegTrade] = useState<TradeType>('Electrician');
  const [regAccountType, setRegAccountType] = useState<'personal' | 'business'>('personal');
  const [regBusinessCategory, setRegBusinessCategory] = useState<'contractor_employer' | 'tool_manufacturer' | 'material_supplier'>('contractor_employer');
  const [regLocation, setRegLocation] = useState<GeoLocation>(GLOBAL_LOCATIONS[0] || IRISH_LOCATIONS[0]);
  const [regExperience, setRegExperience] = useState<number>(0);
  const [detectingRegGps, setDetectingRegGps] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const res = await authService.login(email, password, appMode);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setErrorMsg(res.error || 'Invalid credentials. Please check your email and password.');
    }
  };

  const handleDetectRegLocation = async () => {
    setDetectingRegGps(true);
    try {
      const res = await autoDetectLocation({ preferGps: true });
      setRegLocation(res.location);
    } catch {
      setErrorMsg('Could not detect GPS location. Please select your hub from the list.');
    } finally {
      setDetectingRegGps(false);
    }
  };

  const handleDemoLogin = (userId: string) => {
    const user = authService.loginAsDemoUser(userId);
    onLoginSuccess(user);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) {
      setErrorMsg('Please enter your name and email address.');
      return;
    }

    const newUser = await authService.registerNewUser({
      name: regName.trim(),
      email: regEmail.trim(),
      trade: regTrade,
      accountType: regAccountType,
      businessCategory: regAccountType === 'business' ? regBusinessCategory : undefined,
      phone: regPhone.trim(),
      location: regLocation,
      yearsExperience: Number(regExperience),
    } as any, appMode);

    onLoginSuccess(newUser);
  };

  // Demo users available for quick login
  const demoUsers = storageService.getUsers();

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 py-10 transition-colors ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      <div className="max-w-xl w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 mb-1">
            <Wrench className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{APP_CONFIG.APP_NAME}</h1>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {APP_CONFIG.APP_TAGLINE}
          </p>
        </div>

        {/* Card */}
        <div className={`rounded-3xl p-6 sm:p-8 border shadow-xl ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 mb-6">
            <button
              type="button"
              onClick={() => { setAuthMode('signin'); setErrorMsg(null); }}
              className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                authMode === 'signin'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setErrorMsg(null); }}
              className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                authMode === 'register'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Register New Account
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {authMode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.ie"
                    className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl text-xs transition cursor-pointer shadow-md flex items-center justify-center space-x-2"
              >
                <span>Sign In to {APP_CONFIG.APP_NAME}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Quick Guest / Preview exploration for testing on device */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const guest = authService.loginAsGuest();
                    onLoginSuccess(guest);
                  }}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center justify-center space-x-1.5 ${
                    isDark
                      ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Explore App in Preview / Guest Mode</span>
                </button>
              </div>

              {/* Demo Persona Login - Only rendered when running the dedicated Demo build */}
              {APP_CONFIG.IS_DEMO && (
                <div className="pt-4 border-t border-slate-700/40 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Instant Demo Persona Login:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {demoUsers.map((usr) => (
                      <button
                        key={usr.id}
                        type="button"
                        onClick={() => handleDemoLogin(usr.id)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center space-x-2.5 ${
                          isDark
                            ? 'bg-slate-800/60 border-slate-700/80 hover:border-amber-500/60 text-slate-200'
                            : 'bg-slate-50 border-slate-200 hover:border-amber-500 text-slate-800'
                        }`}
                      >
                        <img src={usr.avatar} alt={usr.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate">{usr.name}</div>
                          <div className="text-[10px] text-amber-500 truncate">{usr.trade}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Connor Kelly"
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="connor@trades.ie"
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Account Persona Type</label>
                  <select
                    value={regAccountType}
                    onChange={(e) => setRegAccountType(e.target.value as any)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="personal">Personal (Apprentice / Qualified / Sole Trader)</option>
                    <option value="business">Business (Employer / Tool or Material Manufacturer)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Trade Discipline</label>
                  <select
                    value={regTrade}
                    onChange={(e) => setRegTrade(e.target.value as TradeType)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {GENERATION_APPRENTICESHIP_SECTORS.flatMap((s) => s.trades).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {regAccountType === 'business' && (
                <div>
                  <label className="block text-xs font-semibold mb-1">Business Category</label>
                  <select
                    value={regBusinessCategory}
                    onChange={(e) => setRegBusinessCategory(e.target.value as any)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="contractor_employer">Contractor & Employer (Hiring site crews)</option>
                    <option value="tool_manufacturer">Tool Manufacturer (Power tools & equipment)</option>
                    <option value="material_supplier">Material Supplier (Building supplies & cables)</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    pattern="[0-9+ ]*"
                    placeholder="e.g. 087 123 4567"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 font-mono ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Years on Site / Experience</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={regExperience}
                    onChange={(e) => setRegExperience(Math.max(0, parseInt(e.target.value) || 0))}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 font-mono ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold">Location / Base of Operations</label>
                  <button
                    type="button"
                    onClick={handleDetectRegLocation}
                    disabled={detectingRegGps}
                    className="inline-flex items-center space-x-1 text-[11px] font-bold text-amber-500 hover:text-amber-400 cursor-pointer disabled:opacity-50"
                  >
                    <Navigation className={`w-3 h-3 ${detectingRegGps ? 'animate-spin' : ''}`} />
                    <span>{detectingRegGps ? 'Detecting GPS...' : 'Auto-Detect My GPS'}</span>
                  </button>
                </div>

                <select
                  value={`${regLocation.town}|${regLocation.county}`}
                  onChange={(e) => {
                    const [town, county] = e.target.value.split('|');
                    const found = [...GLOBAL_LOCATIONS, ...IRISH_LOCATIONS].find(
                      (l) => l.town === town && l.county === county
                    );
                    if (found) {
                      setRegLocation(found);
                    }
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <optgroup label="📍 Republic of Ireland">
                    {IRISH_LOCATIONS.map((loc) => (
                      <option key={`ie-${loc.town}-${loc.county}`} value={`${loc.town}|${loc.county}`}>
                        {loc.town}, Co. {loc.county} (Ireland)
                      </option>
                    ))}
                  </optgroup>

                  <optgroup label="🇬🇧 Northern Ireland & United Kingdom">
                    {GLOBAL_LOCATIONS.filter((l) => l.country === 'Northern Ireland' || l.country === 'United Kingdom').map((loc) => (
                      <option key={`uk-${loc.town}-${loc.county}`} value={`${loc.town}|${loc.county}`}>
                        {loc.town}, {loc.county} ({loc.country})
                      </option>
                    ))}
                  </optgroup>

                  <optgroup label="🇪🇺 Europe">
                    {GLOBAL_LOCATIONS.filter((l) => ['France', 'Germany', 'Netherlands', 'Spain', 'Italy', 'Poland', 'Sweden'].includes(l.country || '')).map((loc) => (
                      <option key={`eu-${loc.town}-${loc.county}`} value={`${loc.town}|${loc.county}`}>
                        {loc.town}, {loc.county} ({loc.country})
                      </option>
                    ))}
                  </optgroup>

                  <optgroup label="🇺🇸 🇨🇦 United States & Canada">
                    {GLOBAL_LOCATIONS.filter((l) => l.country === 'United States' || l.country === 'Canada').map((loc) => (
                      <option key={`na-${loc.town}-${loc.county}`} value={`${loc.town}|${loc.county}`}>
                        {loc.town}, {loc.county} ({loc.country})
                      </option>
                    ))}
                  </optgroup>

                  <optgroup label="🇦🇺 🇳🇿 Australia & New Zealand">
                    {GLOBAL_LOCATIONS.filter((l) => l.country === 'Australia' || l.country === 'New Zealand').map((loc) => (
                      <option key={`anz-${loc.town}-${loc.county}`} value={`${loc.town}|${loc.county}`}>
                        {loc.town}, {loc.county} ({loc.country})
                      </option>
                    ))}
                  </optgroup>
                </select>

                <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 pt-0.5">
                  <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="truncate">
                    Current: <strong className="text-slate-200">{regLocation.town}</strong>, {regLocation.county} {regLocation.country ? `(${regLocation.country})` : ''}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl text-xs transition cursor-pointer shadow-md flex items-center justify-center space-x-2"
              >
                <span>Register & Access Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const guest = authService.loginAsGuest();
                    onLoginSuccess(guest);
                  }}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center justify-center space-x-1.5 ${
                    isDark
                      ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Explore App in Preview / Guest Mode</span>
                </button>
              </div>
            </form>
          )}
        </div>

        <div className={`text-center text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
          Crafted • The Trade Network
        </div>
      </div>
    </div>
  );
};
