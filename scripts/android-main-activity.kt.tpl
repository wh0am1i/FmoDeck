package %PKG%

import android.graphics.Color
import android.os.Bundle
import android.view.ViewGroup
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

/**
 * FmoDeck 的 Android Activity。
 *
 * Tauri 2 默认模板在 onCreate 里调 `enableEdgeToEdge()`，把 app 切到
 * 边到边模式（WebView 画到状态栏下方）。targetSdk 36 (Android 16)
 * 起这个模式是系统强制的，无法通过 `windowOptOutEdgeToEdgeEnforcement`
 * opt-out。正确做法是接受 edge-to-edge，在根 View 上注册
 * WindowInsetsListener，把系统栏 insets 作 padding 喂给 View ——
 * WebView 就从状态栏下方开始渲染。
 *
 * 此模板由 CI (.github/workflows/tauri-android.yml) 每次覆盖 Tauri
 * 生成的 MainActivity.kt。
 */
class MainActivity : TauriActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // 把状态栏 / 导航栏底色定死成 app 背景色（#0a0f1a ≈ hsl(270 100% 4%)）
        window.statusBarColor = Color.parseColor("#0a0f1a")
        window.navigationBarColor = Color.parseColor("#0a0f1a")

        // 接收系统 inset，转成根 View 的 padding（上 / 下 / 左 / 右）。
        // 这样 WebView 从状态栏下方开始渲染，底部也给导航栏留出空间。
        val content = findViewById<ViewGroup>(android.R.id.content)
        ViewCompat.setOnApplyWindowInsetsListener(content) { v, windowInsets ->
            val bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            WindowInsetsCompat.CONSUMED
        }
    }
}
