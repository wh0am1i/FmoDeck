package %PKG%

import android.graphics.Color
import android.os.Bundle
import android.view.WindowManager
import androidx.core.view.WindowCompat

class MainActivity : TauriActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // 关 Tauri 默认的 edge-to-edge，让 WebView 从状态栏下方开始
        WindowCompat.setDecorFitsSystemWindows(window, true)
        // 再清一遍可能残留的 translucent / no-limits flag，保险
        @Suppress("DEPRECATION")
        window.clearFlags(
            WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        )
        // 给状态栏一个与 app 背景同色的实底，避免透过去
        window.statusBarColor = Color.parseColor("#0a0f1a")
    }
}
