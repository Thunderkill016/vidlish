import "server-only";

import { Inngest } from "inngest";

const eventKey = process.env.INNGEST_EVENT_KEY;

export const inngest = new Inngest({
  id: "vidlish",
  ...(eventKey ? { eventKey } : {}),
});
