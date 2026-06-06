import { computeStats } from './stats'

// ── Builders ────────────────────────────────────────────────────────────────

const gp = (profile_id, won, role = 'operative', played_at = '2024-01-01') => ({
  profile_id,
  won,
  role,
  profiles: { display_name: `Player ${profile_id}` },
  games: { played_at },
})

const member = (id, overrides = {}) => ({
  id,
  display_name: `Player ${id}`,
  is_active: true,
  is_angel: false,
  ...overrides,
})

const seed = (profile_id, overrides = {}) => ({
  profile_id,
  w: 0,
  l: 0,
  sm_w: 0,
  sm_l: 0,
  streak_type: null,
  streak_count: 0,
  ...overrides,
})

// ── Empty inputs ─────────────────────────────────────────────────────────────

test('returns empty array when all inputs are empty', () => {
  expect(computeStats([], [], [])).toEqual([])
})

test('returns member with zeroed stats when they have no games and no seed', () => {
  const result = computeStats([], [], [member('p1')])
  expect(result).toHaveLength(1)
  expect(result[0]).toMatchObject({
    profile_id: 'p1',
    w: 0, l: 0, smW: 0, smL: 0,
    gamesPlayed: 0, winPct: 0, streak: '—',
  })
})

// ── Win / loss counting ──────────────────────────────────────────────────────

test('counts wins and losses from game entries', () => {
  const players = [gp('p1', true), gp('p1', true), gp('p1', false)]
  const result = computeStats(players, [], [member('p1')])
  expect(result[0]).toMatchObject({ w: 2, l: 1, gamesPlayed: 3 })
})

test('tracks spymaster W/L separately from overall W/L', () => {
  const players = [
    gp('p1', true, 'spymaster'),
    gp('p1', false, 'spymaster'),
    gp('p1', true, 'operative'),
  ]
  const result = computeStats(players, [], [member('p1')])
  expect(result[0]).toMatchObject({ w: 2, l: 1, smW: 1, smL: 1 })
})

test('operative entries do not affect spymaster counts', () => {
  const players = [gp('p1', true, 'operative'), gp('p1', false, 'operative')]
  const result = computeStats(players, [], [member('p1')])
  expect(result[0]).toMatchObject({ smW: 0, smL: 0 })
})

// ── Win percentage ───────────────────────────────────────────────────────────

test('calculates win percentage rounded to nearest integer', () => {
  // 2/3 = 66.67 → 67
  const players = [gp('p1', true), gp('p1', true), gp('p1', false)]
  const result = computeStats(players, [], [member('p1')])
  expect(result[0].winPct).toBe(67)
})

test('winPct is 0 when no games played', () => {
  const result = computeStats([], [], [member('p1')])
  expect(result[0].winPct).toBe(0)
})

test('winPct is 100 for a perfect record', () => {
  const players = [gp('p1', true), gp('p1', true)]
  const result = computeStats(players, [], [member('p1')])
  expect(result[0].winPct).toBe(100)
})

// ── Seeds ────────────────────────────────────────────────────────────────────

test('merges seed totals into logged game totals', () => {
  const players = [gp('p1', true), gp('p1', false)]
  const seeds = [seed('p1', { w: 5, l: 3, sm_w: 2, sm_l: 1 })]
  const result = computeStats(players, seeds, [member('p1')])
  expect(result[0]).toMatchObject({ w: 6, l: 4, smW: 2, smL: 1, gamesPlayed: 10 })
})

test('includes seed-only members who have no logged games', () => {
  const seeds = [seed('ghost', { w: 10, l: 5 })]
  const result = computeStats([], seeds, [member('ghost', { display_name: 'Ghost' })])
  expect(result).toHaveLength(1)
  expect(result[0]).toMatchObject({ profile_id: 'ghost', w: 10, l: 5, gamesPlayed: 15 })
})

test('gamesPlayed reflects combined seed + logged totals', () => {
  const players = [gp('p1', true)]
  const seeds = [seed('p1', { w: 4, l: 4 })]
  const result = computeStats(players, seeds, [member('p1')])
  expect(result[0].gamesPlayed).toBe(9)
})

// ── Streak ───────────────────────────────────────────────────────────────────

test('streak is — with no entries and no seed streak', () => {
  const result = computeStats([], [], [member('p1')])
  expect(result[0].streak).toBe('—')
})

test('calculates a win streak from the most recent consecutive wins', () => {
  const players = [
    gp('p1', false, 'operative', '2024-01-01'),
    gp('p1', true,  'operative', '2024-01-02'),
    gp('p1', true,  'operative', '2024-01-03'),
  ]
  const result = computeStats(players, [], [member('p1')])
  expect(result[0].streak).toBe('W2')
})

test('calculates a loss streak from the most recent consecutive losses', () => {
  const players = [
    gp('p1', true,  'operative', '2024-01-01'),
    gp('p1', false, 'operative', '2024-01-02'),
    gp('p1', false, 'operative', '2024-01-03'),
  ]
  const result = computeStats(players, [], [member('p1')])
  expect(result[0].streak).toBe('L2')
})

