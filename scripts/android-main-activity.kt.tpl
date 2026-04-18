package %PKG%

import android.graphics.Color
import android.os.Bundle
import androidx.core.view.WindowCompat

/**
 * FmoDeck 的 Android Activity。
 *
 * Tauri 生成的默认模板会在 onCreate 里调 `enableEdgeToEdge()`，把 app
 * 切到 edge-to-edge 模式（WebView 画到状态栏和导航栏下方）。我们不要
 * 这个行为 —— 重写 onCreate 跳过这一步，并 setDecorFitsSystemWindows
 * (true) 让系统帮我们预留状态栏 / 导航栏空间。
 */
class MainActivity : TauriActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, true)
        window.statusBarColor = Color.parseColor("#0a0f1a")
        window.navigationBarColor = Color.parseColor("#0a0f1a")
    }
}
