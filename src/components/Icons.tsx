import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const stroke = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
} as const

export function IconPlus(props: IconProps) {
  return (
    <svg {...stroke} width="20" height="20" {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconReturn(props: IconProps) {
  return (
    <svg {...stroke} width="20" height="20" {...props}>
      <path d="M19 7v4a4 4 0 0 1-4 4H5" />
      <path d="m9 11-4 4 4 4" />
    </svg>
  )
}

export function IconPencil(props: IconProps) {
  return (
    <svg {...stroke} width="18" height="18" {...props}>
      <path d="m15.5 4.5 4 4L8 20H4v-4L15.5 4.5Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  )
}

export function IconTrash(props: IconProps) {
  return (
    <svg {...stroke} width="18" height="18" {...props}>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

export function IconX(props: IconProps) {
  return (
    <svg {...stroke} width="18" height="18" {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...stroke} width="18" height="18" {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  )
}

export function IconUndo(props: IconProps) {
  return (
    <svg {...stroke} width="16" height="16" {...props}>
      <path d="M9 8H5V4" />
      <path d="M5.5 8.5a8 8 0 1 1-1 5" />
    </svg>
  )
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...stroke} width="18" height="18" {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  )
}

export function IconAlert(props: IconProps) {
  return (
    <svg {...stroke} width="18" height="18" {...props}>
      <path d="M12 4 3.5 19h17L12 4Z" />
      <path d="M12 10v4M12 16.5v.5" />
    </svg>
  )
}

export function PitGlyph(props: IconProps) {
  return (
    <svg
      viewBox="0 0 28 28"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden
      focusable="false"
      {...props}
    >
      <ellipse cx="14" cy="7.5" rx="10.5" ry="3.8" />
      <ellipse cx="14" cy="11.2" rx="8" ry="2.9" opacity=".72" />
      <ellipse cx="14" cy="14.7" rx="5.7" ry="2.1" opacity=".52" />
      <ellipse cx="14" cy="17.9" rx="3.5" ry="1.3" opacity=".34" />
      <ellipse cx="14" cy="20.6" rx="1.4" ry="0.7" fill="currentColor" stroke="none" />
    </svg>
  )
}
