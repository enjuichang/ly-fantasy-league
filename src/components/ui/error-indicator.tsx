import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface ErrorIndicatorProps {
    errorFlag: string | null
    errorReason: string | null
}

export function ErrorIndicator({ errorFlag, errorReason }: ErrorIndicatorProps) {
    if (errorFlag !== "是") return null

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-600 text-white text-xs font-bold cursor-help">
                        E
                    </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                    <div className="space-y-1">
                        <p className="font-semibold">Data Fetching Issue</p>
                        {errorReason && (
                            <p className="text-sm">
                                <span className="font-medium">Issue:</span> {errorReason}
                            </p>
                        )}
                        <p className="text-xs text-slate-400 mt-2">
                            This legislator may have incomplete scoring data. Contact support if this persists.
                        </p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
