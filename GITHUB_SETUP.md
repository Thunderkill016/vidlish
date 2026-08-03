# GitHub và BMAD setup

Repository:

```text
Thunderkill016/vidlish
```

## Trạng thái

- Repository đã được tạo trên GitHub.
- Project foundation đã được đưa lên nhánh `main`.
- BMAD Method được ghim ở phiên bản `6.10.0`.
- Tool integration: `codex`.
- Module: `bmm`.
- Ngôn ngữ giao tiếp và tài liệu: Vietnamese.
- Thư mục đầu ra: `_bmad-output`.

## Cài BMAD trên máy local

```bash
npm run bmad:install
```

Hoặc:

```bash
chmod +x install-bmad.sh
./install-bmad.sh
```

## Kiểm tra sau cài đặt

```bash
test -f _bmad/_config/manifest.yaml
test -d .agents/skills
```

## GitHub Actions

Workflow `.github/workflows/install-bmad.yml` sẽ thử cài BMAD trực tiếp trên GitHub runner và commit các file `_bmad/` cùng `.agents/skills/` trở lại nhánh `main`.
