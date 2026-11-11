export const PRACTICE_CREW = [
  { uid: 'crew-amina', displayName: 'Amina Cole', handle: 'amina', score: 91, streak: 46, practice: true },
  { uid: 'crew-leo', displayName: 'Leo Park', handle: 'leo', score: 84, streak: 21, practice: true },
  { uid: 'crew-noah', displayName: 'Noah Idris', handle: 'noah', score: 77, streak: 12, practice: true },
  { uid: 'crew-sable', displayName: 'Sable Quinn', handle: 'sable', score: 68, streak: 9, practice: true },
  { uid: 'crew-jonah', displayName: 'Jonah Reeves', handle: 'jonah', score: 54, streak: 3, practice: true },
]

export function crewBenchmark(dateKey) {
  const average = PRACTICE_CREW.reduce((sum, person) => sum + person.score, 0) / PRACTICE_CREW.length
  let hash = 0
  for (const char of dateKey) hash = (hash * 33 + char.charCodeAt(0)) % 997
  const wave = (hash % 9) - 4
  return Math.max(0, Math.min(100, Math.round(average + wave)))
}
