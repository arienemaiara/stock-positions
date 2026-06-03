import { timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

const USER = process.env.BASIC_AUTH_USER ?? "user";
const PASSWORD = process.env.BASIC_AUTH_PASSWORD;
const REALM = process.env.BASIC_AUTH_REALM ?? "stock-positions";

/**
 * HTTP Basic auth hook. No-op when BASIC_AUTH_PASSWORD is unset, so dev stays
 * open without configuration. When set, every request (including static assets
 * and the SPA fallback) must include valid credentials.
 *
 * Uses timing-safe comparison on both fields so a probing client can't tell
 * whether the username or the password is wrong.
 */
export async function basicAuthHook(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!PASSWORD) return;

  // Health check stays open so platform probes don't need a credential.
  if (req.url === "/api/health") return;

  const header = req.headers.authorization;
  if (!header?.startsWith("Basic ")) {
    return challenge(reply);
  }

  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  } catch {
    return challenge(reply);
  }
  const idx = decoded.indexOf(":");
  if (idx < 0) return challenge(reply);

  const user = decoded.slice(0, idx);
  const pass = decoded.slice(idx + 1);

  if (!safeEqual(user, USER) || !safeEqual(pass, PASSWORD)) {
    return challenge(reply);
  }
}

function challenge(reply: FastifyReply) {
  reply
    .code(401)
    .header("WWW-Authenticate", `Basic realm="${REALM}", charset="UTF-8"`)
    .send({ error: "authentication required" });
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
