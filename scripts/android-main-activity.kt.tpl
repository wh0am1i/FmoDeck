package %PKG%

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.WebView
import androidx.annotation.Keep
import androidx.core.content.FileProvider
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import java.io.File

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
 * companion object 暴露 installApk，由 Rust 侧通过 JNI 调用 →
 * 起系统包安装器完成应用内升级。需配合 AndroidManifest 里的
 * FileProvider + REQUEST_INSTALL_PACKAGES 权限。
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

    companion object {
        /**
         * 从 Rust(JNI)调用：起 ACTION_VIEW 调系统包安装器。
         * 路径必须在 app cache 目录下，通过 FileProvider 授权读。
         * 首次调用时系统会弹"允许此应用安装未知应用"设置页，用户授权
         * 后重新点安装即可走到包安装器 UI。
         *
         * @Keep 告诉 R8 / ProGuard 不要 strip 这个方法。release 构建
         * 默认开启代码裁剪，R8 看不到任何 Java/Kotlin 代码调用它
         * （仅 Rust JNI 反射），如无 @Keep 会被当死代码删掉。
         */
        @JvmStatic
        @Keep
        fun installApk(context: Context, filePath: String) {
            val file = File(filePath)
            val authority = "${context.packageName}.fileprovider"
            val uri: Uri = FileProvider.getUriForFile(context, authority, file)
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }
    }
}
