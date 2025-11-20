import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface LeaveIndicatorProps {
    leaveFlag: string | null
    leaveDate: string | null
    leaveReason: string | null
}

export function LeaveIndicator({ leaveFlag, leaveDate, leaveReason }: LeaveIndicatorProps) {
    if (leaveFlag !== "是") return null

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-xs font-bold cursor-help">
                        L
                    </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                    <div className="space-y-1">
                        <p className="font-semibold">On Leave - Not Earning Points</p>
                        {leaveDate && (
                            <p className="text-sm">
                                <span className="font-medium">Leave Date:</span> {leaveDate}
                            </p>
                        )}
                        {leaveReason && (
                            <p className="text-sm">
                                <span className="font-medium">Reason:</span> {leaveReason}
                            </p>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
