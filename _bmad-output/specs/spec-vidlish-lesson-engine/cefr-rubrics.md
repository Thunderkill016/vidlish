# CEFR Adaptation Rubrics

## 1. Product-level mapping

| Product label | CEFR |
|---|---|
| Beginner | A1 |
| Elementary | A2 |
| Intermediate | B1 |
| Upper Intermediate | B2 |
| Advanced | C1 |

Rubric này điều khiển selection, explanation, support, question type, activity difficulty và output expectation. Không chỉ thay đổi từ ngữ trong prompt.

## 2. Cross-level invariants

Mọi level đều phải:

- bám transcript segment IDs;
- có objective rõ;
- có ít nhất gist comprehension;
- có language noticing;
- có retrieval;
- có transfer phù hợp level;
- phân biệt source quote và generated example;
- không dùng thuật ngữ ngữ pháp phức tạp hơn mức cần thiết.

## 3. A1 — Beginner

### Learning profile

Người học hiểu cụm từ quen thuộc, thông tin trực tiếp và câu ngắn khi có hỗ trợ mạnh.

### Content selection

- 5–8 language items.
- Ưu tiên từ cụ thể, high-frequency và chunks dùng ngay.
- Không ưu tiên idiom, nuance hoặc discourse analysis.
- Tối đa một insight rất ngắn nếu cần để hiểu video.

### Explanation

- Tiếng Việt trực tiếp, câu ngắn.
- English definition tối đa 8–12 từ, dùng từ cơ bản.
- Ví dụ mới ngắn, một mệnh đề nếu có thể.
- Luôn giải thích context của source quote.

### Support

- Caption Anh đầy đủ; dịch theo yêu cầu.
- Transcript chia chunk nhỏ.
- Cho replay và highlight target form.
- Prompt production có sentence frame.

### Comprehension

- Gist trực tiếp.
- Who/what/where hoặc sequence đơn giản.
- Không dùng inference trừ khi cực rõ.
- Distractor khác biệt rõ, không chơi chữ.

### Practice

- Match meaning.
- Recognition L2 → VI.
- Cloze có word bank.
- Sắp xếp từ/câu ngắn.
- Guided sentence completion.

### Transfer

- Chọn hoặc hoàn thành câu nói về bản thân bằng mẫu cho sẵn.

### Failure signs

- Quá 8 item.
- Giải thích chứa nhiều thuật ngữ tiếng Anh mới.
- Free-writing hoặc open production không scaffold.
- Câu hỏi yêu cầu suy luận thái độ phức tạp.

## 4. A2 — Elementary

### Learning profile

Người học xử lý hội thoại và mô tả quen thuộc, thông tin trực tiếp và routine language.

### Content selection

- 6–10 language items.
- Everyday vocabulary, common collocations và routine chunks.
- Tối đa một grammar/pragmatic insight.

### Explanation

- Tiếng Việt rõ; định nghĩa Anh đơn giản.
- Ví dụ một đến hai câu ngắn.
- Có common error khi lỗi phổ biến và dễ giải thích.

### Support

- Caption Anh mặc định; bản dịch on demand.
- Caption fading có thể dùng ở lượt nghe lại.
- Keyword hints cho retrieval.

### Comprehension

- Gist, direct detail, sequence và simple cause.
- Inference nhẹ chỉ khi evidence rõ.

### Practice

- Fill-in-the-blank có gợi ý.
- Collocation matching.
- True/false + evidence.
- Guided retell theo keywords.
- Short response 1–2 câu.

### Transfer

- Hoàn thành một mini dialogue hoặc dùng target chunk trong tình huống quen thuộc.

## 5. B1 — Intermediate

### Learning profile

Người học hiểu ý chính của speech rõ, theo được narrative/opinion quen thuộc và có thể tạo output có liên kết ngắn.

### Content selection

- 8–12 language items.
- Ít nhất 40% multiword units khi video có đủ evidence.
- Collocations, phrasal verbs, discourse markers và một số pragmatic choices.
- 1–2 insights.

### Explanation

- Tiếng Việt cô đọng + definition English dễ hiểu.
- Giải thích usage, register và context.
- Có contrast với cách dùng sai hoặc kém tự nhiên khi hữu ích.

### Support

- Caption Anh; transcript on demand sau gist.
- Partial caption hoặc cloze cho target segment.
- Không dịch toàn bộ mặc định.

### Comprehension

