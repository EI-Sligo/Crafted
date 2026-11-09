export type TradeType =
  // Architecture & Construction
  | 'Carpentry & Joinery'
  | 'Plumbing'
  | 'Brick & Stonelaying'
  | 'Plastering & Drylining'
  | 'Painting & Decorating'
  | 'Stonecutting & Stonemasonry'
  | 'Roofing & Cladding'
  | 'Scaffolding'
  | 'Wood Manufacturing & Finishing'
  | 'Civil Engineering'
  | 'Geo-drilling'
  // Electrical & Engineering
  | 'Electrician'
  | 'Electrical Instrumentation'
  | 'Industrial Electrical'
  | 'Instrumentation'
  | 'Electronic Security Systems'
  | 'Refrigeration & Air Conditioning'
  | 'Mechanical Automation and Maintenance Fitting (MAMF)'
  | 'Metal Fabrication & Welding'
  | 'Toolmaking'
  | 'Pipefitting'
  | 'Engineering Services Maintenance'
  | 'OEM Engineering'
  | 'Manufacturing Engineering'
  | 'Polymer Processing'
  // Motor & Heavy Plant
  | 'Motor Mechanics'
  | 'Heavy Vehicle Mechanics'
  | 'Vehicle Body Repairs'
  | 'Agricultural Mechanics'
  | 'Construction Plant Fitting'
  // Logistics, Utilities & Tech
  | 'Logistics Associate'
  | 'Network Engineer'
  | 'Cybersecurity'
  | 'Telecommunications Field Technician'
  | 'Arboriculture'
  | 'Butchery'
  | 'Chef de Partie'
  | 'Hairdressing'
  // Backward compatibility aliases
  | 'Plumber'
  | 'HVAC & Refrigeration'
  | 'Bricklayer & Mason'
  | 'Welder & Fabricator'
  | 'Plasterer & Dryliner'
  | 'Roofer'
  | 'Painter & Decorator'
  | 'Carpenter'
  | 'Apprentice (Phase 1-3)'
  | 'Apprentice (Phase 4-7)'
  | 'General Contractor';

export interface TradeSector {
  sector: string;
  trades: TradeType[];
}

export const GENERATION_APPRENTICESHIP_SECTORS: TradeSector[] = [
  {
    sector: 'Architecture & Construction',
    trades: [
      'Carpentry & Joinery',
      'Plumbing',
      'Brick & Stonelaying',
      'Plastering & Drylining',
      'Painting & Decorating',
      'Stonecutting & Stonemasonry',
      'Roofing & Cladding',
      'Scaffolding',
      'Wood Manufacturing & Finishing',
      'Civil Engineering',
      'Geo-drilling',
    ],
  },
  {
    sector: 'Electrical & Engineering',
    trades: [
      'Electrician',
      'Electrical Instrumentation',
      'Industrial Electrical',
      'Instrumentation',
      'Electronic Security Systems',
      'Refrigeration & Air Conditioning',
      'Mechanical Automation and Maintenance Fitting (MAMF)',
      'Metal Fabrication & Welding',
      'Toolmaking',
      'Pipefitting',
      'Engineering Services Maintenance',
      'OEM Engineering',
      'Manufacturing Engineering',
      'Polymer Processing',
    ],
  },
  {
    sector: 'Motor & Heavy Plant',
    trades: [
      'Motor Mechanics',
      'Heavy Vehicle Mechanics',
      'Vehicle Body Repairs',
      'Agricultural Mechanics',
      'Construction Plant Fitting',
    ],
  },
  {
    sector: 'Logistics, Utilities & Tech',
    trades: [
      'Logistics Associate',
      'Network Engineer',
      'Cybersecurity',
      'Telecommunications Field Technician',
      'Arboriculture',
    ],
  },
  {
    sector: 'Apprentice Phases & Contracting',
    trades: [
      'Apprentice (Phase 1-3)',
      'Apprentice (Phase 4-7)',
      'General Contractor',
    ],
  },
];

export interface GeoLocation {
  county: string;
  town: string;
  country?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
}

export interface SkillEndorsement {
  skill: string;
  endorserUserIds: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  trade: TradeType;
  isApprentice?: boolean;
  apprenticePhase?: number; // 1 to 7
  trackSolasLogbook?: boolean; // Optional for apprentices, hidden for qualified & companies
  solasId?: string;
  hasSafePass: boolean;
  safePassExpiry?: string;
  hasCifBadge: boolean;
  phone: string;
  email: string;
  avatar: string;
  bio: string;
  location: GeoLocation;
  yearsExperience: number;
  premiumTier?: 'none' | 'apprentice_sponsor' | 'master_contractor';
  followingUserIds: string[];
  followersCount: number;
  portfolio: PortfolioProject[];
  workHistory: WorkHistoryItem[];
  savedPosts?: string[];
  accountType?: 'personal' | 'business' | 'training_provider';
  businessCategory?: 'contractor_employer' | 'tool_manufacturer' | 'material_supplier';
  businessTier?: 'standard' | 'employer_pro' | 'manufacturer_showcase';
  trainingProviderCategory?: 'government_nonprofit' | 'etb' | 'technological_university' | 'private_provider';
  certifications?: string[];
  cvLink?: string;
  skills?: SkillEndorsement[];
}

