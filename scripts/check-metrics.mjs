import assert from 'node:assert/strict'
import {
  balanceSeries,
  flowSeries,
  cashBalance,
  currentStreak,
  dayHeat,
  disciplineScore,
  habitStreak,
  monthSpent,
} from '../src/lib/metrics.js'

const everyDay = [0, 1, 2, 3, 4, 5, 6]

function datesBetween(start, end) {
  const dates = []
  let cursor = start
  while (cursor <= end) {
    dates.push(cursor)
    const [year, month, day] = cursor.split('-').map(Number)
    const date = new Date(year, month - 1, day + 1)
    cursor = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  return dates
}

function mainHabit(partial) {
  return {
    id: 'h',
    title: 'Train',
    type: 'main',
    days: everyDay,
    createdOn: '2026-10-29',
    completedDates: [],
    ...partial,
  }
}

const windowDates = datesBetween('2026-10-29', '2026-11-11')
assert.equal(windowDates.length, 14)

const perfect = mainHabit({ completedDates: windowDates })
assert.equal(disciplineScore([perfect], '2026-11-11').score, 100)
assert.equal(currentStreak([perfect], '2026-11-11'), 14)

const empty = mainHabit({ completedDates: [] })
assert.equal(disciplineScore([empty], '2026-11-11').score, 0)
assert.equal(currentStreak([empty], '2026-11-11'), 0)

const halfDates = windowDates.filter((_, index) => index % 2 === 0)
assert.equal(disciplineScore([mainHabit({ completedDates: halfDates })], '2026-11-11').score, 45)

const quests = [0, 1].map((index) => ({
  id: `q${index}`,
  title: 'Quest',
  type: 'side',
  due: '2026-11-0' + (index + 1),
  createdOn: '2026-10-29',
  completedDates: ['2026-11-0' + (index + 1)],
}))
assert.equal(disciplineScore([mainHabit({ completedDates: halfDates }), ...quests], '2026-11-11').score, 51)
assert.equal(disciplineScore([mainHabit({ completedDates: windowDates }), ...quests], '2026-11-11').score, 100)

const held = mainHabit({ completedDates: datesBetween('2026-10-29', '2026-11-10') })
assert.equal(currentStreak([held], '2026-11-11'), 13)

const broken = mainHabit({ completedDates: datesBetween('2026-10-29', '2026-11-09') })
assert.equal(currentStreak([broken], '2026-11-11'), 0)

const mondays = mainHabit({
  days: [1],
  createdOn: '2026-11-02',
  completedDates: ['2026-11-02', '2026-11-09'],
})
assert.equal(habitStreak(mondays, '2026-11-11'), 2)
assert.equal(currentStreak([mondays], '2026-11-11'), 2)

const questOnly = {
  id: 'quest',
  title: 'Plan',
  type: 'side',
  due: '2026-11-11',
  createdOn: '2026-11-11',
  completedDates: ['2026-11-11'],
}
assert.equal(disciplineScore([questOnly], '2026-11-11').score, 20)

const monthOnly = mainHabit({ completedDates: datesBetween('2026-11-01', '2026-11-11') })
assert.equal(disciplineScore([monthOnly], '2026-11-11').score, 100)

const todayOnly = mainHabit({
  createdOn: '2026-11-01',
  completedDates: ['2026-11-11'],
})
assert.equal(disciplineScore([todayOnly], '2026-11-11').score, 9)

assert.deepEqual(
  cashBalance([
    { amount: 100, kind: 'income', date: '2026-10-02' },
    { amount: 12.5, kind: 'expense', date: '2026-11-02' },
    { amount: 40, kind: 'income', date: '2026-11-03' },
  ]),
  { balance: 127.5, income: 140, spent: 12.5, cash: 0 },
)

assert.equal(dayHeat([perfect], '2026-11-11').level, 1)
assert.equal(dayHeat([perfect, mainHabit({ id: 'b' }), mainHabit({ id: 'c' })], '2026-11-10').level, 1)
assert.equal(
  dayHeat(
    [0, 1, 2, 3].map((id) => mainHabit({ id: String(id), completedDates: ['2026-11-11'] })),
    '2026-11-11',
  ).level,
  4,
)
assert.equal(dayHeat([], '2026-11-11').level, -1)

assert.deepEqual(
  balanceSeries(
    [
      { amount: 100, kind: 'income', date: '2026-11-02', createdAt: 'a', description: 'Pay' },
      { amount: 40, kind: 'expense', date: '2026-11-02', createdAt: 'b', description: 'Food' },
      { amount: 10, kind: 'income', date: '2026-11-05', createdAt: 'c', description: 'Gift' },
    ],
    '2026-11-11',
  ).map((point) => [point.kind, point.balance]),
  [
    ['start', 0],
    ['income', 100],
    ['expense', 60],
    ['income', 70],
    ['now', 70],
  ],
)

assert.deepEqual(
  balanceSeries(
    [{ amount: 40, kind: 'expense', date: '2026-11-02', createdAt: 'b', description: 'Food' }],
    '2026-11-11',
    3000,
  ).map((point) => [point.kind, point.balance]),
  [
    ['start', 3000],
    ['expense', 2960],
    ['now', 2960],
  ],
)
assert.equal(cashBalance([{ amount: 25, kind: 'expense' }], 3000).balance, 2975)

const flowItems = [
  { amount: 100, kind: 'income', date: '2026-11-02', createdAt: 'a', description: 'Pay' },
  { amount: 40, kind: 'expense', date: '2026-11-02', createdAt: 'b', description: 'Food' },
  { amount: 10, kind: 'income', date: '2026-11-05', createdAt: 'c', description: 'Gift' },
]
assert.deepEqual(
  flowSeries(flowItems, 'income', '2026-11-11').map((point) => [point.name, point.total]),
  [
    ['Start', 0],
    ['Pay', 100],
    ['Gift', 110],
    ['Now', 110],
  ],
)
assert.deepEqual(
  flowSeries(flowItems, 'expense', '2026-11-11').map((point) => [point.name, point.total]),
  [
    ['Start', 0],
    ['Food', 40],
    ['Now', 40],
  ],
)

assert.equal(
  monthSpent(
    [
      { amount: 12.5, kind: 'expense', date: '2026-11-02' },
      { amount: 40, kind: 'income', date: '2026-11-03' },
      { amount: 7, kind: 'expense', date: '2026-10-30' },
    ],
    '2026-11-11',
  ),
  12.5,
)

console.log('metrics ok')
