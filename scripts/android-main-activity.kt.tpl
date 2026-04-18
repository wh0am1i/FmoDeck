package %PKG%

import android.graphics.Color
import android.os.Bundle
import android.view.ViewGroup
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

/**
 * FmoDeck Android Activity.
 *
 * targetSdk 36 (Android 16) 起系统强制边到边，WebView 会画到状态栏
 * 下方。我们接受这点，在根 View 上注册 insets listener，把系统栏
 * 空间转成 padding 喂给 View —— WebView 从状态栏下方开始渲染。
 *
 * CI (.github/workflows/tauri-android.yml) 每次都用此模板覆盖 Tauri
 * 生成的默认 MainActivity。
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
