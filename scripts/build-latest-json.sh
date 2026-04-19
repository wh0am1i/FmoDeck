#!/usr/bin/env bash
# 读取当前 APK 路径 + 版本号 + changelog body,产出 latest.json。
# 依赖:
#   APK_PATH              APK 文件路径(如 FmoDeck_0.1.6_android.apk)
#   VERSION               语义化版本号(如 0.1.6,无 v 前缀)
#   UPDATE_BASE_URL       https://<host>,无尾部 /
#   CHANGELOG_BODY        changelog markdown(可多行)
# 产出:./latest.json
set -euo pipefail

: "${APK_PATH:?missing APK_PATH}"
: "${VERSION:?missing VERSION}"
: "${UPDATE_BASE_URL:?missing UPDATE_BASE_URL}"
: "${CHANGELOG_BODY:=}"

APK_NAME=$(basename "$APK_PATH")
SHA=$(sha256sum "$APK_PATH" | awk '{print $1}')
SIZE=$(stat -c%s "$APK_PATH" 2>/dev/null || stat -f%z "$APK_PATH")
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
NOTES_JSON=$(printf '%s' "$CHANGELOG_BODY" | jq -Rs .)

cat > latest.json <<EOF
{
  "version": "${VERSION}",
  "url": "${UPDATE_BASE_URL%/}/fmodeck/android/${APK_NAME}",
  "sha256": "${SHA}",
  "size": ${SIZE},
  "notes": ${NOTES_JSON},
  "publishedAt": "${NOW}"
}
EOF

echo "✓ latest.json written"
cat latest.json
