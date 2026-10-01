'use client'

import Link, { useLinkStatus } from 'next/link'
import type { ComponentProps } from 'react'
import styles from './NavigationLink.module.css'

function PendingCue() {
  const { pending } = useLinkStatus()
  return <span className={styles.cue} data-pending={pending} aria-hidden="true" />
}

// Use full route prefetch for the small, frequently used navigation menus.
// Page data still loads with the caller's RLS permissions after navigation.
export default function NavigationLink({ children, className = '', ...props }: ComponentProps<typeof Link>) {
  return <Link prefetch={true} {...props} className={`${className} ${styles.link}`}>
    {children}<PendingCue />
  </Link>
}
