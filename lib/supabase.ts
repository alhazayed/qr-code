import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export type QRCode = {
  id: string;
  name: string;
  destination_url: string;
  created_at: string;
  total_scans: number;
  last_scanned_at: string | null;
  user_id: string;
};

export type Scan = {
  id: string;
  qr_code_id: string;
  scanned_at: string;
  user_agent: string | null;
  ip: string | null;
  country: string | null;
};

export type Plan = "free" | "starter" | "pro";

export type UserPlan = {
  user_id: string;
  plan: Plan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  scan_count_this_month: number;
  billing_period_start: string;
};

export const PLAN_LIMITS = {
  free:    { codes: 3,         scans: 500,    label: "Free",    price: 0  },
  starter: { codes: 25,        scans: 10000,  label: "Starter", price: 9  },
  pro:     { codes: Infinity,  scans: Infinity, label: "Pro",   price: 29 },
};
