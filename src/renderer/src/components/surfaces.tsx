import { CSSProperties, ReactNode } from 'react'
import { motion } from 'framer-motion'
import './surfaces.css'

/** glass card with expressive radius */
export function Card({
  children,
  className,
  onClick,
  style
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  style?: CSSProperties
}) {
  return (
    <div className={`card glass ${onClick ? 'card-click' : ''} ${className ?? ''}`} onClick={onClick} style={style}>
      {children}
    </div>
  )
}

export function Chip({
  children,
  selected,
  onClick,
  tone = 'neutral'
}: {
  children: ReactNode
  selected?: boolean
  onClick?: () => void
  tone?: 'neutral' | 'primary' | 'error'
}) {
  return (
    <span
      className={`chip chip-${tone} ${selected ? 'chip-selected' : ''} ${onClick ? 'chip-click' : ''}`}
      onClick={onClick}
    >
      {children}
    </span>
  )
}

export function ProgressBar({ value, indeterminate }: { value?: number; indeterminate?: boolean }) {
  if (indeterminate) {
    return (
      <div className="pbar">
        <div className="pbar-fill pbar-indeterminate" />
      </div>
    )
  }
  const pct = Math.max(0, Math.min(100, value ?? 0))
  return (
    <div className="pbar">
      <motion.div
        className="pbar-fill"
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 160, damping: 26 }}
      />
    </div>
  )
}

export function Spinner({ size = 22 }: { size?: number }) {
  return <span className="spinner" style={{ width: size, height: size }} />
}

/** tonal avatar with the first letter of an address — color-cycled per name */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const letter = (name.trim()[0] ?? '?').toUpperCase()
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  const tone = Math.abs(hash) % 6
  return (
    <div
      className={`avatar avatar-${tone}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42
      }}
    >
      {letter}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  body,
  action
}: {
  icon: ReactNode
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {body && <p className="dim">{body}</p>}
      {action}
    </div>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {right}
    </div>
  )
}
