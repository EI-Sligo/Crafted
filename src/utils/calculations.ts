/**
 * Calculations module for Crafted (TradeNet Ireland)
 * Pure engineering formulas, geo-proximity, and relational cascades.
 */

// --- I.S. 10101:2020 Electrical Calculations ---

export interface CableSpec {
  sizeMm2: number;
  label: string;
  mvPerAmpMeter1Phase: number;
  mvPerAmpMeter3Phase: number;
  typicalMaxCurrent: number; // in Amperes
}

export const IS10101_CABLE_TABLE: CableSpec[] = [
  { sizeMm2: 1.5, label: '1.5 mm²', mvPerAmpMeter1Phase: 29.0, mvPerAmpMeter3Phase: 25.0, typicalMaxCurrent: 16 },
  { sizeMm2: 2.5, label: '2.5 mm²', mvPerAmpMeter1Phase: 18.0, mvPerAmpMeter3Phase: 15.0, typicalMaxCurrent: 25 },
  { sizeMm2: 4.0, label: '4.0 mm²', mvPerAmpMeter1Phase: 11.0, mvPerAmpMeter3Phase: 9.5, typicalMaxCurrent: 32 },
  { sizeMm2: 6.0, label: '6.0 mm²', mvPerAmpMeter1Phase: 7.3, mvPerAmpMeter3Phase: 6.4, typicalMaxCurrent: 40 },
  { sizeMm2: 10.0, label: '10.0 mm²', mvPerAmpMeter1Phase: 4.4, mvPerAmpMeter3Phase: 3.8, typicalMaxCurrent: 63 },
  { sizeMm2: 16.0, label: '16.0 mm²', mvPerAmpMeter1Phase: 2.8, mvPerAmpMeter3Phase: 2.4, typicalMaxCurrent: 85 },
  { sizeMm2: 25.0, label: '25.0 mm²', mvPerAmpMeter1Phase: 1.75, mvPerAmpMeter3Phase: 1.5, typicalMaxCurrent: 110 },
  { sizeMm2: 35.0, label: '35.0 mm²', mvPerAmpMeter1Phase: 1.25, mvPerAmpMeter3Phase: 1.1, typicalMaxCurrent: 135 },
];

export interface VoltageDropParams {
  systemVoltage: 230 | 400; // 230V single phase or 400V three phase
  currentAmps: number;
  cableLengthMeters: number;
  cableSizeMm2: number;
  circuitType: 'lighting' | 'other'; // 3% limit for lighting, 5% for other circuits
}

export interface VoltageDropResult {
  voltageDropVolts: number;
  percentageDrop: number;
  maxAllowedPercentage: number;
  maxAllowedVolts: number;
  isCompliant: boolean;
  mvPerAmpMeter: number;
  statusMessage: string;
}

export function calculateVoltageDrop(params: VoltageDropParams): VoltageDropResult {
  const { systemVoltage, currentAmps, cableLengthMeters, cableSizeMm2, circuitType } = params;

  const cable = IS10101_CABLE_TABLE.find(c => c.sizeMm2 === cableSizeMm2) || IS10101_CABLE_TABLE[1];
  const mvPerAmpMeter = systemVoltage === 400 ? cable.mvPerAmpMeter3Phase : cable.mvPerAmpMeter1Phase;

  // Formula: Vd = (mV/A/m * I * L) / 1000
  const voltageDropVolts = (mvPerAmpMeter * currentAmps * cableLengthMeters) / 1000;
  const percentageDrop = (voltageDropVolts / systemVoltage) * 100;

  const maxAllowedPercentage = circuitType === 'lighting' ? 3.0 : 5.0;
  const maxAllowedVolts = (systemVoltage * maxAllowedPercentage) / 100;
  const isCompliant = percentageDrop <= maxAllowedPercentage;

  let statusMessage = '';
  if (isCompliant) {
    statusMessage = `Compliant with I.S. 10101:2020. Voltage drop is ${percentageDrop.toFixed(2)}% (Limit: ${maxAllowedPercentage}%).`;
  } else {
    statusMessage = `NON-COMPLIANT: ${percentageDrop.toFixed(2)}% exceeds the ${maxAllowedPercentage}% limit. Increase cable size.`;
  }

  return {
    voltageDropVolts: Number(voltageDropVolts.toFixed(3)),
    percentageDrop: Number(percentageDrop.toFixed(2)),
    maxAllowedPercentage,
    maxAllowedVolts: Number(maxAllowedVolts.toFixed(2)),
    isCompliant,
    mvPerAmpMeter,
    statusMessage,
  };
}

