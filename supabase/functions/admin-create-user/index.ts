// Eltuff — admin-create-user edge function
//
// Creates a login account for the Eltuff portal WITHOUT any email verification.
// Runs with the service role, but only after verifying the caller is an Eltuff
// admin (any role) or staff (client role only). Supports two login types:
//   - "email": account keyed by a real email address
//   - "phone": account keyed by a synthetic email derived from the phone number,
//              so the person signs in with phone + password and no SMS/email is
//              ever required.
//
// The real phone number is stored on eltuff.profiles.phone for display.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const PHONE_EMAIL_DOMAIN = "phone.eltuffventures.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Normalize a Ghanaian phone number to E.164 digits (no leading +).
// 0244000000 -> 233244000000 ; +233 24 400 0000 -> 233244000000
function normalizePhoneDigits(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("233")) return d;
  if (d.startsWith("0")) return "233" + d.slice(1);
  if (d.length === 9) return "233" + d;
  return d;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Identify the caller from their JWT
  const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  if (!jwt) return json({ error: "Not authenticated" }, 401);
  const { data: callerData, error: callerErr } = await admin.auth.getUser(jwt);
  if (callerErr || !callerData?.user) return json({ error: "Not authenticated" }, 401);
  const callerId = callerData.user.id;

  // 2. Check the caller's Eltuff role
  const { data: callerRoles } = await admin
    .schema("eltuff")
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId);
  const roles = (callerRoles ?? []).map((r: { role: string }) => r.role);
  const isAdmin = roles.includes("admin");
  const isStaff = roles.includes("staff");
  if (!isAdmin && !isStaff) return json({ error: "Not authorized" }, 403);

  // 3. Parse and validate input
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const loginType = body.login_type === "phone" ? "phone" : "email";
  const fullName = String(body.full_name ?? "").trim();
  const password = String(body.password ?? "");
  const requestedRole = String(body.role ?? "client");
  const role = ["client", "staff", "admin"].includes(requestedRole)
    ? requestedRole
    : "client";
  const companyName = String(body.company_name ?? "").trim();
  const address = String(body.address ?? "").trim();
  const clientTier = ["retail", "wholesale", "distributor"].includes(
    String(body.client_tier ?? ""),
  )
    ? String(body.client_tier)
    : "retail";

  // Staff may only create client logins; admin may create any role.
  if (!isAdmin && role !== "client") {
    return json({ error: "Only an admin can create staff or admin logins" }, 403);
  }
  if (!fullName) return json({ error: "Full name is required" }, 400);
  if (password.length < 6)
    return json({ error: "Password must be at least 6 characters" }, 400);

  let email: string;
  let phoneDigits = "";
  if (loginType === "phone") {
    phoneDigits = normalizePhoneDigits(String(body.phone ?? ""));
    if (phoneDigits.length < 11)
      return json({ error: "Enter a valid phone number" }, 400);
    email = `${phoneDigits}@${PHONE_EMAIL_DOMAIN}`;
  } else {
    email = String(body.email ?? "").trim().toLowerCase();
    if (!email.includes("@")) return json({ error: "Enter a valid email" }, 400);
  }

  // 4. Create the account, auto-confirmed (no verification email is sent)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      app: "eltuff",
      role,
      login_type: loginType,
      phone: phoneDigits,
    },
  });

  if (createErr || !created?.user) {
    const msg = createErr?.message ?? "Could not create account";
    const dup = /already|registered|exists|duplicate/i.test(msg);
    return json(
      {
        error: dup
          ? loginType === "phone"
            ? "That phone number already has a login"
            : "That email already has a login"
          : msg,
      },
      dup ? 409 : 400,
    );
  }

  // 5. Fill in extra profile fields the signup trigger doesn't set
  const profilePatch: Record<string, unknown> = {};
  if (companyName) profilePatch.company_name = companyName;
  if (address) profilePatch.address = address;
  if (role === "client") profilePatch.client_tier = clientTier;
  if (Object.keys(profilePatch).length > 0) {
    await admin
      .schema("eltuff")
      .from("profiles")
      .update(profilePatch)
      .eq("user_id", created.user.id);
  }

  return json({
    ok: true,
    user_id: created.user.id,
    login_type: loginType,
    login_hint: loginType === "phone" ? phoneDigits : email,
  });
});
