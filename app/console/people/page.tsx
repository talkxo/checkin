"use client";

// force-dynamic: the workspace reads ?new=1 via useSearchParams, which can't
// be prerendered statically — same pattern the legacy /admin page uses.
export const dynamic = "force-dynamic";

import { PeopleWorkspace } from "@/components/console/people-workspace";

export default function ConsolePeoplePage() {
  return <PeopleWorkspace />;
}

