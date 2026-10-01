import Image from 'next/image'
import colorLogo from '../../../public/LOGO.png'
import whiteLogo from '../../../public/Logo_TVSI_Eng.png'
import styles from './BrandLogo.module.css'

export default function BrandLogo({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <span className={`${styles.logo} ${inverse ? styles.inverse : ''} ${compact ? styles.compact : ''}`}>
      <Image src={colorLogo} alt="TVSI — Chứng khoán Tân Việt" className={styles.color} />
      <Image src={whiteLogo} alt="TVSI — Chứng khoán Tân Việt" className={styles.white} />
    </span>
  )
}
