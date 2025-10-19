// backend/src/routes/auth_google.js
"use strict";

const crypto = require("crypto");

module.exports = async function (fastify) {
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  if (!CLIENT_ID) {
    fastify.log.warn("GOOGLE_CLIENT_ID no definido");
  }

  // ---- Cache simple de JWKS (1h) ----
  let jwksCache = new Map();
  let jwksExpAt = 0;

  async function getGoogleJwkByKid(kid) {
    const now = Date.now();
    if (now < jwksExpAt && jwksCache.has(kid)) return jwksCache.get(kid);

    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/certs", {
        // Node 18+ trae fetch global
        // (si no, puedes usar undici)
        cache: "no-store"
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const { keys } = await res.json();
      jwksCache = new Map();
      for (const k of keys) jwksCache.set(k.kid, k);
      jwksExpAt = now + 60 * 60 * 1000; // 1 hora
      const jwk = jwksCache.get(kid);
      if (!jwk) throw new Error("KID no encontrado en JWKS");
      return jwk;
    } catch (error) {
      console.error("Error obteniendo JWKS de Google:", error);
      throw new Error("No se pudo obtener JWKS de Google: " + error.message);
    }
  }

  function b64uToBuf(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    // añade padding si falta
    while (s.length % 4) s += "=";
    return Buffer.from(s, "base64");
  }

  function parseJwt(token) {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Formato JWT inválido");
    const [h, p, s] = parts;
    const header = JSON.parse(Buffer.from(b64uToBuf(h)).toString("utf8"));
    const payload = JSON.parse(Buffer.from(b64uToBuf(p)).toString("utf8"));
    const signature = b64uToBuf(s);
    return { h, p, s, header, payload, signature };
  }

  function importRsaPublicKeyFromJwk(jwk) {
    // Node soporta importar JWK directo
    return crypto.createPublicKey({ key: jwk, format: "jwk" });
  }

  function verifyRS256(data, signature, publicKey) {
    return crypto.verify("RSA-SHA256", Buffer.from(data), publicKey, signature);
  }

  // genera un display_name único a partir del email local-part
  function pickDisplayName(db, email) {
    const base = (email.split("@")[0] || "user")
      .replace(/[^a-zA-Z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 20) || "user";
    const exists = (name) =>
      db.prepare("SELECT 1 FROM users WHERE display_name = ?").get(name);
    if (!exists(base)) return base;
    for (let i = 1; i < 1000; i++) {
      const cand = `${base}_${i}`;
      if (!exists(cand)) return cand;
    }
    return base + "_" + Date.now().toString(36);
  }

  fastify.post("/auth/google", async (req, reply) => {
    try {
      const { id_token } = req.body || {};
      fastify.log.info("Recibida petición de login con Google");
      
      if (!id_token) {
        fastify.log.warn("Falta id_token en la petición");
        return reply.code(400).send("Falta id_token");
      }
      
      if (!CLIENT_ID) {
        fastify.log.error("CLIENT_ID no configurado");
        return reply.code(500).send("Backend sin CLIENT_ID");
      }

      fastify.log.info("Parseando JWT token...");
      // 1) parsear JWT
      const { h, p, s, header, payload, signature } = parseJwt(id_token);
      
      fastify.log.info("Header JWT:", header);
      fastify.log.info("Payload JWT (email hidden):", { 
        ...payload, 
        email: payload.email ? "[HIDDEN]" : undefined 
      });
      
      if (header.alg !== "RS256" || !header.kid) {
        fastify.log.warn("Token no soportado:", { alg: header.alg, kid: header.kid });
        return reply.code(400).send("Token no soportado");
      }

      fastify.log.info("Obteniendo JWK de Google para kid:", header.kid);
      // 2) obtener JWK de Google para este kid
      const jwk = await getGoogleJwkByKid(header.kid);
      if (jwk.kty !== "RSA") {
        fastify.log.warn("KTY no soportado:", jwk.kty);
        return reply.code(400).send("KTY no soportado");
      }

      fastify.log.info("Verificando firma del token...");
      // 3) verificar firma
      const publicKey = importRsaPublicKeyFromJwk(jwk);
      const ok = verifyRS256(`${h}.${p}`, signature, publicKey);
      if (!ok) {
        fastify.log.warn("Firma del token inválida");
        return reply.code(401).send("Firma inválida");
      }

      fastify.log.info("Validando claims del token...");
      // 4) validar claims
      const now = Math.floor(Date.now() / 1000);
      const issOk =
        payload.iss === "https://accounts.google.com" ||
        payload.iss === "accounts.google.com";
      if (!issOk) {
        fastify.log.warn("ISS inválido:", payload.iss);
        return reply.code(401).send("iss inválido");
      }
      
      if (payload.aud !== CLIENT_ID) {
        fastify.log.warn("AUD inválido. Esperado:", CLIENT_ID, "Recibido:", payload.aud);
        return reply.code(401).send("aud inválido");
      }
      
      if (payload.exp < now) {
        fastify.log.warn("Token expirado. Exp:", payload.exp, "Now:", now);
        return reply.code(401).send("Token expirado");
      }
      
      if (payload.email_verified === false) {
        fastify.log.warn("Email no verificado para:", payload.email);
        return reply.code(401).send("Email no verificado");
      }

      const email = payload.email;
      const googleId = payload.sub; // ID único de Google
      const name =
        payload.name || payload.given_name || payload.email.split("@")[0];
      const picture = payload.picture || null;

      if (!email) {
        fastify.log.warn("Email no presente en token");
        return reply.code(400).send("Email no presente en token");
      }

      if (!googleId) {
        fastify.log.warn("Google ID no presente en token");
        return reply.code(400).send("Google ID no presente en token");
      }

      fastify.log.info("Procesando usuario con email:", email, "y Google ID:", googleId);
      // 5) upsert usuario + sesión con lógica de unificación
      const db = fastify.db;

      // Buscar usuario por email O por google_id
      const selectByEmailOrGoogleId = db.prepare("SELECT * FROM users WHERE email = ? OR google_id = ?");
      let user = selectByEmailOrGoogleId.get(email, googleId);

      if (!user) {
        // Usuario completamente nuevo - crear cuenta OAuth
        fastify.log.info("Creando nueva cuenta OAuth para:", email);
        const dn = pickDisplayName(db, email);
        const ins = db.prepare(
          "INSERT INTO users(email, display_name, avatar_path, google_linked, google_id) VALUES (?, ?, ?, 1, ?)"
        );
        const info = ins.run(email, dn, picture, googleId);
        user = db
          .prepare("SELECT * FROM users WHERE id = ?")
          .get(info.lastInsertRowid);
        fastify.log.info("Nueva cuenta OAuth creada con ID:", user.id);
        
      } else if (user.email === email && !user.google_linked) {
        // Usuario existe con mismo email pero sin Google vinculado - VINCULAR
        fastify.log.info("Vinculando cuenta existente con Google para:", email);
        
        // Preservar avatar existente, solo usar Google si no hay avatar previo
        db.prepare(
          "UPDATE users SET google_linked = 1, google_id = ?, avatar_path = COALESCE(avatar_path, ?), updated_at = datetime('now') WHERE id = ?"
        ).run(googleId, picture, user.id);
        
        // Recargar usuario actualizado
        user = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
        fastify.log.info("Cuenta vinculada exitosamente. Avatar preservado:", user.avatar_path);
        
      } else if (user.google_id === googleId) {
        // Usuario ya vinculado con Google - login normal
        fastify.log.info("Login con Google para cuenta ya vinculada:", email);
        
        // Solo actualizar avatar si no hay uno previo
        db.prepare(
          "UPDATE users SET avatar_path = COALESCE(avatar_path, ?), updated_at = datetime('now') WHERE id = ?"
        ).run(picture, user.id);
        
        // Recargar usuario actualizado
        user = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
        
      } else {
        // Caso extraño: otro usuario tiene este google_id pero diferente email
        fastify.log.warn("Conflicto de Google ID con diferente email");
        return reply.code(409).send("Conflicto de identidad Google");
      }

      // sesión
      req.session.uid = user.id;
      
      fastify.log.info("Login exitoso para usuario:", user.id, user.email);

      return reply.send({
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar: user.avatar_path
      });
    } catch (e) {
      fastify.log.error("Error procesando token de Google:", e);
      return reply.code(400).send("Token de Google inválido: " + e.message);
    }
  });

  fastify.post("/auth/google-second", async (req, reply) => {
    try {
      const me = req.session.uid;
      if (!me) return reply.code(401).send({ error: "Unauthorized" });

      const body = req.body || {};
      const token = body.token || body.id_token || body.credential;
      if (!token) return reply.code(400).send({ error: "Falta token" });
      if (!CLIENT_ID) return reply.code(500).send({ error: "Backend sin CLIENT_ID" });

      const { h, p, s, header, payload, signature } = parseJwt(token);

      if (header.alg !== "RS256" || !header.kid) return reply.code(400).send({ error: "Token no soportado" });
      const jwk = await getGoogleJwkByKid(header.kid);
      if (jwk.kty !== "RSA") return reply.code(400).send({ error: "KTY no soportado" });

      const publicKey = importRsaPublicKeyFromJwk(jwk);
      const ok = verifyRS256(`${h}.${p}`, signature, publicKey);
      if (!ok) return reply.code(401).send({ error: "Firma inválida" });

      const now = Math.floor(Date.now() / 1000);
      const issOk = payload.iss === "https://accounts.google.com" || payload.iss === "accounts.google.com";
      if (!issOk) return reply.code(401).send({ error: "iss inválido" });
      if (payload.aud !== CLIENT_ID) return reply.code(401).send({ error: "aud inválido" });
      if (payload.exp < now) return reply.code(401).send({ error: "Token expirado" });
      if (payload.email_verified === false) return reply.code(401).send({ error: "Email no verificado" });

      const email = payload.email;
      const googleId = payload.sub;
      if (!email) return reply.code(400).send({ error: "Email no presente en token" });
      if (!googleId) return reply.code(400).send({ error: "Google ID no presente en token" });

      const db = fastify.db;
      const user = db.prepare("SELECT * FROM users WHERE email = ? OR google_id = ?").get(email, googleId);
      if (!user) return reply.code(401).send({ error: "Usuario no encontrado" });
      if (user.id === me) return reply.code(400).send({ error: "El segundo jugador debe ser diferente" });

      return reply.send({
        id: user.id,
        displayName: user.display_name,
        email: user.email,
        avatar_path: user.avatar_path
      });
    } catch (e) {
      fastify.log.error("google-second error:", e);
      return reply.code(400).send({ error: "Token de Google inválido" });
    }
  });
};
