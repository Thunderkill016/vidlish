import { type NextRequest, NextResponse } from "next/server";

import { ValidateVideoUrl } from "@/modules/video";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createVideoMetadataProvider } from "@/platform/video/create-video-metadata-provider";
import { validateVideoUrlRequestSchema } from "@/shared/contracts/video";
import { authErrors, videoErrors } from "@/shared/errors/product-error";
import { readAuthJsonBody } from "@/shared/http/json-body";
import { productErrorResponse } from "@/shared/http/product-error-response";
import { assertSameOrigin } from "@/shared/http/same-origin";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const access = await (await createIdentityService()).resolveCurrentAccess();
    if (!access) throw authErrors.sessionRequired();

    const raw = await readAuthJsonBody(request);
    const parsed = validateVideoUrlRequestSchema.safeParse(raw);
    if (!parsed.success) throw videoErrors.invalidUrl();

    const metadata = await new ValidateVideoUrl(
      createVideoMetadataProvider(),
    ).execute(parsed.data);

    return NextResponse.json(
      { metadata },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return productErrorResponse(error, videoErrors.metadataFailed());
  }
}
