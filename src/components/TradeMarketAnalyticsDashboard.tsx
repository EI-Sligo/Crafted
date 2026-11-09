import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  MapPin,
  Briefcase,
  Award,
  Filter,
  ArrowUpRight,
  Zap,
  Building2,
  Calendar,
} from 'lucide-react';
import { storageService } from '../services/storage';
import { useTheme } from '../context/ThemeContext';
import { JobListing } from '../types';

interface CountyTradeDemandMetric {
  county: string;
  region: 'Leinster' | 'Munster' | 'Connacht' | 'Ulster';
  jobDemandCount: number;
  avgDayRate: number;
  highValueTrade: string;
  tradeSpecialism: string;
  demandIndex: number; // 1 - 100
  dominantRoleType: string;
}

// Baseline Irish County Trade Job & Subcontractor Day-Rate Benchmarks
const BASELINE_COUNTY_JOB_DATA: CountyTradeDemandMetric[] = [
  {
    county: 'Dublin',
    region: 'Leinster',
    jobDemandCount: 42,
    avgDayRate: 360,
    highValueTrade: 'Industrial Electrical & Automation',
    tradeSpecialism: 'Commercial & High-Density Fitouts',
    demandIndex: 96,
    dominantRoleType: 'Qualified Electrician',
  },
  {
    county: 'Kildare',
    region: 'Leinster',
    jobDemandCount: 34,
    avgDayRate: 380,
    highValueTrade: 'Instrumentation & Cleanrooms',
    tradeSpecialism: 'Intel Leixlip Fab & Data Centre Corridor',
    demandIndex: 92,
    dominantRoleType: 'Instrumentation Tech',
  },
  {
    county: 'Cork',
    region: 'Munster',
    jobDemandCount: 31,
    avgDayRate: 350,
    highValueTrade: 'Pipefitting & Process Mechanical',
    tradeSpecialism: 'Ringaskiddy Pharma & Marine Engineering',
    demandIndex: 88,
    dominantRoleType: 'Pipefitter / Welder',
  },
  {
    county: 'Galway',
    region: 'Connacht',
    jobDemandCount: 22,
    avgDayRate: 320,
    highValueTrade: 'HVAC & Heat Pump Commissioning',
    tradeSpecialism: 'MedTech Parks & Deep Retrofits',
    demandIndex: 78,
    dominantRoleType: 'HVAC Engineer',
  },
  {
    county: 'Limerick',
    region: 'Munster',
    jobDemandCount: 19,
    avgDayRate: 310,
    highValueTrade: 'Metal Fabrication & MAMF',
    tradeSpecialism: 'Shannon Free Zone & Industrial Logistics',
    demandIndex: 74,
    dominantRoleType: 'Fabricator / MAMF',
  },
  {
    county: 'Meath',
    region: 'Leinster',
    jobDemandCount: 26,
    avgDayRate: 330,
    highValueTrade: 'Cut Roof Carpentry & Joinery',
    tradeSpecialism: 'Residential Timber Frame Expansion',
    demandIndex: 82,
    dominantRoleType: 'Carpenter / Joiner',
  },
  {
    county: 'Waterford',
    region: 'Munster',
    jobDemandCount: 14,
    avgDayRate: 295,
    highValueTrade: 'Bricklaying & Stonemasonry',
    tradeSpecialism: 'South-East Port & Commercial Upgrades',
    demandIndex: 68,
    dominantRoleType: 'Bricklayer & Mason',
  },
  {
    county: 'Louth',
    region: 'Leinster',
    jobDemandCount: 18,
    avgDayRate: 315,
    highValueTrade: 'Electrical Instrumentation',
    tradeSpecialism: 'M1 Commuter Corridor Infrastructure',
    demandIndex: 72,
    dominantRoleType: 'Electrician',
  },
  {
    county: 'Wicklow',
    region: 'Leinster',
    jobDemandCount: 16,
    avgDayRate: 340,
    highValueTrade: 'Bespoke Joinery & Cabinetmaking',
    tradeSpecialism: 'Luxury Architectural Residential',
    demandIndex: 70,
    dominantRoleType: 'Carpenter',
  },
  {
    county: 'Wexford',
    region: 'Leinster',
    jobDemandCount: 11,
    avgDayRate: 285,
    highValueTrade: 'Plumbing & Underfloor Heating',
    tradeSpecialism: 'Coastal Residential & Agri-Tech',
    demandIndex: 62,
    dominantRoleType: 'Plumber',
  },
  {
    county: 'Donegal',
    region: 'Ulster',
    jobDemandCount: 9,
    avgDayRate: 275,
    highValueTrade: 'Civil Engineering & Plant Fitting',
    tradeSpecialism: 'North-West Wind Farms & Utilities',
    demandIndex: 58,
    dominantRoleType: 'Plant Fitter',
  },
  {
    county: 'Kerry',
    region: 'Munster',
    jobDemandCount: 12,
    avgDayRate: 290,
    highValueTrade: 'Solar PV & Domestic Electrical',
    tradeSpecialism: 'Hospitality Refurbishment & Solar Retrofits',
    demandIndex: 64,
    dominantRoleType: 'Solar PV Installer',
  },
];

