import styles from './loading.module.css'

export default function Loading() {
  return <div className={styles.loading} role="status" aria-label="Đang mở mục" aria-busy="true">
    <div className={styles.eyebrow} />
    <div className={styles.heading} />
    <div className={styles.description} />
    <div className={styles.toolbar}><span /><span /><span /></div>
    <div className={styles.rows}>{[0, 1, 2, 3].map(row => <div key={row}><span /><span /><span /></div>)}</div>
  </div>
}
