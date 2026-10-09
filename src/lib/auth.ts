// Web Crypto based signed session cookie (works in edge middleware and node)
export const COOKIE = "tc_session";
const enc = new TextEncoder();

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function makeToken(): Promise<string> {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 30;
  return `${exp}.${await hmac(process.env.APP_PASSWORD ?? "", "session:" + exp)}`;
}
export async function verifyToken(t?: string | null): Promise<boolean> {
  if (!t || !process.env.APP_PASSWORD) return false;
  const [exp, sig] = t.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = await hmac(process.env.APP_PASSWORD, "session:" + exp);
  if (good.length !== sig.length) return false;
  let d = 0; for (let i = 0; i < good.length; i++) d |= good.charCodeAt(i) ^ sig.charCodeAt(i);
  return d === 0;
}
