'use client'

import { useState, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { LeaveIndicator } from '@/components/ui/leave-indicator'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { CategoryScores } from '@/lib/scoring-utils'

export interface LegislatorWithScores {
  id: string
  nameCh: string
  nameEn: string | null
  party: string
  region: string | null
  picUrl: string | null
  leaveFlag: string | null
  leaveDate: string | null
  leaveReason: string | null
  lastWeekScores: CategoryScores
  averageScores: CategoryScores
}

interface LegislatorsListProps {
  legislators: LegislatorWithScores[]
  onLegislatorClick: (legislator: LegislatorWithScores) => void
  onActionClick?: (legislator: LegislatorWithScores, e: React.MouseEvent) => void
  actionLabel?: string
  showActions?: boolean
}

type SortColumn =
  | 'name'
  | 'party'
  | 'lwPropose'
  | 'lwCosign'
  | 'lwFloor'
  | 'lwTotal'
  | 'avgPropose'
  | 'avgCosign'
  | 'avgFloor'
  | 'avgTotal'

type SortDirection = 'asc' | 'desc'

export default function LegislatorsList({
  legislators,
  onLegislatorClick,
  onActionClick,
  actionLabel = 'Add',
  showActions = true
}: LegislatorsListProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('lwTotal')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to descending for scores, ascending for text
      setSortColumn(column)
      setSortDirection(column === 'name' || column === 'party' ? 'asc' : 'desc')
    }
  }

  const sortedLegislators = useMemo(() => {
    const sorted = [...legislators].sort((a, b) => {
      let aValue: number | string
      let bValue: number | string

      switch (sortColumn) {
        case 'name':
          aValue = a.nameCh
          bValue = b.nameCh
          break
        case 'party':
          aValue = a.party
          bValue = b.party
          break
        case 'lwPropose':
          aValue = a.lastWeekScores.PROPOSE_BILL
          bValue = b.lastWeekScores.PROPOSE_BILL
          break
        case 'lwCosign':
          aValue = a.lastWeekScores.COSIGN_BILL
          bValue = b.lastWeekScores.COSIGN_BILL
          break
        case 'lwFloor':
          aValue = a.lastWeekScores.FLOOR_SPEECH
          bValue = b.lastWeekScores.FLOOR_SPEECH
          break
        case 'lwTotal':
          aValue = a.lastWeekScores.total
          bValue = b.lastWeekScores.total
          break
        case 'avgPropose':
          aValue = a.averageScores.PROPOSE_BILL
          bValue = b.averageScores.PROPOSE_BILL
          break
        case 'avgCosign':
          aValue = a.averageScores.COSIGN_BILL
          bValue = b.averageScores.COSIGN_BILL
          break
        case 'avgFloor':
          aValue = a.averageScores.FLOOR_SPEECH
          bValue = b.averageScores.FLOOR_SPEECH
          break
        case 'avgTotal':
          aValue = a.averageScores.total
          bValue = b.averageScores.total
          break
        default:
          aValue = 0
          bValue = 0
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })

    return sorted
  }, [legislators, sortColumn, sortDirection])

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-1 h-4 w-4 opacity-40" />
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="ml-1 h-4 w-4" />
      : <ArrowDown className="ml-1 h-4 w-4" />
  }

  const SortableHeader = ({ column, children, align = 'left' }: {
    column: SortColumn
    children: React.ReactNode
    align?: 'left' | 'center' | 'right'
  }) => (
    <TableHead
      className={`cursor-pointer hover:bg-slate-50 select-none ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''}`}
      onClick={() => handleSort(column)}
    >
      <div className={`flex items-center ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        {children}
        <SortIcon column={column} />
      </div>
    </TableHead>
  )

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Photo</TableHead>
            <SortableHeader column="name">Name</SortableHeader>
            <SortableHeader column="party">Party</SortableHeader>
            <TableHead colSpan={4} className="text-center bg-blue-50 border-x">Last Week</TableHead>
            <TableHead colSpan={4} className="text-center bg-green-50 border-x">Average</TableHead>
            {showActions && <TableHead className="w-24">Actions</TableHead>}
          </TableRow>
          <TableRow>
            <TableHead></TableHead>
            <TableHead></TableHead>
            <TableHead></TableHead>
            <SortableHeader column="lwPropose" align="right">Propose</SortableHeader>
            <SortableHeader column="lwCosign" align="right">Cosign</SortableHeader>
            <SortableHeader column="lwFloor" align="right">Floor</SortableHeader>
            <SortableHeader column="lwTotal" align="right">Total</SortableHeader>
            <SortableHeader column="avgPropose" align="right">Propose</SortableHeader>
            <SortableHeader column="avgCosign" align="right">Cosign</SortableHeader>
            <SortableHeader column="avgFloor" align="right">Floor</SortableHeader>
            <SortableHeader column="avgTotal" align="right">Total</SortableHeader>
            {showActions && <TableHead></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedLegislators.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 12 : 11} className="text-center py-10 text-slate-500">
                No legislators found
              </TableCell>
            </TableRow>
          ) : (
            sortedLegislators.map(legislator => (
              <TableRow
                key={legislator.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => onLegislatorClick(legislator)}
              >
                <TableCell>
                  {legislator.picUrl ? (
                    <img
                      src={legislator.picUrl}
                      alt={legislator.nameCh}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-sm">
                      {legislator.nameCh.charAt(0)}
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {legislator.nameCh}
                    <LeaveIndicator
                      leaveFlag={legislator.leaveFlag}
                      leaveDate={legislator.leaveDate}
                      leaveReason={legislator.leaveReason}
                    />
                  </div>
                </TableCell>
                <TableCell>{legislator.party}</TableCell>
                <TableCell className="text-right bg-blue-50/30">{legislator.lastWeekScores.PROPOSE_BILL.toFixed(1)}</TableCell>
                <TableCell className="text-right bg-blue-50/30">{legislator.lastWeekScores.COSIGN_BILL.toFixed(1)}</TableCell>
                <TableCell className="text-right bg-blue-50/30">{legislator.lastWeekScores.FLOOR_SPEECH.toFixed(1)}</TableCell>
                <TableCell className="text-right font-semibold bg-blue-50/50">{legislator.lastWeekScores.total.toFixed(1)}</TableCell>
                <TableCell className="text-right bg-green-50/30">{legislator.averageScores.PROPOSE_BILL.toFixed(1)}</TableCell>
                <TableCell className="text-right bg-green-50/30">{legislator.averageScores.COSIGN_BILL.toFixed(1)}</TableCell>
                <TableCell className="text-right bg-green-50/30">{legislator.averageScores.FLOOR_SPEECH.toFixed(1)}</TableCell>
                <TableCell className="text-right font-semibold bg-green-50/50">{legislator.averageScores.total.toFixed(1)}</TableCell>
                {showActions && onActionClick && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => onActionClick(legislator, e)}
                    >
                      {actionLabel}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
