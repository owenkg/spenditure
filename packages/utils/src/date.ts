export function formatDate(date: string | Date, format: 'short' | 'long' | 'relative' = 'short'): string {
  const d = new Date(date);
  if (format === 'relative') {
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
  }
  if (format === 'long') {
    return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return d.toLocaleDateString('en-UG', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function startOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function toISODateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}
