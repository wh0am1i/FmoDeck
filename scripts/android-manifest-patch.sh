#!/usr/bin/env bash
set -euo pipefail

ANDROID_DIR=src-tauri/gen/android
MANIFEST=$ANDROID_DIR/app/src/main/AndroidManifest.xml
RES_XML_DIR=$ANDROID_DIR/app/src/main/res/xml

if [ ! -f "$MANIFEST" ]; then
  echo "::error::$MANIFEST not found"
  exit 1
fi

# 1) REQUEST_INSTALL_PACKAGES 权限(幂等)
if ! grep -q 'REQUEST_INSTALL_PACKAGES' "$MANIFEST"; then
  python3 - "$MANIFEST" <<'PY'
import sys, re
p = sys.argv[1]
s = open(p).read()
perm = '    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES"/>\n'
s = re.sub(r'(<manifest[^>]*>\s*\n)', r'\1' + perm, s, count=1)
open(p, 'w').write(s)
PY
  echo "✓ REQUEST_INSTALL_PACKAGES injected"
fi

# 2) FileProvider(幂等)
if ! grep -q 'androidx.core.content.FileProvider' "$MANIFEST"; then
  python3 - "$MANIFEST" <<'PY'
import sys, re
p = sys.argv[1]
s = open(p).read()
provider = '''
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/fmodeck_file_paths"/>
        </provider>
'''
# 插到 </application> 前
s = re.sub(r'(\s*</application>)', provider + r'\1', s, count=1)
open(p, 'w').write(s)
PY
  echo "✓ FileProvider injected"
fi

# 3) 拷 file_paths xml
mkdir -p "$RES_XML_DIR"
cp scripts/android-file-paths.xml "$RES_XML_DIR/fmodeck_file_paths.xml"
echo "✓ fmodeck_file_paths.xml copied"