// --- 4-20mA Instrumentation Scaler ---

export interface ScalingParams {
  processMin: number;
  processMax: number;
  currentInputMa: number;
}

export interface CalibrationCheckpoint {
  percentage: number;
  currentMa: number;
  scaledValue: number;
}

export interface ScalingResult {
  scaledProcessValue: number;
  percentage: number;
  checkpoints: CalibrationCheckpoint[];
  isOutOfRange: boolean;
  rangeStatus: 'UNDER_RANGE' | 'NORMAL' | 'OVER_RANGE';
}

export function scale4To20mA(params: ScalingParams): ScalingResult {
  const { processMin, processMax, currentInputMa } = params;
  const span = processMax - processMin;

  // Output = OutMin + ((mA - 4) / 16) * Span
  const scaledProcessValue = processMin + ((currentInputMa - 4) / 16) * span;
  const percentage = ((currentInputMa - 4) / 16) * 100;

  let rangeStatus: 'UNDER_RANGE' | 'NORMAL' | 'OVER_RANGE' = 'NORMAL';
  if (currentInputMa < 3.8) rangeStatus = 'UNDER_RANGE';
  else if (currentInputMa > 20.5) rangeStatus = 'OVER_RANGE';

  const checkpoints: CalibrationCheckpoint[] = [
    { percentage: 0, currentMa: 4.0, scaledValue: Number((processMin + 0 * span).toFixed(2)) },
    { percentage: 25, currentMa: 8.0, scaledValue: Number((processMin + 0.25 * span).toFixed(2)) },
    { percentage: 50, currentMa: 12.0, scaledValue: Number((processMin + 0.5 * span).toFixed(2)) },
    { percentage: 75, currentMa: 16.0, scaledValue: Number((processMin + 0.75 * span).toFixed(2)) },
    { percentage: 100, currentMa: 20.0, scaledValue: Number((processMin + 1.0 * span).toFixed(2)) },
  ];

  return {
    scaledProcessValue: Number(scaledProcessValue.toFixed(3)),
    percentage: Number(percentage.toFixed(1)),
    checkpoints,
    isOutOfRange: rangeStatus !== 'NORMAL',
    rangeStatus,
  };
}

export function engineeringValueToMa(processMin: number, processMax: number, engValue: number): number {
  const span = processMax - processMin;
  if (span === 0) return 4.0;
  const ma = 4 + ((engValue - processMin) / span) * 16;
  return Number(ma.toFixed(3));
}

// --- Geo-Proximity & Haversine Distance (Ireland Focus) ---

export interface LatLon {
  latitude: number;
  longitude: number;
}

/**
 * Calculates great-circle distance between two points in Kilometers using Haversine formula
 */
export function calculateHaversineDistanceKm(pointA: LatLon, pointB: LatLon): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((pointB.latitude - pointA.latitude) * Math.PI) / 180;
  const dLon = ((pointB.longitude - pointA.longitude) * Math.PI) / 180;

  const lat1 = (pointA.latitude * Math.PI) / 180;
  const lat2 = (pointB.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((R * c).toFixed(1));
}

export function isWithin50KmRadius(origin: LatLon, target: LatLon): boolean {
  return calculateHaversineDistanceKm(origin, target) <= 50.0;
}

// --- Cascading Deletion & Foreign Key Integrity Simulator ---

export interface DatabaseState {
  users: Array<{ id: string; name: string }>;
  posts: Array<{ id: string; userId: string; content: string }>;
  comments: Array<{ id: string; postId: string; userId: string; text: string }>;
  marketplaceItems: Array<{ id: string; sellerId: string; title: string }>;
}

export function cascadeDeletePost(state: DatabaseState, postId: string): DatabaseState {
  const nextPosts = state.posts.filter(p => p.id !== postId);
  const nextComments = state.comments.filter(c => c.postId !== postId);
  return {
    ...state,
    posts: nextPosts,
    comments: nextComments,
  };
}

export function cascadeDeleteUser(state: DatabaseState, userId: string): DatabaseState {
  const userPostIds = new Set(state.posts.filter(p => p.userId === userId).map(p => p.id));
  const nextUsers = state.users.filter(u => u.id !== userId);
  const nextPosts = state.posts.filter(p => p.userId !== userId);
  // Comments written by user OR comments on posts belonging to the user
  const nextComments = state.comments.filter(c => c.userId !== userId && !userPostIds.has(c.postId));
  const nextMarketplaceItems = state.marketplaceItems.filter(m => m.sellerId !== userId);

  return {
    users: nextUsers,
    posts: nextPosts,
    comments: nextComments,
    marketplaceItems: nextMarketplaceItems,
  };
}

