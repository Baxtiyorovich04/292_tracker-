import { todayKey } from './dates.js'
import { withHistory } from './metrics.js'

function habit(title, icon, days) {
  return {
    id: crypto.randomUUID(),
    title,
    note: '',
    type: 'main',
    icon,
    days,
    due: '',
    createdOn: todayKey(),
    completedDates: [],
  }
}

export function starterState() {
  const today = todayKey()
  return withHistory({
    version: 1,
    updatedAt: Date.now(),
    profile: {
      displayName: '',
      currency: 'USD',
      cash: 0,
      cashSet: false,
      seenIntro: false,
      handle: '',
      friendIds: [],
    },
    habits: [
      habit('Train', 'dumbbell', [1, 2, 3, 4, 5, 6]),
      habit('Deep work', 'brain', [1, 2, 3, 4, 5]),
      habit('Read', 'book', [0, 1, 2, 3, 4, 5, 6]),
      {
        id: crypto.randomUUID(),
        title: "Set tomorrow's plan",
        note: '',
        type: 'side',
        icon: 'target',
        days: [],
        due: today,
        createdOn: today,
        completedDates: [],
      },
    ],
    transactions: [],
    history: [],
  })
}
