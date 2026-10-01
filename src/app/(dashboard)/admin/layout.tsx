'use client'
import Link from '@/components/ui/NavigationLink'
import { usePathname } from 'next/navigation'
import styles from './layout.module.css'
const sections = [{ href:'/admin/projects', label:'Dự án' }, { href:'/admin/users', label:'Tài khoản' }, { href:'/admin/assignments', label:'Phân quyền PO' }]
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return <div className={styles.page}><nav className={styles.nav} aria-label="Danh mục quản trị">{sections.map(section => <Link key={section.href} href={section.href} className={pathname === section.href ? styles.active : ''} aria-current={pathname === section.href ? 'page' : undefined}>{section.label}</Link>)}</nav>{children}</div>
}
