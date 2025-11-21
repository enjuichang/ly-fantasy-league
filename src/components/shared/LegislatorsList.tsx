'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { LeaveIndicator } from '@/components/ui/leave-indicator'
import { ErrorIndicator } from '@/components/ui/error-indicator'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { CategoryScores } from '@/lib/scoring-client'

export interface LegislatorWithScores {
  id: string
  nameCh: string
  nameEn: string | null
  party: string
  region: string | null
  areaName: string | null
  picUrl: string | null
  leaveFlag: string | null
  leaveDate: string | null
  leaveReason: string | null
  errorFlag?: string | null
  errorReason?: string | null
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
  | 'region'
  | 'lwPropose'
  | 'lwCosign'
  | 'lwFloor'
  | 'lwRollcall'
  | 'lwMaverick'
  | 'lwWritten'
  | 'lwTotal'
  | 'avgPropose'
  | 'avgCosign'
  | 'avgFloor'
  | 'avgRollcall'
  | 'avgMaverick'
  | 'avgWritten'
  | 'avgTotal'

type SortDirection = 'asc' | 'desc'

export default function LegislatorsList({
  legislators,
  onLegislatorClick,
  onActionClick,
  actionLabel = 'Add',
  showActions = true
}: LegislatorsListProps) {
  const t = useTranslations('legislatorsList')
  const [sortColumn, setSortColumn] = useState<SortColumn>('lwTotal')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to descending for scores, ascending for text
      setSortColumn(column)
      setSortDirection(column === 'name' || column === 'party' || column === 'region' ? 'asc' : 'desc')
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
        case 'region':
          aValue = a.areaName || ''
          bValue = b.areaName || ''
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
        case 'lwWritten':
          return (b.lastWeekScores?.WRITTEN_SPEECH || 0) - (a.lastWeekScores?.WRITTEN_SPEECH || 0)
        case 'avgWritten':
          return (b.averageScores?.WRITTEN_SPEECH || 0) - (a.averageScores?.WRITTEN_SPEECH || 0)
        case 'lwRollcall':
          aValue = a.lastWeekScores.ROLLCALL_VOTE
          bValue = b.lastWeekScores.ROLLCALL_VOTE
          break
        case 'lwMaverick':
          aValue = a.lastWeekScores.MAVERICK_BONUS
          bValue = b.lastWeekScores.MAVERICK_BONUS
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
        case 'avgRollcall':
          aValue = a.averageScores.ROLLCALL_VOTE
          bValue = b.averageScores.ROLLCALL_VOTE
          break
        case 'avgMaverick':
          aValue = a.averageScores.MAVERICK_BONUS
          bValue = b.averageScores.MAVERICK_BONUS
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
      className={`cursor-pointer hover:bg-accent select-none ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''}`}
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
            <TableHead className="w-16">{t('photo')}</TableHead>
            <SortableHeader column="name">{t('name')}</SortableHeader>
            <SortableHeader column="party">{t('party')}</SortableHeader>
            <SortableHeader column="region">{t('region')}</SortableHeader>
            <TableHead className="text-center border-l" colSpan={7}>{t('lastWeek')}</TableHead>
            <TableHead className="text-center border-l" colSpan={7}>{t('average')}</TableHead>
            {showActions && <TableHead className="w-24">{t('actions')}</TableHead>}
          </TableRow>
          <TableRow>
            <TableHead></TableHead>
            <TableHead></TableHead>
            <TableHead></TableHead>
            <TableHead></TableHead>
            <SortableHeader column="lwPropose" align="right">{t('propose')}</SortableHeader>
            <SortableHeader column="lwCosign" align="right">{t('cosign')}</SortableHeader>
            <SortableHeader column="lwFloor" align="right">{t('floor')}</SortableHeader>
            <SortableHeader column="lwWritten" align="right">{t('written')}</SortableHeader>
            <SortableHeader column="lwRollcall" align="right">{t('vote')}</SortableHeader>
            <SortableHeader column="lwMaverick" align="right">{t('mav')}</SortableHeader>
            <SortableHeader column="lwTotal" align="right">{t('total')}</SortableHeader>
            <SortableHeader column="avgPropose" align="right">{t('propose')}</SortableHeader>
            <SortableHeader column="avgCosign" align="right">{t('cosign')}</SortableHeader>
            <SortableHeader column="avgFloor" align="right">{t('floor')}</SortableHeader>
            <SortableHeader column="avgWritten" align="right">{t('written')}</SortableHeader>
            <SortableHeader column="avgRollcall" align="right">{t('vote')}</SortableHeader>
            <SortableHeader column="avgMaverick" align="right">{t('mav')}</SortableHeader>
            <SortableHeader column="avgTotal" align="right">{t('total')}</SortableHeader>
            {showActions && <TableHead></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedLegislators.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 19 : 18} className="text-center py-10 text-muted-foreground">
                {t('noLegislatorsFound')}
              </TableCell>
            </TableRow>
          ) : (
            sortedLegislators.map(legislator => (
              <TableRow
                key={legislator.id}
                className="cursor-pointer hover:bg-accent"
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
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm">
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
                    <ErrorIndicator
                      errorFlag={legislator.errorFlag || null}
                      errorReason={legislator.errorReason || null}
                    />
                  </div>
                </TableCell>
                <TableCell>{legislator.party}</TableCell>
                <TableCell className="text-muted-foreground">{legislator.areaName || '-'}</TableCell>
                <TableCell className="text-right bg-primary/10">{legislator.lastWeekScores.PROPOSE_BILL.toFixed(1)}</TableCell>
                <TableCell className="text-right bg-primary/10">{legislator.lastWeekScores.COSIGN_BILL.toFixed(1)}</TableCell>
                <TableCell className="text-right bg-primary/10">{legislator.lastWeekScores.FLOOR_SPEECH.toFixed(1)}</TableCell>
                <TableCell className="text-right bg-primary/10">{(legislator.lastWeekScores?.WRITTEN_SPEECH || 0).toFixed(1)}</TableCell>
                <TableCell className="text-right bg-primary/10">{(legislator.lastWeekScores?.ROLLCALL_VOTE || 0).toFixed(1)}</TableCell>
                <TableCell className="text-right bg-primary/10">{legislator.lastWeekScores.MAVERICK_BONUS.toFixed(1)}</TableCell>
                <TableCell className="text-right font-semibold bg-primary/15">{legislator.lastWeekScores.total.toFixed(1)}</TableCell>
                <TableCell className="text-right bg-green-50/30">{legislator.averageScores.PROPOSE_BILL.toFixed(1)}</TableCell>
                <TableCell className="text-right bg-green-50/30">{legislator.averageScores.COSIGN_BILL.toFixed(1)}</TableCell>
                <TableCell className="text-right bg-green-50/30">{legislator.averageScores.FLOOR_SPEECH.toFixed(1)}</TableCell>
                <TableCell className="text-right bg-green-50/30">{legislator.averageScores.WRITTEN_SPEECH.toFixed(1)}</TableCell>
                <TableCell className="text-right bg-green-50/30">{legislator.averageScores.ROLLCALL_VOTE.toFixed(1)}</TableCell>
                <TableCell className="text-right bg-green-50/30">{legislator.averageScores.MAVERICK_BONUS.toFixed(1)}</TableCell>
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
