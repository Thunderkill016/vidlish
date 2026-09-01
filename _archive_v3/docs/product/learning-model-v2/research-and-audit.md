# Vidlish — Audit Lesson v1 và tổng hợp bằng chứng học tập

**Trạng thái:** design input, không phải backlog cũ  
**Ngày:** 2026-08-06  
**Phạm vi:** lesson production hiện tại, schema/prompt/pipeline/viewer, và bằng chứng nghiên cứu dùng để thiết kế Learning Model v2

---

## 1. Kết luận điều hành

Lesson hiện tại của Vidlish bảo vệ được một điều rất quan trọng: citation không thể bịa vì model chỉ trả segment ID và server hydrate câu thật từ canonical transcript. Tuy nhiên, nó chưa tạo ra một learning experience. Nó biến transcript thành một JSON tĩnh gồm tóm tắt, danh sách từ, cụm từ, ngữ pháp, câu hỏi và cloze; viewer sau đó in toàn bộ JSON thành một trang dài.

Vấn đề không nằm chủ yếu ở model Gemini, màu sắc hay component. **Schema, prompt và persistence hiện tại đang buộc hệ thống tạo content dump.** Một model tốt hơn vẫn phải lấp đủ các mảng cố định và một viewer đẹp hơn vẫn chỉ trình bày một tài liệu tĩnh.

Learning Model v2 phải giữ invariant grounding của v1 nhưng thay đổi đơn vị sản phẩm:

```text
v1: transcript → document để đọc
v2: learner + video → chuỗi hành động học có trạng thái → bằng chứng hiểu/nhớ/vận dụng
```

---

## 2. Bằng chứng production trực tiếp

### 2.1 Screenshot được cung cấp ngày 2026-08-06

Trang production `/lessons/35d963b3-25d7-4fd3-897c-0b212b562a7e` hiển thị:

- tiêu đề “IShowSpeed Phản Ứng Với Các Đoạn Clip Discord”;
- nhãn `C1` và “trình độ video C1”;
- một khối tóm tắt song ngữ;
- một danh sách “Từ vựng (6)”;
- các mục như `dip`, `qualify`, `relegated`, `expired`, `absence`;
- mỗi mục có định nghĩa, ví dụ mới và timestamp câu thật.

Các ví dụ mới nhìn thấy trong screenshot gồm:

- `House prices tend to dip during the winter months.`
- `The national team worked hard to qualify for the world championship.`
- `If they lose the next match, the club will be relegated to the second division.`
- `The milk in the fridge has expired, so we should throw it away.`

Những câu này có thể đúng về ngữ pháp nhưng không giúp người học hiểu cách IShowSpeed phản ứng, cách livestream vận hành, sắc thái khẩu ngữ, nhịp lời nói, thái độ, hay cách dùng ngôn ngữ trong đúng ngữ cảnh video. Chúng tạo ra một bài từ vựng tổng quát tình cờ gắn timestamp, không phải một vòng học từ video.

### 2.2 Triệu chứng UX

Trang production có một cột nội dung hẹp, nhiều card xếp dọc và thanh cuộn rất dài. Video không hiện cạnh task; evidence mở ra tab YouTube mới. Người học có thể:

- đọc tóm tắt trước khi tự xác định ý chính;
- nhìn toàn bộ từ/cụm/ngữ pháp trước khi thử nghe;
- mở đáp án bằng `<details>` mà không submit attempt;
- bỏ qua toàn bộ task mà hệ thống vẫn không phân biệt với completion;
- không có trạng thái học được lưu.

Đây là **progressive dumping**, không phải progressive disclosure.

---

## 3. Audit code hiện tại

### 3.1 Schema ép model lấp đầy nội dung

`src/shared/contracts/lesson.ts` định nghĩa `lesson:v1` bằng các mảng cố định:

| Trường | Ràng buộc |
|---|---:|
| vocabulary | 6–20 |
| phrases | 3–8 |
| grammarPoints | 1–3 |
| comprehensionQuestions | 3–6 |
| clozeItems | 1–4 |
| difficultyReasonsVi | 1–4 |

Đây là lỗi thiết kế quan trọng nhất. Số lượng tối thiểu trở thành target tối ưu hóa của model. Khi transcript không có sáu language items thật sự đáng học, model vẫn phải tìm đủ sáu mục hoặc bị server từ chối.

Hệ quả:

