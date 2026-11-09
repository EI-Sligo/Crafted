import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  UserCheck,
  Users,
  MessageSquare,
  ShieldCheck,
  Award,
  MapPin,
  Briefcase,
  Plus,
  Check,
  FolderPlus,
  ThumbsUp,
  CheckCircle2,
  Sparkles,
  User,
} from 'lucide-react';
import { UserProfile, CustomUserGroup } from '../types';
import { storageService } from '../services/storage';
import { useTheme } from '../context/ThemeContext';

const TRADE_SKILL_SUGGESTIONS: Record<string, string[]> = {
  Electrician: [
    'Electrical Wiring',
    'Blueprint Reading',
    'Testing & Verification',
    'Distribution Boards',
    'Conduit Bending',
    'EV Charger Installs',
    'PAT Testing',
    'Cable Tray & Containment',
  ],
  Plumber: [
    'Heat Pump Commissioning',
    'Blueprint Reading',
    'Underfloor Heating',
    'Pipefitting & Soldering',
    'Gas Safety RGII',
    'Plantroom Hydraulics',
    '1st Fix Drainage',
  ],
  Carpenter: [
    'Cut Roof Framing',
    'Blueprint Reading',
    '1st Fix Joinery',
    'Timber Frame Construction',
    'Staircase Fitting',
    'Formwork',
  ],
  'HVAC & Refrigeration': [
    'F-Gas Refrigeration',
    'Blueprint Reading',
    'Sensor Calibration',
    'VRF System Diagnostics',
    'Airflow Balancing',
  ],
};

