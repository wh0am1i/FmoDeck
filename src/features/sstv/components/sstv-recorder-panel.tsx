import { recordingStore } from '../recording'

/**
 * 调试录音面板,只在 dev 构建中导入(见 sstv-canvas.tsx 的条件 lazy import)。
 * 文案直接内联中文,不走 i18n,避免 locale JSON 在 prod 残留 dev 字符串。
 */
export function SstvRecorderPanel({ decoderActive }: { decoderActive: boolean }) {
  const recState = recordingStore((s) => s.state)
  const lastClip = recordingStore((s) => s.lastClip)

  const handleArm = () => recordingStore.getState().arm()
  const handleCancel = () => recordingStore.getState().cancel()
  const handleClear = () => recordingStore.getState().clearClip()

  const downloadName = lastClip
    ? `sstv-${lastClip.mode ?? 'unknown'}-${new Date(lastClip.capturedAt)
        .toISOString()
        .replace(/[:.]/g, '-')}.wav`
    : ''

  return (
    <div className="hud-mono flex w-full max-w-[280px] flex-col gap-1 border-t border-primary/10 pt-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">调试录音</span>
        {recState === 'idle' && (
          <button
            type="button"
            onClick={handleArm}
            disabled={decoderActive}
            className="border border-primary/40 px-2 py-0.5 text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            录下一帧
          </button>
        )}
        {recState === 'armed' && (
          <button
            type="button"
            onClick={handleCancel}
            className="border border-accent/40 px-2 py-0.5 text-accent hover:bg-accent/10"
          >
            取消
          </button>
        )}
        {recState === 'recording' && (
          <button
            type="button"
            onClick={handleCancel}
            className="border border-destructive/40 px-2 py-0.5 text-destructive hover:bg-destructive/10"
          >
            取消
          </button>
        )}
      </div>
      {recState === 'armed' && (
        <span className="text-accent">已就绪 · 等待 VIS…</span>
      )}
      {recState === 'recording' && (
        <span className="text-primary">录制中…</span>
      )}
      {recState === 'idle' && decoderActive && !lastClip && (
        <span className="text-muted-foreground">当前正在解码,等本帧完成后再录</span>
      )}
      {lastClip && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">
            {lastClip.mode ?? 'timeout'} · {lastClip.durationSec.toFixed(1)}s · {lastClip.sampleRate}Hz
          </span>
          <div className="flex gap-1">
            <a
              href={lastClip.url}
              download={downloadName}
              className="border border-primary/40 px-2 py-0.5 text-primary hover:bg-primary/10"
            >
              下载 WAV
            </a>
            <button
              type="button"
              onClick={handleClear}
              className="border border-muted-foreground/40 px-2 py-0.5 text-muted-foreground hover:bg-muted-foreground/10"
            >
              丢弃
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
