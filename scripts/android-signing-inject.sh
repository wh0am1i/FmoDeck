#!/usr/bin/env bash
# 往 src-tauri/gen/android/app/build.gradle.kts 注入 release signingConfig。
# 签名四项(storePassword / keyAlias / keyPassword / keystore 路径)全部
# 通过 Kotlin System.getenv 从环境变量读取,避开:
#   1) Java Properties 对 `\` 的转义解析(密码里含反斜杠会被吃掉)
#   2) Gradle Kotlin DSL top-level 的 `java` 被 JavaPluginExtension 抢走
#      导致 `java.util.Properties` 写法解析失败
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

# 在 android { ... } 块内开头插入 signingConfigs + buildTypes.release.signingConfig。
# 注入块全部用 System.getenv 读,keystore 文件名硬编码 fmodeck-release.jks
# (与 android-signing-setup.sh 写出的路径对齐)。
python3 - "$BUILD_GRADLE" <<'PY'
import re, sys
p = sys.argv[1]
src = open(p).read()

inject = '''
    // FMODECK_SIGNING_INJECTED
    signingConfigs {
        if (System.getenv("ANDROID_KEYSTORE_PASSWORD") != null) {
            create("release") {
                storeFile = file("fmodeck-release.jks")
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        getByName("release") {
            if (System.getenv("ANDROID_KEYSTORE_PASSWORD") != null) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }
'''

src2 = re.sub(r'(android\s*\{\s*\n)', r'\1' + inject, src, count=1)
if src2 == src:
    sys.exit("ERROR: android { block not found in build.gradle.kts")

open(p, 'w').write(src2)
print(f"\u2713 injected signingConfig into {p}")
PY
