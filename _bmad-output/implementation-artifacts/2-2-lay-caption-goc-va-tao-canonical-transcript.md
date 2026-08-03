# Story 2.2: Lấy caption gốc và tạo canonical transcript

Status: done

## Story

As a người học có video với caption dùng được,
I want Vidlish lấy caption và chuẩn hóa thành transcript thống nhất,
so that flow tiếp tục nhanh mà không cần input thủ công.

## Scope

- Dùng strategy `supadata-native-caption` qua universal transcript endpoint.
- Request bắt buộc `mode=native`, `text=false`, không gửi `lang` và không gọi translation endpoint.
- Local/CI dùng fixture, không gọi provider thật.
- `transcript-unavailable` hoặc content rỗng trở thành `NO_USABLE_CAPTIONS`, không phải unsupported language.
- Provider payload phải qua Zod trước khi thành transcript candidate.
- Normalization deterministic: Unicode NFC, whitespace, timestamp sort, invalid/empty/exact duplicate removal; không sửa, dịch hoặc bịa nội dung.
- Persist transcript, segments và acquisition attempt atomically với RLS và dedupe.
- Chỉ sau commit mới chuyển `normalizing_transcript` sang `checking_language`.
- Không gắn transcript-level language là English trước Story 2.3.

## Acceptance Criteria

1. Native request contract chính xác và server-only.
2. Provenance giữ source/provider/declared language/available languages; manual/auto và translated/original để `unknown` khi provider không chứng minh được.
3. No-caption không tạo artifact rỗng và không fail bằng language error.
4. Candidate/canonical schemas strict; raw payload không đi vào UI/log/persistence.
5. Hash và stable segment IDs lặp lại được với cùng input + version.
6. Atomic RPC/repository ngăn duplicate và cross-owner access.
7. Workflow chỉ tới `checking_language` sau transcript commit.
8. UI giữ learner phases hiện có, không lộ tên provider.
9. Tests bao phủ adapter, normalization, atomic persistence, RLS, retry và state transition; không live provider.

## Tasks

- [x] Contracts và strategy/repository ports.
- [x] Supadata native adapter + fixture.
- [x] Deterministic normalizer.
- [x] Migration, atomic RPC, RLS và repositories.
- [x] Workflow integration.
- [x] Unit, adapter, SQL/RLS và workflow tests.
- [x] Targeted checks và một full CI trước merge.

## Validation Record

- Result: PASS.
- Story kết thúc tại committed transcript và `checking_language`; chưa chạy language detector.

## Completion Record

- PR: #5 — `Story 2.2: Native captions and canonical transcript`.
- Squash merge: `104edbd1e5f9e8812e592c9a9d4c5b3f6d39f22e`.
- Final CI: run `30851142219`; quality, Chromium journeys và Supabase migration/RLS jobs passed.
- Adversarial review fixes: valid fixture video IDs, composite segment identity scoped per transcript, and inline workflow parity through native-caption acquisition.
- Open findings: none.
