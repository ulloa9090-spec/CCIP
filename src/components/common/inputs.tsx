import { useEffect, useState } from 'react'
import { fromDollars, toDollars, type Money } from '../../engine/money'

const baseInputClass =
  'w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block text-sm">
    <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
    {children}
  </label>
)

/** Dollar-denominated input; stores/emits Money (integer cents) but displays dollars. */
export const MoneyInput = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: Money
  onChange: (value: Money) => void
  placeholder?: string
}) => {
  const [text, setText] = useState(toDollars(value).toString())

  useEffect(() => {
    setText(toDollars(value).toString())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <Field label={label}>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">$</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          className={`${baseInputClass} pl-6`}
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            const parsed = Number.parseFloat(text)
            onChange(fromDollars(Number.isFinite(parsed) ? parsed : 0))
          }}
        />
      </div>
    </Field>
  )
}

/** Percent input; displays 0-100, stores/emits a 0-1 fraction. */
export const PercentInput = ({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) => {
  const [text, setText] = useState((value * 100).toString())

  useEffect(() => {
    setText((value * 100).toString())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <Field label={label}>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          className={`${baseInputClass} pr-7`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            const parsed = Number.parseFloat(text)
            const clamped = Math.min(100, Math.max(0, Number.isFinite(parsed) ? parsed : 0))
            onChange(clamped / 100)
          }}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">%</span>
      </div>
    </Field>
  )
}

/** Like PercentInput, but allows negative values (for what-if deltas: -10% to +10%). */
export const SignedPercentInput = ({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) => {
  const [text, setText] = useState((value * 100).toString())

  useEffect(() => {
    setText((value * 100).toString())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <Field label={label}>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          className={`${baseInputClass} pr-7`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            const parsed = Number.parseFloat(text)
            onChange((Number.isFinite(parsed) ? parsed : 0) / 100)
          }}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">%</span>
      </div>
    </Field>
  )
}

export const NumberField = ({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
}) => {
  const [text, setText] = useState(value.toString())

  useEffect(() => {
    setText(value.toString())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <Field label={label}>
      <input
        type="number"
        inputMode="numeric"
        step="1"
        min={min}
        className={baseInputClass}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const parsed = Number.parseInt(text, 10)
          onChange(Number.isFinite(parsed) ? Math.max(min, parsed) : min)
        }}
      />
    </Field>
  )
}

export const TextField = ({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) => (
  <Field label={label}>
    <input type="text" className={baseInputClass} value={value} onChange={(e) => onChange(e.target.value)} />
  </Field>
)

export const SelectField = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) => (
  <Field label={label}>
    <select className={baseInputClass} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </Field>
)
