import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IconChevronDown, IconCheck, IconEye, IconEyeOff } from './icons'
import './fields.css'

const spring = { type: 'spring' as const, stiffness: 600, damping: 34 }

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | null
  hint?: string
  /** trailing element inside the field (e.g. reveal button) */
  suffix?: ReactNode
  /** monospaced content (addresses, patterns) */
  mono?: boolean
}

/** M3E filled-style text field with floating label, tuned for glass surfaces */
export function TextField({ label, error, hint, suffix, className, value, mono, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false)
  const filled = value !== undefined && String(value).length > 0
  const floated = focused || filled
  return (
    <div className={`tf ${className ?? ''}`}>
      <div className={`tf-box ${focused ? 'tf-focused' : ''} ${error ? 'tf-error' : ''}`}>
        <label className={`tf-label ${floated ? 'tf-floated' : ''}`}>{label}</label>
        <input
          className={mono ? 'mono' : undefined}
          {...rest}
          value={value}
          onFocus={(e) => {
            setFocused(true)
            rest.onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            rest.onBlur?.(e)
          }}
        />
        {suffix && <div className="tf-suffix">{suffix}</div>}
      </div>
      <AnimatePresence>
        {(error || hint) && (
          <motion.div
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            className={`tf-sub ${error ? 'tf-sub-error' : 'dim'}`}
          >
            {error || hint}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: Array<{ value: string; label: string }>
}

export function Select({ label, options, className, ...rest }: SelectProps) {
  return (
    <div className={`tf ${className ?? ''}`}>
      <div className="tf-box select-box">
        <label className="tf-label tf-floated">{label}</label>
        <select {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <IconChevronDown className="select-caret" size={18} />
      </div>
    </div>
  )
}

interface SwitchProps {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}

/** M3 switch — expressive handle squish */
export function Switch({ checked, onChange, disabled }: SwitchProps) {
  return (
    <button
      className={`switch ${checked ? 'switch-on' : ''} ${disabled ? 'switch-disabled' : ''}`}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <motion.span
        className="switch-handle"
        animate={{ width: checked ? 22 : 14, x: checked ? 20 : 2 }}
        transition={spring}
      />
    </button>
  )
}

interface CheckboxProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}

export function Checkbox({ checked, onChange, label }: CheckboxProps) {
  return (
    <button className="checkbox-row" onClick={() => onChange(!checked)}>
      <motion.span className={`checkbox ${checked ? 'checkbox-on' : ''}`} transition={spring} whileTap={{ scale: 0.85 }}>
        <AnimatePresence>
          {checked && (
            <motion.span initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
              <IconCheck size={14} strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
      {label && <span>{label}</span>}
    </button>
  )
}

interface SegmentedProps<T extends string> {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
}

/** M3E segmented buttons with a springing selection pill */
export function Segmented<T extends string>({ value, options, onChange }: SegmentedProps<T>) {
  const id = useRef(`seg-${Math.random().toString(36).slice(2)}`).current
  return (
    <div className="segmented">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button key={o.value} className={`segment ${active ? 'segment-active' : ''}`} onClick={() => onChange(o.value)}>
            {active && <motion.span layoutId={id} className="segment-pill" transition={spring} />}
            <span className="segment-text">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

interface CharsetTextProps {
  value: string
  onChange: (v: string) => void
}

/** small mono field for editing the symbol pool */
export function SymbolSetField({ value, onChange }: CharsetTextProps) {
  const [local, setLocal] = useState(value)
  useEffect(() => setLocal(value), [value])
  return (
    <input
      className="symbol-set mono"
      value={local}
      onChange={(e) => {
        setLocal(e.target.value)
        onChange(e.target.value)
      }}
      spellCheck={false}
      aria-label="symbol set"
    />
  )
}

export function PasswordReveal(value: boolean, onToggle: () => void) {
  return (
    <button type="button" className="icon-btn" onClick={onToggle} tabIndex={-1} aria-label="toggle visibility">
      {value ? <IconEyeOff size={18} /> : <IconEye size={18} />}
    </button>
  )
}