interface TradeMarketAnalyticsDashboardProps {
  onClose?: () => void;
  onSelectCounty?: (county: string) => void;
}

export const TradeMarketAnalyticsDashboard: React.FC<TradeMarketAnalyticsDashboardProps> = ({
  onClose,
  onSelectCounty,
}) => {
  const { isDark } = useTheme();

  // Selected filters
  const [activeTab, setActiveTab] = useState<'demandVsRate' | 'dayRates' | 'opportunityMap'>('demandVsRate');
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'demand' | 'rate'>('demand');

  // Compute live job openings merged with Irish county benchmarks
  const combinedData = useMemo(() => {
    const liveJobs: JobListing[] = storageService.getJobs();

    return BASELINE_COUNTY_JOB_DATA.map((base) => {
      const countyJobs = liveJobs.filter(
        (j) => j.location?.county?.toLowerCase() === base.county.toLowerCase()
      );

      const liveJobCount = countyJobs.length;

      return {
        ...base,
        jobDemandCount: base.jobDemandCount + liveJobCount,
        liveJobCount,
      };
    });
  }, []);

  // Filtered & Sorted County List
  const displayData = useMemo(() => {
    let list = combinedData;
    if (selectedRegion !== 'All') {
      list = list.filter((c) => c.region === selectedRegion);
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'demand') return b.jobDemandCount - a.jobDemandCount;
      if (sortBy === 'rate') return b.avgDayRate - a.avgDayRate;
      return 0;
    });
  }, [combinedData, selectedRegion, sortBy]);

  // Key Headline Metrics
  const highestDemandCounty = useMemo(() => {
    return [...combinedData].sort((a, b) => b.jobDemandCount - a.jobDemandCount)[0];
  }, [combinedData]);

  const highestDayRateCounty = useMemo(() => {
    return [...combinedData].sort((a, b) => b.avgDayRate - a.avgDayRate)[0];
  }, [combinedData]);

  const topSpecialismCounty = useMemo(() => {
    return [...combinedData].find((c) => c.county === 'Cork') || combinedData[2];
  }, [combinedData]);

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: CountyTradeDemandMetric = payload[0].payload;
      return (
        <div
          className={`p-3.5 rounded-2xl shadow-xl border text-xs space-y-1.5 ${
            isDark
              ? 'bg-slate-900 border-slate-700 text-white'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between space-x-3 pb-1 border-b border-slate-700/50">
            <span className="font-bold text-amber-500 text-sm">
              Co. {data.county} ({data.region})
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-mono font-bold">
              Demand Index #{data.demandIndex}/100
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 text-[11px]">
            <span className="text-slate-400">Active Job Openings:</span>
            <span className="font-mono font-bold text-amber-400">{data.jobDemandCount} listings</span>

            <span className="text-slate-400">Benchmark Day Rate:</span>
            <span className="font-mono font-bold text-emerald-400">€{data.avgDayRate} / day</span>

            <span className="text-slate-400">High-Demand Role:</span>
            <span className="font-semibold text-slate-200">{data.dominantRoleType}</span>
          </div>

          <div className="pt-1.5 text-[10px] text-slate-400">
            <span className="font-semibold text-slate-300">Key Trade:</span> {data.highValueTrade}
          </div>
          <div className="text-[10px] text-slate-500 italic">
            Sector: {data.tradeSpecialism}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`rounded-3xl border p-4 sm:p-6 space-y-5 transition-all shadow-xl ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}
    >
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-700/40">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Irish Trade Job Demand & Day-Rate Radar
            </h3>
          </div>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} mt-1`}>
            Cross-county visualization of active trade hiring volume, subbie day rates, and key regional clusters.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center space-x-1 p-1 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs shrink-0">
          <button
            onClick={() => setActiveTab('demandVsRate')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'demandVsRate'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Demand vs Rates
          </button>
          <button
            onClick={() => setActiveTab('dayRates')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'dayRates'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Subbie Day Rates
          </button>
          <button
            onClick={() => setActiveTab('opportunityMap')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'opportunityMap'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            County Hotspots
          </button>
        </div>
      </div>

      {/* Top 3 High-Value Opportunity Stat Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isDark ? 'bg-slate-950/60 border-amber-500/30' : 'bg-amber-50/50 border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-500 font-bold mb-1">
            <span className="flex items-center space-x-1">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Highest Job Demand Hub</span>
            </span>
            <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded-full">#1 Hiring Volume</span>
          </div>
          <div className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Co. {highestDemandCounty.county}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            <strong>{highestDemandCounty.jobDemandCount} active listings</strong> • {highestDemandCounty.tradeSpecialism}
          </div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isDark ? 'bg-slate-950/60 border-emerald-500/30' : 'bg-emerald-50/50 border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-500 font-bold mb-1">
            <span className="flex items-center space-x-1">
              <Award className="w-3.5 h-3.5" />
              <span>Top Subcontractor Rate</span>
            </span>
            <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full">Top Earnings</span>
          </div>
          <div className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Co. {highestDayRateCounty.county}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            <strong>€{highestDayRateCounty.avgDayRate} / day benchmark</strong> • {highestDayRateCounty.highValueTrade}
          </div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isDark ? 'bg-slate-950/60 border-sky-500/30' : 'bg-sky-50/50 border-sky-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-sky-500 font-bold mb-1">
            <span className="flex items-center space-x-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>Specialist Industrial Cluster</span>
            </span>
            <span className="text-[10px] bg-sky-500/20 px-2 py-0.5 rounded-full">Pharma & Marine</span>
          </div>
          <div className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Co. {topSpecialismCounty.county}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            <strong>€{topSpecialismCounty.avgDayRate}/day</strong> • {topSpecialismCounty.tradeSpecialism}
          </div>
        </div>
      </div>

      {/* Filter Row: Region & Sorting */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center space-x-1.5 flex-wrap">
          <span className="text-slate-400 flex items-center space-x-1 font-semibold mr-1">
            <Filter className="w-3.5 h-3.5 text-amber-500" />
            <span>Region:</span>
          </span>
          {['All', 'Leinster', 'Munster', 'Connacht', 'Ulster'].map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRegion(r)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                selectedRegion === r
                  ? 'bg-amber-500 border-amber-500 text-slate-950'
                  : isDark
                  ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-amber-500/40'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-amber-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-semibold">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`text-xs px-2.5 py-1 rounded-xl border font-medium focus:outline-none focus:border-amber-400 ${
              isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
            }`}
          >
            <option value="demand">Job Demand (High → Low)</option>
            <option value="rate">Subcontractor Day Rate (High → Low)</option>
          </select>
        </div>
      </div>

      {/* Primary Recharts Visualization */}
      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        {activeTab === 'demandVsRate' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Active Job Openings vs Subcontractor Day Rates (€) by County
              </span>
              <div className="flex items-center space-x-3 text-[11px]">
                <span className="flex items-center space-x-1 text-amber-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" />
                  <span>Job Openings</span>
                </span>
                <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Day Rate (€/day)</span>
                </span>
              </div>
            </div>

            <div className="w-full h-80 pt-2 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={displayData} margin={{ top: 10, right: 5, bottom: 45, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.6} />
                  <XAxis
                    dataKey="county"
                    stroke={isDark ? '#94a3b8' : '#64748b'}
                    fontSize={10}
                    tickLine={false}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={45}
                  />
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    stroke="#f59e0b"
                    fontSize={11}
                    tickFormatter={(v) => `${v}`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#10b981"
                    fontSize={11}
                    domain={[220, 420]}
                    tickFormatter={(v) => `€${v}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    yAxisId="left"
                    dataKey="jobDemandCount"
                    name="Job Openings"
                    fill="#f59e0b"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgDayRate"
                    name="Day Rate (€)"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#10b981' }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'dayRates' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Subcontractor Benchmark Day Rates (€ / day) across Ireland
              </span>
              <span className="text-[11px] text-emerald-400 font-mono font-bold">
                Ireland National Average: €325/day
              </span>
            </div>

            <div className="w-full h-80 pt-2 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayData} margin={{ top: 10, right: 5, bottom: 45, left: -20 }}>
                  <defs>
                    <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.6} />
                  <XAxis
                    dataKey="county"
                    stroke={isDark ? '#94a3b8' : '#64748b'}
                    fontSize={10}
                    tickLine={false}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={45}
                  />
                  <YAxis
                    stroke="#10b981"
                    fontSize={11}
                    domain={[200, 420]}
                    tickFormatter={(v) => `€${v}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="avgDayRate"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#rateGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'opportunityMap' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                County Opportunity Score (Demand Index 1 - 100)
              </span>
              <span className="text-[11px] text-amber-500 font-semibold">
                Tap any county bar to filter site jobs
              </span>
            </div>

            <div className="w-full h-80 pt-2 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayData} margin={{ top: 10, right: 5, bottom: 45, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.6} />
                  <XAxis
                    dataKey="county"
                    stroke={isDark ? '#94a3b8' : '#64748b'}
                    fontSize={10}
                    tickLine={false}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={45}
                  />
                  <YAxis
                    stroke={isDark ? '#94a3b8' : '#64748b'}
                    fontSize={11}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="demandIndex"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                    onClick={(entry: any) => {
                      const county = entry?.county || entry?.payload?.county;
                      if (county) onSelectCounty?.(county);
                    }}
                  >
                    {displayData.map((entry, index) => {
                      const color =
                        entry.demandIndex >= 85
                          ? '#f59e0b'
                          : entry.demandIndex >= 70
                          ? '#10b981'
                          : '#0ea5e9';
                      return <Cell key={`cell-${index}`} fill={color} className="cursor-pointer hover:opacity-80" />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Regional Specialisms & Contractor Insights Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className={isDark ? 'text-white' : 'text-slate-900'}>
            Regional Trade Clusters & Day-Rate Benchmarks
          </span>
          <span className="text-slate-400 font-normal text-[11px]">
            Showing {displayData.length} counties
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-700/50">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b border-slate-700/50 ${isDark ? 'bg-slate-950/80 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                <th className="py-2.5 px-3 font-bold">County</th>
                <th className="py-2.5 px-3 font-bold">Active Jobs</th>
                <th className="py-2.5 px-3 font-bold">Subbie Day Rate</th>
                <th className="py-2.5 px-3 font-bold">In-Demand Discipline</th>
                <th className="py-2.5 px-3 font-bold">Industrial Specialism</th>
                <th className="py-2.5 px-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {displayData.slice(0, 8).map((item) => (
                <tr
                  key={item.county}
                  className={`transition ${
                    isDark ? 'hover:bg-slate-800/40 text-slate-300' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <td className="py-2.5 px-3 font-bold flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Co. {item.county}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-full font-mono font-bold text-[10px]">
                      {item.jobDemandCount} active
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-emerald-500 font-semibold">
                    €{item.avgDayRate}/day
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-200">
                    {item.dominantRoleType}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-400 truncate max-w-[200px]" title={item.tradeSpecialism}>
                    {item.tradeSpecialism}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => onSelectCounty?.(item.county)}
                      className="text-[11px] font-bold text-amber-500 hover:text-amber-400 hover:underline cursor-pointer inline-flex items-center space-x-0.5"
                    >
                      <span>Filter Jobs</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
