import { Button } from '@/components/ui/button'

export function App() {
  return (
    <div className="p-6 bg-background text-foreground min-h-screen">
      <h1 className="hud-title text-2xl text-primary mb-2">FmoDeck</h1>
      <p className="hud-mono text-sm text-muted-foreground mb-6">
        Phase 1 scaffolding · shadcn integration check
      </p>
      <div className="flex gap-2">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
    </div>
  )
}

export default App
