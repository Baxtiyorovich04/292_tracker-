export function clockLabel(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(value || '')
  if (!match) return ''
  const date = new Date()
  date.setHours(Number(match[1]), Number(match[2]), 0, 0)
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
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