export interface CourseListing {
  id: string;
  providerId: string;
  providerName: string;
  providerAvatar: string;
  providerType: string;
  title: string;
  category: 'Apprenticeship Off-the-Job' | 'Safe Pass / CSCS' | 'Up-skilling & Certification' | 'Electrical Regs (IS 10101)' | 'F-Gas & HVAC' | 'Welding & Fabrication' | 'Management & Safety';
  description: string;
  durationText: string;
  costText: string;
  costAmount: number;
  location: GeoLocation;
  startDate: string;
  applicationUrl?: string;
  contactEmail: string;
  contactPhone: string;
  isFree: boolean;
  createdAt: string;
}

export interface PortfolioProject {
  id: string;
  title: string;
  trade: string;
  completionDate: string;
  description: string;
  location: string;
  images: string[];
}

export interface WorkHistoryItem {
  id: string;
  role: string;
  company: string;
  period: string;
  location: string;
  summary: string;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userTrade: TradeType;
  text: string;
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userHandle: string;
  userAvatar: string;
  userTrade: TradeType;
  userHasSafePass: boolean;
  userApprenticePhase?: number;
  userLevel?: string;
  hasSafePass?: boolean;
  userPhase?: number;
  content: string;
  tradeTag: TradeType;
  location: GeoLocation;
  mediaType?: 'image' | 'video' | 'none';
  mediaUrls: string[];
  videoDurationSeconds?: number;
  likes: number;
  likesCount?: number;
  isLiked?: boolean;
  likedByCurrentUser?: boolean;
  viewsCount?: number;
  commentsCount: number;
  createdAt: string;
}

export interface MarketplaceItem {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  sellerTrade: TradeType;
  sellerPhone: string;
  title: string;
  description: string;
  price: number;
  category: 'Tools' | 'Power Tools' | 'Vans & Vehicles' | 'Materials' | 'Safety Gear' | 'Plant & Machinery';
  condition: 'Brand New' | 'Like New' | 'Good Working Order' | 'Needs Service';
  location: GeoLocation;
  images: string[];
  tier: 'standard' | 'boosted' | 'premium';
  isBoosted: boolean;
  boostExpiresAt?: string;
  createdAt: string;
  isSold?: boolean;
}

export type JobType = 'Apprentice' | 'Qualified Hire' | 'Subcontract';
export type RateType = 'hourly' | 'daily' | 'piece-rate' | 'salary';

export interface JobListing {
  id: string;
  employerId: string;
  employerName: string;
  employerAvatar: string;
  employerTrade: TradeType;
  employerCompany: string;
  hasSafePassRequired: boolean;
  title: string;
  jobType: JobType;
  trade: TradeType;
  targetApprenticePhase?: string; // e.g. "Phase 1-3", "Phase 4-7", "Any Phase"
  description: string;
  location: GeoLocation;
  rateText: string;
  rateType: RateType;
  rateAmount: number;
  duration?: string; // e.g. "Immediate - 6 Months", "Permanent", "2 Weeks Subcontract"
  tier: 'basic' | 'priority' | 'contractor_pro';
  isFeatured: boolean;
  createdAt: string;
  applicationsCount: number;
}

export interface CustomUserGroup {
  id: string;
  creatorId: string;
  name: string; // e.g., "Intel Leixlip Fab 34 Site Crew", "Ballycoolin Subbies"
  description?: string;
  memberUserIds: string[];
  createdAt: string;
}

export interface StolenGearAlert {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterPhone: string;
  reporterTrade: TradeType;
  itemTitle: string;
  category: 'Power Tools' | 'Hand Tools' | 'Van Break-in' | 'Testing Equipment' | 'Machinery';
  serialNumbers: string;
  distinguishingMarks: string;
  theftLocation: GeoLocation;
  stolenDate: string;
  stolenTime: string;
  rewardOffered?: string;
  images: string[];
  tier: 'local' | 'regional' | 'national';
  urgency: 'CRITICAL' | 'HIGH';
  status: 'ACTIVE_ALERT' | 'RECOVERED';
  sightingsCount: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  createdAt: string;
  isRead: boolean;
  attachedItemId?: string;
  attachedItemTitle?: string;
  attachedJobId?: string;
  attachedJobTitle?: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participantNames: { [id: string]: string };
  participantAvatars: { [id: string]: string };
  participantTrades: { [id: string]: TradeType };
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  contextTag?: string; // e.g., "Makita 18V Combi Drill" or "Subcontract 1st Fix"
  contextType?: 'marketplace' | 'job' | 'group' | 'general';
  groupId?: string;
}

export interface PricingTier {
  id: string;
  name: string;
  priceEuros: number;
  durationText: string;
  features: string[];
  isPopular?: boolean;
}

