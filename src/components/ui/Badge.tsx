type Variant = 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'gray'

interface Props {
  label: string
  variant: Variant
}

const styles: Record<Variant, string> = {
  green:  'bg-green-500/15 text-green-400 border-green-500/30',
  red:    'bg-red-500/15 text-red-400 border-red-500/30',
  amber:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
  blue:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
  purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  gray:   'bg-gray-500/15 text-gray-400 border-gray-500/30',
}

export function Badge({ label, variant }: Props) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[variant]}`}>
      {label}
    </span>
  )
}
