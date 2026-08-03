# GitHub và BMAD setup

Repository:

```text
Thunderkill016/vidlish
```

## Trạng thái

- Repository đã được tạo trên GitHub.
- Project foundation đã được đưa lên nhánh `main`.
- BMAD Method `6.10.0` đã được cài thành công bằng GitHub Actions.
- Modules đã cài: `core`, `bmm`.
- Tool integration: `codex`.
- Codex skills: `.agents/skills/`.
- BMAD runtime/config: `_bmad/`.
- Ngôn ngữ giao tiếp và tài liệu: Vietnamese.
- Thư mục đầu ra: `_bmad-output/`.

## Commit cài đặt

```text
06e9d9509a662bcc3cfeb951050c9df47b5d2e08
chore: install BMAD for Codex
```

## Cài hoặc cập nhật trên máy local

```bash
npm run bmad:install
```

Hoặc:

```bash
chmod +x install-bmad.sh
./install-bmad.sh
```

## Kiểm tra

```bash
test -f _bmad/_config/manifest.yaml
test -d .agents/skills
```

## Bắt đầu với Codex

```text
Đọc IDEA.md, dùng bmad-spec để tạo SPEC.md trong _bmad-output,
sau đó dùng bmad-help để đề xuất workflow tiếp theo.
Chưa viết code cho đến khi đặc tả MVP hoàn chỉnh.
```
