import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Łączenie klas CSS (shadcn tego wymaga)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatowanie daty po polsku
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const months = [
    'sty', 'lut', 'mar', 'kwi', 'maj', 'cze',
    'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'
  ]
  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${day} ${month} ${year}, ${hours}:${minutes}`
}

// Obcinanie tekstu
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

// Kopiowanie do schowka
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// Plany i limity
export const PLANS = {
  free: {
    name: 'Free',
    credits: 5,
    price: 0,
    description: 'Na start i testowanie',
  },
  starter: {
    name: 'Starter',
    credits: 100,
    price: 99,
    description: 'Dla aktywnych sprzedawców',
  },
  pro: {
    name: 'Pro',
    credits: 999999,
    price: 249,
    description: 'Dla poważnych biznesów',
  },
  scale: {
    name: 'Scale',
    credits: 999999,
    price: 499,
    description: 'Dla zespołów i dużej skali',
  },
} as const