export function auditDatabaseIntegrity(state: DatabaseState): { isValid: boolean; orphanedComments: number; orphanedPosts: number; orphanedItems: number } {
  const userIds = new Set(state.users.map(u => u.id));
  const postIds = new Set(state.posts.map(p => p.id));

  let orphanedComments = 0;
  for (const c of state.comments) {
    if (!postIds.has(c.postId) || !userIds.has(c.userId)) {
      orphanedComments++;
    }
  }

  let orphanedPosts = 0;
  for (const p of state.posts) {
    if (!userIds.has(p.userId)) {
      orphanedPosts++;
    }
  }

  let orphanedItems = 0;
  for (const m of state.marketplaceItems) {
    if (!userIds.has(m.sellerId)) {
      orphanedItems++;
    }
  }

  return {
    isValid: orphanedComments === 0 && orphanedPosts === 0 && orphanedItems === 0,
    orphanedComments,
    orphanedPosts,
    orphanedItems,
  };
}

// --- Following, Custom Groups & Feed Radius Filters ---

export function toggleFollowUser(currentFollowing: string[], targetUserId: string): string[] {
  if (currentFollowing.includes(targetUserId)) {
    return currentFollowing.filter(id => id !== targetUserId);
  }
  return [...currentFollowing, targetUserId];
}

export function isUserFollowed(currentFollowing: string[], targetUserId: string): boolean {
  return currentFollowing.includes(targetUserId);
}

export interface GenericGroup {
  id: string;
  creatorId: string;
  name: string;
  memberUserIds: string[];
}

export function addMemberToGroup<T extends GenericGroup>(group: T, userId: string): T {
  if (group.memberUserIds.includes(userId)) return group;
  return {
    ...group,
    memberUserIds: [...group.memberUserIds, userId],
  };
}

export function removeMemberFromGroup<T extends GenericGroup>(group: T, userId: string): T {
  return {
    ...group,
    memberUserIds: group.memberUserIds.filter(id => id !== userId),
  };
}

export function filterItemsByRadius<T extends { location: LatLon }>(
  items: T[],
  origin: LatLon,
  radiusKm: number | 'all'
): T[] {
  if (radiusKm === 'all') return items;
  return items.filter(item => {
    const dist = calculateHaversineDistanceKm(origin, item.location);
    return dist <= radiusKm;
  });
}

export function isWithinMaxVideoDuration(durationSeconds: number, maxAllowed = 30): boolean {
  return durationSeconds <= maxAllowed;
}

export function findClosestIrishLocation<T extends LatLon>(
  coords: LatLon,
  locations: T[]
): T {
  if (locations.length === 0) {
    throw new Error('Locations list cannot be empty');
  }
  let closest = locations[0];
  let minDistance = Infinity;

  for (const loc of locations) {
    const dist = calculateHaversineDistanceKm(coords, loc);
    if (dist < minDistance) {
      minDistance = dist;
      closest = loc;
    }
  }

  return closest;
}

/**
 * Checks whether an item/post trade matches the selected trade filter,
 * accounting for Generation Apprenticeship titles and backward compatibility aliases.
 */
export function matchesTradeFilter(filterTrade: string, itemTrade: string): boolean {
  if (!filterTrade || filterTrade === 'All') return true;
  if (!itemTrade) return false;

  const f = filterTrade.toLowerCase().trim();
  const i = itemTrade.toLowerCase().trim();

  if (f === i) return true;

  const pairs: [string, string][] = [
    ['plumber', 'plumbing'],
    ['carpenter', 'carpentry & joinery'],
    ['carpenter', 'carpentry'],
    ['electrician', 'electrical'],
    ['electrician', 'electrical instrumentation'],
    ['bricklayer & mason', 'brick & stonelaying'],
    ['bricklayer', 'brick & stonelaying'],
    ['plasterer & dryliner', 'plastering & drylining'],
    ['plasterer', 'plastering & drylining'],
    ['roofer', 'roofing & cladding'],
    ['painter & decorator', 'painting & decorating'],
    ['hvac & refrigeration', 'refrigeration & air conditioning'],
    ['welder & fabricator', 'metal fabrication & welding'],
    ['motor mechanic', 'motor mechanics'],
    ['heavy vehicle mechanic', 'heavy vehicle mechanics'],
  ];

  for (const [a, b] of pairs) {
    if ((f === a && i === b) || (f === b && i === a)) return true;
  }

  return f.includes(i) || i.includes(f);
}


