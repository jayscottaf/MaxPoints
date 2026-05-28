'use client'

import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { CreditCard, TrendingUp, Calendar } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface SummaryOverviewProps {
  totalAnnualFees: number
  totalPerksValue: number
  totalUsed: number
}

export function SummaryOverview({ totalAnnualFees, totalPerksValue, totalUsed }: SummaryOverviewProps) {
  const netCost = totalAnnualFees - totalUsed
  const feesCovered = netCost <= 0
  // How much of the fees you've already earned back via perks used.
  const coveragePercent = totalAnnualFees > 0 ? Math.round((totalUsed / totalAnnualFees) * 100) : 0
  const gaugePercent = Math.min(coveragePercent, 100)
  // How much of the total available perk value you've actually captured.
  const capturePercent = totalPerksValue > 0 ? Math.round((totalUsed / totalPerksValue) * 100) : 0

  const gaugeColor = feesCovered ? '#34d399' : '#3b82f6'
  const data = [{ name: 'coverage', value: gaugePercent, fill: gaugeColor }]

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-zinc-800 bg-[#1a1b23] shadow-lg shadow-black/20">
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[auto_1fr] lg:gap-10">
        {/* Radial gauge: fee coverage */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative h-44 w-44">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="74%"
                outerRadius="100%"
                data={data}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background={{ fill: '#27272a' }} dataKey="value" cornerRadius={999} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${feesCovered ? 'text-emerald-400' : 'text-white'}`}>
                {coveragePercent}%
              </span>
              <span className="text-xs text-zinc-400">of fees earned back</span>
            </div>
          </div>
          <p className={`mt-2 text-sm font-medium ${feesCovered ? 'text-emerald-400' : 'text-zinc-300'}`}>
            {feesCovered
              ? `Net positive by ${formatCurrency(Math.abs(netCost))}`
              : `${formatCurrency(netCost)} to break even`}
          </p>
        </div>

        {/* Key figures */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-zinc-800 sm:grid-cols-2">
          <Stat
            label="Total Annual Fees"
            value={formatCurrency(totalAnnualFees)}
            valueClass="text-white"
            icon={<CreditCard className="h-5 w-5 text-zinc-500" />}
          />
          <Stat
            label="Total Perks Value"
            value={formatCurrency(totalPerksValue)}
            valueClass="text-blue-400"
            icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
          />
          <Stat
            label="Used to Date"
            value={formatCurrency(totalUsed)}
            valueClass="text-emerald-400"
            icon={<Calendar className="h-5 w-5 text-emerald-500" />}
            footer={`${capturePercent}% of available value captured`}
          />
          <Stat
            label="Net Cost"
            value={formatCurrency(netCost)}
            valueClass={netCost <= 0 ? 'text-emerald-400' : 'text-red-400'}
            icon={
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                  netCost <= 0 ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'
                }`}
              >
                {netCost <= 0 ? '+' : '-'}
              </span>
            }
          />
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  valueClass,
  icon,
  footer,
}: {
  label: string
  value: string
  valueClass: string
  icon: React.ReactNode
  footer?: string
}) {
  return (
    <div className="bg-[#1a1b23] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-400">{label}</p>
          <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
        </div>
        {icon}
      </div>
      {footer && <p className="mt-2 text-xs text-zinc-400">{footer}</p>}
    </div>
  )
}
