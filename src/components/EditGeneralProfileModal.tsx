import React, { useState } from 'react';
import { X, User } from 'lucide-react';
import { UserProfile } from '../types';
import { storageService } from '../services/storage';
import { useTheme } from '../context/ThemeContext';

interface EditGeneralProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSave: (updated: UserProfile) => void;
}

export const EditGeneralProfileModal: React.FC<EditGeneralProfileModalProps> = ({
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...user,
      name: name.trim(),
      handle: handle.trim(),
      bio: bio.trim(),
      phone: phone.trim(),
      email: email.trim(),
      yearsExperience: Number(yearsExperience),
    };
    storageService.updateCurrentUser(updated);
    onSave(updated);
    onClose();
    alert('Profile details updated successfully!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`border rounded-3xl max-w-md w-full p-6 shadow-2xl relative ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/40 mb-3">
          <h3 className="text-base font-black flex items-center space-x-2">
            <User className="w-5 h-5 text-amber-500" />
            <span>Edit Profile Details</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-xs font-semibold mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'}`}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Handle (@)</label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'}`}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Bio / Site Experience Summary</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={`w-full border rounded-xl p-3 text-xs leading-relaxed focus:outline-none focus:border-amber-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'}`}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Phone Number</label>
              <input
                type="tel"
                inputMode="tel"
                pattern="[0-9+ ]*"
                placeholder="e.g. 087 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 font-mono ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400'}`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'}`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Years on Site / Experience</label>
            <input
              type="number"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(Number(e.target.value))}
              className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'}`}
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-700/40">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer shadow-md">
              Save Profile Details
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
