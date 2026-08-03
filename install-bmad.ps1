$ErrorActionPreference = "Stop"

$BmadVersion = "6.10.0"
$MinimumNode = [Version]"20.12.0"

function Fail([string]$Message) {
    Write-Host ""
    Write-Host "❌ $Message" -ForegroundColor Red
    exit 1
}

foreach ($Command in @("node", "npm", "npx", "git")) {
    if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
        Fail "Không tìm thấy '$Command'. Hãy cài Node.js 20.12+ và Git."
    }
}

try {
    $NodeVersionText = (& node -p "process.versions.node").Trim()
    $NodeVersion = [Version]$NodeVersionText
} catch {
    Fail "Không đọc được phiên bản Node.js."
}

if ($NodeVersion -lt $MinimumNode) {
    Fail "Node.js hiện tại là $NodeVersionText. BMAD cần Node.js 20.12 trở lên."
}

Set-Location $PSScriptRoot

Write-Host "Node.js: $NodeVersionText"
Write-Host "Đang kiểm tra Codex trong BMAD $BmadVersion..."

$ToolsOutput = (& npx --yes "bmad-method@$BmadVersion" install --list-tools 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) {
    Write-Host $ToolsOutput
    Fail "Không thể tải BMAD từ npm. Kiểm tra Internet, npm registry hoặc proxy rồi chạy lại."
}

if ($ToolsOutput -notmatch "(?m)(^|\s)codex(\s|$)") {
    Write-Host $ToolsOutput
    Fail "Bản BMAD này không báo cáo tool ID 'codex'."
}

Write-Host ""
Write-Host "Đang cài BMAD cho Codex..."

& npx --yes "bmad-method@$BmadVersion" install `
    --directory . `
    --modules bmm `
    --tools codex `
    --yes `
    --communication-language Vietnamese `
    --document-output-language Vietnamese `
    --output-folder _bmad-output

if ($LASTEXITCODE -ne 0) {
    Fail "BMAD installer trả về lỗi."
}

if (-not (Test-Path "_bmad/_config/manifest.yaml")) {
    Fail "Installer kết thúc nhưng không tìm thấy manifest BMAD."
}

if (-not (Test-Path ".agents/skills")) {
    Fail "Không tìm thấy skills dành cho Codex tại .agents/skills."
}

Write-Host ""
Write-Host "✅ BMAD $BmadVersion đã được cài cho Codex." -ForegroundColor Green
Write-Host "Mở thư mục này bằng Codex và nhập:"
Write-Host "Đọc IDEA.md, dùng bmad-spec để tạo SPEC.md rồi đề xuất workflow tiếp theo."
