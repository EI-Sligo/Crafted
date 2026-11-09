import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  MapPin,
  Clock,
  ShieldCheck,
  Award,
  Users,
  Search,
  CheckCircle,
  Filter,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Euro,
  X,
  Send,
  TrendingUp,
  User,
} from 'lucide-react';
import {
  JobListing,
  JobType,
  TradeType,
  UserProfile,
  GeoLocation,
  JOB_POSTING_TIERS,
  GENERATION_APPRENTICESHIP_SECTORS,
} from '../types';
import { storageService } from '../services/storage';
import { supabaseService } from '../services/supabaseService';
import { calculateHaversineDistanceKm } from '../utils/calculations';
import { IRISH_LOCATIONS } from '../data/seedData';
import { useTheme } from '../context/ThemeContext';
import { TradeMarketAnalyticsDashboard } from './TradeMarketAnalyticsDashboard';

interface JobsTabProps {
  currentUser: UserProfile;
  currentLocation: GeoLocation;
  onOpenChatWithJob: (conversationId: string) => void;
  onOpenUserProfile: (user: UserProfile) => void;
  onTriggerStripeCheckout: (item: {
    title: string;
    priceEuros: number;
    type: 'boost' | 'subscription' | 'job' | 'stolen';
  }) => void;
}

const TRADE_LIST: TradeType[] = [
  'Electrician',
  'Plumber',
  'Carpentry & Joinery',
  'Brick & Stonelaying',
  'Plastering & Drylining',
  'Painting & Decorating',
  'Roofing & Cladding',
  'Refrigeration & Air Conditioning',
  'Electrical Instrumentation',
  'Instrumentation',
  'Electronic Security Systems',
  'Mechanical Automation and Maintenance Fitting (MAMF)',
  'Metal Fabrication & Welding',
  'Toolmaking',
  'Pipefitting',
  'Motor Mechanics',
  'Heavy Vehicle Mechanics',
  'Construction Plant Fitting',
  'Scaffolding',
  'Civil Engineering',
  'Logistics Associate',
  'Network Engineer',
  'General Contractor',
];

