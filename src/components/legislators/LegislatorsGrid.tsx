'use client'

import { useState, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import LegislatorsList, { type LegislatorWithScores } from '@/components/shared/LegislatorsList'
import { Search } from 'lucide-react'

interface LegislatorsGridProps {
    legislators: LegislatorWithScores[]
}

export default function LegislatorsGrid({ legislators }: LegislatorsGridProps) {
    const t = useTranslations('legislatorsPage')
    const locale = useLocale()
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')

    // Filter legislators based on search query
    const filteredLegislators = useMemo(() => {
        if (!searchQuery.trim()) return legislators

        const query = searchQuery.toLowerCase()
        return legislators.filter(leg =>
            leg.nameCh.toLowerCase().includes(query) ||
            leg.nameEn?.toLowerCase().includes(query) ||
            leg.party.toLowerCase().includes(query) ||
            leg.areaName?.toLowerCase().includes(query)
        )
    }, [legislators, searchQuery])

    const handleLegislatorClick = (legislator: LegislatorWithScores) => {
        router.push(`/${locale}/legislators/${legislator.id}`)
    }

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Results count */}
            {searchQuery && (
                <p className="text-sm text-muted-foreground">
                    {filteredLegislators.length} {t('title').toLowerCase()} found
                </p>
            )}

            {/* Legislators List */}
            {filteredLegislators.length > 0 ? (
                <LegislatorsList
                    legislators={filteredLegislators}
                    onLegislatorClick={handleLegislatorClick}
                    showActions={false}
                />
            ) : (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">{t('noResults')}</p>
                </div>
            )}
        </div>
    )
}
