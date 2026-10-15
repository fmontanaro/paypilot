// Store do express-session na tabela `sessions`. Também guarda usuário e aparelho
// para a lista de "Sessões ativas" do Perfil.
import session from "express-session";
import { eq, lt } from "drizzle-orm";
import { sessions } from "@shared/schema";
import { db } from "./db";

type Sess = session.SessionData & { userId?: string; device?: string };

export class DbSessionStore extends session.Store {
  constructor(private ttlMs: number) {
    super();
    setInterval(() => void db().delete(sessions).where(lt(sessions.expire, new Date())).catch(() => {}), 60 * 60 * 1000).unref();
  }

  get(sid: string, cb: (err: unknown, s?: session.SessionData | null) => void) {
    db()
      .select()
      .from(sessions)
      .where(eq(sessions.sid, sid))
      .then(([row]) => {
        if (!row || row.expire < new Date()) return cb(null, null);
        cb(null, row.sess as session.SessionData);
      })
      .catch((e) => cb(e));
  }

  set(sid: string, s: session.SessionData, cb?: (err?: unknown) => void) {
    const sess = s as Sess;
    const expire = new Date(Date.now() + this.ttlMs);
    const row = { sid, sess: sess as unknown as Record<string, unknown>, expire, userId: sess.userId ?? null, device: sess.device ?? null, lastSeenAt: new Date() };
    db()
      .insert(sessions)
      .values(row)
      .onConflictDoUpdate({ target: sessions.sid, set: { sess: row.sess, expire, userId: row.userId, device: row.device, lastSeenAt: row.lastSeenAt } })
      .then(() => cb?.())
      .catch((e) => cb?.(e));
  }

  destroy(sid: string, cb?: (err?: unknown) => void) {
    db()
      .delete(sessions)
      .where(eq(sessions.sid, sid))
      .then(() => cb?.())
      .catch((e) => cb?.(e));
  }

  touch(sid: string, s: session.SessionData, cb?: () => void) {
    db()
      .update(sessions)
      .set({ expire: new Date(Date.now() + this.ttlMs), lastSeenAt: new Date() })
      .where(eq(sessions.sid, sid))
      .then(() => cb?.())
      .catch(() => cb?.());
  }
}
