#!/usr/bin/env python3
"""在 Tauri 生成的 themes.xml 主 <style> 里注入关 edge-to-edge 的 item。

sed 处理多行注入太麻烦而且会被 prettier 卡 YAML，干脆换 Python。
"""
import sys
from pathlib import Path

ITEMS = """\
        <item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>
        <item name="android:statusBarColor">#0a0f1a</item>
        <item name="android:navigationBarColor">#0a0f1a</item>
        <item name="android:windowLightStatusBar">false</item>
"""


def main(path: str) -> None:
    p = Path(path)
    src = p.read_text(encoding="utf-8")
    # 幂等：已经 patch 过就跳过
    if "windowOptOutEdgeToEdgeEnforcement" in src:
        print("themes.xml already patched, skipping")
        return
    # 只改第一个 </style>（主 theme）
    if "</style>" not in src:
        raise SystemExit("No </style> found in themes.xml")
    src = src.replace("</style>", ITEMS + "    </style>", 1)
    p.write_text(src, encoding="utf-8")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: android-patch-themes.py <themes.xml>")
    main(sys.argv[1])
