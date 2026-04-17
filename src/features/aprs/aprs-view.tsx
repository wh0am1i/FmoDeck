import { PasscodeCalculator } from './components/passcode-calculator'

export function AprsView() {
  return (
    <div className="flex flex-col gap-6">
      <PasscodeCalculator />
    </div>
  )
}
