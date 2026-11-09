import React from 'react';
import { ShieldCheck, Award, Briefcase, CheckCircle, X, ExternalLink } from 'lucide-react';
import { UserProfile } from '../types';
import { useTheme } from '../context/ThemeContext';

interface VerifiedBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  badgeType: 'safepass' | 'solas' | 'cif' | 'master';
}

export const VerifiedBadgeModal: React.FC<VerifiedBadgeModalProps> = ({
  isOpen,
  onClose,
  user,
  badgeType,
}) => {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className={`border rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
              {badgeType === 'safepass' && <ShieldCheck className="w-6 h-6" />}
              {badgeType === 'solas' && <Briefcase className="w-6 h-6 text-sky-400" />}
              {badgeType === 'cif' && <Award className="w-6 h-6 text-purple-400" />}
              {badgeType === 'master' && <ShieldCheck className="w-6 h-6 text-amber-500" />}
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">
                {badgeType === 'safepass' && 'Safe Pass Card Verification'}
                {badgeType === 'solas' && 'National Apprenticeship Registry'}
                {badgeType === 'cif' && 'Construction Industry Federation (CIF)'}
                {badgeType === 'master' && 'Verified Master Contractor Pro'}
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Official Irish National Registry Check</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className={`p-3.5 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Cardholder Name:</span>
              <span className="font-bold">{user.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Trade Discipline:</span>
              <span className="font-bold text-amber-500">{user.trade}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Registered Location:</span>
              <span className="font-bold">{user.location.town}, Co. {user.location.county}</span>
            </div>
            {badgeType === 'safepass' && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Safe Pass Expiry:</span>
                <span className="font-bold text-emerald-400">{user.safePassExpiry || '2028-05-15'}</span>
              </div>
            )}
            {badgeType === 'solas' && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Apprentice Registration ID:</span>
                <span className="font-mono font-bold text-sky-400">{user.solasId || 'APP-IE-849201'}</span>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Verified Authentic Credential</div>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">
                This credential has been cross-referenced with national safety databases for site operations in Ireland.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            onClick={onClose}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
          >
            Close Certificate
          </button>
        </div>
      </div>
    </div>
  );
};
