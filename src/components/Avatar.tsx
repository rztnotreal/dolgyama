import { initials, inkOn } from '../lib/ledger'

type AvatarProps = {
  name: string
  color: string
  size?: number
  className?: string
}

export function Avatar({ name, color, size = 34, className = '' }: AvatarProps) {
  return (
    <span
      className={`avatar ${className}`.trim()}
      style={{
        width: size,
        height: size,
        background: color,
        color: inkOn(color),
        fontSize: Math.max(9, Math.round(size * 0.34)),
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}
