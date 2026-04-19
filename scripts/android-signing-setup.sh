#!/usr/bin/env bash
# CI 里使用:从 GitHub Secrets 还原 keystore 到脚手架路径。
# 签名密码走 env var 直接进 Gradle(System.getenv),不写 keystore.properties,
# 避免 Java Properties 的反斜杠转义 + Gradle Kotlin DSL 的 `java` 名字冲突。
#
# 依赖环境变量:
#   ANDROID_KEYSTORE_BASE64     jks 文件的 base64
#   ANDROID_KEYSTORE_PASSWORD   storePassword(Gradle 侧 System.getenv 直接读)
#   ANDROID_KEY_ALIAS           keyAlias
#   ANDROID_KEY_PASSWORD        keyPassword
# 调用时机:pnpm tauri android init 之后、build 之前
set -euo pipefail

: "${ANDROID_KEYSTORE_BASE64:?missing ANDROID_KEYSTORE_BASE64}"
: "${ANDROID_KEYSTORE_PASSWORD:?missing ANDROID_KEYSTORE_PASSWORD}"
: "${ANDROID_KEY_ALIAS:?missing ANDROID_KEY_ALIAS}"
: "${ANDROID_KEY_PASSWORD:?missing ANDROID_KEY_PASSWORD}"

ANDROID_DIR=src-tauri/gen/android
if [ ! -d "$ANDROID_DIR" ]; then
  echo "::error::$ANDROID_DIR not found (run 'tauri android init' first)"
  exit 1
fi

echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > "$ANDROID_DIR/app/fmodeck-release.jks"
echo "✓ keystore restored to $ANDROID_DIR/app/fmodeck-release.jks"
