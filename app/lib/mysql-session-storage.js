// app/lib/mysql-session-storage.js
import { Session } from "@shopify/shopify-api";
import pool from "../db.server.js";

export class MySQLSessionStorage {
  constructor() {
    this.table = "stores"; // your table name
  }

  /** -------------------------
   * SAVE A SESSION
   * ------------------------- */
  async storeSession(session) {
    try {
      const data = session.toObject(); // Shopify → JSON
      const jsonString = JSON.stringify(data);

      await pool.query(
        `
        INSERT INTO ${this.table} (shop, session_id, access_token, sessionData, updated_at)
        VALUES (?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          access_token = VALUES(access_token),
          sessionData  = VALUES(sessionData),
          updated_at   = NOW()
        `,
        [session.shop, session.id, session.accessToken, jsonString],
      );

      return true;
    } catch (err) {
      console.error("❌ storeSession error:", err);
      throw err;
    }
  }

  /** -------------------------
   * LOAD A SESSION
   * ------------------------- */
  async loadSession(id) {
    try {
      const [rows] = await pool.query(
        `SELECT sessionData FROM ${this.table} WHERE session_id = ?`,
        [id],
      );

      if (!rows.length) return undefined;

      const json = JSON.parse(rows[0].sessionData);

      return new Session({
        id: json.id,
        shop: json.shop,
        state: json.state,
        isOnline: json.isOnline,
        scope: json.scope,
        accessToken: json.accessToken,
        expires: json.expires ? new Date(json.expires) : undefined,
      });
    } catch (err) {
      console.error("❌ loadSession error:", err);
      return undefined;
    }
  }

  /** -------------------------
   * FIND ALL SESSIONS FOR A SHOP
   * ------------------------- */
  async findSessionsByShop(shop) {
    try {
      const [rows] = await pool.query(
        `SELECT sessionData FROM ${this.table} WHERE shop = ?`,
        [shop],
      );

      return rows.map((r) => {
        const data = JSON.parse(r.sessionData);
        return Session.fromPropertyArray(Object.entries(data));
      });
    } catch (err) {
      console.error("❌ findSessionsByShop error:", err);
      return [];
    }
  }

  /** -------------------------
   * DELETE A SESSION
   * ------------------------- */
  async deleteSession(id) {
    try {
      const [result] = await pool.query(
        `DELETE FROM ${this.table} WHERE session_id = ?`,
        [id],
      );

      return result.affectedRows > 0;
    } catch (err) {
      console.error("❌ deleteSession error:", err);
      return false;
    }
  }

  /** -------------------------
   * BULK STORE SESSIONS
   * ------------------------- */
  async storeSessions(sessions) {
    if (!sessions?.length) return true;

    try {
      const values = sessions.map((s) => [
        s.shop,
        s.id,
        s.accessToken,
        JSON.stringify(s.toObject()),
      ]);

      await pool.query(
        `
        REPLACE INTO ${this.table} (shop, session_id, access_token, sessionData, updated_at)
        VALUES ?
        `,
        [values],
      );

      return true;
    } catch (err) {
      console.error("❌ storeSessions error:", err);
      return false;
    }
  }

  /** -------------------------
   * BULK DELETE SESSIONS
   * ------------------------- */
  async deleteSessions(sessionIds) {
    if (!sessionIds.length) return true;

    try {
      const placeholders = sessionIds.map(() => "?").join(",");

      const [result] = await pool.query(
        `DELETE FROM ${this.table} WHERE session_id IN (${placeholders})`,
        sessionIds,
      );

      return result.affectedRows > 0;
    } catch (err) {
      console.error("❌ deleteSessions error:", err);
      return false;
    }
  }

  /** -------------------------
   * SAVE / UPDATE FTP SETTINGS
   * ------------------------- */
  async saveFtpConfig(shop, config) {
    try {
      const { protocol, host, port, username, password, time_range } = config;

      const [result] = await pool.query(
        `
        UPDATE ${this.table}
        SET 
          ftp_protocol = ?,
          ftp_host = ?,
          ftp_port = ?,
          ftp_username = ?,
          ftp_password = ?,
          ftp_time_range = ?, 
          updated_at = NOW()
        WHERE shop = ?
        `,
        [protocol, host, port, username, password, time_range, shop],
      );

      // If UPDATE changed nothing → insert new row
      if (result.affectedRows === 0) {
        await pool.query(
          `
          INSERT INTO ${this.table} 
            (shop, ftp_protocol, ftp_host, ftp_port, ftp_username, ftp_password, ftp_time_range,updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
          `,
          [shop, protocol, host, port, username, password, time_range],
        );
      }

      return true;
    } catch (err) {
      console.error("❌ saveFtpConfig error:", err);
      return false;
    }
  }

  /** -------------------------
   * GET FTP SETTINGS FOR SHOP
   * ------------------------- */
  async getFtpConfig(shop) {
    try {
      const [rows] = await pool.query(
        `
      SELECT 
        ftp_protocol AS protocol,
        ftp_host AS host,
        ftp_port AS port,
        ftp_username AS username,
        ftp_password AS password,
          ftp_time_range AS time_range   
      FROM ${this.table}
      WHERE shop = ?
      LIMIT 1
      `,
        [shop],
      );

      if (rows.length === 0) return null;

      return rows[0];
    } catch (err) {
      console.error("❌ getFtpConfig error:", err);
      return null;
    }
  }
}
