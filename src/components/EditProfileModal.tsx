import React, { useState } from 'react';
import { X, FileText, Award, Plus, Trash2, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import { storageService } from '../services/storage';
import { useTheme } from '../context/ThemeContext';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSave: (updatedUser: UserProfile) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
}) => {
  const { isDark } = useTheme();

  const [name, setName] = useState(user.name);
  const [handle, setHandle] = useState(user.handle);
  const [bio, setBio] = useState(user.bio);
  const [phone, setPhone] = useState(user.phone);
  const [email, setEmail] = useState(user.email);
  const [yearsExperience, setYearsExperience] = useState(user.yearsExperience);
  const [cvLink, setCvLink] = useState(user.cvLink || '');
  const [solasId, setSolasId] = useState(user.solasId || '');
  const [hasSafePass, setHasSafePass] = useState(user.hasSafePass);
  const [safePassExpiry, setSafePassExpiry] = useState(user.safePassExpiry || '2028-09-15');
  const [hasCifBadge, setHasCifBadge] = useState(user.hasCifBadge);

  // Certifications list
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
    const updatedUser: UserProfile = {
      ...user,
      name: name.trim(),
      handle: handle.trim(),
      bio: bio.trim(),
      phone: phone.trim(),
      email: email.trim(),
      yearsExperience: Number(yearsExperience),
      cvLink: cvLink.trim(),
      solasId: user.accountType !== 'business' && (user.isApprentice === true || user.trade.includes('Apprentice')) ? solasId.trim() : undefined,
      hasSafePass,
      safePassExpiry,
      hasCifBadge,
      certifications,
    };

    storageService.updateCurrentUser(updatedUser);
    onSave(updatedUser);
    onClose();
    alert('Profile, Digital CV and Certifications successfully updated!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className={`border rounded-3xl max-w-xl w-full p-6 shadow-2xl relative max-h-[92vh] flex flex-col ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/40 mb-3">
          <h3 className="text-base font-black flex items-center space-x-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <span>Edit Profile, Digital CV & Certifications</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 cursor-pointer rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Full Name / Company Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Handle (@)</label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Bio / Site Experience Summary</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={`w-full border rounded-xl p-3 text-xs leading-relaxed focus:outline-none focus:border-amber-500 ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
              }`}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Phone Number</label>
              <input
                type="tel"
                inputMode="tel"
                pattern="[0-9+ ]*"
                placeholder="e.g. 087 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 font-mono ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Years on Site / Experience</label>
              <input
                type="number"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(Number(e.target.value))}
                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Digital CV Link (PDF / Portfolio URL)</label>
              <input
                type="url"
                placeholder="https://... (Drive, LinkedIn, or Web CV)"
                value={cvLink}
                onChange={(e) => setCvLink(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Apprentice ID (only shown for apprentices) */}
          {user.accountType !== 'business' && (user.isApprentice === true || user.trade.includes('Apprentice')) && (
            <div>
              <label className="block text-xs font-semibold mb-1">
                Apprentice Registration Number <span className="text-[10px] text-amber-500 font-normal">(Applicable for Apprentices)</span>
              </label>
              <input
                type="text"
                placeholder="APP-IE-XXXXXX"
                value={solasId}
                onChange={(e) => setSolasId(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 font-mono ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          )}

          {/* Certifications Manager */}
          <div className={`p-3 rounded-2xl border space-y-2.5 ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <label className="block text-xs font-bold flex items-center space-x-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Certifications & Site Tickets (Safe Pass, Manual Handling, IPAF, RECI, etc.)</span>
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
                className={`flex-1 border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
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
                  className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
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
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer shadow-md"
            >
              Save Profile & Sync Backend
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
