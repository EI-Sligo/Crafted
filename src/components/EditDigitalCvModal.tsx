import React, { useState } from 'react';
import { X, FileText, Plus, Trash2 } from 'lucide-react';
import { UserProfile, WorkHistoryItem } from '../types';
import { storageService } from '../services/storage';
import { useTheme } from '../context/ThemeContext';

interface EditDigitalCvModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSave: (updated: UserProfile) => void;
}

export const EditDigitalCvModal: React.FC<EditDigitalCvModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
}) => {
  const { isDark } = useTheme();
  const [cvLink, setCvLink] = useState(user.cvLink || '');
  const [workHistory, setWorkHistory] = useState<WorkHistoryItem[]>(user.workHistory || []);

  const [newRole, setNewRole] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newPeriod, setNewPeriod] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newSummary, setNewSummary] = useState('');

  if (!isOpen) return null;

  const handleAddWorkHistory = () => {
    if (!newRole.trim() || !newCompany.trim()) return;
    const newItem: WorkHistoryItem = {
      id: `wh_${Date.now()}`,
      role: newRole.trim(),
      company: newCompany.trim(),
      period: newPeriod.trim() || '2025 - Present',
      location: newLocation.trim() || 'Ireland',
      summary: newSummary.trim() || 'Site execution and technical installations.',
    };
    setWorkHistory([newItem, ...workHistory]);
    setNewRole('');
    setNewCompany('');
    setNewPeriod('');
    setNewLocation('');
    setNewSummary('');
  };

  const handleRemoveWorkHistory = (id: string) => {
    setWorkHistory(workHistory.filter((item) => item.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...user,
      cvLink: cvLink.trim(),
      workHistory,
    };
    storageService.updateCurrentUser(updated);
    onSave(updated);
    onClose();
    alert('Digital CV & Work History successfully updated!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`border rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[92vh] flex flex-col ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/40 mb-3">
          <h3 className="text-base font-black flex items-center space-x-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <span>Edit Digital CV & Work History</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          <div>
            <label className="block text-xs font-semibold mb-1">Digital CV Link (PDF / Portfolio URL)</label>
            <input
              type="url"
              placeholder="https://... (Drive, LinkedIn, or Web CV)"
              value={cvLink}
              onChange={(e) => setCvLink(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'}`}
            />
          </div>

          {/* Add Work History Item Section */}
          <div className={`p-3.5 rounded-2xl border space-y-2.5 ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <h4 className="font-bold text-xs flex items-center space-x-1.5">
              <Plus className="w-4 h-4 text-amber-500" />
              <span>Add Work History / Site Role</span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Role / Job Title"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className={`border rounded-xl px-3 py-1.5 text-xs ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
              />
              <input
                type="text"
                placeholder="Company / Contractor"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                className={`border rounded-xl px-3 py-1.5 text-xs ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Period (e.g. 2024 - Present)"
                value={newPeriod}
                onChange={(e) => setNewPeriod(e.target.value)}
                className={`border rounded-xl px-3 py-1.5 text-xs ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
              />
              <input
                type="text"
                placeholder="Location (e.g. Dublin)"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className={`border rounded-xl px-3 py-1.5 text-xs ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
              />
            </div>
            <textarea
              rows={2}
              placeholder="Summary of responsibilities and site achievements..."
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              className={`w-full border rounded-xl p-2.5 text-xs ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
            />
            <button
              type="button"
              onClick={handleAddWorkHistory}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-xl text-xs transition cursor-pointer"
            >
              Add to Work History Log
            </button>
          </div>

          {/* Existing Work History List */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs">Current Work History Log ({workHistory.length})</h4>
            {workHistory.map((item) => (
              <div key={item.id} className={`p-3 rounded-xl border flex items-start justify-between ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <div className="font-bold text-xs">{item.role} • <span className="text-amber-500">{item.company}</span></div>
                  <div className="text-[10px] text-slate-400">{item.period} | {item.location}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveWorkHistory(item.id)}
                  className="text-slate-400 hover:text-red-400 p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-700/40">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer shadow-md">
              Save Digital CV
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