1. **Filler pressure:** model chọn mục có thể giải thích được thay vì mục có giá trị sư phạm cao nhất.
2. **Category pressure:** mọi video phải có ngữ pháp, vocabulary list và cloze dù genre/mục tiêu không phù hợp.
3. **No learner gap:** schema không biết người học đã biết gì.
4. **No time budget:** bài 5 phút và 30 phút cùng một cấu trúc.
5. **No learning outcome:** schema mô tả content, không mô tả learner action hay can-do outcome.
6. **No provenance class:** source quote, explanation và generated example chưa được phân loại rõ trong contract.
7. **No session state:** không có unseen, attempted, feedback, retrieval, transfer hay completed.

### 3.2 Prompt củng cố sai mục tiêu

`src/adapters/gemini/gemini-lesson-provider.ts` ghi rõ:

> “Video càng có nhiều thứ đáng học thì càng phải soạn gần mức tối đa; chỉ dừng ở mức tối thiểu khi transcript thật sự nghèo nội dung.”

Prompt sau đó lặp lại các quota bắt buộc. Đây là một proxy sai cho chất lượng: **nhiều mục hơn không đồng nghĩa học tốt hơn**.

Prompt còn yêu cầu `exampleEn` là câu mới do model viết. Vì không có ràng buộc về communicative outcome hay target scenario, model có động lực tạo câu generic, như các ví dụ trong screenshot.

### 3.3 Pipeline chỉ có một learner attribute

`LessonGenerationInput` hiện chứa:

- `cefrLevel`;
- video title/channel;
- toàn bộ permitted transcript segments.

Nó không chứa:

- mục tiêu người học;
- time budget;
- mục đã biết/yếu;
- lịch sử attempt;
- preferred support;
- vocabulary coverage estimate;
- video diagnostics;
- candidate spans đã được lọc;
- target outcomes.

`GenerateLesson.execute()` thực hiện một lần gọi provider cho toàn bộ bài rồi publish. Không có bước chẩn đoán, candidate selection, blueprint compilation hoặc quality gate theo learning outcome.

### 3.4 Persistence coi lesson là document bất biến duy nhất

Bảng `lessons` lưu:

- `draft jsonb`;
- `citations jsonb`;
- provenance/token metadata.

Đây là persistence phù hợp với artifact tĩnh, nhưng không đủ cho trải nghiệm học có trạng thái. Không có:

- lesson session;
- activity attempt;
- idempotency key của attempt;
- reveal state;
- completion policy;
- item mastery/review state;
- learner reflection;
- due-at cho spaced retrieval.

### 3.5 Viewer render schema thành trang dài

`lesson-view.tsx` render tuần tự:

1. header;
2. summary;
3. vocabulary;
4. phrases;
5. grammar;
6. comprehension questions;
7. cloze.

Đáp án nằm trong `<details>`. Không có form submission, scoring, focus flow, phase gate hay state persistence. Timestamp là link mở tab YouTube thay vì player control trong task context.

### 3.6 Fixture làm CI xanh nhưng mô phỏng chính content dump

`FixtureLessonProvider` tạo `term1…term6`, `phrase 1…3`, “Thì hiện tại đơn” và ba câu hỏi placeholder. Fixture chứng minh schema/persistence/render chạy, nhưng không chứng minh giá trị học tập hoặc content selection. Vì fixture được cấu trúc theo quota của v1, CI mặc định củng cố chính thiết kế cần thay.

---

## 4. Phân loại vấn đề

### 4.1 Pedagogy

- Không có can-do outcome quan sát được.
- Không có activation/prediction thực sự.
- Summary reveal trước effort làm mất retrieval/gist task.
- Language items không được chọn theo learner gap và communicative usefulness.
- Không có retrieval trước reveal.
- Không có transfer sang context mới có tiêu chí tự kiểm.
- Không có delayed review.

### 4.2 Content quality

- Ví dụ generic tách khỏi video.
- Category quota tạo filler.
- `estimatedLevel` của video dễ bị hiểu nhầm thành trình độ người học.
- Không phân biệt item cần để hiểu video với item đáng mang sang giao tiếp.
- Không mô hình hóa register, function, pronunciation/acoustic difficulty.

### 4.3 UX

- Video, task và evidence tách rời.
- Một trang dài tạo cảm giác tài liệu tham khảo, không phải phiên học.
- Tất cả nội dung và đáp án xuất hiện quá sớm.
- Không có current step, progress có nghĩa hay resume state.
- Không có mobile learning flow quanh player.

