import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  MapPin,
  Clock,
  Award,
  Search,
  CheckCircle,
  ExternalLink,
  Trash2,
  Euro,
  Building2,
  Calendar,
  Sparkles,
  Phone,
  Mail,
  ShieldCheck,
  X,
} from 'lucide-react';
import { CourseListing, UserProfile, GeoLocation } from '../types';
import { storageService } from '../services/storage';
import { supabaseService } from '../services/supabaseService';
import { useTheme } from '../context/ThemeContext';
import { IRISH_LOCATIONS } from '../data/seedData';
import { LocationAutocomplete } from './LocationAutocomplete';

interface CoursesTabProps {
  currentUser: UserProfile;
  currentLocation: GeoLocation;
  onOpenUserProfile: (user: UserProfile) => void;
  onTriggerStripeCheckout: (item: { title: string; priceEuros: number; type: 'boost' | 'subscription' | 'job'; itemId?: string }) => void;
}

const COURSE_CATEGORIES = [
  'All',
  'Apprenticeship Programs',
  'Safe Pass / CSCS',
  'Up-skilling & Certification',
  'Electrical Regs (IS 10101)',
  'F-Gas & HVAC',
  'Welding & Fabrication',
  'Management & Safety',
] as const;

export const CoursesTab: React.FC<CoursesTabProps> = ({
  currentUser,
  currentLocation,
  onOpenUserProfile,
  onTriggerStripeCheckout,
}) => {
  const { isDark } = useTheme();
  const [courses, setCourses] = useState<CourseListing[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPricing, setSelectedPricing] = useState<'all' | 'free' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<CourseListing | null>(null);

  // Form states for posting a new course (Training Provider)
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<CourseListing['category']>('Up-skilling & Certification');
  const [formDesc, setFormDesc] = useState('');
  const [formDuration, setFormDuration] = useState('2 Days');
  const [formCostText, setFormCostText] = useState('€250');
  const [formCostAmount, setFormCostAmount] = useState<number>(250);
  const [formIsFree, setFormIsFree] = useState<boolean>(false);
  const [formLocation, setFormLocation] = useState<GeoLocation>(currentLocation);
  const [formStartDate, setFormStartDate] = useState('2026-12-01');
  const [formContactEmail, setFormContactEmail] = useState(currentUser.email);
  const [formContactPhone, setFormContactPhone] = useState(currentUser.phone);

  const isTrainingProvider = currentUser.accountType === 'training_provider';

  const fetchCourses = async () => {
    try {
      const list = await supabaseService.getCourses();
      setCourses(list);
    } catch (e) {
      console.error('Failed to fetch courses:', e);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handlePostCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDesc.trim()) return;

    try {
      await supabaseService.createCourse({
        providerId: currentUser.id,
        providerName: currentUser.name,
        providerAvatar: currentUser.avatar || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=300&q=80',
        providerType: currentUser.trainingProviderCategory === 'government_nonprofit' ? 'Government Agency' : 'Verified Training Provider',
        title: formTitle.trim(),
        category: formCategory,
        description: formDesc.trim(),
        durationText: formDuration.trim(),
        costText: formIsFree ? 'Free (Sponsored / Funded)' : formCostText,
        costAmount: formIsFree ? 0 : formCostAmount,
        location: formLocation,
        startDate: formStartDate,
        contactEmail: formContactEmail.trim() || currentUser.email,
        contactPhone: formContactPhone.trim() || currentUser.phone,
        isFree: formIsFree,
      });

      setFormTitle('');
      setFormDesc('');
      setShowPostModal(false);
      fetchCourses();
    } catch (err: any) {
      alert(`Could not post course: ${err.message || 'Please check connection'}`);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    await supabaseService.deleteCourse(courseId);
    fetchCourses();
  };

  const filteredCourses = courses.filter((c) => {
    if (selectedCategory !== 'All' && c.category !== selectedCategory) return false;
    if (selectedPricing === 'free' && !c.isFree) return false;
    if (selectedPricing === 'paid' && c.isFree) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.providerName.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.location.town.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="pb-20 max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-4">
      {/* Top Banner */}
      <div className={`rounded-3xl p-6 sm:p-8 border relative overflow-hidden shadow-xl ${
        isDark ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border-slate-800' : 'bg-gradient-to-r from-slate-900 via-slate-900 to-amber-900 text-white border-slate-800'
      }`}>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 hidden sm:block">
          <BookOpen className="w-48 h-48 text-amber-500" />
        </div>
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" />
            <span>Global Training & Qualifications Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Apprenticeships, Up-Skilling & Site Tickets
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Browse government/state-funded programs, polytechnics, universities, and accredited training provider courses worldwide.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {isTrainingProvider ? (
              <button
                onClick={() => setShowPostModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center space-x-2 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Publish Training Course</span>
              </button>
            ) : (
              <div className="text-[11px] text-amber-400/90 font-medium bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                💡 Are you an educational institution, university or training provider? Switch your account profile to <strong>Training Provider</strong> to publish courses.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className={`p-4 rounded-2xl border shadow-sm space-y-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search courses, providers, towns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Pricing Filter */}
          <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Courses' },
              { id: 'free', label: 'Free / State Funded' },
              { id: 'paid', label: 'Paid / Certified' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPricing(p.id as any)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                  selectedPricing === p.id
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {COURSE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                  : isDark
                  ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-amber-500/50'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-amber-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCourses.length === 0 ? (
          <div className={`col-span-full py-16 text-center rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
            <BookOpen className="w-12 h-12 mx-auto text-amber-500 mb-3 opacity-60" />
            <h3 className="text-base font-bold text-white mb-1">No training courses found</h3>
            <p className="text-xs text-slate-400">Try adjusting your category filter or search keywords.</p>
          </div>
        ) : (
          filteredCourses.map((course) => {
            const isOwner = course.providerId === currentUser.id;
            return (
              <div
                key={course.id}
                className={`rounded-3xl p-5 border shadow-sm transition flex flex-col justify-between space-y-4 ${
                  isDark ? 'bg-slate-900 border-slate-800 hover:border-amber-500/50 text-white' : 'bg-white border-slate-200 hover:border-amber-500 text-slate-900'
                }`}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <img src={course.providerAvatar || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=300&q=80'} alt={course.providerName} className="w-10 h-10 rounded-xl object-cover border border-slate-700" />
                      <div>
                        <div className="text-xs font-bold text-amber-500 flex items-center space-x-1">
                          <span>{course.providerName}</span>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                        <div className="text-[10px] text-slate-400">{course.providerType}</div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      course.isFree
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {course.costText}
                    </span>
                  </div>

                  {/* Title & Category */}
                  <div>
                    <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700 uppercase tracking-wider">
                      {course.category}
                    </span>
                    <h2 className="text-base font-black tracking-tight mt-1.5 leading-snug">{course.title}</h2>
                  </div>

                  {/* Description */}
                  <p className={`text-xs line-clamp-3 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {course.description}
                  </p>
                </div>

                {/* Details Footer */}
                <div className="pt-3 border-t border-slate-800/60 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{course.durationText}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{course.location.town}, Co. {course.location.county}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 col-span-2">
                      <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Starts: <strong className="text-slate-200">{course.startDate}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {isOwner ? (
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        className="text-xs text-red-500 hover:text-red-400 font-semibold px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 cursor-pointer flex items-center space-x-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Course</span>
                      </button>
                    ) : (
                      <a
                        href={`mailto:${course.contactEmail}?subject=Inquiry regarding ${encodeURIComponent(course.title)}`}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition cursor-pointer flex items-center space-x-1.5 shadow-sm"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Enquire / Apply</span>
                      </a>
                    )}

                    <button
                      onClick={() => setSelectedCourseDetail(course)}
                      className={`text-xs font-bold px-3 py-2 rounded-xl border transition cursor-pointer ${
                        isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                      }`}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Post Course Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`border rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[92vh] flex flex-col ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/40 mb-3">
              <h3 className="text-base font-black flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-amber-500" />
                <span>Publish Training Course</span>
              </h3>
              <button onClick={() => setShowPostModal(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostCourse} className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              <div>
                <label className="block font-bold mb-1">Course Title</label>
                <input
                  type="text"
                  placeholder="e.g. Advanced Low Voltage Switchgear & Testing"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  >
                    {COURSE_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 3 Days / 12 Weeks"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="course-free-toggle"
                    checked={formIsFree}
                    onChange={(e) => setFormIsFree(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor="course-free-toggle" className="font-bold cursor-pointer">
                    Free / State Funded (SOLAS)
                  </label>
                </div>

                {!formIsFree && (
                  <div>
                    <label className="block font-bold mb-1">Cost Text & Fee</label>
                    <input
                      type="text"
                      placeholder="e.g. €350"
                      value={formCostText}
                      onChange={(e) => setFormCostText(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold mb-1">Course Description & Requirements</label>
                <textarea
                  rows={4}
                  placeholder="Provide details on course content, certifications awarded, entry prerequisites..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold">Training Location / Campus</label>
                <LocationAutocomplete
                  currentLocation={formLocation}
                  onLocationSelect={(loc) => setFormLocation(loc)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={formContactEmail}
                    onChange={(e) => setFormContactEmail(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formContactPhone}
                    onChange={(e) => setFormContactPhone(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-700/40">
                <button type="button" onClick={() => setShowPostModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-md"
                >
                  Publish Course Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Detail Modal */}
      {selectedCourseDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`border rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto space-y-4 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/40">
              <div className="flex items-center space-x-3">
                <img src={selectedCourseDetail.providerAvatar || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=300&q=80'} alt={selectedCourseDetail.providerName} className="w-10 h-10 rounded-xl object-cover border border-slate-700" />
                <div>
                  <div className="text-xs font-bold text-amber-500">{selectedCourseDetail.providerName}</div>
                  <div className="text-[10px] text-slate-400">{selectedCourseDetail.providerType}</div>
                </div>
              </div>
              <button onClick={() => setSelectedCourseDetail(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700 uppercase tracking-wider">
                {selectedCourseDetail.category}
              </span>
              <h2 className="text-lg font-black tracking-tight">{selectedCourseDetail.title}</h2>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {selectedCourseDetail.description}
              </p>

              <div className={`p-4 rounded-2xl border space-y-2 text-xs ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between">
                  <span className="text-slate-400">Duration:</span>
                  <span className="font-bold">{selectedCourseDetail.durationText}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cost / Funding:</span>
                  <span className="font-bold text-amber-500">{selectedCourseDetail.costText}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Start Date:</span>
                  <span className="font-bold">{selectedCourseDetail.startDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Location:</span>
                  <span className="font-bold">{selectedCourseDetail.location.town}, Co. {selectedCourseDetail.location.county}</span>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 text-xs ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="font-bold text-amber-500 mb-1">Contact Provider:</div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <a href={`mailto:${selectedCourseDetail.contactEmail}`} className="text-amber-400 hover:underline">{selectedCourseDetail.contactEmail}</a>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedCourseDetail.contactPhone}</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={`mailto:${selectedCourseDetail.contactEmail}?subject=Enrollment Inquiry: ${encodeURIComponent(selectedCourseDetail.title)}`}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl text-xs transition cursor-pointer shadow-md flex items-center justify-center space-x-2"
              >
                <span>Enquire / Register Now</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
