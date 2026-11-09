import React, { useState } from 'react';
import { X, Award, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';
import { storageService } from '../services/storage';
import { useTheme } from '../context/ThemeContext';

interface ManageCertificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSave: (updated: UserProfile) => void;
}

export const ManageCertificationsModal: React.FC<ManageCertificationsModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
}) => {
  const { isDark } = useTheme();
  const [hasSafePass, setHasSafePass] = useState(user.hasSafePass);
  const [safePassExpiry, setSafePassExpiry] = useState(user.safePassExpiry || '2028-09-15');
  const [solasId, setSolasId] = useState(user.solasId || '');
  const [apprenticePhase, setApprenticePhase] = useState(user.apprenticePhase || 1);
  const isCompany = user.accountType === 'business' || Boolean(user.businessCategory);
  const [isApprentice, setIsApprentice] = useState(
    !isCompany && (
      user.isApprentice === true ||
      user.trade.includes('Apprentice') ||
      (user.isApprentice !== false && user.apprenticePhase !== undefined && user.apprenticePhase > 0)
    )
  );
  const [trackSolasLogbook, setTrackSolasLogbook] = useState(
    user.trackSolasLogbook !== false
  );
  const [certifications, setCertifications] = useState<string[]>(
    user.certifications || ['Safe Pass', 'Manual Handling', 'Abrasive Wheels', 'MEWP IPAF']
  );
  const [newCert, setNewCert] = useState('');

  if (!isOpen) return null;

  const handleAddCert = () => {
    if (!newCert.trim()) return;
    if (!certifications.includes(newCert.trim())) {
      setCertifications([...certifications, newCert.trim()]);
    }
    setNewCert('');
  };

  const handleRemoveCert = (cert: string) => {
    setCertifications(certifications.filter((c) => c !== cert));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...user,
      hasSafePass,
      safePassExpiry,
      isApprentice: isCompany ? false : isApprentice,
      apprenticePhase: !isCompany && isApprentice ? apprenticePhase : undefined,
      trackSolasLogbook: !isCompany && isApprentice ? trackSolasLogbook : false,
      solasId: !isCompany && isApprentice ? solasId.trim() : undefined,
      certifications,
    };
    storageService.updateCurrentUser(updated);
    onSave(updated);
    onClose();
    alert('Certifications & Trade Cards successfully updated!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`border rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[92vh] flex flex-col ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/40 mb-3">
          <h3 className="text-base font-black flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-500" />
            <span>Manage Certifications & Trade Tickets</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* Safe Pass */}
          <div className={`p-3.5 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="modal-safepass"
                checked={hasSafePass}
                onChange={(e) => setHasSafePass(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="modal-safepass" className="font-bold text-xs cursor-pointer">
                Safe Pass Card Valid
              </label>
            </div>
            {hasSafePass && (
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Safe Pass Expiry Date</label>
                <input
                  type="date"
                  value={safePassExpiry}
                  onChange={(e) => setSafePassExpiry(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-1.5 text-xs ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                />
              </div>
            )}
          </div>

          {/* Trade Status: Qualified Craftsperson vs Trade Apprentice (hidden for companies) */}
          {!isCompany && (
            <div className={`p-3.5 rounded-2xl border space-y-3 ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <label className="font-bold text-xs">Trade Qualification & Status</label>
                <span className="text-[10px] text-amber-500 font-semibold">
                  {isApprentice ? 'Apprentice Profile' : 'Qualified Tradesperson'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsApprentice(false)}
                  className={`p-2.5 rounded-xl border font-bold text-center cursor-pointer transition ${
                    !isApprentice
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : isDark
                      ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Qualified Craftsperson
                </button>
                <button
                  type="button"
                  onClick={() => setIsApprentice(true)}
                  className={`p-2.5 rounded-xl border font-bold text-center cursor-pointer transition ${
                    isApprentice
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : isDark
                      ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Trade Apprentice
                </button>
              </div>

              {isApprentice && (
                <div className="pt-2 border-t border-slate-700/30 space-y-3">
                  {/* Optional Logbook Tracking Toggle */}
                  <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                    isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-white border-slate-200'
                  }`}>
                    <div>
                      <div className="font-bold text-xs">Track Apprentice Logbook</div>
                      <div className="text-[10px] text-slate-400">Optional for apprentices. Turn off if not logging hours.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTrackSolasLogbook(!trackSolasLogbook)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition ${
                        trackSolasLogbook
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {trackSolasLogbook ? 'Tracking On' : 'Tracking Off (Optional)'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Current Apprentice Phase</label>
                      <select
                        value={apprenticePhase}
                        onChange={(e) => setApprenticePhase(Number(e.target.value))}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      >
                        {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                          <option key={num} value={num}>Phase {num}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Apprentice Registration ID</label>
                      <input
                        type="text"
                        placeholder="APP-IE-XXXXXX"
                        value={solasId}
                        onChange={(e) => setSolasId(e.target.value)}
                        className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Certifications Manager */}
          <div className={`p-3.5 rounded-2xl border space-y-2.5 ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <label className="block text-xs font-bold flex items-center space-x-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Additional Site Tickets & Qualifications (Manual Handling, IPAF, RECI, etc.)</span>
            </label>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Add certification (e.g. Abrasive Wheels, MEWP, Confined Space)..."
                value={newCert}
                onChange={(e) => setNewCert(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCert();
                  }
                }}
                className={`flex-1 border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
              />
              <button
                type="button"
                onClick={handleAddCert}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {certifications.map((cert) => (
                <span
                  key={cert}
                  className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border ${isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{cert}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCert(cert)}
                    className="text-slate-400 hover:text-red-400 ml-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-700/40">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer shadow-md">
              Save Certifications
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
