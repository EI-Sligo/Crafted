import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateVoltageDrop,
  scale4To20mA,
  engineeringValueToMa,
  calculateHaversineDistanceKm,
  isWithin50KmRadius,
  cascadeDeletePost,
  cascadeDeleteUser,
  auditDatabaseIntegrity,
  DatabaseState,
  toggleFollowUser,
  addMemberToGroup,
  removeMemberFromGroup,
  filterItemsByRadius,
  isWithinMaxVideoDuration,
  findClosestIrishLocation,
  matchesTradeFilter,
} from './calculations';

test('I.S. 10101:2020 calculates single-phase voltage drop correctly', () => {
  // 230V, 20 Amps, 25 meters, 2.5mm² cable (18 mV/A/m)
  // Vd = (18 * 20 * 25) / 1000 = 9.0 Volts
  // % = (9.0 / 230) * 100 = 3.91%
  const result = calculateVoltageDrop({
    systemVoltage: 230,
    currentAmps: 20,
    cableLengthMeters: 25,
    cableSizeMm2: 2.5,
    circuitType: 'other', // 5% max allowed
  });

  assert.equal(result.voltageDropVolts, 9.0);
  assert.equal(result.percentageDrop, 3.91);
  assert.equal(result.isCompliant, true);
  assert.equal(result.maxAllowedPercentage, 5.0);
});

test('I.S. 10101:2020 catches non-compliant lighting circuit over 3% drop', () => {
  // 230V, 10 Amps, 30 meters, 1.5mm² cable (29 mV/A/m)
  // Vd = (29 * 10 * 30) / 1000 = 8.7 Volts
  // % = (8.7 / 230) * 100 = 3.78% (Lighting max is 3.0%)
  const result = calculateVoltageDrop({
    systemVoltage: 230,
    currentAmps: 10,
    cableLengthMeters: 30,
    cableSizeMm2: 1.5,
    circuitType: 'lighting',
  });

  assert.equal(result.voltageDropVolts, 8.7);
  assert.equal(result.percentageDrop, 3.78);
  assert.equal(result.isCompliant, false);
});

test('4-20mA scaler scales process values and generates 5 checkpoints', () => {
  // 0 to 10 Bar pressure transmitter at 12mA (50% span)
  const result = scale4To20mA({
    processMin: 0,
    processMax: 10,
    currentInputMa: 12.0,
  });

  assert.equal(result.scaledProcessValue, 5.0);
  assert.equal(result.percentage, 50.0);
  assert.equal(result.isOutOfRange, false);
  assert.equal(result.checkpoints.length, 5);

  // Check standard calibration points
  assert.equal(result.checkpoints[0].currentMa, 4.0);
  assert.equal(result.checkpoints[0].scaledValue, 0.0);
  assert.equal(result.checkpoints[2].currentMa, 12.0);
  assert.equal(result.checkpoints[2].scaledValue, 5.0);
  assert.equal(result.checkpoints[4].currentMa, 20.0);
  assert.equal(result.checkpoints[4].scaledValue, 10.0);
});

test('engineeringValueToMa reverses calculation accurately', () => {
  const ma = engineeringValueToMa(0, 100, 75); // 75% should be 16mA
  assert.equal(ma, 16.0);
});

test('Haversine distance calculates Irish coordinates and 50km radius correctly', () => {
  // Dublin City (53.3498, -6.2603) to Swords, Co. Dublin (53.4557, -6.2197) ~12km
  const dublin = { latitude: 53.3498, longitude: -6.2603 };
  const swords = { latitude: 53.4557, longitude: -6.2197 };
  const distance = calculateHaversineDistanceKm(dublin, swords);
  assert.ok(distance > 10 && distance < 15, `Expected ~12km, got ${distance}`);
  assert.equal(isWithin50KmRadius(dublin, swords), true);

  // Dublin to Galway City (53.2707, -9.0568) is ~185km
  const galway = { latitude: 53.2707, longitude: -9.0568 };
  const dublinToGalway = calculateHaversineDistanceKm(dublin, galway);
  assert.ok(dublinToGalway > 170 && dublinToGalway < 210, `Expected ~185km, got ${dublinToGalway}`);
  assert.equal(isWithin50KmRadius(dublin, galway), false);
});