### 4.4 System architecture

- One-shot generation tạo coupling lớn giữa selection, explanation và activity authoring.
- Immutable lesson artifact và mutable learner state bị thiếu phân tách.
- Schema v1 không thể biểu diễn nguồn gốc content rõ ràng.
- Không có deterministic runtime evaluator cho task đóng.
- Không có learner model tối thiểu.
- Metrics hiện dễ đo generation/completion nhưng chưa đo learning.

---

## 5. Research synthesis

### 5.1 CEFR: action-oriented, can-do và learner agency

**Nguồn chính thức**

- Council of Europe, *CEFR Companion Volume* (2020): https://book.coe.int/en/education-and-modern-languages/8152-common-european-framework-of-reference-for-languages-learning-teaching-assessment-companion-volume.html
- Council of Europe, *The CEFR in the classroom*: https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-in-the-classroom

**Kết luận áp dụng**

CEFR không nên chỉ được dùng như một label độ khó. Descriptors được dùng để liên kết planning, activity và assessment; action-oriented approach coi người học là tác nhân thực hiện hành động có mục đích.

**Quyết định thiết kế**

- Mỗi lesson có 2–4 can-do outcomes, không chỉ `estimatedLevel`.
- Mỗi activity phải liên kết ít nhất một outcome.
- Transfer task phải yêu cầu hành động giao tiếp có audience/context, không chỉ chọn đáp án.
- CEFR learner target và video challenge profile là hai object riêng.

**Mức chắc chắn:** cao cho nguyên tắc; trung bình cho cách ánh xạ tự động từ video vì CEFR không cung cấp thuật toán AI authoring.

### 5.2 Task-based language teaching

**Nguồn**

- Bryfonski & McKay, *TBLT implementation and evaluation: A meta-analysis*: https://doi.org/10.1177/1362168817744389

**Kết luận áp dụng**

TBLT nhấn mạnh sử dụng ngôn ngữ trong task có ý nghĩa thay vì chỉ học danh mục form. Bằng chứng tổng hợp hỗ trợ TBLT nhưng hiệu quả phụ thuộc quality of implementation và context.

**Quyết định thiết kế**

- Lesson kết thúc bằng transfer/self-check chứ không kết thúc ở vocabulary list.
- Controlled practice phục vụ task cuối, không tồn tại độc lập.
- Outcome và task scenario được chọn trước language focus.

**Mức chắc chắn:** trung bình-cao. Meta-analysis tổng hợp classroom programmes, không trực tiếp kiểm thử micro-lesson từ video cá nhân.

### 5.3 Retrieval practice

**Nguồn gốc**

- Roediger & Karpicke, *Test-enhanced learning: Taking memory tests improves long-term retention* (2006): https://pubmed.ncbi.nlm.nih.gov/16507066/
- Roediger et al., classroom evidence (2011): https://pubmed.ncbi.nlm.nih.gov/22082095/

**Kết luận áp dụng**

Repeated study có thể tạo cảm giác quen thuộc cao, trong khi retrieval cải thiện delayed retention. Retrieval phải xảy ra trước khi target/answer được reveal.

**Quyết định thiết kế**

- Summary/answer/transcript không mặc định lộ trước first attempt.
- Mỗi target language item quan trọng phải có ít nhất một retrieval event.
- Reopen lesson không chỉ hiển thị document; nó ưu tiên item đến hạn review.

**Mức chắc chắn:** cao cho retrieval effect; trung bình cho schedule tối ưu trong product này vì cần đo với người dùng Vidlish.

### 5.4 Distributed practice / spacing

**Nguồn**

- Cepeda et al., *Distributed practice in verbal recall tasks: A review and quantitative synthesis* (2006): https://pubmed.ncbi.nlm.nih.gov/16719566/
- Cepeda et al., optimizing gaps (2009): https://pubmed.ncbi.nlm.nih.gov/19439395/

**Kết luận áp dụng**

Phân bố retrieval qua thời gian thường tốt hơn massed restudy; khoảng cách tối ưu phụ thuộc retention interval và item strength.

**Quyết định thiết kế**

- Lưu `nextReviewAt`, `lastOutcome`, `successfulRetrievals`, không chỉ `completedAt`.
- Phiên đầu dùng schedule bảo thủ, có thể điều chỉnh sau dữ liệu thật.
- Không tuyên bố mastery chỉ vì hoàn thành một lesson.

**Mức chắc chắn:** cao cho spacing tổng quát; thấp-trung bình cho thuật toán review cá nhân ban đầu.

