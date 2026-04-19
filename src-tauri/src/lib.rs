#[cfg(target_os = "android")]
#[tauri::command]
fn install_apk(path: String) -> Result<(), String> {
    use jni::objects::{JObject, JValue};
    use jni::JavaVM;

    // ndk-context 由 Tauri / Android activity 在进程启动时初始化,
    // 提供当前 JavaVM + Context(MainActivity 实例)。
    let ctx = ndk_context::android_context();
    let vm = unsafe { JavaVM::from_raw(ctx.vm().cast()) }
        .map_err(|e| format!("JavaVM: {e}"))?;
    let activity = unsafe { JObject::from_raw(ctx.context().cast()) };
    let mut env = vm
        .attach_current_thread()
        .map_err(|e| format!("attach: {e}"))?;

    // 调 com.wh0am1i.fmodeck.MainActivity.installApk(Context, String):V
    // companion object + @JvmStatic 在 Kotlin 编译产物里表现为静态方法。
    let class = env
        .find_class("com/wh0am1i/fmodeck/MainActivity")
        .map_err(|e| format!("find_class: {e}"))?;
    let path_str = env
        .new_string(&path)
        .map_err(|e| format!("new_string: {e}"))?;
    env.call_static_method(
        class,
        "installApk",
        "(Landroid/content/Context;Ljava/lang/String;)V",
        &[JValue::Object(&activity), JValue::Object(&path_str)],
    )
    .map_err(|e| format!("call_static_method: {e}"))?;

    Ok(())
}

#[cfg(not(target_os = "android"))]
#[tauri::command]
fn install_apk(_path: String) -> Result<(), String> {
    Err("install_apk is Android-only".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![install_apk])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