export const JobsTab: React.FC<JobsTabProps> = ({
  currentUser,
  currentLocation,
  onOpenChatWithJob,
  onOpenUserProfile,
  onTriggerStripeCheckout,
}) => {
  const { isDark } = useTheme();
  const [jobs, setJobs] = useState<JobListing[]>(storageService.getJobs());
  const [selectedType, setSelectedType] = useState<'All' | JobType>('All');
  const [selectedTrade, setSelectedTrade] = useState<'All' | TradeType>('All');
  const [selectedRadiusKm, setSelectedRadiusKm] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDemandRadar, setShowDemandRadar] = useState(false);
  const [showPostJobModal, setShowPostJobModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    supabaseService
      .getJobs()
      .then((remote) => {
        if (isMounted && remote) {
          setJobs(remote);
        }
      })
      .catch((err) => {
        console.warn('Initial jobs fetch failed:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Form states for posting a new job
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<JobType>('Apprentice');
  const [formTrade, setFormTrade] = useState<TradeType>(currentUser.trade);
  const [formTargetPhase, setFormTargetPhase] = useState('Phase 1 (Junior/Entry)');
  const [formDesc, setFormDesc] = useState('');
  const [formRateAmount, setFormRateAmount] = useState<number>(18.5);
  const [formRatePeriod, setFormRatePeriod] = useState<string>('hr');
  const [formRateType, setFormRateType] = useState<JobListing['rateType']>('hourly');
  const [formCompany, setFormCompany] = useState(currentUser.name + ' Contracting');
  const [formTown, setFormTown] = useState(currentLocation.town);
  const [formSafePassRequired, setFormSafePassRequired] = useState(true);
  const [selectedTier, setSelectedTier] = useState<JobListing['tier']>('basic');

  const refreshJobs = () => {
    setJobs(storageService.getJobs());
  };

  const filteredJobs = jobs.filter((job) => {
    // 1. Job Type
    if (selectedType !== 'All' && job.jobType !== selectedType) return false;

    // 2. Trade
    if (selectedTrade !== 'All') {
      if (job.trade !== selectedTrade) {
        if (
          !(
            (selectedTrade === 'Carpentry & Joinery' && job.trade === 'Carpenter') ||
            (selectedTrade === 'Brick & Stonelaying' && job.trade === 'Bricklayer & Mason') ||
            (selectedTrade === 'Metal Fabrication & Welding' && job.trade === 'Welder & Fabricator') ||
            (selectedTrade === 'Plastering & Drylining' && job.trade === 'Plasterer & Dryliner') ||
            (selectedTrade === 'Roofing & Cladding' && job.trade === 'Roofer') ||
            (selectedTrade === 'Refrigeration & Air Conditioning' && job.trade === 'HVAC & Refrigeration')
          )
        ) {
          return false;
        }
      }
    }

    // 3. Location radius
    if (selectedRadiusKm !== 'all') {
      const distance = calculateHaversineDistanceKm(
        { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
        { latitude: job.location.latitude, longitude: job.location.longitude }
      );
      if (distance > selectedRadiusKm) return false;
    }

    // 4. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = job.title.toLowerCase().includes(q);
      const matchCompany = job.employerCompany.toLowerCase().includes(q);
      const matchTown = job.location.town.toLowerCase().includes(q);
      const matchTrade = job.trade.toLowerCase().includes(q);
      if (!matchTitle && !matchCompany && !matchTown && !matchTrade) return false;
    }

    return true;
  });

  const handleApplyClick = (job: JobListing) => {
    const convId = storageService.startOrOpenConversationForJob(job);
    storageService.applyForJob(job.id);
    refreshJobs();
    onOpenChatWithJob(convId);
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDesc.trim()) return;

    const chosenLoc = IRISH_LOCATIONS.find((l) => l.town === formTown) || currentLocation;
    const tierData = JOB_POSTING_TIERS.find((t) => t.id.includes(selectedTier)) || JOB_POSTING_TIERS[0];

    try {
      await supabaseService.createJob({
        employerId: currentUser.id,
        employerName: currentUser.name,
        employerAvatar: currentUser.avatar,
        employerTrade: currentUser.trade,
        employerCompany: formCompany.trim() || `${currentUser.name} Contracting Ltd`,
        hasSafePassRequired: formSafePassRequired,
        title: formTitle.trim(),
        jobType: formType,
        trade: formTrade,
        targetApprenticePhase: formType === 'Apprentice' ? formTargetPhase : undefined,
        description: formDesc.trim(),
        location: chosenLoc,
        rateText:
          formRateType === 'hourly'
            ? `€${formRateAmount.toFixed(2)} / hr`
            : formRateType === 'daily'
            ? `€${formRateAmount.toFixed(2)} / day`
            : formRateType === 'piece-rate'
            ? 'Agreed Piece Work Rate'
            : `€${formRateAmount.toLocaleString()} / year`,
        rateType: formRateType,
        rateAmount: formRateAmount,
        duration: 'Immediate Start',
        tier: selectedTier,
        isFeatured: selectedTier !== 'basic',
      });

      onTriggerStripeCheckout({
        title: `Job Listing (${tierData.name}) - ${formTitle.trim()}`,
        priceEuros: tierData.priceEuros,
        type: 'job',
      });

      setFormTitle('');
      setFormDesc('');
      setShowPostJobModal(false);
      refreshJobs();
    } catch (err: any) {
      console.error('Failed to create job:', err);
      alert(`Could not post job to database: ${err.message || 'Please check connection'}`);
    }
  };

  return (
    <div className="pb-16 max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-4">
      {/* Top Banner */}
      <div className={`rounded-3xl p-6 sm:p-8 border relative overflow-hidden shadow-xl ${
        isDark ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border-slate-800' : 'bg-gradient-to-r from-slate-900 via-slate-900 to-amber-900 text-white border-slate-800'
      }`}>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 hidden sm:block">
          <Briefcase className="w-48 h-48 text-amber-500" />
        </div>
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" />
            <span>Irish Site Opportunities & Subcontract Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Trades & Apprenticeship Jobs
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Advertise for registered apprentices, qualified site crew, or subcontract packages across Ireland.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              onClick={() => setShowDemandRadar(!showDemandRadar)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 border ${
                showDemandRadar
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <TrendingUp className={`w-4 h-4 ${showDemandRadar ? 'text-slate-950' : 'text-amber-500'}`} />
              <span>{showDemandRadar ? 'Hide Irish Radar' : 'Irish Demand & Day-Rate Radar'}</span>
            </button>

            <button
              onClick={() => setShowPostJobModal(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Post a Job (From €0.99)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Trade Demand and Rate Radar */}
      {showDemandRadar && (
        <div className="pt-2">
          <TradeMarketAnalyticsDashboard
            onClose={() => setShowDemandRadar(false)}
            onSelectCounty={(county) => {
              setSearchQuery(county);
            }}
          />
        </div>
      )}

      {/* Search & Location Radius Filter Bar */}
      <div className={`rounded-2xl p-4 border space-y-3 shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="sm:col-span-2 relative">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="text"
              placeholder="Search job title, company, town, or trade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-amber-500 ${
                isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          <div className="relative">
            <select
              value={selectedRadiusKm}
              onChange={(e) =>
                setSelectedRadiusKm(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className={`w-full py-2 px-3 rounded-xl text-xs border focus:outline-none focus:border-amber-500 cursor-pointer ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <option value="all">📍 All Ireland Radius</option>
              <option value={25}>Within 25 km of {currentLocation.town}</option>
              <option value={50}>Within 50 km of {currentLocation.town}</option>
              <option value={100}>Within 100 km of {currentLocation.town}</option>
            </select>
          </div>
        </div>

        {/* Role Type Filter Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(['All', 'Apprentice', 'Qualified Hire', 'Subcontract'] as Array<'All' | JobType>).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                selectedType === type
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : isDark
                  ? 'bg-slate-800 text-slate-300 hover:text-white'
                  : 'bg-slate-100 text-slate-700 hover:text-slate-900'
              }`}
            >
              {type === 'All' ? 'All Roles' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Listing Grid */}
      <div className="space-y-3.5">
        {filteredJobs.length === 0 ? (
          <div
            className={`rounded-2xl p-8 text-center space-y-2 border ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <p className="text-sm font-semibold">No active job listings match your filters.</p>
            <button
              onClick={() => {
                setSelectedType('All');
                setSelectedTrade('All');
                setSelectedRadiusKm('all');
                setSearchQuery('');
              }}
              className="text-amber-500 text-xs font-bold hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const distanceKm = calculateHaversineDistanceKm(
              { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
              { latitude: job.location.latitude, longitude: job.location.longitude }
            );

            const isEmployer = job.employerId === currentUser.id;

            return (
              <div
                key={job.id}
                className={`rounded-2xl p-4 sm:p-5 border shadow-sm transition space-y-3 ${
                  job.isFeatured
                    ? isDark
                      ? 'bg-slate-900/95 border-amber-500/40 ring-1 ring-amber-500/20'
                      : 'bg-white border-amber-400 ring-1 ring-amber-300/40'
                    : isDark
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-200'
                }`}
              >
                {/* Job Title & Pay */}
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="flex items-start space-x-3">
                    <button
                      onClick={() =>
                        onOpenUserProfile({
                          id: job.employerId,
                          name: job.employerName,
                          handle: `@${job.employerName.toLowerCase().replace(/\s+/g, '_')}`,
                          trade: job.trade,
                          avatar: job.employerAvatar,
                          hasSafePass: true,
                          location: job.location,
                          yearsExperience: 8,
                          bio: '',
                          phone: '',
                          email: '',
                          hasCifBadge: true,
                          followingUserIds: [],
                          followersCount: 45,
                          portfolio: [],
                          workHistory: [],
                        })
                      }
                      className="cursor-pointer group relative shrink-0"
                    >
                      {job.employerAvatar ? (
                        <img
                          src={job.employerAvatar}
                          alt={job.employerName}
                          className="w-10 h-10 rounded-xl object-cover border border-amber-500/50"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-800 text-amber-500 border border-amber-500/50 flex items-center justify-center font-bold text-xs select-none">
                          {job.employerName ? job.employerName.substring(0, 2).toUpperCase() : <User className="w-5 h-5" />}
                        </div>
                      )}
                    </button>
                    <div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            onOpenUserProfile({
                              id: job.employerId,
                              name: job.employerName,
                              handle: `@${job.employerName.toLowerCase().replace(/\s+/g, '_')}`,
                              trade: job.trade,
                              avatar: job.employerAvatar,
                              hasSafePass: true,
                              location: job.location,
                              yearsExperience: 8,
                              bio: '',
                              phone: '',
                              email: '',
                              hasCifBadge: true,
                              followingUserIds: [],
                              followersCount: 45,
                              portfolio: [],
                              workHistory: [],
                            })
                          }
                          className="text-xs font-bold text-amber-500 hover:underline text-left cursor-pointer"
                        >
                          {job.employerCompany}
                        </button>
                        <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          by {job.employerName}
                        </span>
                      </div>
                      <h3 className={`text-sm sm:text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {job.title}
                      </h3>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm sm:text-base font-black text-amber-500 font-mono">
                      {job.rateText}
                    </div>
                    {job.isFeatured && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded font-black uppercase">
                        FEATURED HIRING
                      </span>
                    )}
                  </div>
                </div>

                {/* Badges strip: Role, Trade, SOLAS Phase, Safe Pass, Distance */}
                <div className="flex items-center space-x-2 text-xs flex-wrap gap-y-1">
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {job.jobType}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {job.trade}
                  </span>
                  {job.targetApprenticePhase && (
                    <span className="text-[10px] bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold">
                      Apprentice: {job.targetApprenticePhase}
                    </span>
                  )}
                  {job.hasSafePassRequired && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center space-x-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Safe Pass Required</span>
                    </span>
                  )}
                  <span className={`flex items-center space-x-1 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <MapPin className="w-3 h-3 text-amber-500" />
                    <span>
                      {job.location.town}, Co. {job.location.county} ({distanceKm} km away)
                    </span>
                  </span>
                </div>

                {/* Job Description */}
                <p className={`text-xs sm:text-sm leading-relaxed whitespace-pre-line ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {job.description}
                </p>

                {/* Footer Strip */}
                <div
                  className={`flex items-center justify-between pt-2.5 border-t text-xs flex-wrap gap-2 ${
                    isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}
                >
                  <div className={`flex items-center space-x-2 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span>Posted {job.createdAt}</span>
                    <span>•</span>
                    <span className="text-amber-500 font-semibold">
                      {job.applicationsCount} interested applicants
                    </span>
                  </div>

                  {isEmployer ? (
                    <button
                      onClick={async () => {
                        await supabaseService.deleteJob(job.id);
                        refreshJobs();
                      }}
                      className="text-xs text-red-500 hover:text-red-400 font-semibold px-2 py-1 rounded cursor-pointer"
                    >
                      Remove Listing
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApplyClick(job)}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-1.5 rounded-xl text-xs transition cursor-pointer flex items-center space-x-1.5 shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Apply / Direct Message Employer</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Post New Job (Starts at €0.99) */}
      {showPostJobModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div
            className={`border rounded-3xl max-w-lg w-full p-5 shadow-2xl relative max-h-[92vh] flex flex-col ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/40">
              <h3 className="text-base font-bold flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-amber-500" />
                <span>Advertise Trade Job or Subcontract</span>
              </h3>
              <button
                onClick={() => setShowPostJobModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostJob} className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apprentice Electrician (Phase 2-4) – Commercial 1st Fix"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Role Category
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as JobType)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Apprentice">Apprentice Position</option>
                    <option value="Qualified Hire">Qualified Hire</option>
                    <option value="Subcontract">Subcontract Work</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Trade Discipline (Generation Apprenticeship)
                  </label>
                  <select
                    value={formTrade}
                    onChange={(e) => setFormTrade(e.target.value as TradeType)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                  >
                    {GENERATION_APPRENTICESHIP_SECTORS.map((sector) => (
                      <optgroup key={sector.sector} label={sector.sector}>
                        {sector.trades.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              {formType === 'Apprentice' && (
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Target Apprentice Phase
                  </label>
                  <select
                    value={formTargetPhase}
                    onChange={(e) => setFormTargetPhase(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Phase 1 (Junior/Entry)">Phase 1 (Junior/Entry)</option>
                    <option value="Phase 2-4 (Junior to Mid)">Phase 2-4 (Junior to Mid)</option>
                    <option value="Phase 5-7 (Senior Apprentice)">Phase 5-7 (Senior Apprentice)</option>
                    <option value="Any Registered Phase">Any Registered Phase</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Rate Amount (€)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formRateAmount}
                    onChange={(e) => setFormRateAmount(Number(e.target.value))}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Rate Period
                  </label>
                  <select
                    value={formRateType}
                    onChange={(e) => setFormRateType(e.target.value as any)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="hourly">Per Hour (€/hr)</option>
                    <option value="daily">Per Day (€/day)</option>
                    <option value="piece-rate">Piece Work Rate</option>
                    <option value="salary">Annual Salary</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Hiring Company Name
                  </label>
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Job Location (Hub)
                  </label>
                  <select
                    value={formTown}
                    onChange={(e) => setFormTown(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                  >
                    {IRISH_LOCATIONS.map((loc) => (
                      <option key={loc.town} value={loc.town}>
                        {loc.town}, Co. {loc.county}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Scope of Work & Site Requirements
                </label>
                <textarea
                  rows={3}
                  placeholder="Specify containment, tools required, PPE, parking, induction times..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className={`w-full border rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500 leading-relaxed ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="safe-pass-req"
                  checked={formSafePassRequired}
                  onChange={(e) => setFormSafePassRequired(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <label htmlFor="safe-pass-req" className="text-xs cursor-pointer font-medium">
                  Mandatory Valid Safe Pass required for site access
                </label>
              </div>

              {/* 3-Tier Job Posting Selector Starting at €0.99 */}
              <div>
                <label className="block text-xs font-bold mb-1.5">
                  Select Advertising Tier (Starting at €0.99)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {JOB_POSTING_TIERS.map((tier) => {
                    const tierKey = tier.id === 'job_tier_1' ? 'basic' : tier.id === 'job_tier_2' ? 'priority' : 'contractor_pro';
                    const isSelected = selectedTier === tierKey;

                    return (
                      <div
                        key={tier.id}
                        onClick={() => setSelectedTier(tierKey as any)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/40'
                            : isDark
                            ? 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{tier.name}</span>
                            {tier.isPopular && (
                              <span className="text-[9px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded">
                                POPULAR
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-black text-amber-500 font-mono mt-1">
                            €{tier.priceEuros.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{tier.durationText}</div>
                        </div>

                        <ul className="text-[10px] space-y-0.5 mt-2 border-t border-slate-700/30 pt-1.5 opacity-80">
                          {tier.features.slice(0, 2).map((f, idx) => (
                            <li key={idx}>• {f}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-700/40">
                <button
                  type="button"
                  onClick={() => setShowPostJobModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formTitle.trim() || !formDesc.trim()}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer shadow-md"
                >
                  Publish & Pay €
                  {(
                    JOB_POSTING_TIERS.find((t) => t.id.includes(selectedTier)) || JOB_POSTING_TIERS[0]
                  ).priceEuros.toFixed(2)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
