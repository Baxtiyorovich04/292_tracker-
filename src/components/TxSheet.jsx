import { useEffect, useState } from 'react'
import { CATEGORIES, INCOME_CATEGORIES, categoryLabel } from '../lib/catalog.js'
import { todayKey } from '../lib/dates.js'
import { useStore } from '../context/Store.jsx'
import { Glyph } from './icons.jsx'
import { Sheet } from './ui.jsx'

export function TxSheet({ open, tx, defaultDate, onClose }) {
  const { saveTx, deleteTx } = useStore()
  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState('expense')
  const [category, setCategory] = useState('food')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayKey())
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!open) return
    const openingKind = tx?.kind === 'income' ? 'income' : 'expense'
    const openingChoices = openingKind === 'income' ? INCOME_CATEGORIES : CATEGORIES
    setAmount(tx ? String(tx.amount) : '')
    setKind(openingKind)
    setCategory(openingChoices.some((item) => item.id === tx?.category) ? tx.category : openingChoices[0].id)
    setDescription(tx?.description || '')
    setDate(tx?.date || defaultDate || todayKey())
    setError('')
    setConfirming(false)
  }, [open, tx, defaultDate])

  const choices = kind === 'income' ? INCOME_CATEGORIES : CATEGORIES

  function chooseKind(next) {
    const nextChoices = next === 'income' ? INCOME_CATEGORIES : CATEGORIES
    setKind(next)
    if (!nextChoices.some((item) => item.id === category)) setCategory(nextChoices[0].id)
  }

  function save() {
    const value = Math.round(Number(amount) * 100) / 100
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    if (!date) {
      setError('Pick a date.')
      return
    }
    saveTx({
      id: tx?.id || crypto.randomUUID(),
      amount: value,
      kind,
      category,
      description: description.trim() || categoryLabel(category),
      date,
      createdAt: tx?.createdAt || new Date().toISOString(),
    })
    onClose()
  }

  return (
    <Sheet open={open} title={tx ? 'Edit entry' : kind === 'income' ? 'Add income' : 'Add expense'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-soft p-1">
          {[
            ['expense', 'Expense'],
            ['income', 'Income'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`rounded-xl px-3 py-2 text-sm font-medium ${kind === id ? 'bg-ember text-ink' : 'text-muted'}`}
              onClick={() => chooseKind(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="label">Amount</span>
          <input
            className="field mt-2 font-display text-3xl"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0"
            autoFocus
          />
        </label>
        <div>
          <span className="label">Category</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {choices.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={category === item.id}
                className={`chip inline-flex items-center gap-1.5 ${category === item.id ? 'chip-active' : ''}`}
                onClick={() => setCategory(item.id)}
              >
                <Glyph name={item.icon} size={14} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="label">Description</span>
          <input
            className="field mt-2"
            value={description}
            maxLength={80}
            placeholder={kind === 'income' ? 'Paycheck, client, gift' : 'Lunch, fare, subscription'}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="label">Date</span>
          <input className="field mt-2" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        {error && (
          <p className="text-sm text-ember" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-ember w-full" type="button" onClick={save}>
          Save
        </button>
        {tx && !confirming && (
          <button className="btn btn-line w-full" type="button" onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
        {tx && confirming && (
          <button
            className="btn btn-line w-full"
            type="button"
            onClick={() => {
              deleteTx(tx.id)
              onClose()
            }}
          >
            Confirm delete
          </button>
        )}
      </div>
    </Sheet>
  )
}
