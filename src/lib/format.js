export function clockLabel(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(value || '')
  if (!match) return ''
  const date = new Date()
  date.setHours(Number(match[1]), Number(match[2]), 0, 0)
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function cleanedAmount(input) {
  return String(input ?? '')
    .trim()
    .replace(/[\s\u00a0\u202f]/g, '')
    .replace(/^\+/, '')
    .replace(/[^\d.,]/g, '')
}

export function parseAmount(input) {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return NaN
    return Math.round(input * 100) / 100
  }
  const cleaned = cleanedAmount(input)
  if (!cleaned) return NaN

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  let normalized = cleaned

  if (lastComma !== -1 && lastDot !== -1) {
    normalized = lastComma > lastDot
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '')
  } else if (lastComma !== -1 || lastDot !== -1) {
    const parts = cleaned.split(lastComma !== -1 ? ',' : '.')
    const thousands = parts.every((part, index) => part.length > 0 && (index === 0 ? part.length <= 3 : part.length === 3))
    if (thousands) {
      normalized = parts.join('')
    } else {
      const head = parts[0]
      const fraction = parts.slice(1).join('')
      if (!head && !fraction) return NaN
      normalized = fraction ? `${head || '0'}.${fraction}` : head
    }
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) return NaN
  const value = Number(normalized)
  if (!Number.isFinite(value)) return NaN
  return Math.round(value * 100) / 100
}

export function amountDraft(value) {
  const raw = String(value ?? '')
  if (raw.trim() === '') return ''
  const cleaned = cleanedAmount(raw)
  if (!cleaned) return ''

  const separators = cleaned.match(/[.,]/g) || []
  if (separators.length > 1) {
    const parsed = parseAmount(cleaned)
    return Number.isFinite(parsed) ? String(parsed) : null
  }

  const sepAt = cleaned.search(/[.,]/)
  if (sepAt === -1) return /^\d+$/.test(cleaned) ? cleaned : null
  const head = cleaned.slice(0, sepAt)
  const fraction = cleaned.slice(sepAt + 1).slice(0, 2)
  if (!/^\d*$/.test(head)) return null
  return `${head}${cleaned[sepAt]}${fraction}`
}

export function money(amount, currency = 'USD') {
  const value = Number(amount) || 0
  const digits = Number.isInteger(value) ? 0 : 2
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value)
  } catch {
    return `${currency} ${value.toFixed(digits)}`
  }
}