- Gist, detail, reason, sequence và inference nhẹ.
- Có câu hỏi “evidence ở đâu?”.

### Practice

- Recall VI → EN cho chunks quan trọng.
- Paraphrase có scaffold.
- Dictation/cloze ngắn.
- Role response theo scene.
- Guided summary.

### Transfer

- Tạo 2–4 câu dùng target language trong bối cảnh mới hoặc retell 30 giây theo keyword.

## 6. B2 — Upper Intermediate

### Learning profile

Người học theo được argument, nuance, stance và speech tự nhiên tương đối phức tạp; có thể diễn đạt và bảo vệ quan điểm.

### Content selection

- 8–12 language items.
- Nuance, register, stance markers, discourse organization, idiomatic chunks.
- 1–2 grammar/pragmatic/discourse insights.
- Loại item quá cơ bản trừ khi có usage đặc biệt.

### Explanation

- Tiếng Việt ngắn; English definition tự nhiên hơn.
- So sánh register và alternatives.
- Nêu pragmatic effect và speaker intention.

### Support

- Gist lần đầu không caption hoặc transcript ẩn.
- Caption Anh/annotated transcript sau lượt đầu.
- Keyword/partial caption cho decoding.

### Comprehension

- Gist, detail, inference, attitude, argument structure và implicit relation.
- Distractor có độ khó nhưng vẫn chỉ một đáp án đúng.

### Practice

- Paraphrase.
- Error correction tự nhiên.
- Summary giới hạn từ.
- Debate preparation.
- Mediation: brief cho người khác.

### Transfer

- Phản hồi hoặc phản biện quan điểm; dùng ít nhất hai target chunks.

## 7. C1 — Advanced

### Learning profile

Người học xử lý discourse dài/phức tạp, hàm ý, rhetoric, register và có thể tạo output chính xác theo audience.

### Content selection

- 6–10 item, ít hơn nhưng sâu.
- Stance, rhetoric, pragmatics, cultural reference, idiomaticity và subtle collocation.
- Tránh dạy từ đơn chỉ vì hiếm.
- 1–2 deep insights.

### Explanation

- Tiếng Việt chỉ dùng để làm rõ nuance; có thể dùng English-first definition.
- So sánh alternatives, connotation, register và rhetorical effect.
- Ví dụ mới phải tự nhiên và đa dạng cấu trúc.

### Support

- Không caption ở gist mặc định.
- Transcript annotated sau khi người học đã xử lý nội dung.
- Không bật song ngữ toàn bài.

### Comprehension

- Implication, stance, rhetoric, bias, assumptions, argument gaps và audience effect.
- Không dùng câu hỏi detail tầm thường làm phần lớn assessment.

### Practice

- Synthesis.
- Critical response.
- Register transformation.
- Precise paraphrase.
- Mediation cho audience cụ thể.

### Transfer

- Tạo brief, counterargument, presentation outline hoặc response dài có constraint về audience/register.

## 8. Question-distribution defaults

| Level | Gist | Detail | Inference/attitude | Transfer/production |
|---|---:|---:|---:|---:|
| A1 | 40% | 50% | 0–10% | scaffolded |
| A2 | 30% | 50% | 20% | highly guided |
| B1 | 25% | 40% | 35% | guided-open |
| B2 | 20% | 30% | 50% | open with criteria |
| C1 | 10% | 20% | 70% | audience/register constrained |

Đây là default định hướng, không phải quota tuyệt đối. Genre và evidence có thể điều chỉnh.

## 9. Support-fading rules

- A1: full caption → highlighted caption → cloze có word bank.
- A2: English caption → partial caption → recall có hint.
- B1: no/full caption tùy difficulty → partial caption → no-answer retrieval.
- B2: no caption gist → transcript evidence → production.
- C1: no caption gist/inference → annotated transcript for analysis → synthesis.

## 10. Level validation checklist

Validator phải trả fail khi:

- item count vượt ceiling đáng kể;
- instruction chứa vocabulary/grammar trên level mà không scaffold;
- question type không phù hợp rubric;
- generated example phức tạp hơn target level không có lý do;
- production demand quá cao hoặc quá thấp;
- cùng video giữa các level chỉ đổi wording nhưng giữ nguyên activity/assessment;
- support mode không đúng rubric;
- C1 lesson chủ yếu là dịch nghĩa và multiple choice detail;
- A1 lesson yêu cầu inference/rhetoric hoặc free production dài.
