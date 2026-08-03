# Vidlish

**Vidlish** biến bất kỳ video YouTube nào thành bài học tiếng Anh cá nhân hóa.

> **Any video. Your English lesson.**

## Cài BMAD cho Codex

BMAD được cấu hình cố định ở phiên bản `6.10.0`, dùng module `bmm` và tích hợp Codex qua `.agents/skills/`.

### Linux, macOS hoặc Git Bash

```bash
chmod +x install-bmad.sh
./install-bmad.sh
```

### Windows PowerShell

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\install-bmad.ps1
```

Hoặc dùng npm:

```bash
npm run bmad:install
```

Script sẽ:

- Kiểm tra Node.js 20.12+, npm, npx và Git.
- Cài BMAD Method `6.10.0`.
- Cài module `bmm`.
- Tích hợp Codex bằng tool ID `codex`.
- Thiết lập giao tiếp và tài liệu đầu ra bằng tiếng Việt.
- Ghi artifact vào `_bmad-output/`.
- Kiểm tra `_bmad/_config/manifest.yaml` và `.agents/skills/`.

## Bắt đầu với Codex

Sau khi BMAD được cài, mở repository bằng Codex rồi nhập:

```text
Đọc IDEA.md, dùng bmad-spec để tạo SPEC.md trong _bmad-output,
sau đó dùng bmad-help để đề xuất workflow tiếp theo.
Chưa viết code cho đến khi đặc tả MVP hoàn chỉnh.
```

## Cấu trúc sau khi cài thành công

```text
.
├── .agents/
│   └── skills/
├── _bmad/
│   └── _config/
│       └── manifest.yaml
├── _bmad-output/
├── AGENTS.md
├── BRAND.md
├── IDEA.md
├── install-bmad.ps1
├── install-bmad.sh
└── package.json
```
