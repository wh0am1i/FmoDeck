/**
 * Tailwind v3 配置 —— 仅 legacy 包(安卓 8.1 / Chromium 61)使用。
 * 主包仍是 Tailwind v4(@tailwindcss/vite + globals.css),这份不影响主包。
 *
 * 关键:颜色用函数式输出 hsl()/hsla() 的逗号语法(Chromium 61 兼容),
 * 而不是 v4 的 `hsl(var(--x) / <alpha>)` 斜杠语法(需 Chrome 65+)。
 * 因此 legacy.css 里的 CSS 变量必须是逗号形三元组(如 --primary: 190, 100%, 50%)。
 */

/** 生成支持 alpha 的颜色:无透明度→hsl(var),有透明度→hsla(var, a)。 */
function hslaVar(varName) {
  return ({ opacityValue } = {}) =>
    opacityValue === undefined || opacityValue === null
      ? `hsl(var(${varName}))`
      : `hsla(var(${varName}), ${opacityValue})`
}

/** @type {import('tailwindcss3').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: hslaVar('--border'),
        input: hslaVar('--input'),
        ring: hslaVar('--ring'),
        background: hslaVar('--background'),
        foreground: hslaVar('--foreground'),
        primary: {
          DEFAULT: hslaVar('--primary'),
          foreground: hslaVar('--primary-foreground')
        },
        secondary: {
          DEFAULT: hslaVar('--secondary'),
          foreground: hslaVar('--secondary-foreground')
        },
        destructive: {
          DEFAULT: hslaVar('--destructive'),
          foreground: hslaVar('--destructive-foreground')
        },
        muted: {
          DEFAULT: hslaVar('--muted'),
          foreground: hslaVar('--muted-foreground')
        },
        accent: {
          DEFAULT: hslaVar('--accent'),
          foreground: hslaVar('--accent-foreground')
        },
        popover: {
          DEFAULT: hslaVar('--popover'),
          foreground: hslaVar('--popover-foreground')
        },
        card: {
          DEFAULT: hslaVar('--card'),
          foreground: hslaVar('--card-foreground')
        }
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'calc(var(--radius) - 1px)',
        md: 'var(--radius)',
        lg: 'calc(var(--radius) + 2px)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace']
      }
    }
  },
  plugins: [
    // tw-animate-css 的 v3 等价物:提供 animate-in / fade-in-0 / zoom-in-95 等
    require('tailwindcss-animate'),
    // globals.css 里的 @custom-variant tall (@media (min-height: 640px)) 等价物
    function ({ addVariant }) {
      addVariant('tall', '@media (min-height: 640px)')
    }
  ]
}
