export function editionStatus(date: string): 'upcoming' | 'active' | 'completed' {
  if (!date) return 'upcoming'
  const today = new Date().toISOString().split('T')[0]
  if (date > today) return 'upcoming'
  if (date === today) return 'active'
  return 'completed'
}
