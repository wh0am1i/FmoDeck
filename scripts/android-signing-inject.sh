#!/usr/bin/env bash
# 往 src-tauri/gen/android/app/build.gradle.kts 注入 release signingConfig。
# 读取同目录之上的 keystore.properties(由 android-signing-setup.sh 生成)。
# 幂等:检测到已注入就跳过。
set -euo pipefail

BUILD_GRADLE=src-tauri/gen/android/app/build.gradle.kts
if [ ! -f "$BUILD_GRADLE" ]; then
  echo "::error::$BUILD_GRADLE not found"
  exit 1
fi

if grep -q 'FMODECK_SIGNING_INJECTED' "$BUILD_GRADLE"; then
  echo "signingConfig 已注入,跳过"
  exit 0
fi

# 1) 顶部 import + keystoreProperties 读取
#    插到现有最后一个 import 之后
python3 - "$BUILD_GRADLE" <<'PY'
import re, sys
p = sys.argv[1]
src = open(p).read()

header = '''
// FMODECK_SIGNING_INJECTED
import java.util.Properties
import java.io.FileInputStream

val fmodeckKeystoreFile = rootProject.file("keystore.properties")
val fmodeckKeystoreProps = Properties().apply {
    if (fmodeckKeystoreFile.exists()) {
        load(FileInputStream(fmodeckKeystoreFile))
    }
}
'''

# 插入到最后一行 import 之后(如果没有 import,就插入文件开头)
last_import = 0
for m in re.finditer(r'^import [^\n]+\n', src, re.MULTILINE):
    last_import = m.end()
src = src[:last_import] + header + src[last_import:]

# 2) 在 android { ... } 块内,开头插入 signingConfigs + buildTypes.release.signingConfig
#    android { 之后换行,再插入我们的块
inject = '''
    signingConfigs {
        if (fmodeckKeystoreFile.exists()) {
            create("release") {
                storeFile = file(fmodeckKeystoreProps["storeFile"] as String)
                storePassword = fmodeckKeystoreProps["storePassword"] as String
                keyAlias = fmodeckKeystoreProps["keyAlias"] as String
                keyPassword = fmodeckKeystoreProps["keyPassword"] as String
            }
        }
    }
    buildTypes {
        getByName("release") {
            if (fmodeckKeystoreFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }
'''

src2 = re.sub(r'(android\s*\{\s*\n)', r'\1' + inject, src, count=1)
if src2 == src:
    sys.exit("ERROR: android { block not found in build.gradle.kts")

open(p, 'w').write(src2)
print(f"✓ injected signingConfig into {p}")
PY