### 5.5 Captioned audiovisual input

**Nguồn tổng hợp**

- Montero Perez, Van den Noortgate & Desmet, captioned video meta-analysis (2013): https://doi.org/10.1016/j.system.2013.07.013
- Kurokawa, Hein & Uchihara, captioned viewing vocabulary meta-analysis (2025): https://doi.org/10.1111/lang.12697
- Montero Perez, review of audiovisual input/on-screen text (2022): https://doi.org/10.1017/S0261444821000501

**Kết luận áp dụng**

Captions thường hỗ trợ comprehension và vocabulary, nhưng hiệu quả bị moderator bởi task, material, learner và measurement. Caption không nên bị coi là luôn bật hoặc luôn có hại.

**Quyết định thiết kế**

- Caption là scaffold có kiểm soát: first viewing có thể tắt; focused viewing cho bật/tắt theo task và learner profile.
- Không khóa số lượt nghe.
- Record caption mode để nghiên cứu, không dùng nó làm điểm năng lực.

**Mức chắc chắn:** trung bình-cao về lợi ích tổng thể; không đủ để đặt một policy caption duy nhất cho mọi learner/video.

### 5.6 Entertainment video cần instructional layer mạnh

**Nguồn**

- *The effects of audiovisual input on second language learning: A meta-analysis* (2026): https://doi.org/10.1017/S0272263126101612

**Kết luận áp dụng**

Audiovisual input có thể tạo learning gains, nhưng video category có vai trò; entertainment-focused materials cho hiệu quả thấp hơn educational/language-focused materials trong tổng hợp này.

**Quyết định thiết kế**

- Vidlish không được giả định “xem video thật = học”.
- Video diagnosis phải tìm teachable moments và có quyền tạo lesson ngắn, yêu cầu đổi video, hoặc nói rõ video này chỉ phù hợp listening exposure.
- Entertainment video cần segmentation, purpose, evidence task và transfer rõ hơn.

**Mức chắc chắn:** trung bình. Meta-analysis mới, category rộng và không đồng nghĩa mọi entertainment video đều kém.

### 5.7 Multimedia segmenting và cognitive load

**Nguồn**

- Rey et al., *A Meta-analysis of the Segmenting Effect* (2019): https://doi.org/10.1007/s10648-018-9456-4
- Mayer, principles for managing essential processing: https://doi.org/10.1017/9781108894333.020

**Kết luận áp dụng**

Meaningful, learner-paced segments có lợi cho retention/transfer và giảm cognitive load trong nhiều bối cảnh multimedia, dù có thể tăng thời gian học.

**Quyết định thiết kế**

- Focused viewing dùng clip windows có điểm bắt đầu/kết thúc có nghĩa, không dùng full-video scroll.
- Một task chính mỗi màn hình/step.
- Player, instruction và evidence cùng context; không mở tab ngoài làm flow mặc định.

**Mức chắc chắn:** trung bình-cao cho multimedia learning; cần kiểm thử đoạn dài bao nhiêu theo genre/video.

### 5.8 Lexical coverage và content selection

**Nguồn**

- Van Zeeland & Schmitt, listening coverage (2013): https://doi.org/10.1093/applin/ams074
- Montero Perez, Peters & Desmet, viewing coverage study: https://doi.org/10.1017/S0272263122000407

**Kết luận áp dụng**

Comprehension giảm khi lexical coverage giảm. Các threshold như 95% là context-sensitive, không phải universal product rule.

**Quyết định thiết kế**

- Dùng coverage estimate như một diagnostic signal, không như verdict tuyệt đối.
- Chọn language items để vừa unlock comprehension vừa có transfer value.
- Không chọn từ chỉ vì hiếm; dùng learner gap, recurrence/usefulness, contextual clarity, register/function và acoustic evidence.

**Mức chắc chắn:** trung bình; nghiên cứu thường dùng documentary/controlled manipulation và sample cụ thể.

### 5.9 Formative feedback

**Nguồn**

- Shute, *Focus on Formative Feedback* (2008): https://doi.org/10.3102/0034654307313795
- Wisniewski, Zierer & Hattie, *The Power of Feedback Revisited* (2020): https://doi.org/10.3389/fpsyg.2019.03087

**Kết luận áp dụng**

Feedback nhìn chung có tác động dương nhưng rất không đồng nhất. Feedback hữu ích cần cụ thể, liên quan task/process, hỗ trợ bước tiếp theo; generic praise hoặc chỉ báo đúng/sai là chưa đủ.

