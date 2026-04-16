export function App() {
  return (
    <div className="p-6 bg-background text-foreground min-h-screen">
      <h1 className="hud-title text-2xl text-primary mb-2">FmoDeck</h1>
      <p className="hud-mono text-sm text-muted-foreground">
        Phase 1 scaffolding · Tailwind + HUD theme check
      </p>
      <div className="hud-frame hud-glow mt-6 p-4 inline-block">
        <span className="hud-mono text-primary">[ HUD FRAME TEST ]</span>
      </div>
    </div>
  )
}

export default App
