"use strict";
const crypto = require("crypto");

module.exports = async function (fastify) {
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

  // --- helpers (idénticos a la verificación que ya usabas) ---
  function b64uToBuf(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
    return Buffer.from(s, "base64");
  }
  function parseJwt(token) {
    const [h, p, s] = token.split(".");
    const header = JSON.parse(Buffer.from(b64uToBuf(h)).toString("utf8"));
    const payload = JSON.parse(Buffer.from(b64uToBuf(p)).toString("utf8"));
    const signature = b64uToBuf(s);
    return { h, p, s, header, payload, signature };
  }
  let jwksCache = new Map(); let jwksExpAt = 0;
  async function getGoogleJwkByKid(kid) {
    const now = Date.now();
    if (now < jwksExpAt && jwksCache.has(kid)) return jwksCache.get(kid);
    const res = await fetch("https://www.googleapis.com/oauth2/v3/certs", { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudo obtener JWKS de Google");
    const { keys } = await res.json();
    jwksCache = new Map(); for (const k of keys) jwksCache.set(k.kid, k);
    jwksExpAt = now + 60 * 60 * 1000;
    const jwk = jwksCache.get(kid); if (!jwk) throw new Error("KID no encontrado");
    return jwk;
  }
  function importRsaPublicKeyFromJwk(jwk) {
    return crypto.createPublicKey({ key: jwk, format: "jwk" });
  }
  function verifyRS256(data, signature, publicKey) {
    return crypto.verify("RSA-SHA256", Buffer.from(data), publicKey, signature);
  }
  function pickDisplayName(db, email) {
    const base = (email.split("@")[0] || "user").replace(/[^a-zA-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 20) || "user";
    const exists = (name) => db.prepare("SELECT 1 FROM users WHERE display_name = ?").get(name);
    if (!exists(base)) return base;
    for (let i = 1; i < 1000; i++) { const cand = `${base}_${i}`; if (!exists(cand)) return cand; }
    return base + "_" + Date.now().toString(36);
  }

  fastify.post("/auth/google/oauth-code", async (req, reply) => {
    try {
      const { code } = req.body || {};
      if (!code) return reply.code(400).send("Falta code");
      if (!CLIENT_ID || !CLIENT_SECRET) return reply.code(500).send("Config Google incompleta");

      // 1) Intercambiar code -> tokens
      const params = new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: "postmessage"
      });
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
      });
      if (!tokenRes.ok) {
        const t = await tokenRes.text();
        return reply.code(401).send("Intercambio de código fallido");
      }
      const tok = await tokenRes.json();
      const id_token = tok.id_token;
      if (!id_token) return reply.code(401).send("Respuesta sin id_token");

      // 2) Verificar id_token (RS256)
      const { h, p, signature, header, payload } = parseJwt(id_token);
      if (header.alg !== "RS256" || !header.kid) return reply.code(400).send("JWT no soportado");
      const jwk = await getGoogleJwkByKid(header.kid);
      const publicKey = importRsaPublicKeyFromJwk(jwk);
      const ok = verifyRS256(`${h}.${p}`, signature, publicKey);
      if (!ok) return reply.code(401).send("Firma inválida");

      const now = Math.floor(Date.now() / 1000);
      const issOk = payload.iss === "https://accounts.google.com" || payload.iss === "accounts.google.com";
      if (!issOk) return reply.code(401).send("iss inválido");
      if (payload.aud !== CLIENT_ID) return reply.code(401).send("aud inválido");
      if (payload.exp < now) return reply.code(401).send("Token expirado");
      if (payload.email_verified === false) return reply.code(401).send("Email no verificado");

      const email   = payload.email;
      const name    = payload.name || payload.given_name || email?.split("@")[0];
      const picture = payload.picture || null;
      if (!email) return reply.code(400).send("Email no presente en token");

      // 3) Upsert usuario + sesión (SQLite)
      const db = fastify.db;
      db.prepare(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT UNIQUE NOT NULL,
        password_hash TEXT NULL,
        avatar_path TEXT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`).run();

      const sel = db.prepare("SELECT * FROM users WHERE email = ?");
      let user = sel.get(email);
      if (!user) {
        const dn = pickDisplayName(db, email);
        const ins = db.prepare("INSERT INTO users(email, display_name, password_hash, avatar_path) VALUES (?, ?, NULL, ?)");
        const info = ins.run(email, dn, picture);
        user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
      } else {
        db.prepare("UPDATE users SET avatar_path = COALESCE(?, avatar_path), updated_at = datetime('now') WHERE id = ?").run(picture, user.id);
      }

      req.session.uid = user.id;
      return reply.send({ id: user.id, email: user.email, display_name: user.display_name, avatar: user.avatar_path });
    } catch (e) {
      req.log.error(e);
      return reply.code(400).send("Fallo en login con Google");
    }
  });
};