**Quyết định thiết kế**

- Feedback trả lời ba câu: mục tiêu là gì, response hiện tại cho thấy gì, bước tiếp theo là gì.
- Task đóng được chấm deterministic và giải thích bằng grounded evidence.
- Không dùng feedback phán xét con người (`Bạn yếu`, `Xuất sắc`) hoặc gamification thay cho hướng dẫn.

**Mức chắc chắn:** cao về việc feedback không phải một treatment đồng nhất; trung bình về timing tối ưu theo từng task.

### 5.10 Open-response grading và learner model

**Nguồn**

- Wang, Maeda & Chang, learner-model systematic review (2025): https://doi.org/10.1016/j.compedu.2024.105184
- Eneye et al., cross-disciplinary survey of LLM auto-grading (2025): https://aclanthology.org/2025.bea-1.35/

**Kết luận áp dụng**

Adaptive systems thường cần domain model, learner model, adaptation logic và UI. Automated grading of open responses remains context-sensitive; reported reliability varies by domain, rubric and evaluation setup.

**Quyết định thiết kế**

- Learner model v2 bắt đầu nhỏ: target CEFR, goals, time budget, item exposure/attempt/retrieval history và support preference.
- Open transfer response dùng self-check criteria + exemplar/reveal, không fake-grade thành đúng/sai.
- AI feedback cho open response là future opt-in feature cần calibration/human-evaluated benchmark, không nằm trong vertical slice đầu.

**Mức chắc chắn:** trung bình. Adaptive-learning literature rộng hơn SLA; evidence auto-grading thay đổi nhanh và không đủ để trao quyền grading tự động trong MVP.

---

## 6. Evidence → design decision matrix

| Bằng chứng | Quyết định không thương lượng trong v2 |
|---|---|
| CEFR action-oriented | outcome/task trước content category |
| Retrieval practice | attempt trước reveal |
| Spacing | completion không bằng mastery; có review state |
| Caption research | caption là scaffold điều khiển được |
| Entertainment video lower effect | video diagnosis + teachable-moment selection |
| Segmenting effect | learner-paced clip windows, một task trọng tâm |
| Lexical coverage | coverage signal, không label CEFR đơn giản |
| Feedback evidence | deterministic, evidence-specific, next-step feedback |
| Auto-grading uncertainty | không fake-grade open response |
| Current grounding success | giữ canonical segment IDs và server hydration |

---

## 7. Những điều nghiên cứu không chứng minh

Để tránh biến paper thành khẩu hiệu sản phẩm:

- Không có paper nào chứng minh đúng 11 phase là tối ưu cho Vidlish.
- Không có threshold lexical coverage duy nhất áp dụng cho mọi video, accent và learner.
- Không có bằng chứng rằng CEFR có thể được suy ra chính xác chỉ từ transcript.
- Không có bằng chứng rằng LLM tự chọn teachable moments luôn đáng tin.
- Không có bằng chứng rằng completion, time-on-task hay số click là learning.
- Không có bằng chứng đủ mạnh để LLM grade open response mà không benchmark/human oversight.
- Không có spacing schedule “chuẩn” cho toàn bộ learner population của Vidlish.

Vì vậy v2 phải thiết kế để đo, hiệu chỉnh và fail honestly thay vì hardcode các tuyên bố trên thành sự thật.

---

## 8. Yêu cầu thiết kế rút ra từ audit

Một thiết kế chỉ được chuyển sang implementation khi nó đáp ứng đồng thời:

1. Không còn quota content cố định làm proxy chất lượng.
2. Learner context và video diagnosis là input hạng nhất.
3. Có 2–4 can-do outcomes và trace từ activity về outcome.
4. Source quote, pedagogical explanation và generated transfer example có provenance riêng.
5. Lesson artifact bất biến tách khỏi session/attempt/mastery mutable.
6. Attempt xảy ra trước answer/reveal trong runtime, không chỉ được ghi trong prompt.
7. Closed task scoring deterministic; open task không fake-grade.
8. Video, task và evidence ở cùng interaction context.
9. Lesson có thể ngắn, dài hoặc từ chối tạo khi teachable value thấp.
10. Measurement plan có immediate comprehension, delayed recall và transfer, không chỉ engagement.

Tài liệu thiết kế tương ứng nằm tại `docs/product/learning-model-v2/design.md`.
