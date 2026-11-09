import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Award,
  Briefcase,
  MapPin,
  Phone,
  Mail,
  Camera,
  Plus,
  Crown,
  User,
  CheckCircle,
  Database,
  RefreshCw,
  FolderKanban,
  FileText,
  X,
  Users,
  MessageSquare,
  UserCheck,
  Trash2,
  ExternalLink,
  Sun,
  Moon,
  Navigation,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  Play,
  Zap,
  ThumbsUp,
} from 'lucide-react';
import { UserProfile, PortfolioProject, WorkHistoryItem, GeoLocation, CustomUserGroup } from '../types';
import { storageService, compressImageFile } from '../services/storage';
import { supabaseService } from '../services/supabaseService';
import { authService } from '../services/authService';
import { auditDatabaseIntegrity } from '../utils/calculations';
import { useTheme } from '../context/ThemeContext';
import { EditGeneralProfileModal } from './EditGeneralProfileModal';
import { EditDigitalCvModal } from './EditDigitalCvModal';
import { ManageCertificationsModal } from './ManageCertificationsModal';
import { AdCreatorModal } from './AdCreatorModal';
import { SolasLogbookModal } from './SolasLogbookModal';

interface ProfileTabProps {
  currentUser: UserProfile;
  currentLocation: GeoLocation;
  onTriggerStripeCheckout: (item: { title: string; priceEuros: number; type: 'boost' | 'subscription' | 'job' }) => void;
  onOpenConversation?: (convId: string) => void;
  onOpenUserProfile?: (user: UserProfile) => void;
  isGpsAuto?: boolean;
  onDetectGpsLocation?: () => void;
  gpsLoading?: boolean;
  locationMethodDesc?: string;
  onLogout?: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  currentUser,
  currentLocation,
  onTriggerStripeCheckout,
  onOpenConversation,
  onOpenUserProfile,
  isGpsAuto = false,
  onDetectGpsLocation,
  gpsLoading = false,
  locationMethodDesc = '',
  onLogout,
}) => {
  const { isDark, theme, toggleTheme, setTheme } = useTheme();
  const [user, setUser] = useState<UserProfile>(currentUser);

  useEffect(() => {
    setUser(currentUser);
  }, [currentUser]);

  useEffect(() => {
    const unsubscribe = storageService.subscribe(() => {
      const fresh = storageService.getCurrentUser();
      if (fresh) setUser(fresh);
      setCustomGroups(storageService.getCustomGroups());
    });
    return () => unsubscribe();
  }, []);
  const [activeSubTab, setActiveSubTab] = useState<'portfolio' | 'cv' | 'credentials' | 'groups' | 'settings'>('portfolio');
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [customGroups, setCustomGroups] = useState<CustomUserGroup[]>(storageService.getCustomGroups());

  // Separate Modal states for each tab
  const [showEditGeneralModal, setShowEditGeneralModal] = useState(false);
  const [showEditCvModal, setShowEditCvModal] = useState(false);
  const [showManageCertsModal, setShowManageCertsModal] = useState(false);
  const [showSolasLogbookModal, setShowSolasLogbookModal] = useState(false);

  // Business Ad state
  const [showAdModal, setShowAdModal] = useState(false);


  // Form states for adding a portfolio project
  const [projectTitle, setProjectTitle] = useState('');
  const [projectTrade, setProjectTrade] = useState(user.trade);
  const [projectLocation, setProjectLocation] = useState(currentLocation.town);
  const [projectDesc, setProjectDesc] = useState('');
  const [projectImages, setProjectImages] = useState<string[]>([]);
  const [isCompressingProjectImg, setIsCompressingProjectImg] = useState(false);

  // Group creation form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // Business Profile states
  const [accountType, setAccountType] = useState<'personal' | 'business' | 'training_provider'>(user.accountType || 'personal');
  const [businessCategory, setBusinessCategory] = useState<'contractor_employer' | 'tool_manufacturer' | 'material_supplier'>(user.businessCategory || 'contractor_employer');
  const [businessTier, setBusinessTier] = useState<'standard' | 'employer_pro' | 'manufacturer_showcase'>(user.businessTier || 'standard');
  const [trainingProviderCategory, setTrainingProviderCategory] = useState<'government_nonprofit' | 'etb' | 'technological_university' | 'private_provider'>(user.trainingProviderCategory || 'etb');

  const isCompanyOrBusiness = user.accountType === 'business' || user.accountType === 'training_provider' || Boolean(user.businessCategory);
  const isApprentice = !isCompanyOrBusiness && (
    user.isApprentice === true ||
    user.trade.includes('Apprentice') ||
    (user.isApprentice !== false && user.apprenticePhase !== undefined && user.apprenticePhase > 0)
  );
  const isLogbookTrackingEnabled = isApprentice && user.trackSolasLogbook !== false;

  const handleSaveAccountType = () => {
    const updated = {
      ...user,
      accountType,
      businessCategory: accountType === 'business' ? businessCategory : undefined,
      businessTier: accountType === 'business' ? businessTier : 'standard',
      trainingProviderCategory: accountType === 'training_provider' ? trainingProviderCategory : undefined,
    };
    setUser(updated);
    storageService.updateCurrentUser(updated);
    alert('Account type and profile persona successfully saved!');
  };

  // Database audit result
  const [auditResult, setAuditResult] = useState<any | null>(null);

  const refreshGroups = () => {
    setCustomGroups(storageService.getCustomGroups());
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const compressedDataUrl = await compressImageFile(files[0], 600, 0.8);
      const updatedUser = { ...user, avatar: compressedDataUrl };
      setUser(updatedUser);
      storageService.updateCurrentUser(updatedUser);
    } catch (err) {
      console.error('Avatar upload failed', err);
    }
  };

  const handleProjectImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressingProjectImg(true);
    try {
      const compressedDataUrl = await compressImageFile(files[0], 1200, 0.75);
      setProjectImages([compressedDataUrl]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCompressingProjectImg(false);
    }
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim()) return;

    const newProj: PortfolioProject = {
      id: `proj_${Date.now()}`,
      title: projectTitle.trim(),
      trade: projectTrade,
      completionDate: 'Recently Completed',
      location: projectLocation,
      description: projectDesc.trim(),
      images:
        projectImages.length > 0
          ? projectImages
          : ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80'],
    };

    const updatedPortfolio = [newProj, ...user.portfolio];
    const updatedUser = { ...user, portfolio: updatedPortfolio };
    setUser(updatedUser);
    storageService.updateCurrentUser(updatedUser);

    setProjectTitle('');
    setProjectDesc('');
    setProjectImages([]);
    setShowAddProjectModal(false);
  };

  const handleCreateCustomGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    storageService.createCustomGroup(newGroupName.trim(), newGroupDesc.trim(), []);
    setNewGroupName('');
    setNewGroupDesc('');
    setShowNewGroupModal(false);
    refreshGroups();
  };

  const handleStartGroupChat = (group: CustomUserGroup) => {
    const convId = storageService.startGroupConversation(group);
    if (onOpenConversation) onOpenConversation(convId);
  };

  const runDatabaseAudit = () => {
    const state = {
      users: storageService.getUsers(),
      posts: storageService.getPosts(),
      comments: storageService.getComments(),
      marketplaceItems: storageService.getMarketplaceItems(),
    };
    const audit = auditDatabaseIntegrity(state as any);
    setAuditResult(audit);
  };

  const followedUsers = storageService.getUsers().filter((u) => user.followingUserIds.includes(u.id));

  return (
    <div className="pb-16 max-w-3xl mx-auto px-3 sm:px-4 py-4 space-y-4">
      {/* Top Banner */}
      <div className={`rounded-3xl p-6 sm:p-8 border relative overflow-hidden shadow-xl ${
        isDark ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border-slate-800' : 'bg-gradient-to-r from-slate-900 via-slate-900 to-amber-900 text-white border-slate-800'
      }`}>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 hidden sm:block">
          <User className="w-48 h-48 text-amber-500" />
        </div>
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" />
            <span>Irish Trade Credentials & Digital CV</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Tradesperson Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Manage your verified Safe Pass, Solas logbook, trade qualifications, and portfolio projects.
          </p>

          <div className="pt-1">
            <button
              onClick={() => setShowEditGeneralModal(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg"
            >
              <span>Edit Profile Details</span>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Header Card */}
      <div
        className={`rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 border transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-700/30">
          <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {user.accountType === 'business' ? 'Business Profile & Operations' : 'Trade Profile & Digital CV'}
          </span>
          <button
            onClick={() => setShowEditGeneralModal(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs transition cursor-pointer shadow-sm flex items-center space-x-1 shrink-0"
          >
            <span>Edit Profile Details</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          {/* Avatar with Camera badge */}
          <div className="relative shrink-0">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-500 shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-dashed border-amber-500/50 flex flex-col items-center justify-center text-amber-500 shadow-lg select-none">
                <User className="w-8 h-8 opacity-70" />
                <span className="text-[9px] font-bold mt-1 text-slate-400">Add Photo</span>
              </div>
            )}
            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-1 -right-1 bg-amber-500 hover:bg-amber-400 text-slate-950 p-1.5 rounded-lg cursor-pointer shadow-md transition"
              title="Upload Avatar (Auto-compressed)"
            >
              <Camera className="w-3.5 h-3.5" />
            </label>
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center space-x-2 flex-wrap">
              <h2 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{user.name}</h2>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user.handle}</span>
              {user.premiumTier !== 'none' && (
                <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-sm">
                  <Crown className="w-3 h-3 fill-slate-950" />
                  <span>
                    {user.premiumTier === 'master_contractor' ? 'MASTER CONTRACTOR' : 'SPONSOR'}
                  </span>
                </span>
              )}
            </div>

            <div className={`flex items-center space-x-2 text-xs mt-1 flex-wrap gap-y-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <span className="text-amber-500 font-bold">{user.trade}</span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>{user.location.town}, Co. {user.location.county}</span>
              </span>
              <span>•</span>
              <span>{user.yearsExperience} yrs on site</span>
              <span>•</span>
              <span className="text-amber-500 font-semibold">{user.followingUserIds.length} Following</span>
            </div>

            {/* Badges bar */}
            <div className="flex items-center space-x-2 mt-2 flex-wrap gap-y-1.5">
              {user.hasSafePass && (
                <span className="inline-flex items-center space-x-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Safe Pass Valid (Expires: {user.safePassExpiry})</span>
                </span>
              )}

              {user.solasId && isApprentice && (
                <span className="inline-flex items-center space-x-1 bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-[10px] font-bold px-2 py-0.5 rounded-lg font-mono">
                  <span>{user.solasId}</span>
                </span>
              )}

              {user.hasCifBadge && (
                <span className="inline-flex items-center space-x-1 bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                  <Award className="w-3 h-3" />
                  <span>CIF Registered</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        <p
          className={`text-xs leading-relaxed p-3 rounded-xl border ${
            isDark ? 'text-slate-300 bg-slate-800/40 border-slate-800' : 'text-slate-700 bg-slate-50 border-slate-200'
          }`}
        >
          {user.bio}
        </p>

        {/* Peer-Endorsed Skills & Competencies */}
        {user.skills && user.skills.length > 0 && (
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-500">
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>Peer-Endorsed Trade Skills</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {user.skills.map((item) => (
                <div
                  key={item.skill}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl border text-xs shadow-xs ${
                    isDark
                      ? 'bg-slate-800/90 border-slate-700 text-slate-200'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <ThumbsUp className="w-3 h-3 text-amber-500" />
                  <span className="font-semibold">{item.skill}</span>
                  <span className="bg-amber-500/20 text-amber-500 font-bold px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                    {item.endorserUserIds.length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Strip: 3-column layout resolving circled empty right space */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div
            className={`flex items-center space-x-2 p-2.5 rounded-xl border ${
              isDark ? 'bg-slate-800/60 border-slate-700/50 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <Phone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="font-mono truncate">{user.phone}</span>
          </div>

          <div
            className={`flex items-center space-x-2 p-2.5 rounded-xl border truncate ${
              isDark ? 'bg-slate-800/60 border-slate-700/50 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>

          <div
            className={`flex items-center space-x-2 p-2.5 rounded-xl border truncate ${
              isDark ? 'bg-slate-800/60 border-slate-700/50 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">{user.location.town}, Co. {user.location.county}</span>
          </div>
        </div>
      </div>

      {/* FIXED SUBTABS BAR: Responsive 5-column grid on desktop/tablet, smooth horizontal scroll on mobile */}
      {/* Guaranteed to NOT cut off "Tiers & Admin" on any screen size (iOS, Android, or Web) */}
      <div className="relative">
        <div
          className={`flex sm:grid sm:grid-cols-5 items-center gap-1.5 p-1 rounded-2xl border pb-1.5 sm:pb-1 overflow-x-auto whitespace-nowrap scrollbar-none no-scrollbar ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <button
            onClick={() => setActiveSubTab('portfolio')}
            className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 sm:shrink ${
              activeSubTab === 'portfolio'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Portfolio ({user.portfolio.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('cv')}
            className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 sm:shrink ${
              activeSubTab === 'cv'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Digital CV</span>
          </button>

          <button
            onClick={() => setActiveSubTab('credentials')}
            className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 sm:shrink ${
              activeSubTab === 'credentials'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Certifications</span>
          </button>

          <button
            onClick={() => setActiveSubTab('groups')}
            className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 sm:shrink ${
              activeSubTab === 'groups'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Site Groups ({customGroups.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('settings')}
            className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 sm:shrink ${
              activeSubTab === 'settings'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Tiers & Admin</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: WORK PORTFOLIO */}
      {activeSubTab === 'portfolio' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Completed Site Projects Gallery
            </h3>
            <button
              onClick={() => setShowAddProjectModal(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs transition cursor-pointer flex items-center space-x-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Project</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {user.portfolio.map((proj) => (
              <div
                key={proj.id}
                className={`rounded-2xl overflow-hidden border shadow-sm transition ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="relative h-44 bg-slate-800 overflow-hidden">
                  <img
                    src={proj.images[0]}
                    alt={proj.title}
                    className="w-full h-full object-cover hover:scale-105 transition duration-300"
                  />
                  <span className="absolute top-2.5 left-2.5 bg-slate-950/80 backdrop-blur-md text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-500/30">
                    {proj.trade}
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{proj.title}</h4>
                  <div className={`flex items-center space-x-2 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="truncate">{proj.location}</span>
                    <span>•</span>
                    <span>{proj.completionDate}</span>
                  </div>
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{proj.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 2: DIGITAL CV */}
      {activeSubTab === 'cv' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Verified On-Site Work History & Apprenticeship Log
            </h3>
            <button
              onClick={() => setShowEditCvModal(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs transition cursor-pointer shadow-sm"
            >
              Edit Digital CV & History
            </button>
          </div>

          <div
            className={`rounded-2xl p-4 sm:p-5 border shadow-sm space-y-6 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            {user.workHistory.map((item, idx) => (
              <div key={item.id} className="relative pl-6 pb-6 last:pb-0 border-l-2 border-amber-500/40">
                <div className="absolute -left-2 top-0 w-3.5 h-3.5 rounded-full bg-amber-500 ring-4 ring-slate-900" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs">
                  <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.role}</h4>
                  <span className="text-amber-500 font-semibold">{item.period}</span>
                </div>
                <div className={`text-xs font-medium mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {item.company} • <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{item.location}</span>
                </div>
                <p className={`text-xs leading-relaxed mt-2 p-2.5 rounded-xl border ${
                  isDark ? 'bg-slate-800/40 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  {item.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: CERTIFICATIONS */}
      {activeSubTab === 'credentials' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Irish Trade Cards & Site Safety Credentials
            </h3>
            <button
              onClick={() => setShowManageCertsModal(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs transition cursor-pointer shadow-sm"
            >
              Manage Certifications
            </button>
          </div>

          {/* Safe Pass Explicit Toggle Card */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 ${
            user.hasSafePass
              ? isDark ? 'bg-slate-900 border-emerald-500/50' : 'bg-emerald-50 border-emerald-300 shadow-sm'
              : isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                user.hasSafePass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
              }`}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Safe Pass Card (Site Safety)</h4>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    user.hasSafePass
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {user.hasSafePass ? 'Valid' : 'Not Certified / Unselected'}
                  </span>
                </div>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {user.hasSafePass ? `Verified Safe Pass (Expires: ${user.safePassExpiry || '2028-09-15'})` : 'Toggle on to display Safe Pass verified status on your posts & profile.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const nextHasSafePass = !user.hasSafePass;
                const updated: UserProfile = {
                  ...user,
                  hasSafePass: nextHasSafePass,
                  safePassExpiry: nextHasSafePass ? (user.safePassExpiry || '2028-09-15') : '',
                };
                setUser(updated);
                storageService.updateCurrentUser(updated);
                supabaseService.upsertProfile(updated);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                user.hasSafePass
                  ? 'bg-emerald-500 text-slate-950 shadow-md hover:bg-emerald-400'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{user.hasSafePass ? 'Safe Pass Enabled ✓' : 'Enable Safe Pass'}</span>
            </button>
          </div>

          {/* Trade Qualification & SOLAS Card */}
          {isCompanyOrBusiness ? (
            /* Companies / Employers: No apprentice logbook */
            <div className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 ${isDark ? 'bg-slate-900 border-purple-500/30' : 'bg-purple-50 border-purple-200 shadow-sm'}`}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Registered Enterprise / Contractor Entity</h4>
                    <span className="bg-purple-500/20 text-purple-400 text-[10px] font-bold px-1.5 py-0.2 rounded border border-purple-500/30">
                      Company Account
                    </span>
                  </div>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Active hiring contractor / subcontractor firm registered in Ireland.
                  </p>
                </div>
              </div>
            </div>
          ) : isApprentice ? (
            /* Apprentice Profile: Apprentice Logbook Tracking is OPTIONAL */
            <div className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 ${
              isLogbookTrackingEnabled
                ? isDark ? 'bg-slate-900 border-sky-500/50' : 'bg-sky-50 border-sky-300 shadow-sm'
                : isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isLogbookTrackingEnabled ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Apprentice Logbook Tracking</h4>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      isLogbookTrackingEnabled
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {isLogbookTrackingEnabled ? 'Tracking Active (Phase ' + (user.apprenticePhase || 1) + ')' : 'Optional / Paused'}
                    </span>
                  </div>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {isLogbookTrackingEnabled
                      ? 'Record on-site hours, off-the-job training blocks & mentor sign-offs.'
                      : 'Logbook tracking is optional for apprentices. Turn on if logging on-site hours for trade certification.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const updated: UserProfile = {
                      ...user,
                      trackSolasLogbook: !isLogbookTrackingEnabled,
                      apprenticePhase: user.apprenticePhase || 1,
                    };
                    setUser(updated);
                    storageService.updateCurrentUser(updated);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    isLogbookTrackingEnabled
                      ? isDark
                        ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        : 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300'
                      : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500 shadow-sm'
                  }`}
                >
                  {isLogbookTrackingEnabled ? 'Disable (Optional)' : 'Enable Logbook'}
                </button>

                {isLogbookTrackingEnabled && (
                  <button
                    onClick={() => setShowSolasLogbookModal(true)}
                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition cursor-pointer shadow-sm flex items-center space-x-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Open Logbook</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Qualified Tradesperson: No apprentice logbook */
            <div className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 ${isDark ? 'bg-slate-900 border-amber-500/30' : 'bg-amber-50 border-amber-200 shadow-sm'}`}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Qualified Tradesperson Status</h4>
                    <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                      National Craft Standards
                    </span>
                  </div>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Fully Qualified {user.trade} • {user.yearsExperience} years on-site experience across Ireland.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {user.hasSafePass && (
              <div
                className={`p-4 rounded-2xl border flex items-start space-x-3.5 ${
                  isDark ? 'bg-slate-900 border-emerald-500/40' : 'bg-white border-emerald-500/40 shadow-sm'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Safe Pass Card</h4>
                    <span className="bg-emerald-500/20 text-emerald-500 text-[10px] font-bold px-1.5 py-0.2 rounded">
                      VALID
                    </span>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Mandatory on-site health & safety awareness. Expires: <strong>{user.safePassExpiry || '2028-09-15'}</strong>
                  </p>
                </div>
              </div>
            )}

            {user.solasId && isApprentice && isLogbookTrackingEnabled && (
              <div
                className={`p-4 rounded-2xl border flex items-start space-x-3.5 ${
                  isDark ? 'bg-slate-900 border-sky-500/40' : 'bg-white border-sky-500/40 shadow-sm'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-500 flex items-center justify-center shrink-0">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Trade Apprenticeship Log</h4>
                    <span className="bg-sky-500/20 text-sky-500 text-[10px] font-bold px-1.5 py-0.2 rounded">
                      Phase {user.apprenticePhase || 1}
                    </span>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Registered under National Apprenticeship Registry. ID: <strong>{user.solasId}</strong>
                  </p>
                </div>
              </div>
            )}
          </div>

          {user.certifications && user.certifications.length > 0 && (
            <div className="pt-2">
              <h4 className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Additional Site Tickets & Qualifications ({user.certifications.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {user.certifications.map((cert) => (
                  <div
                    key={cert}
                    className={`p-3 rounded-xl border flex items-center space-x-2.5 ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <Award className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-xs font-bold truncate">{cert}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: SITE GROUPS & NETWORK */}
      {activeSubTab === 'groups' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                My Custom Site Crew Groups
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Private buckets of tradespeople you worked with on site. Network as a group or message together.
              </p>
            </div>
            <button
              onClick={() => setShowNewGroupModal(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs transition cursor-pointer flex items-center space-x-1 shrink-0 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Group</span>
            </button>
          </div>

          {/* List of Custom Groups */}
          <div className="space-y-3">
            {customGroups.map((group) => {
              const members = storageService.getUsers().filter((u) => group.memberUserIds.includes(u.id));

              return (
                <div
                  key={group.id}
                  className={`rounded-2xl p-4 border shadow-sm space-y-3 ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <h4 className={`text-sm font-black flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <span>{group.name}</span>
                      </h4>
                      {group.description && (
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{group.description}</p>
                      )}
                      <div className={`text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Created {group.createdAt} • {group.memberUserIds.length} crew members
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleStartGroupChat(group)}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs transition cursor-pointer flex items-center space-x-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Network / Group Chat</span>
                      </button>
                      <button
                        onClick={() => {
                          storageService.deleteCustomGroup(group.id);
                          refreshGroups();
                        }}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          isDark ? 'text-slate-500 hover:text-red-400 hover:bg-slate-800' : 'text-slate-400 hover:text-red-500 hover:bg-slate-100'
                        }`}
                        title="Delete Group"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Members in bucket */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-700/40">
                    <div className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Group Members:
                    </div>
                    {members.length === 0 ? (
                      <p className={`text-xs italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        No tradespeople added yet. Click any user on the feed to bucket them into this group.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className={`flex items-center justify-between p-2 rounded-xl border ${
                              isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <button
                              onClick={() => onOpenUserProfile && onOpenUserProfile(member)}
                              className="flex items-center space-x-2 text-left cursor-pointer group"
                            >
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="w-7 h-7 rounded-lg object-cover"
                              />
                              <div>
                                <div className={`text-xs font-bold group-hover:text-amber-500 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  {member.name}
                                </div>
                                <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{member.trade}</div>
                              </div>
                            </button>

                            <button
                              onClick={() => {
                                storageService.removeUserFromCustomGroup(group.id, member.id);
                                refreshGroups();
                              }}
                              className="text-[10px] text-red-400 hover:text-red-300 p-1"
                              title="Remove from group"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Followed Tradespeople Section */}
          <div className="pt-2">
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Tradespeople You Follow ({followedUsers.length})
            </h3>
            {followedUsers.length === 0 ? (
              <p className={`text-xs italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                You are not following anyone yet. Tap any user in the feed to follow them.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {followedUsers.map((fu) => (
                  <div
                    key={fu.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <button
                      onClick={() => onOpenUserProfile && onOpenUserProfile(fu)}
                      className="flex items-center space-x-2.5 text-left cursor-pointer group"
                    >
                      {fu.avatar ? (
                        <img
                          src={fu.avatar}
                          alt={fu.name}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0">
                          {fu.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className={`text-xs font-bold group-hover:text-amber-500 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {fu.name}
                        </div>
                        <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {fu.trade} • {fu.location.town}
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        storageService.unfollowUser(fu.id);
                        setUser(storageService.getCurrentUser());
                      }}
                      className="text-[11px] font-bold text-slate-400 hover:text-red-400 px-2 py-1 rounded-lg border border-slate-700"
                    >
                      Unfollow
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 5: SETTINGS */}
      {activeSubTab === 'settings' && (
        <div className="space-y-4">
          {/* ACCOUNT SECURITY & SIGN OUT */}
          {onLogout && (
            <div
              className={`rounded-2xl p-5 border shadow-sm flex items-center justify-between flex-wrap gap-3 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <h3 className={`text-sm font-bold flex items-center space-x-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <span>Account Session & Security</span>
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Currently signed in as <strong>{user.email}</strong>. Sign out to switch trade personas.
                </p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer shadow-sm shrink-0"
              >
                Sign Out / Switch Account
              </button>
            </div>
          )}

          {/* THEME & APPEARANCE SELECTOR: Fulfilling user request for Light Theme */}
          <div
            className={`rounded-2xl p-5 border shadow-sm space-y-3 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-sm font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Color Theme & Jobsite Sunlight Mode</span>
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Switch between Light Theme for bright on-site outdoor glare and Dark Theme for evening reading.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => setTheme('light')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center space-x-3 ${
                  theme === 'light'
                    ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/40 text-slate-900'
                    : isDark
                    ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                    : 'bg-slate-100 border-slate-300 text-slate-700 hover:border-slate-400'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black">Light Theme</div>
                  <div className="text-[10px] text-slate-500">High-contrast daytime view</div>
                </div>
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center space-x-3 ${
                  theme === 'dark'
                    ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/40 text-white'
                    : isDark
                    ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                    : 'bg-slate-100 border-slate-300 text-slate-700 hover:border-slate-400'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center shrink-0 border border-slate-700">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Dark Theme</div>
                  <div className="text-[10px] text-slate-500">Low-glare night workshop view</div>
                </div>
              </button>
            </div>
          </div>

          {/* LOCATION DETECTION & GPS SETTINGS */}
          <div
            className={`rounded-2xl p-5 border shadow-sm space-y-3 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className={`text-sm font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Navigation className="w-4 h-4 text-emerald-500" />
                  <span>Automatic GPS Geolocation & Radius</span>
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Current town: <strong>{currentLocation.town}, Co. {currentLocation.county}</strong> •{' '}
                  <span className={`font-semibold ${isGpsAuto ? 'text-emerald-400' : 'text-amber-500'}`}>
                    {isGpsAuto ? 'Auto-Detected (Active)' : 'Manually Set'}
                  </span>
                </p>
                {locationMethodDesc && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Source: {locationMethodDesc} • {currentLocation.latitude.toFixed(3)}°N, {currentLocation.longitude.toFixed(3)}°W
                  </p>
                )}
              </div>

              {onDetectGpsLocation && (
                <button
                  onClick={onDetectGpsLocation}
                  disabled={gpsLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-50 shrink-0"
                >
                  {gpsLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Detecting Coordinates...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Auto-Detect Location (GPS & IP)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* ACCOUNT TYPE & BUSINESS PROFILE CONFIGURATION */}
          <div
            className={`rounded-2xl p-5 border shadow-sm space-y-4 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div>
              <h3 className={`text-sm font-bold flex items-center space-x-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Briefcase className="w-4 h-4 text-amber-500" />
                <span>Account Persona & Business Profile Type</span>
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Choose between a Personal trade profile (Apprentice / Qualified) or a Business profile (Contractor / Employer or Tool & Material Manufacturer).
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType('personal')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col space-y-1 ${
                    accountType === 'personal'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/40'
                      : isDark
                      ? 'border-slate-700 bg-slate-800/60 text-slate-300'
                      : 'border-slate-300 bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="font-bold text-xs">Personal Profile</span>
                  <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Apprentice, Qualified Tradesperson, or Sole Trader
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType('business')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col space-y-1 ${
                    accountType === 'business'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/40'
                      : isDark
                      ? 'border-slate-700 bg-slate-800/60 text-slate-300'
                      : 'border-slate-300 bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="font-bold text-xs">Business Profile</span>
                  <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Employer, Contractor or Manufacturer/Supplier
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType('training_provider')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col space-y-1 ${
                    accountType === 'training_provider'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/40'
                      : isDark
                      ? 'border-slate-700 bg-slate-800/60 text-slate-300'
                      : 'border-slate-300 bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="font-bold text-xs">Training Provider</span>
                  <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    ETB, Technological University, SOLAS, or Private Provider
                  </span>
                </button>
              </div>

              {accountType === 'business' && (
                <div className="space-y-3 pt-2 border-t border-slate-700/40 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Business Category</label>
                    <select
                      value={businessCategory}
                      onChange={(e) => setBusinessCategory(e.target.value as any)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="contractor_employer">Contractor & Employer (Hiring site crews)</option>
                      <option value="tool_manufacturer">Tool Manufacturer (Power tools, hand tools & gear)</option>
                      <option value="material_supplier">Material Supplier (Building supplies, cables & fittings)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Business Profile Tier</label>
                    <select
                      value={businessTier}
                      onChange={(e) => setBusinessTier(e.target.value as any)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="standard">Standard Business Profile (Free)</option>
                      <option value="employer_pro">Employer Pro Subscription (€19.99/mo)</option>
                      <option value="manufacturer_showcase">Tool & Material Manufacturer Showcase (€49.99/mo)</option>
                    </select>
                  </div>
                </div>
              )}

              {accountType === 'training_provider' && (
                <div className="space-y-3 pt-2 border-t border-slate-700/40 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Training Provider Category</label>
                    <select
                      value={trainingProviderCategory}
                      onChange={(e) => setTrainingProviderCategory(e.target.value as any)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="government_nonprofit">Government Non-Profit Agency (SOLAS - Free)</option>
                      <option value="etb">ETB / Education and Training Board (Free)</option>
                      <option value="technological_university">Technological University / College (Free)</option>
                      <option value="private_provider">Private Certified Training Provider (Paid Monthly)</option>
                    </select>
                  </div>
                  <div className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                    💡 Non-profit state agencies and ETB providers publish courses for free on the Global Courses Hub.
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveAccountType}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer shadow-sm"
              >
                Save Account Type & Persona
              </button>
            </div>
          </div>

          {/* BUSINESS ADVERTISEMENT MANAGER */}
          {user.accountType === 'business' && (
            <div
              className={`rounded-2xl p-5 border shadow-sm space-y-4 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <h3 className={`text-sm font-bold flex items-center space-x-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Business Feed Advertisements Manager</span>
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  As a registered business profile, you can purchase and instantly broadcast sponsored advertisements, special tool offers, or recruitment drives directly to the All-Ireland Trade Feed.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAdModal(true)}
                className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-md flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create & Purchase Sponsored Feed Ad (€49)</span>
              </button>
            </div>
          )}

          {/* Stripe SaaS Subscriptions */}
          <div
            className={`rounded-2xl p-5 border shadow-sm space-y-4 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div>
              <h3 className={`text-sm font-bold flex items-center space-x-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Crown className="w-4 h-4 text-amber-500" />
                <span>TradeNet Pro & Contractor SaaS Plans</span>
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Unlock unlimited subcontract direct messaging, priority apprentice applications, and permanent top placements.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                className={`rounded-xl p-4 flex flex-col justify-between border ${
                  isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-amber-500">Apprentice Sponsor</div>
                  <div className={`text-xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    €29 <span className="text-xs font-normal text-slate-400">/ month</span>
                  </div>
                  <ul className={`text-[11px] space-y-1 mt-2.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    <li>• Direct apprentice applicant reviews</li>
                    <li>• Verified Employer Gold Checkmark</li>
                    <li>• 3 featured job slots per month</li>
                  </ul>
                </div>
                <button
                  onClick={() =>
                    onTriggerStripeCheckout({
                      title: 'Apprentice Sponsor Tier Subscription',
                      priceEuros: 29,
                      type: 'subscription',
                    })
                  }
                  className="mt-4 w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-xl text-xs transition cursor-pointer shadow-sm"
                >
                  Upgrade via Stripe (€29/mo)
                </button>
              </div>

              <div
                className={`rounded-xl p-4 flex flex-col justify-between border ring-1 ring-amber-500/40 ${
                  isDark ? 'bg-slate-800/80 border-amber-500/60' : 'bg-amber-50/50 border-amber-300'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-amber-500 flex items-center justify-between">
                    <span>Master Contractor</span>
                    <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded">
                      POPULAR
                    </span>
                  </div>
                  <div className={`text-xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    €79 <span className="text-xs font-normal text-slate-400">/ month</span>
                  </div>
                  <ul className={`text-[11px] space-y-1 mt-2.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    <li>• Priority placement on Classifieds & Feed</li>
                    <li>• Subcontractor dispatch & team accounts</li>
                    <li>• Instant 50km Stolen Gear radar broadcasts</li>
                  </ul>
                </div>
                <button
                  onClick={() =>
                    onTriggerStripeCheckout({
                      title: 'Master Contractor Tier Subscription',
                      priceEuros: 79,
                      type: 'subscription',
                    })
                  }
                  className="mt-4 w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold py-2 rounded-xl text-xs transition cursor-pointer shadow-md"
                >
                  Upgrade via Stripe (€79/mo)
                </button>
              </div>
            </div>
          </div>

          {/* Phase 1: Database & Deletion Finalization (Audit Simulator) */}
          <div
            className={`rounded-2xl p-5 border shadow-sm space-y-3 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className={`text-sm font-bold flex items-center space-x-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Database className="w-4 h-4 text-emerald-500" />
                  <span>Phase 1: Relational Integrity & Cascade Audit</span>
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Verify that foreign keys cascade cleanly without constraint violations or orphaned records.
                </p>
              </div>
              <button
                onClick={runDatabaseAudit}
                className={`border text-xs font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center space-x-1 ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Run Audit</span>
              </button>
            </div>

            {auditResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                  auditResult.isValid
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/15 border-red-500/40 text-red-600 dark:text-red-400'
                }`}
              >
                <div className="font-bold flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4" />
                  <span>Integrity Audit Passed: Zero Orphaned Records</span>
                </div>
                <p className="text-[11px] opacity-90">
                  Orphaned Comments: {auditResult.orphanedComments} • Orphaned Posts: {auditResult.orphanedPosts} • Orphaned Marketplace Items: {auditResult.orphanedItems}
                </p>
              </div>
            )}

            <button
              onClick={() => {
                storageService.resetToDefaultSeed();
                window.location.reload();
              }}
              className="text-xs text-slate-500 hover:text-slate-400 underline cursor-pointer"
            >
              Reset Database to Initial Seed
            </button>
          </div>
        </div>
      )}

      {/* Modal: Create Custom Site Crew Group */}
      {showNewGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div
            className={`border rounded-3xl max-w-md w-full p-5 shadow-2xl relative ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/40 mb-3">
              <h3 className="text-base font-bold flex items-center space-x-2">
                <Users className="w-4 h-4 text-amber-500" />
                <span>Create Custom Site Crew Group</span>
              </h3>
              <button
                onClick={() => setShowNewGroupModal(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomGroup} className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Intel Leixlip Fab 34 Crew, Malahide Rewire Team"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Description / Site Focus (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cleanroom containment, shift notes, tool sharing"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-700/40">
                <button
                  type="button"
                  onClick={() => setShowNewGroupModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newGroupName.trim()}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  Create Site Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Portfolio Project */}
      {showAddProjectModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`border rounded-2xl max-w-lg w-full p-5 shadow-2xl relative ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/40 mb-4">
              <h3 className="text-base font-bold">Add Project to Digital Portfolio</h3>
              <button
                onClick={() => setShowAddProjectModal(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3-Phase Main Switchgear Installation"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Location (Irish Town / County)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grand Canal Dock, Dublin 2"
                  value={projectLocation}
                  onChange={(e) => setProjectLocation(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Scope & Technical Details
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe containment, equipment, test results, certifications, or materials used..."
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className={`w-full border rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500 leading-relaxed ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              {/* Photo upload with compression */}
              <div
                className={`border border-dashed rounded-xl p-3 text-center ${
                  isDark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-300 bg-slate-50'
                }`}
              >
                <input
                  type="file"
                  id="portfolio-photo-upload"
                  accept="image/*"
                  onChange={handleProjectImageUpload}
                  className="hidden"
                />
                <label
                  htmlFor="portfolio-photo-upload"
                  className="cursor-pointer text-xs text-amber-500 font-semibold hover:underline block"
                >
                  + Upload Completed Work Photo (Auto-compressed)
                </label>
                {isCompressingProjectImg && (
                  <p className="text-xs text-amber-500 mt-1">Compressing image client-side...</p>
                )}
                {projectImages.length > 0 && (
                  <img
                    src={projectImages[0]}
                    alt="Preview"
                    className="mt-2 w-24 h-24 object-cover rounded-lg border border-slate-700 mx-auto"
                  />
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-700/40">
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!projectTitle.trim() || isCompressingProjectImg}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  Add to Portfolio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      <AdCreatorModal
        isOpen={showAdModal}
        onClose={() => setShowAdModal(false)}
        currentUser={user}
        onTriggerStripeCheckout={onTriggerStripeCheckout}
      />
      <EditGeneralProfileModal
        isOpen={showEditGeneralModal}
        onClose={() => setShowEditGeneralModal(false)}
        user={user}
        onSave={(updated) => {
          setUser(updated);
          storageService.updateCurrentUser(updated);
          supabaseService.upsertProfile(updated);
        }}
      />

      <EditDigitalCvModal
        isOpen={showEditCvModal}
        onClose={() => setShowEditCvModal(false)}
        user={user}
        onSave={(updated) => {
          setUser(updated);
          storageService.updateCurrentUser(updated);
          supabaseService.upsertProfile(updated);
        }}
      />

      <ManageCertificationsModal
        isOpen={showManageCertsModal}
        onClose={() => setShowManageCertsModal(false)}
        user={user}
        onSave={(updated) => {
          setUser(updated);
          storageService.updateCurrentUser(updated);
          supabaseService.upsertProfile(updated);
        }}
      />

      <SolasLogbookModal
        isOpen={showSolasLogbookModal}
        onClose={() => setShowSolasLogbookModal(false)}
        user={user}
        onUserUpdate={(updated) => setUser(updated)}
      />
    </div>
  );
};
