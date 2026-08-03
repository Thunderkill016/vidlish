#!/usr/bin/env bash
set -Eeuo pipefail

BMAD_VERSION="6.10.0"
MIN_NODE_MAJOR=20
MIN_NODE_MINOR=12

fail() {
  printf "\n❌ %s\n" "$1" >&2
  exit 1
}

command -v node >/dev/null 2>&1 || fail "Chưa có Node.js. Hãy cài Node.js 20.12 trở lên."
command -v npm >/dev/null 2>&1 || fail "Chưa có npm."
command -v npx >/dev/null 2>&1 || fail "Chưa có npx."
command -v git >/dev/null 2>&1 || fail "Chưa có Git."

NODE_VERSION="$(node -p "process.versions.node")"
NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
NODE_MINOR="$(node -p "Number(process.versions.node.split('.')[1])")"

if (( NODE_MAJOR < MIN_NODE_MAJOR )) || \
   (( NODE_MAJOR == MIN_NODE_MAJOR && NODE_MINOR < MIN_NODE_MINOR )); then
  fail "Node.js hiện tại là ${NODE_VERSION}. BMAD cần Node.js 20.12 trở lên."
fi

cd "$(dirname "$0")"

printf "Node.js: %s\n" "$NODE_VERSION"
printf "Đang kiểm tra Codex trong BMAD %s...\n" "$BMAD_VERSION"

TOOLS_OUTPUT="$(npx --yes "bmad-method@${BMAD_VERSION}" install --list-tools 2>&1)" || {
  printf "%s\n" "$TOOLS_OUTPUT" >&2
  fail "Không thể tải BMAD từ npm. Kiểm tra Internet, npm registry hoặc proxy rồi chạy lại."
}

printf "%s\n" "$TOOLS_OUTPUT" | grep -Eq '(^|[[:space:]])codex([[:space:]]|$)' || {
  printf "%s\n" "$TOOLS_OUTPUT"
  fail "Bản BMAD này không báo cáo tool ID 'codex'."
}

printf "\nĐang cài BMAD cho Codex...\n"

npx --yes "bmad-method@${BMAD_VERSION}" install \
  --directory . \
  --modules bmm \
  --tools codex \
  --yes \
  --communication-language Vietnamese \
  --document-output-language Vietnamese \
  --output-folder _bmad-output

test -f "_bmad/_config/manifest.yaml" || fail "Installer kết thúc nhưng không tìm thấy manifest BMAD."
test -d ".agents/skills" || fail "Không tìm thấy skills dành cho Codex tại .agents/skills."

printf "\n✅ BMAD %s đã được cài cho Codex.\n" "$BMAD_VERSION"
printf "Mở thư mục này bằng Codex và nhập:\n"
printf "  Đọc IDEA.md, dùng bmad-spec để tạo SPEC.md rồi đề xuất workflow tiếp theo.\n"
