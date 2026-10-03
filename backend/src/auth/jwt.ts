import { createSecretKey } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

function secretKey(secret: string) {
  return createSecretKey(Buffer.from(secret, "utf8"));
}

export interface SessionClaims {
  sub: string;
  email: string;
}

export async function signSession(
  claims: SessionClaims,
  secret: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const key = secretKey(secret);
  return new SignJWT({ email: claims.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(key);
}

export async function verifySession(
  token: string,
  secret: string,
): Promise<SessionClaims> {
  const key = secretKey(secret);
  const { payload } = await jwtVerify(token, key);
  const sub = payload.sub;
  const email = payload.email;
  if (!sub || typeof sub !== "string") {
    throw new Error("invalid token");
  }
  return {
    sub,
    email: typeof email === "string" ? email : "",
  };
}
