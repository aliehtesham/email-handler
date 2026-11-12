import { ButtonHTMLAttributes, ReactNode } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import './Button.css'

const spring = { type: 'spring' as const, stiffness: 640, damping: 32, mass: 0.9 }

type Variant = 'filled' | 'tonal' | 'outlined' | 'text' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: ReactNode
  large?: boolean
  loading?: boolean
}

/** M3E button — pill shape that morphs toward rounded-corner while pressed */
export function Button({ variant = 'filled', icon, large, loading, children, className, ...rest }: ButtonProps) {
  return (
    <motion.button
      {...(rest as HTMLMotionProps<'button'>)}
      whileTap={rest.disabled ? undefined : { scale: 0.955, borderRadius: '18px' }}
      whileHover={rest.disabled ? undefined : { scale: 1.015 }}
      transition={spring}
      className={`btn btn-${variant} ${large ? 'btn-lg' : ''} ${className ?? ''}`}
    >
      {loading ? <span className="btn-spinner" aria-label="loading" /> : icon}
      {children}
    </motion.button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'standard' | 'tonal' | 'outlined' | 'danger'
  active?: boolean
}

export function IconButton({ variant = 'standard', active, className, ...rest }: IconButtonProps) {
  return (
    <motion.button
      {...(rest as HTMLMotionProps<'button'>)}
      whileTap={rest.disabled ? undefined : { scale: 0.9 }}
      transition={spring}
      className={`icon-btn icon-btn-${variant} ${active ? 'icon-btn-active' : ''} ${className ?? ''}`}
    />
  )
}

interface FabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label?: string
  extended?: boolean
}

export function Fab({ icon, label, extended, className, ...rest }: FabProps) {
  return (
    <motion.button
      {...(rest as HTMLMotionProps<'button'>)}
      whileTap={rest.disabled ? undefined : { scale: 0.93, borderRadius: '24px' }}
      whileHover={{ scale: 1.04, y: -1 }}
      transition={spring}
      className={`fab ${extended ? 'fab-extended' : ''} ${className ?? ''}`}
    >
      {icon}
      {extended && label ? <span>{label}</span> : null}
    </motion.button>
  )
}
