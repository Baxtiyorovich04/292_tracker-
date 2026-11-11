export const firebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_APP_ID,
)

export const CURRENCIES = [
  { id: 'USD', label: 'USD' },
  { id: 'EUR', label: 'EUR' },
  { id: 'GBP', label: 'GBP' },
  { id: 'CAD', label: 'CAD' },
  { id: 'AUD', label: 'AUD' },
  { id: 'INR', label: 'INR' },
  { id: 'PKR', label: 'PKR' },
  { id: 'JPY', label: 'JPY' },
]

export const CATEGORIES = [
  { id: 'food', label: 'Food', icon: 'utensils' },
  { id: 'tech', label: 'Tech', icon: 'cpu' },
  { id: 'transport', label: 'Transport', icon: 'car' },
  { id: 'entertainment', label: 'Entertainment', icon: 'clapperboard' },
  { id: 'health', label: 'Health', icon: 'heart' },
  { id: 'home', label: 'Home', icon: 'house' },
  { id: 'other', label: 'Other', icon: 'dot' },
]

export const INCOME_CATEGORIES = [
  { id: 'salary', label: 'Salary', icon: 'briefcase' },
  { id: 'freelance', label: 'Freelance', icon: 'pencil' },
  { id: 'gift', label: 'Gift', icon: 'gift' },
  { id: 'refund', label: 'Refund', icon: 'undo' },
  { id: 'invest', label: 'Investment', icon: 'trend' },
  { id: 'other-in', label: 'Other', icon: 'dot' },
]

export const CATEGORY_COLORS = {
  dark: ['#FF5100', '#FF8A4C', '#FFC2A3', '#F4F1EC', '#A7A29C', '#6E6A66', '#3C3A38'],
  light: ['#FF5100', '#C2410C', '#9A3412', '#292524', '#78716C', '#A8A29E', '#D6D3D1'],
}

export const HABIT_ICONS = ['dumbbell', 'book', 'brain', 'sunrise', 'droplets', 'moon', 'target', 'pencil']

export function categoryLabel(id) {
  return [...CATEGORIES, ...INCOME_CATEGORIES].find((category) => category.id === id)?.label || 'Other'
}
