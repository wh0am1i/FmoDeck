import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { setAppLanguage, type AppLanguage } from '@/i18n'

export function LanguageField() {
  const { i18n } = useTranslation()
  const current = (i18n.language.startsWith('en') ? 'en' : 'zh-CN') as AppLanguage

  return (
    <div className="flex items-center gap-3">
      <Select value={current} onValueChange={(v) => setAppLanguage(v as AppLanguage)}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="zh-CN">简体中文</SelectItem>
          <SelectItem value="en">English</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