test('streak of 1 when the most recent result breaks the prior run', () => {
  const players = [
    gp('p1', true, 'operative', '2024-01-01'),
    gp('p1', true, 'operative', '2024-01-02'),
    gp('p1', false, 'operative', '2024-01-03'),
  ]
  const result = computeStats(players, [], [member('p1')])
  expect(result[0].streak).toBe('L1')
})

test('uses seed streak when member has no logged games', () => {
  const seeds = [seed('p1', { w: 5, l: 2, streak_type: 'W', streak_count: 3 })]
  const result = computeStats([], seeds, [member('p1')])
  expect(result[0].streak).toBe('W3')
})

test('ignores seed streak when member has at least one logged game', () => {
  const players = [gp('p1', false, 'operative', '2024-01-01')]
  const seeds = [seed('p1', { w: 10, l: 0, streak_type: 'W', streak_count: 10 })]
  const result = computeStats(players, seeds, [member('p1')])
  expect(result[0].streak).toBe('L1')
})

test('seed streak_count of 0 leaves streak as —', () => {
  const seeds = [seed('p1', { streak_type: 'W', streak_count: 0 })]
  const result = computeStats([], seeds, [member('p1')])
  expect(result[0].streak).toBe('—')
})

test('missing streak_type leaves streak as — even with positive count', () => {
  const seeds = [seed('p1', { streak_type: null, streak_count: 5 })]
  const result = computeStats([], seeds, [member('p1')])
  expect(result[0].streak).toBe('—')
})

// ── Sorting ──────────────────────────────────────────────────────────────────

test('sorts active members before inactive regardless of win%', () => {
  const players = [
    gp('inactive', true),  // 100% win rate but inactive
    gp('active', false),   // 0% win rate but active
  ]
  const members = [
    member('inactive', { is_active: false }),
    member('active', { is_active: true }),
  ]
  const result = computeStats(players, [], members)
  expect(result[0].profile_id).toBe('active')
  expect(result[1].profile_id).toBe('inactive')
})

test('sorts active members by win percentage descending', () => {
  const players = [
    gp('lo', false),                          // 0%
    gp('hi', true), gp('hi', true),           // 100%
    gp('mid', true), gp('mid', false),        // 50%
  ]
  const members = [member('lo'), member('hi'), member('mid')]
  const [first, second, third] = computeStats(players, [], members)
  expect(first.profile_id).toBe('hi')
  expect(second.profile_id).toBe('mid')
  expect(third.profile_id).toBe('lo')
})

test('breaks win% ties by games played descending', () => {
  const players = [
    gp('few', true, 'operative', '2024-01-01'), gp('few', false, 'operative', '2024-01-02'),
    gp('many', true, 'operative', '2024-01-01'), gp('many', false, 'operative', '2024-01-02'),
    gp('many', true, 'operative', '2024-01-03'), gp('many', false, 'operative', '2024-01-04'),
  ]
  const members = [member('few'), member('many')]
  const result = computeStats(players, [], members)
  expect(result[0].profile_id).toBe('many')
})

// ── Display name resolution ───────────────────────────────────────────────────

test('uses display_name from game_players.profiles', () => {
  const players = [{
    profile_id: 'p1', won: true, role: 'operative',
    profiles: { display_name: 'GP Name' },
    games: { played_at: '2024-01-01' },
  }]
  const result = computeStats(players, [], [member('p1', { display_name: 'Member Name' })])
  expect(result[0].display_name).toBe('GP Name')
})

test('falls back to allMembers display_name for seed-only entries', () => {
  const seeds = [seed('p1', { w: 1 })]
  const result = computeStats([], seeds, [member('p1', { display_name: 'Seed Name' })])
  expect(result[0].display_name).toBe('Seed Name')
})

// ── Member metadata ───────────────────────────────────────────────────────────

test('reads is_active and is_angel from allMembers', () => {
  const members = [member('p1', { is_active: false, is_angel: true })]
  const result = computeStats([], [], members)
  expect(result[0]).toMatchObject({ is_active: false, is_angel: true })
})

test('defaults is_active to true and is_angel to false when not in allMembers', () => {
  const players = [gp('p1', true)]
  const result = computeStats(players, [], [])
  expect(result[0]).toMatchObject({ is_active: true, is_angel: false })
})

// ── Multiple members ──────────────────────────────────────────────────────────

test('tracks multiple members independently', () => {
  const players = [
    gp('p1', true), gp('p1', false),
    gp('p2', true), gp('p2', true),
  ]
  const members = [member('p1'), member('p2')]
  const result = computeStats(players, [], members)
  const p1 = result.find(r => r.profile_id === 'p1')
  const p2 = result.find(r => r.profile_id === 'p2')
  expect(p1).toMatchObject({ w: 1, l: 1 })
  expect(p2).toMatchObject({ w: 2, l: 0 })
})
