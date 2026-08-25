import { redirect } from "next/navigation";

import { CONTRASTS } from "@/modules/pronunciation/content/minimal-pairs";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { Card } from "@/shared/ui/card";

import { HearTheDifference } from "./_components/hear-the-difference";

export const dynamic = "force-dynamic";

export default async function ListenPage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--accent)]">Luyện tai</p>
        <h1 className="text-3xl font-bold tracking-tight">
          Nghe ra sự khác nhau
        </h1>
        <p className="max-w-2xl text-[var(--muted-foreground)]">
          Có những âm tiếng Anh mà tai người Việt chưa tách ra được — không phải
          vì nghe kém, mà vì tiếng Việt không dùng đến chúng nên tai chưa bao giờ
          cần phân biệt. Phần này luyện đúng những âm đó.
        </p>
      </div>

      <HearTheDifference />

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Vì sao lại là những âm này</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Không phải lấy từ một danh sách chung về “âm tiếng Anh khó”. Chúng lấy
          từ số liệu đo trên người học Việt Nam: trong cụm hai phụ âm, 77,4% lỗi
          là đổi đặc trưng âm — gần như đều ở /p/, /t/, /k/, vì tiếng Việt hầu
          như không bật hơi. Trong cụm ba phụ âm thì đổi thành nuốt âm, 78,2%.
          Tiếng Việt cũng có rất ít phụ âm cuối và không có cụm phụ âm cuối.
        </p>
        <ul className="flex flex-col gap-1 text-sm">
          {CONTRASTS.map((item) => (
            <li key={item.id}>
              <strong>{item.titleVi}</strong>{" "}
              <span className="text-[var(--muted-foreground)]">
                — {item.pairs.length} cặp từ
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-[var(--muted-foreground)]">
          Cách luyện này có bằng chứng mạnh nhất trong toàn bộ những gì sản phẩm
          này dùng: phân tích tổng hợp 79 nghiên cứu, hiệu quả g = 0,67 khi so
          với nhóm đối chứng, và giữ được lâu dài. Nhưng nó luyện <em>nghe</em>.
          Phần chuyển sang <em>nói</em> chỉ khoảng +10% trên đúng những từ đã
          luyện, nên đây không phải cách sửa giọng, và sản phẩm sẽ không nói khác
          đi.
        </p>
      </Card>
    </div>
  );
}
