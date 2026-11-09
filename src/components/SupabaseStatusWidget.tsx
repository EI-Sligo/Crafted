import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  WifiOff,
  Settings,
  Key,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Save,
  Trash2,
  Info,
} from 'lucide-react';
import {
  supabase,
  isSupabaseConfigured,
  getActiveSupabaseUrl,
  getActiveSupabaseAnonKey,
  getSupabaseConfigDiagnostics,
  updateSupabaseCredentials,
} from '../services/supabaseClient';
import { useTheme } from '../context/ThemeContext';

export const SupabaseStatusWidget: React.FC = () => {
  const { isDark } = useTheme();
  const [status, setStatus] = useState<'checking' | 'connected' | 'unconfigured' | 'error'>('checking');
  const [userCount, setUserCount] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // In-app credentials configuration state
  const [showConfig, setShowConfig] = useState(false);
  const [inputUrl, setInputUrl] = useState(getActiveSupabaseUrl());
  const [inputKey, setInputKey] = useState(getActiveSupabaseAnonKey());
  const [saveSuccess, setSaveSuccess] = useState(false);

  const diagnostics = getSupabaseConfigDiagnostics();

  const checkConnection = async () => {
    setStatus('checking');
    setErrorMessage(null);

    if (!isSupabaseConfigured()) {
      setStatus('unconfigured');
      setUserCount(null);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (error) {
        setStatus('error');
        setErrorMessage(error.message);
      } else {
        setStatus('connected');
        setUserCount(count || 0);
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Connection failed');
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = updateSupabaseCredentials(inputUrl, inputKey);
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      checkConnection();
    }
  };

  const handleClearCredentials = () => {
    updateSupabaseCredentials('', '');
    setInputUrl('');
    setInputKey('');
    checkConnection();
  };

  return (
    <div
      className={`rounded-2xl p-4 border transition-all space-y-3 ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider">Supabase Connection Status</h4>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Database telemetry & active user count verifier
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-1.5 rounded-xl border transition cursor-pointer text-xs font-semibold flex items-center space-x-1 ${
              showConfig
                ? 'bg-amber-500 text-slate-950 border-amber-500'
                : isDark
                ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                : 'border-slate-300 hover:bg-slate-100 text-slate-700'
            }`}
            title="Configure Credentials"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Configure</span>
          </button>

          <button
            onClick={checkConnection}
            disabled={status === 'checking'}
            className="p-1.5 rounded-xl border border-slate-700 hover:bg-slate-500/10 transition cursor-pointer text-xs font-semibold flex items-center space-x-1"
            title="Test Connection"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-500 ${status === 'checking' ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Test Connection</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-700/30">
        <div className="flex items-center space-x-2">
          {status === 'checking' && (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-semibold text-amber-500">Connecting to Supabase...</span>
            </>
          )}
          {status === 'connected' && (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-bold text-emerald-500 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 inline" />
                <span>Connected Live</span>
              </span>
            </>
          )}
          {status === 'unconfigured' && (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span className="font-semibold text-yellow-500 flex items-center space-x-1">
                <WifiOff className="w-3.5 h-3.5 inline" />
                <span>Local-First Offline Cache (Supabase unconfigured)</span>
              </span>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="font-semibold text-red-500 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5 inline" />
                <span>Connection Error</span>
              </span>
            </>
          )}
        </div>

        <div>
          {status === 'connected' && userCount !== null && (
            <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
              Profiles Count: {userCount}
            </span>
          )}
          {status === 'unconfigured' && (
            <button
              onClick={() => setShowConfig(true)}
              className="text-[11px] text-amber-500 font-bold hover:underline cursor-pointer flex items-center space-x-1"
            >
              <span>Set Keys on Phone</span>
              <Key className="w-3 h-3" />
            </button>
          )}
          {status === 'error' && errorMessage && (
            <span className="text-[10px] text-red-400 truncate max-w-[200px]" title={errorMessage}>
              {errorMessage}
            </span>
          )}
        </div>
      </div>

      {/* Expandable Manual Credentials & Diagnostics Form */}
      {showConfig && (
        <div
          className={`p-3.5 rounded-xl border space-y-3 mt-2 ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-500 flex items-center space-x-1">
              <Key className="w-3.5 h-3.5" />
              <span>Mobile Supabase Key Linker</span>
            </span>
            <span className="text-[10px] text-slate-400">
              {diagnostics.hasBuildEnv ? '✓ Build-time env detected' : '⚠ Build-time env not detected'}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Enter your Supabase credentials directly here to link this phone without needing to re-build in Android Studio, or review the detected values:
          </p>

          <form onSubmit={handleSaveCredentials} className="space-y-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">
                Supabase Project URL
              </label>
              <input
                type="url"
                placeholder="https://xyzabcdefg.supabase.co"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono focus:outline-none focus:border-amber-400 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">
                Supabase Anon Public API Key
              </label>
              <textarea
                rows={2}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono focus:outline-none focus:border-amber-400 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
                required
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleClearCredentials}
                className="text-[11px] text-red-400 hover:text-red-300 flex items-center space-x-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Reset Keys</span>
              </button>

              <div className="flex items-center space-x-2">
                {saveSuccess && (
                  <span className="text-[11px] text-emerald-400 font-bold">Saved & Linking...</span>
                )}
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs transition cursor-pointer flex items-center space-x-1 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save & Connect Live</span>
                </button>
              </div>
            </div>
          </form>

          {/* Diagnostic Explainer */}
          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 space-y-1">
            <div className="flex items-start space-x-1.5">
              <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Why was it unconfigured?</strong> Android Studio does not read your computer&apos;s <code className="text-amber-400">.env</code> file directly. You must run <code className="text-amber-400">npm run build</code> and then <code className="text-amber-400">npx cap sync android</code> on your PC so Vite inlines your keys into the Android assets before compiling the APK.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
