#!/usr/bin/env bash
# 从 README.md 抽取 "### $TAG" 对应小节的内容，追加下载指引，写入
# GitHub Actions 的 step output。CI 里 tauri-release.yml 用。
#
# 用法：TAG=v0.1.3 ./scripts/extract-changelog.sh
set -euo pipefail

tag="${TAG:-${GITHUB_REF_NAME:-}}"

if [ -z "$tag" ]; then
  echo "TAG / GITHUB_REF_NAME 未设置" >&2
  exit 1
fi

body=$(awk -v ver="### $tag" '
  $0 ~ "^"ver { found=1; next }
  found && /^### v/ { exit }
  found { print }
' README.md)

if [ -z "$body" ]; then
  body="自动构建的桌面版本 · 版本 $tag"
fi

# 追加下载指引
read -r -d '' footer <<'EOF' || true

---

## 下载

- macOS Apple Silicon (M1/M2/M3/M4)：`FmoDeck_*_aarch64.dmg`
- macOS Intel：`FmoDeck_*_x64.dmg`
- Windows：`FmoDeck_*_x64-setup.exe` 或 `.msi`
- Linux：`FmoDeck_*_amd64.deb` 或 `.AppImage`

未签名版本首次打开会被 Gatekeeper / SmartScreen 拦截：

**macOS**（已做 ad-hoc 签名，仍可能被 Gatekeeper 拦）
- 常规：右键 `FmoDeck.app` → 打开 → "仍要打开"
- 若提示"已损坏"：终端执行 `xattr -cr /Applications/FmoDeck.app` 后再打开

**Windows**
- 点"更多信息 → 仍要运行"
EOF

full="$body
$footer"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "body<<CHANGELOG_EOF"
    echo "$full"
    echo "CHANGELOG_EOF"
  } >> "$GITHUB_OUTPUT"
else
  # 本地运行时直接打印
  echo "$full"
fi
