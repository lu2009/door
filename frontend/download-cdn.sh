#!/bin/bash
set -euo pipefail

CDN_DIR="$(cd "$(dirname "$0")" && pwd)/vendor"
mkdir -p "$CDN_DIR/js" "$CDN_DIR/css" "$CDN_DIR/coze"

echo "📦 Downloading CDN resources to $CDN_DIR ..."
echo ""

# Helper: download with retries, follow redirects
download() {
  local url="$1"
  local dest="$2"
  local name="$3"
  echo -n "  ⏳ $name ... "
  if curl -fsSL --retry 3 --retry-delay 2 -o "$dest" "$url"; then
    local size=$(du -h "$dest" | cut -f1)
    echo "✅ $size"
  else
    echo "❌ FAILED"
    return 1
  fi
}

# ── JS Libraries ──

download \
  "https://unpkg.com/vue@3.5.13/dist/vue.global.prod.js" \
  "$CDN_DIR/js/vue.min.js" \
  "Vue 3.5.13"

download \
  "https://unpkg.com/vue-router@4.5.0/dist/vue-router.global.prod.js" \
  "$CDN_DIR/js/vue-router.min.js" \
  "Vue Router 4.5.0"

download \
  "https://unpkg.com/jquery@3.7.1/dist/jquery.min.js" \
  "$CDN_DIR/js/jquery.min.js" \
  "jQuery 3.7.1"

download \
  "https://unpkg.com/element-plus@2.9.10/dist/index.full.min.js" \
  "$CDN_DIR/js/element-plus.min.js" \
  "Element Plus 2.9.10 (JS)"

download \
  "https://unpkg.com/echarts@5.6.0/dist/echarts.min.js" \
  "$CDN_DIR/js/echarts.min.js" \
  "ECharts 5.6.0"

download \
  "https://unpkg.com/konva@10.0.0/konva.min.js" \
  "$CDN_DIR/js/konva.min.js" \
  "Konva 10.0.0"

download \
  "https://unpkg.com/exceljs@4.4.0/dist/exceljs.min.js" \
  "$CDN_DIR/js/exceljs.min.js" \
  "ExcelJS 4.4.0"

# ── CSS ──

download \
  "https://unpkg.com/element-plus@2.9.10/dist/index.css" \
  "$CDN_DIR/css/element-plus.css" \
  "Element Plus CSS"

# ── Coze SDK ──

download \
  "https://lf-cdn.coze.cn/obj/unpkg/flow-platform/chat-app-sdk/1.2.0-beta.19/libs/cn/index.js" \
  "$CDN_DIR/coze/chat-app-sdk.js" \
  "Coze Chat SDK"

echo ""
echo "🎉 Done! Files saved to: $CDN_DIR"
echo ""
echo "Now update index.html to replace CDN URLs with local paths:"
echo "  https://unpkg.com/vue@3.5.13            → /vendor/js/vue.min.js"
echo "  https://unpkg.com/vue-router@4.5.0        → /vendor/js/vue-router.min.js"
echo "  https://unpkg.com/jquery@3.7.1            → /vendor/js/jquery.min.js"
echo "  https://unpkg.com/element-plus@2.9.10      → /vendor/js/element-plus.min.js"
echo "  https://unpkg.com/element-plus/dist/...css → /vendor/css/element-plus.css"
echo "  https://unpkg.com/echarts@5.6.0/...       → /vendor/js/echarts.min.js"
echo "  https://unpkg.com/konva@10.0.0/...        → /vendor/js/konva.min.js"
echo "  https://unpkg.com/exceljs@4.4.0/...       → /vendor/js/exceljs.min.js"
echo "  https://lf-cdn.coze.cn/...index.js         → /vendor/coze/chat-app-sdk.js"
