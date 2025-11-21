import { getPartyInfo } from '@/lib/party-utils'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

interface PartyBadgeProps {
    party: string
    showIcon?: boolean
    showEnglish?: boolean
    showChinese?: boolean
    className?: string
}

export function PartyBadge({
    party,
    showIcon = true,
    showEnglish = true,
    showChinese = false,
    className = ''
}: PartyBadgeProps) {
    const partyInfo = getPartyInfo(party)

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={`inline-flex items-center gap-1.5 ${className}`}>
                        {showIcon && partyInfo.emblemUrl && (
                            <img
                                src={partyInfo.emblemUrl}
                                alt={partyInfo.english}
                                className="w-5 h-5 object-contain"
                            />
                        )}
                        {showEnglish && (
                            <span className="font-medium">{partyInfo.english}</span>
                        )}
                        {showChinese && (
                            <span className="text-muted-foreground">{partyInfo.chinese}</span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{partyInfo.chinese} ({partyInfo.english})</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
