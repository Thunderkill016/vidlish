import { createClient } from "@/lib/supabase/server";

import { HeaderShell } from "@/components/layout/header-shell";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const avatarUrl = user?.user_metadata?.avatar_url;
  const fullName = user?.user_metadata?.full_name || user?.email?.split("@")[0];

  return (
    <HeaderShell
      user={user}
      avatarUrl={avatarUrl}
      fullName={fullName}
    />
  );
}