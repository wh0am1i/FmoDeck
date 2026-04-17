import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { logsStore } from '../store'
import { X } from 'lucide-react'

export function LogsFilter() {
  const filter = logsStore((s) => s.filter)

  return (
    <div className="flex items-center gap-2">
      <Input
        value={filter}
        onChange={(e) => logsStore.getState().setFilter(e.target.value)}
        placeholder="按呼号前缀过滤（如 BG）"
        className="max-w-xs"
        aria-label="过滤呼号"
      />
      {filter && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => logsStore.getState().setFilter('')}
          aria-label="清除过滤"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