test('Cascade deletion of post removes associated comments without leaving orphans', () => {
  const initialState: DatabaseState = {
    users: [
      { id: 'u1', name: 'Sean O Connor' },
      { id: 'u2', name: 'Liam Murphy' },
    ],
    posts: [
      { id: 'p1', userId: 'u1', content: 'Neat conduit installation' },
      { id: 'p2', userId: 'u2', content: 'Copper pipework job' },
    ],
    comments: [
      { id: 'c1', postId: 'p1', userId: 'u2', text: 'Clean bends!' },
      { id: 'c2', postId: 'p1', userId: 'u1', text: 'Cheers mate' },
      { id: 'c3', postId: 'p2', userId: 'u1', text: 'Great solder' },
    ],
    marketplaceItems: [
      { id: 'm1', sellerId: 'u1', title: 'Fluke Multimeter' },
    ],
  };

  // Pre-check integrity
  assert.equal(auditDatabaseIntegrity(initialState).isValid, true);

  // Delete post p1
  const afterPostDelete = cascadeDeletePost(initialState, 'p1');
  assert.equal(afterPostDelete.posts.length, 1);
  assert.equal(afterPostDelete.comments.length, 1);
  assert.equal(afterPostDelete.comments[0].id, 'c3');

  const auditResult = auditDatabaseIntegrity(afterPostDelete);
  assert.equal(auditResult.isValid, true);
  assert.equal(auditResult.orphanedComments, 0);
});

test('Cascade deletion of user removes all related posts, comments, and marketplace listings', () => {
  const initialState: DatabaseState = {
    users: [
      { id: 'u1', name: 'Sean O Connor' },
      { id: 'u2', name: 'Liam Murphy' },
    ],
    posts: [
      { id: 'p1', userId: 'u1', content: 'Post 1' },
      { id: 'p2', userId: 'u2', content: 'Post 2' },
    ],
    comments: [
      { id: 'c1', postId: 'p1', userId: 'u2', text: 'Comment on P1' },
      { id: 'c2', postId: 'p2', userId: 'u1', text: 'Comment by u1 on P2' },
    ],
    marketplaceItems: [
      { id: 'm1', sellerId: 'u1', title: 'DeWalt Chop Saw' },
      { id: 'm2', sellerId: 'u2', title: 'Milwaukee M18' },
    ],
  };

  const afterUserDelete = cascadeDeleteUser(initialState, 'u1');
  assert.equal(afterUserDelete.users.length, 1);
  assert.equal(afterUserDelete.users[0].id, 'u2');
  assert.equal(afterUserDelete.posts.length, 1);
  assert.equal(afterUserDelete.posts[0].id, 'p2');
  assert.equal(afterUserDelete.marketplaceItems.length, 1);
  assert.equal(afterUserDelete.marketplaceItems[0].id, 'm2');

  // Any comments belonging to deleted post or authored by deleted user must be gone
  assert.equal(afterUserDelete.comments.length, 0);

  const audit = auditDatabaseIntegrity(afterUserDelete);
  assert.equal(audit.isValid, true);
  assert.equal(audit.orphanedComments, 0);
  assert.equal(audit.orphanedPosts, 0);
  assert.equal(audit.orphanedItems, 0);
});

test('toggleFollowUser toggles user in following list', () => {
  const initial = ['usr_2'];
  const followed = toggleFollowUser(initial, 'usr_3');
  assert.deepEqual(followed, ['usr_2', 'usr_3']);
  const unfollowed = toggleFollowUser(followed, 'usr_2');
  assert.deepEqual(unfollowed, ['usr_3']);
});

test('Custom group add and remove member logic', () => {
  const group = {
    id: 'grp_1',
    creatorId: 'usr_me',
    name: 'Intel Leixlip Site Crew',
    memberUserIds: ['usr_2'],
  };
  const withMember = addMemberToGroup(group, 'usr_3');
  assert.deepEqual(withMember.memberUserIds, ['usr_2', 'usr_3']);
  // Idempotent add
  const idempotent = addMemberToGroup(withMember, 'usr_3');
  assert.deepEqual(idempotent.memberUserIds, ['usr_2', 'usr_3']);
  // Remove member
  const removed = removeMemberFromGroup(withMember, 'usr_2');
  assert.deepEqual(removed.memberUserIds, ['usr_3']);
});

