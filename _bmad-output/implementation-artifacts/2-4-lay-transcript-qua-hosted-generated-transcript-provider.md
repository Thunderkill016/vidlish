# Story 2.4: Lấy transcript qua hosted generated-transcript provider

Status: in-progress

## Story

As a người học có video không có native caption hoặc caption evidence quá yếu,
I want Vidlish thử một hosted transcription provider phía server,
so that tôi vẫn có transcript mà chưa cần thao tác thủ công.

## Scope

- Automatic registry giữ thứ tự `supadata-native-caption` rồi `supadata-generated-transcript`.
- Generated strategy chỉ đăng ký khi feature flag, server credential và local cost/duration policy cho phép.
- Supadata request dùng universal `GET /v1/transcript`, `mode=generate`, `text=false`, không gửi `lang` và không gọi translation endpoint.
- HTTP 202/job ID được giữ trong durable workflow state, ghi vào internal attempt metadata và poll với interval/count hữu hạn.
- Reload hoặc duplicate create không tạo provider job mới.
- Provider result phải qua Zod candidate boundary, deterministic normalization, atomic canonical persistence và Story 2.3 language gate.
- Provider-declared language không được tự mở khóa Lesson Engine.
- No-speech/empty result không tạo canonical transcript.
- Local/CI dùng fixtures, không gọi Supadata thật.

## Acceptance Criteria

1. Registry gọi native trước, hosted generated chỉ sau `NO_USABLE_CAPTIONS`, translated-caption rejection hoặc native evidence `insufficient_evidence`.
2. Generated request chỉ dùng canonical public YouTube URL từ validated video ID; không nhận arbitrary URL từ client.
3. Request không có `lang`; output phải phản ánh ngôn ngữ nói trong nguồn.
4. 202 polling dùng bounded durable steps; provider job ID không lộ UI/event public và không tạo request trùng khi workflow resume.
5. 200/poll-completed response giữ timestamp chunks, optional request ID, declared language và provenance `hosted_generated_transcript`.
6. Queued/active tiếp tục poll; failed/404/schema/auth/payment/rate/network được map thành stable result với bounded local behavior.
7. Success đi qua normalization → atomic persistence → `checking_language` → original-English gate; duplicate hash không tạo transcript duplicate.
8. UI chỉ nói Vidlish đang thử cách khác để lấy lời thoại; không hiện Supadata/provider error.
9. Telemetry/attempt metadata chỉ có opaque IDs, result, latency và cost band; không có transcript body.
10. Tests bao phủ registry order, disabled-without-key/policy, exact request, 200, 202 polling, timeout/error mapping, dedupe, language gate và no-live-provider CI.

## Tasks

- [ ] Generalize transcript strategy/candidate contracts and add automatic registry.
- [ ] Add hosted generated Supadata adapter and deterministic async fixture.
- [ ] Add generated-transcript policy and server config.
- [ ] Persist internal provider job metadata and extend canonical transcript constraints.
- [ ] Add durable Inngest polling and inline fixture parity.
- [ ] Add safe progress copy and fallback lifecycle handling.
- [ ] Add unit, adapter, workflow, SQL/RLS and E2E tests.
- [ ] Run targeted checks, adversarial review and final full CI before merge.

## Validation Record

- Result: PASS.
- Story ends at `analyzing_video`, `failed`, or the transcript acquisition boundary; it does not invoke Lesson Engine.
