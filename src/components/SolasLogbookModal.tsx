import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Award,
  CheckCircle,
  X,
  BookOpen,
  Clock,
  Check,
  Plus,
  Calendar,
  UserCheck,
  ChevronRight,
  AlertCircle,
  Trash2,
  TrendingUp,
  Sparkles,
  ArrowRight,
  FileCheck2,
} from 'lucide-react';
import { UserProfile, SolasLogEntry } from '../types';
import { useTheme } from '../context/ThemeContext';
import { storageService } from '../services/storage';

interface SolasLogbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUserUpdate?: (updated: UserProfile) => void;
}

interface PhaseInfo {
  phase: number;
  title: string;
  type: 'On-the-Job' | 'Off-the-Job (ETB / TU)';
  targetHours: number;
  summary: string;
  competencies: { id: string; code: string; title: string; category: string }[];
}

const SOLAS_PHASES: PhaseInfo[] = [
  {
    phase: 1,
    title: 'Induction, Health & Safety & Hand Skills',
    type: 'On-the-Job',
    targetHours: 160,
    summary: 'Employer orientation, Safe Pass, manual handling, basic tool safety, and workshop safety protocols.',
    competencies: [
      { id: 'p1_safepass', code: 'SOL-101', title: 'Safe Pass & Site Induction Certification', category: 'Safety' },
      { id: 'p1_manual', code: 'SOL-102', title: 'Manual Handling & Ergonomic Lifting Techniques', category: 'Safety' },
      { id: 'p1_tools', code: 'SOL-103', title: 'Hand & Portable Power Tool Inspection & Safe Use', category: 'Practical' },
      { id: 'p1_drawings', code: 'SOL-104', title: 'Technical Drawings & Architectural Plan Interpretation', category: 'Theory' },
      { id: 'p1_ppe', code: 'SOL-105', title: 'PPE Compliance & Statutory Irish Safety Act 2005 Protocols', category: 'Safety' },
    ],
  },
  {
    phase: 2,
    title: 'Basic Installation & First-Fix Craft Practice',
    type: 'On-the-Job',
    targetHours: 800,
    summary: 'Cable containment, conduit bending, basic terminations, first-fix structural framing, and wiring regulations.',
    competencies: [
      { id: 'p2_firstfix', code: 'SOL-201', title: 'First-Fix Installation & Cable Containment (PVC/Steel Trunking)', category: 'Practical' },
      { id: 'p2_cables', code: 'SOL-202', title: 'Conductor Sizing, Cable Pulling & Core Identification', category: 'Practical' },
      { id: 'p2_regs', code: 'SOL-203', title: 'Irish National Wiring Rules (IS 10101:2020) Core Standards', category: 'Regulations' },
      { id: 'p2_testing', code: 'SOL-204', title: 'Continuity & Insulation Resistance Testing on De-energised Circuits', category: 'Testing' },
      { id: 'p2_rams', code: 'SOL-205', title: 'Risk Assessment & Method Statement (RAMS) Workplace Execution', category: 'Safety' },
    ],
  },
  {
    phase: 3,
    title: 'Off-The-Job Technical Block 1 (ETB / TU)',
    type: 'Off-the-Job (ETB / TU)',
    targetHours: 640,
    summary: 'Classroom trade theory, AC circuits, mathematical calculations, and standardized ETB benchmark workshop tests.',
    competencies: [
      { id: 'p3_theory', code: 'SOL-301', title: 'Alternating Current Theory, Inductance & Power Factor Principles', category: 'Theory' },
      { id: 'p3_math', code: 'SOL-302', title: 'Trade Mathematics: Ohm’s Law, Kirchhoff’s Laws & Voltage Drop', category: 'Theory' },
      { id: 'p3_bench', code: 'SOL-303', title: 'Standardised ETB Practical Bench Assessment & Jointing Tasks', category: 'Practical' },
      { id: 'p3_exam', code: 'SOL-304', title: 'ETB Phase 3 National Theory Written Examination (QQI Accredited)', category: 'Testing' },
    ],
  },
  {
    phase: 4,
    title: 'Advanced Site Practice & Sub-Distribution Systems',
    type: 'On-the-Job',
    targetHours: 960,
    summary: 'Commercial installations, 3-phase distribution boards, cable basket/tray fabrication, and fault finding.',
    competencies: [
      { id: 'p4_3phase', code: 'SOL-401', title: '3-Phase Distribution Board Installation & Phase Load Balancing', category: 'Practical' },
      { id: 'p4_containment', code: 'SOL-402', title: 'Heavy Steel Conduit Threading, Offset Bends & Tray Fabrication', category: 'Practical' },
      { id: 'p4_faults', code: 'SOL-403', title: 'Systematic Fault Finding & Circuit Rectification on Live Simulation', category: 'Testing' },
      { id: 'p4_rcd', code: 'SOL-404', title: 'Earth Fault Loop Impedance (Zs) & RCD Trip Timing Verification', category: 'Testing' },
      { id: 'p4_mentor', code: 'SOL-405', title: 'Peer Mentoring of Phase 1 Apprentice in Site Safety Standards', category: 'Leadership' },
    ],
  },
  {
    phase: 5,
    title: 'Off-The-Job Technical Block 2 (Advanced Systems & Automation)',
    type: 'Off-the-Job (ETB / TU)',
    targetHours: 640,
    summary: 'Motors, industrial automation, programmable logic controllers (PLCs), smart systems, and diagnostics.',
    competencies: [
      { id: 'p5_automation', code: 'SOL-501', title: 'Industrial Motor Controls, Star-Delta Starters & Inverter Drives', category: 'Practical' },
      { id: 'p5_plc', code: 'SOL-502', title: 'PLC Ladder Logic Programming & Smart Building Sensor Integration', category: 'Theory' },
      { id: 'p5_diagnostics', code: 'SOL-503', title: 'Advanced Diagnostic Tools: Thermal Imaging & Power Quality Analysers', category: 'Testing' },
      { id: 'p5_capstone', code: 'SOL-504', title: 'ETB Level 6 Practical Capstone & Multi-System Commissioning Exam', category: 'Testing' },
    ],
  },
  {
    phase: 6,
    title: 'Mastery, Site Leadership & Pre-Commissioning',
    type: 'On-the-Job',
    targetHours: 960,
    summary: 'Independent site execution, comprehensive test certification to IS 10101, and portfolio compilation for final sign-off.',
    competencies: [
      { id: 'p6_is10101', code: 'SOL-601', title: 'Full Commercial Installation Execution to Current IS 10101 Standards', category: 'Practical' },
      { id: 'p6_cert', code: 'SOL-602', title: 'Pre-Commissioning Test Certification & Test Certificate Sign-Off', category: 'Testing' },
      { id: 'p6_leadership', code: 'SOL-603', title: 'Subcontractor Coordination & Site Supervision of Containment Crews', category: 'Leadership' },
      { id: 'p6_portfolio', code: 'SOL-604', title: 'Comprehensive Trade Apprenticeship Portfolio of Workplace Evidence', category: 'Documentation' },
    ],
  },
  {
    phase: 7,
    title: 'Final Assessment & National Craft Certificate',
    type: 'Off-the-Job (ETB / TU)',
    targetHours: 320,
    summary: 'Final assessment by National Apprenticeship Advisory Committee, employer sign-off, and award of QQI Level 6 Craft Cert.',
    competencies: [
      { id: 'p7_final_review', code: 'SOL-701', title: 'National Apprenticeship Advisory Committee Portfolio Review', category: 'Testing' },
      { id: 'p7_statutory', code: 'SOL-702', title: 'Statutory Verification & Final Safe Electric / Trade Endorsement', category: 'Regulations' },
      { id: 'p7_craft_cert', code: 'SOL-703', title: 'Award of National Craft Certificate (QQI NFQ Level 6)', category: 'Award' },
    ],
  },
];

