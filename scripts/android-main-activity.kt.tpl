package %PKG%

import android.graphics.Color
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.WebView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

/**
 * FmoDeck Android Activity.
 *
 * targetSdk 36 (Android 16) 起系统强制边到边，WebView 会画到状态栏
 * 下方。我们接受这点，在根 View 上注册 insets listener，把系统栏
 * 空间转成 padding 喂给 View —— WebView 从状态栏下方开始渲染。
 *
 * 另外 release APK 默认关闭 WebView 远程调试；我们无条件打开，
 * 业余软件调试需要走 chrome://inspect 远程看 WebView Console，
 * 比靠 logcat 盲猜强得多。
 *
 * CI (.github/workflows/tauri-android.yml) 每次都用此模板覆盖 Tauri
 * 生成的默认 MainActivity。
 */
class MainActivity : TauriActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // setWebContentsDebuggingEnabled 是静态方法，必须在 WebView 实例
        // 化之前调用；TauriActivity.super.onCreate 里会造 WebView，所以
        // 放在 super.onCreate 之前。
        WebView.setWebContentsDebuggingEnabled(true)

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
