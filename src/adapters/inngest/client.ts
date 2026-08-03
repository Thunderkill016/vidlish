import "server-only";

import { Inngest } from "inngest";

import { getServerConfig } from "@/platform/config/server";

const config = getServerConfig();

export const inngest = new Inngest({
  id: "vidlish",
  ...(config.INNGEST_EVENT_KEY ? { eventKey: config.INNGEST_EVENT_KEY } : {}),
});
