import { useState } from 'react'
import { nanoid } from 'nanoid'
import { Trans, useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { settingsStore, type SyncMode } from '@/stores/settings'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

function SyncModeRadio({ value, onChange }: { value: SyncMode; onChange: (m: SyncMode) => void }) {
  const { t } = useTranslation()
  const options: { key: SyncMode; labelKey: string; hintKey: string }[] = [
    { key: 'all', labelKey: 'settings.syncFullTitle', hintKey: 'settings.syncFullDesc' },
    { key: 'today', labelKey: 'settings.syncTodayTitle', hintKey: 'settings.syncTodayDesc' },
    {
      key: 'incremental',
      labelKey: 'settings.syncIncrementalTitle',
      hintKey: 'settings.syncIncrementalDesc'
    }
  ]
  return (
    <div role="radiogroup" aria-label={t('settings.syncModeLabel')} className="flex flex-col gap-2">
      {options.map((o) => {
        const active = value === o.key
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.key)}
            className={cn(
              'hud-mono flex flex-col gap-0.5 rounded-sm border px-3 py-2 text-left text-sm',
              active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-foreground hover:bg-primary/5'
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  'h-3 w-3 rounded-full border',
                  active ? 'border-primary bg-primary' : 'border-border'
                )}
                aria-hidden="true"
              />
              {t(o.labelKey)}
            </span>
            <span className="pl-5 text-xs text-muted-foreground">{t(o.hintKey)}</span>
          </button>
        )
      })}
    </div>
  )
}

export function FmoAddressDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [host, setHost] = useState('')
  const [name, setName] = useState('')
  const [syncMode, setSyncMode] = useState<SyncMode>('all')
  const hostValid = host.trim().length > 0

  function submit() {
    if (!hostValid) return
    settingsStore.getState().addAddress({
      id: nanoid(8),
      host: host.trim(),
      syncMode,
      ...(name.trim() ? { name: name.trim() } : {})
    })
    setOpen(false)
    setHost('')
    setName('')
    setSyncMode('all')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4" />
          {t('settings.addButton')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="hud-title text-primary">
            {t('settings.addDialogTitle')}
          </DialogTitle>
          <DialogDescription className="hud-mono text-xs">
            {t('settings.addDialogDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <label className="hud-mono text-xs text-muted-foreground" htmlFor="fmo-host">
            <Trans
              i18nKey="settings.hostLabel"
              values={{ example1: 'fmo.local', example2: '192.168.1.10:8080' }}
              components={{ 1: <code />, 2: <code /> }}
            />
          </label>
          <Input
            id="fmo-host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="fmo.local"
            autoFocus
          />
          <label className="hud-mono text-xs text-muted-foreground mt-2" htmlFor="fmo-name">
            {t('settings.nameLabel')}
          </label>
          <Input
            id="fmo-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('settings.namePlaceholder')}
          />
          <label className="hud-mono text-xs text-muted-foreground mt-2">
            {t('settings.syncModeLabel')}
          </label>
          <SyncModeRadio value={syncMode} onChange={setSyncMode} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={!hostValid}>
            {t('settings.addConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
