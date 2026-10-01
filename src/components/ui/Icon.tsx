import type { CSSProperties } from 'react'

const paths = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  ticket: 'M4 4h16v5a3 3 0 0 0 0 6v5H4v-5a3 3 0 0 0 0-6z M15 4v3m0 3v4m0 3v3',
  book: 'M12 5v16 M12 5C8 2 4 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-2-1-6-2-10 1z',
  mail: 'M3 5h18v14H3z M3 6l9 7 9-7',
  settings: 'M4 7h9m4 0h3 M4 17h3m4 0h9 M13 4v6 M7 14v6',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0z',
  user: 'M20 21v-2a7 7 0 0 0-14 0v2 M16 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0z',
  folder: 'M3 7V4h6l2 3h10v13H3z',
  search: 'M21 21l-5-5 M18 10a8 8 0 1 0-16 0 8 8 0 0 0 16 0z',
  plus: 'M12 5v14 M5 12h14',
  close: 'M6 6l12 12 M6 18L18 6',
  check: 'M5 12l4 4L19 6',
  circleCheck: 'M9 12l2 2 4-4 M22 12a10 10 0 1 0-20 0 10 10 0 0 0 20 0z',
  clock: 'M12 6v6l4 2 M22 12a10 10 0 1 0-20 0 10 10 0 0 0 20 0z',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  arrowRight: 'M4 12h16 M14 6l6 6-6 6',
  arrowLeft: 'M20 12H4 M10 6l-6 6 6 6',
  external: 'M14 3h7v7 M10 14L21 3 M21 14v7H3V3h7',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  sun: 'M12 2v2m0 16v2 M2 12h2m16 0h2 M5 5l1.5 1.5m11 11L19 19 M5 19l1.5-1.5m11-11L19 5 M16 12a4 4 0 1 0-8 0 4 4 0 0 0 8 0z',
  moon: 'M21 13a9 9 0 0 1-10-10A9 9 0 1 0 21 13z',
  logout: 'M9 21H3V3h6 M10 12h11 M16 7l5 5-5 5',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M9 12l2 2 4-4',
  lock: 'M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4 M12 14v3',
  sparkles: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z M20 2v4m-2-2h4',
  warning: 'M12 3L2 21h20z M12 9v5 M12 17v.1',
  info: 'M12 11v6 M12 7v.1 M22 12a10 10 0 1 0-20 0 10 10 0 0 0 20 0z',
  upload: 'M12 16V3 M7 8l5-5 5 5 M3 16v5h18v-5',
  download: 'M12 3v13 M7 11l5 5 5-5 M3 16v5h18v-5',
  file: 'M14 2H4v20h16V8z M14 2v6h6 M8 13h8 M8 17h6',
  edit: 'M16 3l5 5L9 20l-6 1 1-6z M14 5l5 5',
  trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  send: 'M22 2L9 15 M22 2l-8 20-5-7-7-5z',
  image: 'M3 3h18v18H3z M3 17l6-6 4 4 3-3 5 5 M8 7h.1',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z M15 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0z',
  refresh: 'M20 7a9 9 0 0 0-15-2L2 8 M2 2v6h6 M4 17a9 9 0 0 0 15 2l3-3 M22 22v-6h-6',
  chart: 'M3 3v18h18 M7 15l4-5 4 3 6-8',
} as const

export type IconName = keyof typeof paths

export default function Icon({ name, size = 20, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className} style={{ flexShrink: 0, verticalAlign: 'middle', ...style }}><path d={paths[name]} /></svg>
}