export const STOLEN_GEAR_TIERS: PricingTier[] = [
  {
    id: 'stolen_tier_1',
    name: 'Local Radar (50km)',
    priceEuros: 1.99,
    durationText: '48 Hours Broadcast',
    features: ['50km local radius alert', 'Serial number database check', 'Sighting hotline link'],
  },
  {
    id: 'stolen_tier_2',
    name: 'Regional Alert (150km)',
    priceEuros: 4.99,
    durationText: '5 Days Active',
    isPopular: true,
    features: ['150km expanded radius coverage', 'High-priority red alert banner', 'Automated trade push dispatch'],
  },
  {
    id: 'stolen_tier_3',
    name: 'National Red Alert',
    priceEuros: 9.99,
    durationText: '14 Days Active',
    features: ['All-Ireland 32 counties coverage', 'Pinned top of feed ticker', 'Instant scrap dealer & tool pawn warnings'],
  },
];

export const JOB_POSTING_TIERS: PricingTier[] = [
  {
    id: 'job_tier_1',
    name: 'Basic Site Listing',
    priceEuros: 0.99,
    durationText: '14 Days Active',
    features: ['Standard job board placement', 'Direct message candidates', 'Geo-proximity radius matching'],
  },
  {
    id: 'job_tier_2',
    name: 'Priority Trade Hiring',
    priceEuros: 2.99,
    durationText: '30 Days Active',
    isPopular: true,
    features: ['30 Days listing', 'Featured badge in Trade Feed', 'Alert sent to qualified apprentices'],
  },
  {
    id: 'job_tier_3',
    name: 'Contractor Pro Blast',
    priceEuros: 5.99,
    durationText: '60 Days Active',
    features: ['Pinned to Top of Jobs Tab', 'Unlimited apprentice applicant reviews', 'Direct subcontract dispatch'],
  },
];

export const BUSINESS_PROFILE_TIERS: PricingTier[] = [
  {
    id: 'bus_tier_1',
    name: 'Standard Business Profile',
    priceEuros: 0.00,
    durationText: 'Free Forever',
    features: ['Basic company directory listing', 'Direct messaging with trade users', 'Standard marketplace & job posts'],
  },
  {
    id: 'bus_tier_2',
    name: 'Employer Pro Subscription',
    priceEuros: 19.99,
    durationText: 'Monthly Subscription',
    isPopular: true,
    features: ['Featured hiring badge in Trade Feed', 'Unlimited priority job listings', 'Direct apprentice candidate dispatch', 'Verified Contractor Pro checkmark'],
  },
  {
    id: 'bus_tier_3',
    name: 'Tool & Material Manufacturer Showcase',
    priceEuros: 49.99,
    durationText: 'Monthly Subscription',
    features: ['Verified Manufacturer badge', 'Pinned product showcase in Marketplace', 'Direct lead generation from site crews', 'Sponsored tool radar & safety bulletins'],
  },
];

export const CLASSIFIEDS_TIERS: PricingTier[] = [
  {
    id: 'class_tier_1',
    name: 'Standard Classified',
    priceEuros: 0.99,
    durationText: '30 Days Active',
    features: ['Standard marketplace listing', 'Direct buyer messaging', 'Compressed photo gallery'],
  },
  {
    id: 'class_tier_2',
    name: 'Boosted Listing',
    priceEuros: 2.99,
    durationText: '7 Days Pinned',
    isPopular: true,
    features: ['Pinned above standard listings', 'Gold FEATURED badge', 'Priority buyer inquiries'],
  },
  {
    id: 'class_tier_3',
    name: 'Premium Showcase',
    priceEuros: 4.99,
    durationText: '14 Days Pinned',
    features: ['Top of category placement for 14 days', 'Featured in Trade Feed', 'Instant alert to local buyers within 50km'],
  },
];

export const AD_TIERS: PricingTier[] = [
  {
    id: 'ad_tier_1',
    name: 'Single Feed Ad Campaign',
    priceEuros: 29.99,
    durationText: '7 Days Pinned in Trade Feed',
    features: ['Pinned at top of community feed', 'Verified Business / Manufacturer badge', 'Direct CTA button for site crews'],
    isPopular: true,
  },
  {
    id: 'ad_tier_2',
    name: 'National Contractor / Tool Blast',
    priceEuros: 79.99,
    durationText: '30 Days Pinned + Push Alert',
    features: ['All-Ireland 32 counties reach', 'Automated push alert to tradespeople', 'Priority banner placement'],
  },
];
export interface SolasLogEntry {
  id: string;
  userId: string;
  phase: number;
  date: string;
  hours: number;
  craftspersonName: string;
  moduleTitle: string;
  notes: string;
  employerSigned: boolean;
  signoffDate?: string;
  signoffCode?: string;
}

export interface SolasCompetency {
  id: string;
  phase: number;
  code: string;
  title: string;
  category: 'Safety & Regulations' | 'Practical Craft' | 'Theory & Calculations' | 'Testing & Verification';
}