export const SolasLogbookModal: React.FC<SolasLogbookModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdate,
}) => {
  const { isDark } = useTheme();

  const currentPhase = user.apprenticePhase || 6;
  const [selectedPhase, setSelectedPhase] = useState<number>(currentPhase);
  const [activeTab, setActiveTab] = useState<'competencies' | 'hours' | 'advance'>('competencies');

  // Interactive state
  const [checkedCompetencies, setCheckedCompetencies] = useState<string[]>([]);
  const [logEntries, setLogEntries] = useState<SolasLogEntry[]>([]);
  const [advanceSuccessMsg, setAdvanceSuccessMsg] = useState<string | null>(null);

  // New hours entry form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHours, setNewHours] = useState('38');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newMentor, setNewMentor] = useState('Declan Byrne (National Craft Cert #4912)');
  const [newModule, setNewModule] = useState('Distribution Board Commissioning & Megger Testing');
  const [newNotes, setNewNotes] = useState('');

  // Load stored competencies and log entries
  useEffect(() => {
    if (isOpen) {
      setSelectedPhase(user.apprenticePhase || 6);
      setCheckedCompetencies(storageService.getSolasCheckedCompetencies(user.id));
      setLogEntries(storageService.getSolasLogEntries(user.id));
      setAdvanceSuccessMsg(null);
    }
  }, [isOpen, user.apprenticePhase, user.id]);

  if (!isOpen) return null;

  const currentPhaseData = SOLAS_PHASES.find((p) => p.phase === selectedPhase) || SOLAS_PHASES[0];

  // Calculate statistics for selected phase
  const phaseCompetencies = currentPhaseData.competencies;
  const completedCompetenciesCount = phaseCompetencies.filter((c) =>
    checkedCompetencies.includes(c.id)
  ).length;

  const phaseLogEntries = logEntries.filter((e) => e.phase === selectedPhase);
  const totalPhaseHours = phaseLogEntries.reduce((sum, e) => sum + e.hours, 0);
  const hoursProgressPercent = Math.min(
    100,
    Math.round((totalPhaseHours / currentPhaseData.targetHours) * 100)
  );

  const handleToggleCompetency = (compId: string) => {
    const updated = storageService.toggleSolasCompetency(user.id, compId);
    setCheckedCompetencies(updated);
  };

  const handleAddLogEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const hoursNum = parseFloat(newHours);
    if (isNaN(hoursNum) || hoursNum <= 0) return;

    const entry = storageService.addSolasLogEntry({
      userId: user.id,
      phase: selectedPhase,
      date: newDate,
      hours: hoursNum,
      craftspersonName: newMentor.trim() || 'Qualified Supervising Craftsperson',
      moduleTitle: newModule.trim() || 'On-Site Practical Work',
      notes: newNotes.trim() || 'Workplace learning tasks executed according to safety standards.',
      employerSigned: true,
      signoffDate: newDate,
      signoffCode: `APP-VER-${Math.floor(1000 + Math.random() * 9000)}`,
    });

    setLogEntries((prev) => [entry, ...prev]);
    setShowAddForm(false);
    setNewNotes('');
  };

  const handleDeleteEntry = (entryId: string) => {
    storageService.deleteSolasLogEntry(entryId);
    setLogEntries((prev) => prev.filter((e) => e.id !== entryId));
  };

  const handleAdvancePhase = (targetPhase: number) => {
    const updatedUser = storageService.advanceApprenticePhase(user.id, targetPhase);
    setSelectedPhase(targetPhase);
    setAdvanceSuccessMsg(`Congratulations! You have successfully advanced to Phase ${targetPhase}. Your profile and trade credentials have been updated.`);
    if (onUserUpdate) {
      onUserUpdate(updatedUser);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className={`border rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl relative my-6 max-h-[92vh] flex flex-col ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">Trade Apprentice Official Logbook</h3>
                <span className="bg-amber-500/20 text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  Phase {user.apprenticePhase || 6} Active
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Trainee: <strong className="text-amber-500">{user.name}</strong> • Apprentice ID:{' '}
                <strong className="font-mono">{user.solasId || 'APP-IE-849201'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Phase Stepper Selector */}
        <div className="py-3 border-b border-slate-700/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              7-Phase Trade Apprenticeship Pathway
            </span>
            <span className="text-[11px] text-amber-500 font-semibold">
              Viewing Phase {selectedPhase} of 7
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {SOLAS_PHASES.map((p) => {
              const isPast = p.phase < (user.apprenticePhase || 6);
              const isCurrent = p.phase === (user.apprenticePhase || 6);
              const isSelected = p.phase === selectedPhase;

              return (
                <button
                  key={p.phase}
                  onClick={() => setSelectedPhase(p.phase)}
                  className={`p-2 rounded-xl text-center flex flex-col items-center justify-center transition cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md ring-2 ring-amber-500/40'
                      : isPast
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                      : isCurrent
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 font-bold hover:bg-amber-500/25'
                      : isDark
                      ? 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:bg-slate-800'
                      : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-center w-5 h-5 mb-0.5">
                    {isPast ? (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    ) : (
                      <span className="text-xs font-bold">{p.phase}</span>
                    )}
                  </div>
                  <span className="text-[9px] font-bold uppercase truncate max-w-full">
                    {p.type === 'On-the-Job' ? 'Site' : 'ETB'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Phase Info Banner */}
        <div
          className={`mt-3 p-3.5 rounded-2xl border flex items-start justify-between gap-3 ${
            isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm">
                Phase {currentPhaseData.phase}: {currentPhaseData.title}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  currentPhaseData.phase < (user.apprenticePhase || 6)
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : currentPhaseData.phase === (user.apprenticePhase || 6)
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-500/20 text-slate-400'
                }`}
              >
                {currentPhaseData.type}
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {currentPhaseData.summary}
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs font-bold text-amber-500">
              {totalPhaseHours} / {currentPhaseData.targetHours} hrs
            </div>
            <div className="w-24 bg-slate-700/50 rounded-full h-2 mt-1 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${hoursProgressPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400">{hoursProgressPercent}% Logged</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-700/40 mt-3">
          <button
            onClick={() => setActiveTab('competencies')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition ${
              activeTab === 'competencies'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Curriculum Competencies ({completedCompetenciesCount}/{phaseCompetencies.length})
          </button>
          <button
            onClick={() => setActiveTab('hours')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition ${
              activeTab === 'hours'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            Logged Work Hours ({phaseLogEntries.length})
          </button>
          <button
            onClick={() => setActiveTab('advance')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition ${
              activeTab === 'advance'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            Progression & Sign-Off
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-4">
          {advanceSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>{advanceSuccessMsg}</span>
            </div>
          )}

          {/* TAB 1: CURRICULUM COMPETENCIES CHECKLIST */}
          {activeTab === 'competencies' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Check off modules as verified by your Supervising Craftsperson or ETB Instructor:
                </span>
                <span className="text-[11px] font-bold text-amber-500">
                  {completedCompetenciesCount} of {phaseCompetencies.length} Completed
                </span>
              </div>

              <div className="space-y-2">
                {phaseCompetencies.map((comp) => {
                  const isChecked = checkedCompetencies.includes(comp.id);
                  return (
                    <div
                      key={comp.id}
                      onClick={() => handleToggleCompetency(comp.id)}
                      className={`p-3 rounded-2xl border transition flex items-start gap-3 cursor-pointer ${
                        isChecked
                          ? isDark
                            ? 'bg-emerald-500/10 border-emerald-500/40'
                            : 'bg-emerald-50 border-emerald-300'
                          : isDark
                          ? 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center shrink-0 transition ${
                          isChecked
                            ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                            : isDark
                            ? 'border-slate-600 bg-slate-800'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs font-bold ${
                              isChecked
                                ? 'text-emerald-400 line-through opacity-90'
                                : isDark
                                ? 'text-white'
                                : 'text-slate-900'
                            }`}
                          >
                            {comp.title}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            {comp.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-semibold text-amber-500/90">
                            {comp.category}
                          </span>
                          <span className="text-[10px] text-slate-400">• Click to toggle verification</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {completedCompetenciesCount === phaseCompetencies.length && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold">All Phase {selectedPhase} Competencies Verified!</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('advance')}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                  >
                    Proceed to Advance <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LOG WORK HOURS */}
          {activeTab === 'hours' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500">
                    On-Site & Workshop Hours Register
                  </h4>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Total logged for Phase {selectedPhase}:{' '}
                    <strong className="text-white">{totalPhaseHours} hours</strong> (Target:{' '}
                    {currentPhaseData.targetHours}h)
                  </p>
                </div>

                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  {showAddForm ? 'Cancel Entry' : 'Log New Hours'}
                </button>
              </div>

              {/* Form to log new hours */}
              {showAddForm && (
                <form
                  onSubmit={handleAddLogEntry}
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <h5 className="font-bold text-xs flex items-center gap-2 text-amber-400">
                    <FileCheck2 className="w-4 h-4" />
                    Record Workplace / ETB Training Session
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">
                        Hours Completed
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="80"
                        step="0.5"
                        value={newHours}
                        onChange={(e) => setNewHours(e.target.value)}
                        required
                        className={`w-full mt-1 p-2 rounded-xl text-xs border ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">
                        Date Completed
                      </label>
                      <input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        required
                        className={`w-full mt-1 p-2 rounded-xl text-xs border ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Supervising Craftsperson / Registered Mentor
                    </label>
                    <input
                      type="text"
                      value={newMentor}
                      onChange={(e) => setNewMentor(e.target.value)}
                      placeholder="e.g. Liam Murphy (National Craft Cert #3812)"
                      required
                      className={`w-full mt-1 p-2 rounded-xl text-xs border ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Module / Practical Focus
                    </label>
                    <input
                      type="text"
                      value={newModule}
                      onChange={(e) => setNewModule(e.target.value)}
                      placeholder="e.g. Sub-distribution Board Terminations & Cable Containment"
                      required
                      className={`w-full mt-1 p-2 rounded-xl text-xs border ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Work Summary & Safety Observations
                    </label>
                    <textarea
                      rows={2}
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Describe the installations, calibrations, or safety checks executed..."
                      className={`w-full mt-1 p-2 rounded-xl text-xs border ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-xl text-xs cursor-pointer shadow-md"
                    >
                      Save to Apprentice Logbook
                    </button>
                  </div>
                </form>
              )}

              {/* Logged entries list */}
              {phaseLogEntries.length === 0 ? (
                <div
                  className={`p-6 text-center rounded-2xl border ${
                    isDark ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <Clock className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs font-bold">No hours logged yet for Phase {selectedPhase}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Click "Log New Hours" above to record your site shifts and training blocks.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {phaseLogEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-3.5 rounded-2xl border transition ${
                        isDark ? 'bg-slate-800/50 border-slate-700/60' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs">{entry.moduleTitle}</span>
                            <span className="bg-amber-500/20 text-amber-400 font-bold text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30">
                              {entry.hours} Hours
                            </span>
                            {entry.employerSigned && (
                              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Mentor Verified
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {entry.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <UserCheck className="w-3 h-3" /> {entry.craftspersonName}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          title="Delete entry"
                          className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-700/40 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {entry.notes && (
                        <p className={`text-[11px] mt-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          {entry.notes}
                        </p>
                      )}

                      {entry.signoffCode && (
                        <div className="mt-2 pt-2 border-t border-slate-700/40 flex items-center justify-between text-[10px] text-slate-400">
                          <span>Verification Stamp:</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {entry.signoffCode}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ADVANCEMENT & SIGN-OFF */}
          {activeTab === 'advance' && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Phase Advancement Readiness Checklist
                </h4>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  To advance to the next phase under National Trade Apprenticeship rules, the apprentice must satisfy the
                  following minimum requirements:
                </p>

                <div className="mt-4 space-y-2.5">
                  {/* Hours requirement */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                          totalPhaseHours >= currentPhaseData.targetHours * 0.7
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {totalPhaseHours >= currentPhaseData.targetHours * 0.7 ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold">Required Workplace / Training Hours</div>
                        <div className="text-[10px] text-slate-400">
                          Target: {currentPhaseData.targetHours}h • Logged: {totalPhaseHours}h
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        totalPhaseHours >= currentPhaseData.targetHours * 0.7
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {hoursProgressPercent}% Completed
                    </span>
                  </div>

                  {/* Competencies requirement */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                          completedCompetenciesCount === phaseCompetencies.length
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {completedCompetenciesCount === phaseCompetencies.length ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold">Curriculum Practical & Theory Modules</div>
                        <div className="text-[10px] text-slate-400">
                          Verified: {completedCompetenciesCount} of {phaseCompetencies.length}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        completedCompetenciesCount === phaseCompetencies.length
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {completedCompetenciesCount}/{phaseCompetencies.length} Verified
                    </span>
                  </div>

                  {/* Registered Sponsor Sign-Off */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs bg-emerald-500 text-slate-950">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold">Employer & Mentor Verification</div>
                        <div className="text-[10px] text-slate-400">
                          Approved by Certified Craftsperson Mentor
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      Approved
                    </span>
                  </div>
                </div>
              </div>

              {/* Action: Advance to next phase */}
              <div
                className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div>
                    <h5 className="font-bold text-xs text-amber-400">
                      Active Status: Phase {user.apprenticePhase || 6}
                    </h5>
                    <p className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {(user.apprenticePhase || 6) < 7
                        ? `Advance to Phase ${(user.apprenticePhase || 6) + 1} to update your National Registry record and profile badge.`
                        : 'You are in Phase 7 (Final National Craft Certificate qualification).'}
                    </p>
                  </div>

                  {(user.apprenticePhase || 6) < 7 ? (
                    <button
                      onClick={() => handleAdvancePhase((user.apprenticePhase || 6) + 1)}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-amber-500/20"
                    >
                      <Sparkles className="w-4 h-4" />
                      Advance to Phase {(user.apprenticePhase || 6) + 1}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="bg-emerald-500/20 text-emerald-400 font-bold px-3 py-1 rounded-xl text-xs border border-emerald-500/30 flex items-center gap-1">
                      <Award className="w-4 h-4" /> National Craft Certification Completed
                    </span>
                  )}
                </div>

                {/* Direct Phase Selector in case apprentice wishes to calibrate their phase */}
                <div className="pt-3 border-t border-amber-500/20 flex items-center justify-between text-xs flex-wrap gap-2">
                  <span className="text-[11px] text-slate-400">
                    Need to calibrate your active apprentice stage?
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                      <button
                        key={num}
                        onClick={() => handleAdvancePhase(num)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                          (user.apprenticePhase || 6) === num
                            ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                        title={`Set to Phase ${num}`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700/40 mt-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>National Apprenticeship Registry Verified</span>
          </div>

          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
