interface Props {
  label: string
  value: string | number
  color?: string
  icon?: string
}

export function StatCard({ label, value, color = 'blue', icon }: Props) {
  return (
    <div className="rounded-2xl bg-[#161b22] border border-[#30363d] p-5">
      {icon && <div className="text-2xl mb-2">{icon}</div>}
      <p className="text-gray-400 text-sm">{label}</p>
      <p className={`text-3xl font-bold mt-1 text-${color}-400`}>{value}</p>
    </div>
  )
}
