import type { MouseEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Github } from 'lucide-react'
import { openExternal } from '@/lib/utils/external-link'

const REPO_URL = 'https://github.com/wh0am1i/FmoDeck'
const UPSTREAM_URL = 'https://github.com/dingle1122/FmoLogs'

function handleExternal(url: string) {
  return (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    void openExternal(url)
  }
}

export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="border-t border-border/60 bg-card/30 px-4 py-4 text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <span className="hud-mono">
          <Trans
            i18nKey="footer.forkNotice"
            components={{
              1: (
                <a
                  className="text-primary hover:underline"
                  href={UPSTREAM_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={handleExternal(UPSTREAM_URL)}
                />
              )
            }}
          />
        </span>
        <a
          className="hud-mono flex items-center gap-1.5 text-muted-foreground hover:text-primary"
          href={REPO_URL}
          target="_blank"
          rel="noreferrer noopener"
          onClick={handleExternal(REPO_URL)}
          aria-label={t('footer.repoAria')}
        >
          <Github className="h-3.5 w-3.5" />
          <span>wh0am1i/FmoDeck</span>
        </a>
      </div>
    </footer>
  )
}
