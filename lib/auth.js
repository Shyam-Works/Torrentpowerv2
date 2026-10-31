import crypto from "crypto";

const COOKIE = "tp_admin";
const MAX_AGE = 60 * 60 * 12; // 12 hours

function secret() {
  const s = process.env.ADMIN_SECRET;
  if (!s || s.length < 16) throw new Error("ADMIN_SECRET must be at least 16 characters");
  return s;
}

function sign(payload) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function checkCredentials(email, password) {
  const okEmail = safeEqual(
    String(email || "").trim().toLowerCase(),
    String(process.env.ADMIN_EMAIL || "").trim().toLowerCase()
  );
  const okPass = safeEqual(String(password || ""), String(process.env.ADMIN_PASSWORD || ""));
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) && okEmail && okPass;
}

function cookieAttrs(maxAge) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function setSessionCookie(res) {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + MAX_AGE })
  ).toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  res.setHeader("Set-Cookie", `${COOKIE}=${token}; ${cookieAttrs(MAX_AGE)}`);
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; ${cookieAttrs(0)}`);
}

export function isAdmin(req) {
  const raw = req.cookies?.[COOKIE];
  if (!raw || !raw.includes(".")) return false;
  const [payload, sig] = raw.split(".");
  try {
    if (!safeEqual(sig, sign(payload))) return false;
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

// Wrap an API handler so only a logged-in admin can call it.
export function requireAdmin(handler) {
  return async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ error: "Not logged in." });
    return handler(req, res);
  };
}