test('filterItemsByRadius filters locations by radius in km', () => {
  const dublin = { latitude: 53.3498, longitude: -6.2603 };
  const items = [
    { id: '1', title: 'Swords job', location: { latitude: 53.4557, longitude: -6.2197 } }, // ~12km
    { id: '2', title: 'Tallaght job', location: { latitude: 53.2863, longitude: -6.3688 } }, // ~10km
    { id: '3', title: 'Galway job', location: { latitude: 53.2707, longitude: -9.0568 } }, // ~185km
  ];

  const within25Km = filterItemsByRadius(items, dublin, 25);
  assert.equal(within25Km.length, 2);
  assert.equal(within25Km[0].id, '1');
  assert.equal(within25Km[1].id, '2');

  const allItems = filterItemsByRadius(items, dublin, 'all');
  assert.equal(allItems.length, 3);
});

test('isWithinMaxVideoDuration enforces 30-second video limit for feed', () => {
  assert.equal(isWithinMaxVideoDuration(29.5), true);
  assert.equal(isWithinMaxVideoDuration(30.0), true);
  assert.equal(isWithinMaxVideoDuration(30.5), false);
  assert.equal(isWithinMaxVideoDuration(65), false);
});

test('findClosestIrishLocation finds closest town from GPS coordinates', () => {
  const irishHubs = [
    { town: 'Dublin City', county: 'Dublin', latitude: 53.3498, longitude: -6.2603 },
    { town: 'Swords', county: 'Dublin', latitude: 53.4557, longitude: -6.2197 },
    { town: 'Cork City', county: 'Cork', latitude: 51.8985, longitude: -8.4756 },
    { town: 'Galway City', county: 'Galway', latitude: 53.2707, longitude: -9.0568 },
  ];

  // Coords near Dublin Airport / Malahide (53.43, -6.18) -> closest is Swords
  const nearMalahide = { latitude: 53.43, longitude: -6.18 };
  const closestToMalahide = findClosestIrishLocation(nearMalahide, irishHubs);
  assert.equal(closestToMalahide.town, 'Swords');

  // Coords near Kinsale, Cork (51.70, -8.53) -> closest is Cork City
  const nearKinsale = { latitude: 51.70, longitude: -8.53 };
  const closestToKinsale = findClosestIrishLocation(nearKinsale, irishHubs);
  assert.equal(closestToKinsale.town, 'Cork City');
});

test('matchesTradeFilter matches trades and official Generation Apprenticeship aliases', () => {
  // exact match
  assert.equal(matchesTradeFilter('Electrician', 'Electrician'), true);
  assert.equal(matchesTradeFilter('All', 'Plumber'), true);

  // Plumber <-> Plumbing
  assert.equal(matchesTradeFilter('Plumber', 'Plumbing'), true);
  assert.equal(matchesTradeFilter('Plumbing', 'Plumber'), true);

  // Carpenter <-> Carpentry & Joinery
  assert.equal(matchesTradeFilter('Carpentry & Joinery', 'Carpenter'), true);
  assert.equal(matchesTradeFilter('Carpenter', 'Carpentry & Joinery'), true);

  // HVAC <-> Refrigeration & Air Conditioning
  assert.equal(matchesTradeFilter('Refrigeration & Air Conditioning', 'HVAC & Refrigeration'), true);
  assert.equal(matchesTradeFilter('HVAC & Refrigeration', 'Refrigeration & Air Conditioning'), true);

  // Non-matching trades
  assert.equal(matchesTradeFilter('Electrician', 'Plumber'), false);
  assert.equal(matchesTradeFilter('Carpenter', 'Electrician'), false);
});

test('findMatchingIrishTown resolves Galway, Dublin, and Cork correctly from network/IP names', async () => {
  const { findMatchingIrishTown } = await import('../services/locationService');

  const galwayMatch = findMatchingIrishTown('Galway', 'County Galway');
  assert.ok(galwayMatch);
  assert.equal(galwayMatch.town, 'Galway City');
  assert.equal(galwayMatch.county, 'Galway');

  const dublinMatch = findMatchingIrishTown('Dublin', 'Leinster');
  assert.ok(dublinMatch);
  assert.equal(dublinMatch.town, 'Dublin City');

  const swordsMatch = findMatchingIrishTown('Swords');
  assert.ok(swordsMatch);
  assert.equal(swordsMatch.town, 'Swords');

  const corkMatch = findMatchingIrishTown('Carrigaline');
  assert.ok(corkMatch);
  assert.equal(corkMatch.town, 'Carrigaline');
  assert.equal(corkMatch.county, 'Cork');
});



