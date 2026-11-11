import {
  BookOpen,
  Brain,
  Briefcase,
  CalendarDays,
  Car,
  Circle,
  Clapperboard,
  Cpu,
  Droplets,
  Dumbbell,
  Gift,
  Heart,
  House,
  LayoutDashboard,
  Moon,
  Pencil,
  Sunrise,
  Target,
  TrendingUp,
  Trophy,
  Undo2,
  UserRound,
  Utensils,
  Wallet,
} from 'lucide-react'

const ICONS = {
  dumbbell: Dumbbell,
  book: BookOpen,
  brain: Brain,
  sunrise: Sunrise,
  droplets: Droplets,
  moon: Moon,
  target: Target,
  pencil: Pencil,
  briefcase: Briefcase,
  gift: Gift,
  undo: Undo2,
  trend: TrendingUp,
  utensils: Utensils,
  cpu: Cpu,
  car: Car,
  clapperboard: Clapperboard,
  heart: Heart,
  house: House,
  dot: Circle,
}

export function Glyph({ name, size = 18, strokeWidth = 1.75, ...props }) {
  const Icon = ICONS[name] || Target
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" {...props} />
}

export const NAV = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/plan', label: 'Plan', icon: CalendarDays },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
  { to: '/rank', label: 'Rank', icon: Trophy },
  { to: '/you', label: 'You', icon: UserRound },
]
