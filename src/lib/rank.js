// 摸鱼段位：按摸鱼占工时比 ratio = fishMin / (workMin + fishMin)
export const RANKS = [
  { max: 0.05, name: '青铜鱼', emoji: '🥉', color: 'var(--rank-bronze)' },
  { max: 0.15, name: '白银鱼', emoji: '🥈', color: 'var(--rank-silver)' },
  { max: 0.3, name: '老油条', emoji: '🍟', color: 'var(--rank-gold)' },
  { max: 0.6, name: '深海巨鲸', emoji: '🐋', color: 'var(--rank-whale)' },
  { max: Infinity, name: '公司是我家', emoji: '🏠', color: 'var(--rank-home)' },
]

export function getRank(workMin, fishMin) {
  const total = workMin + fishMin
  if (total <= 0) {
    return { name: '段位待定', emoji: '❓', color: 'var(--rank-tbd)', ratio: 0 }
  }
  const ratio = fishMin / total
  for (const r of RANKS) {
    if (ratio < r.max) return { ...r, ratio }
  }
  return { ...RANKS[RANKS.length - 1], ratio }
}
