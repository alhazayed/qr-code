import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
    }
  );
}

export async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-token")?.value;
  if (!token) return null;
  const client = createServerClient();
  const { data: { user } } = await client.auth.getUser(token);
  return user;
}