interface UserProfileModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onOpenDirectMessage: (targetUser: UserProfile) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  currentUser,
  onOpenDirectMessage,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [profileUser, setProfileUser] = useState<UserProfile>(user || currentUser);
  const [customGroups, setCustomGroups] = useState<CustomUserGroup[]>(storageService.getCustomGroups());
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [showAddSkillInput, setShowAddSkillInput] = useState(false);
  const [newSkillText, setNewSkillText] = useState('');
  const [endorseFeedback, setEndorseFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const fresh = storageService.getUserById(user.id) || (storageService.getCurrentUser().id === user.id ? storageService.getCurrentUser() : user);
      setProfileUser(fresh);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const isMe = profileUser.id === currentUser.id;
  const isFollowing = storageService.isFollowing(profileUser.id);

  const skills = profileUser.skills || [];
  const tradeSuggestions = TRADE_SKILL_SUGGESTIONS[profileUser.trade] || [
    'Blueprint Reading',
    'Site Safety Compliance',
    'Method Statements',
    'Tool Calibration',
    'Quality Assurance',
  ];
  const existingSkillNames = skills.map((s) => s.skill.toLowerCase());
  const unaddedSuggestions = tradeSuggestions.filter(
    (s) => !existingSkillNames.includes(s.toLowerCase())
  );

  const handleToggleEndorsement = (skillName: string) => {
    const updated = storageService.endorseSkill(profileUser.id, skillName, currentUser.id);
    if (updated) {
      setProfileUser(updated);
      const isNowEndorsed = updated.skills
        ?.find((s) => s.skill.toLowerCase() === skillName.toLowerCase())
        ?.endorserUserIds.includes(currentUser.id);
      setEndorseFeedback(
        isNowEndorsed
          ? `Endorsed ${skillName}!`
          : `Removed endorsement for ${skillName}`
      );
      setTimeout(() => setEndorseFeedback(null), 2500);
    }
  };

  const handleAddSkill = (skillToAdd: string) => {
    const trimmed = skillToAdd.trim();
    if (!trimmed) return;
    const updated = storageService.endorseSkill(profileUser.id, trimmed, currentUser.id);
    if (updated) {
      setProfileUser(updated);
      setNewSkillText('');
      setShowAddSkillInput(false);
      setEndorseFeedback(`Added & endorsed ${trimmed}!`);
      setTimeout(() => setEndorseFeedback(null), 2500);
    }
  };

  const handleToggleFollow = () => {
    if (isFollowing) {
      storageService.unfollowUser(profileUser.id);
    } else {
      storageService.followUser(profileUser.id);
    }
  };

  const handleToggleGroupMembership = (groupId: string) => {
    const grp = customGroups.find((g) => g.id === groupId);
    if (!grp) return;
    if (grp.memberUserIds.includes(profileUser.id)) {
      storageService.removeUserFromCustomGroup(groupId, profileUser.id);
    } else {
      storageService.addUserToCustomGroup(groupId, profileUser.id);
    }
    setCustomGroups(storageService.getCustomGroups());
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    storageService.createCustomGroup(newGroupName.trim(), newGroupDesc.trim(), [profileUser.id]);
    setNewGroupName('');
    setNewGroupDesc('');
    setShowNewGroupInput(false);
    setCustomGroups(storageService.getCustomGroups());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-3xl max-w-lg w-full p-5 shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>
            TradeNet Professional Profile
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Avatar & Core Info */}
          <div className="flex items-start space-x-3.5">
            {profileUser.avatar ? (
              <img
                src={profileUser.avatar}
                alt={profileUser.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500 shrink-0 shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-dashed border-amber-500/50 flex flex-col items-center justify-center text-amber-500 shrink-0 shadow-lg select-none">
                <User className="w-6 h-6 opacity-70" />
                <span className="text-[8px] font-bold text-slate-400 mt-0.5">No Photo</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1.5 flex-wrap">
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'} text-base truncate`}>{profileUser.name}</h3>
                <span className="text-xs text-slate-400">{profileUser.handle}</span>
              </div>

              <div className={`flex items-center space-x-2 text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'} mt-1 flex-wrap`}>
                <span className="text-amber-500 font-bold">{profileUser.trade}</span>
                <span>•</span>
                <span className="text-slate-400">{profileUser.yearsExperience} yrs on site</span>
                <span>•</span>
                <span className="text-slate-400 flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{profileUser.location.town}, Co. {profileUser.location.county}</span>
                </span>
              </div>

              <div className="text-[11px] text-slate-400 mt-1">
                <strong className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{profileUser.followersCount || 0}</strong> followers
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
            {profileUser.hasSafePass && (
              <span className="inline-flex items-center space-x-1 bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Safe Pass Valid (Expires: {profileUser.safePassExpiry})</span>
              </span>
            )}
            {profileUser.accountType !== 'business' && (profileUser.isApprentice || profileUser.trade.includes('Apprentice')) && profileUser.apprenticePhase && (
              <span className="inline-flex items-center space-x-1 bg-sky-500/15 text-sky-500 border border-sky-500/30 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                <Award className="w-3.5 h-3.5" />
                <span>Phase {profileUser.apprenticePhase} Apprentice</span>
              </span>
            )}
            {profileUser.hasCifBadge && (
              <span className="inline-flex items-center space-x-1 bg-purple-500/15 text-purple-500 border border-purple-500/30 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                <Award className="w-3.5 h-3.5" />
                <span>CIF Registered</span>
              </span>
            )}
          </div>

          {/* Bio */}
          {profileUser.bio && (
            <p className={`text-xs ${isDark ? 'text-slate-300 bg-slate-800/40 border-slate-800' : 'text-slate-700 bg-slate-50 border-slate-200'} leading-relaxed p-3 rounded-xl border`}>
              {profileUser.bio}
            </p>
          )}

          {/* Action Buttons: Follow & Direct Message */}
          {!isMe && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleToggleFollow}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  isFollowing
                    ? isDark
                      ? 'bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-slate-700'
                      : 'bg-slate-100 hover:bg-red-100 text-slate-700 hover:text-red-600 border border-slate-200'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Follow User</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  onOpenDirectMessage(profileUser);
                  onClose();
                }}
                className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'} border py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                <span>Direct Message</span>
              </button>
            </div>
          )}

          {/* Skills & Endorsements Section */}
          <div className={`border ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/50'} rounded-2xl p-3.5 space-y-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <ThumbsUp className="w-4 h-4 text-amber-500" />
                <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Skills & Endorsements
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSkillInput(!showAddSkillInput)}
                className="text-[11px] text-amber-500 hover:underline flex items-center space-x-1 font-semibold cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{showAddSkillInput ? 'Cancel' : 'Endorse Skill'}</span>
              </button>
            </div>

            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>
              Verified trade competencies endorsed by peers. Tap any chip to endorse {isMe ? 'your skills' : `${profileUser.name.split(' ')[0]}'s trade expertise`}.
            </p>

            {endorseFeedback && (
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[11px] font-bold flex items-center space-x-1.5 animate-pulse">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{endorseFeedback}</span>
              </div>
            )}

            {/* Endorsement Chips */}
            <div className="flex flex-wrap gap-2 pt-0.5">
              {skills.length === 0 ? (
                <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'} italic py-1`}>
                  No trade skills listed yet. Click "+ Endorse Skill" above to add the first one.
                </div>
              ) : (
                skills.map((item) => {
                  const isEndorsedByMe = item.endorserUserIds.includes(currentUser.id);
                  const count = item.endorserUserIds.length;

                  return (
                    <button
                      key={item.skill}
                      type="button"
                      onClick={() => handleToggleEndorsement(item.skill)}
                      title={
                        isEndorsedByMe
                          ? `Endorsed by you + ${count - 1} peer(s). Tap to withdraw endorsement.`
                          : `Tap to endorse ${profileUser.name.split(' ')[0]}'s skill in ${item.skill}`
                      }
                      className={`group inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs transition cursor-pointer select-none ${
                        isEndorsedByMe
                          ? 'bg-amber-500/15 border-amber-500 text-amber-500 font-bold ring-1 ring-amber-500/30 shadow-sm'
                          : isDark
                          ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:border-amber-500/50'
                          : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:border-amber-500/50 shadow-xs'
                      }`}
                    >
                      <ThumbsUp
                        className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${
                          isEndorsedByMe ? 'text-amber-500 fill-amber-500' : 'text-slate-400 group-hover:text-amber-500'
                        }`}
                      />
                      <span>{item.skill}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                          isEndorsedByMe
                            ? 'bg-amber-500 text-slate-950'
                            : isDark
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Quick Suggestions & Custom Skill Input */}
            {showAddSkillInput && (
              <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-xl p-3 space-y-2.5 mt-2`}>
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-500">
                  <span>Endorse or Suggest a Trade Skill:</span>
                  <span className="text-[10px] text-slate-400">e.g. Electrical Wiring, Blueprint Reading</span>
                </div>

                {/* Popular suggestions for this trade */}
                {unaddedSuggestions.length > 0 && (
                  <div className="space-y-1">
                    <div className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Popular for {profileUser.trade}:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {unaddedSuggestions.slice(0, 6).map((suggested) => (
                        <button
                          key={suggested}
                          type="button"
                          onClick={() => handleAddSkill(suggested)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer flex items-center space-x-1 ${
                            isDark
                              ? 'bg-slate-800 hover:bg-amber-500/20 border-slate-700 text-slate-200 hover:text-amber-400 hover:border-amber-500/40'
                              : 'bg-slate-100 hover:bg-amber-50 border-slate-200 text-slate-700 hover:text-amber-700 hover:border-amber-300'
                          }`}
                        >
                          <Plus className="w-3 h-3 text-amber-500" />
                          <span>{suggested}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddSkill(newSkillText);
                  }}
                  className="flex items-center space-x-2 pt-1"
                >
                  <input
                    type="text"
                    placeholder="Or type custom trade skill (e.g. PLC Automation, 1st Fix)..."
                    value={newSkillText}
                    onChange={(e) => setNewSkillText(e.target.value)}
                    className={`flex-1 ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'} border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400`}
                  />
                  <button
                    type="submit"
                    disabled={!newSkillText.trim()}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    Endorse
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Custom Groups / Site Crew Buckets */}
          {!isMe && (
            <div className={`border ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/50'} rounded-2xl p-3.5 space-y-3`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center space-x-1.5 text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Users className="w-4 h-4 text-amber-500" />
                  <span>Bucket into Custom Site Groups</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewGroupInput(!showNewGroupInput)}
                  className="text-[11px] text-amber-500 hover:underline flex items-center space-x-1 font-semibold"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Group</span>
                </button>
              </div>

              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Organize tradespeople you work with into private site groups (e.g. "Intel Leixlip Site Crew", "Malahide Rewire Team") for group networking.
              </p>

              {/* Group Checkboxes */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {customGroups.length === 0 ? (
                  <div className="text-xs text-slate-400 italic p-2">
                    No custom groups created yet. Click "New Group" above to create one.
                  </div>
                ) : (
                  customGroups.map((grp) => {
                    const isMember = grp.memberUserIds.includes(user.id);
                    return (
                      <button
                        key={grp.id}
                        type="button"
                        onClick={() => handleToggleGroupMembership(grp.id)}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition cursor-pointer ${
                          isMember
                            ? 'bg-amber-500/15 border-amber-500 text-amber-500 font-medium'
                            : isDark
                            ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{grp.name}</div>
                          {grp.description && (
                            <div className="text-[10px] text-slate-400">{grp.description}</div>
                          )}
                        </div>
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                            isMember ? 'bg-amber-500 border-amber-400 text-slate-950' : 'border-slate-400 dark:border-slate-600'
                          }`}
                        >
                          {isMember && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Create New Group Mini Form */}
              {showNewGroupInput && (
                <form onSubmit={handleCreateGroup} className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-xl p-3 space-y-2 mt-2`}>
                  <div className="text-[11px] font-bold text-amber-500">Create New Site Crew Group</div>
                  <input
                    type="text"
                    placeholder="Group name (e.g. Intel Leixlip Fab 34 Crew)"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className={`w-full ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'} border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400`}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    className={`w-full ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'} border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400`}
                  />
                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowNewGroupInput(false)}
                      className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-white px-2 py-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newGroupName.trim()}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs"
                    >
                      Create & Add User
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
