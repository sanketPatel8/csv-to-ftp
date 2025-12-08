import { json } from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import SftpClient from "ssh2-sftp-client";
import pool from "../../db.server";

export const config = { runtime: "nodejs" };

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const storeDomain = session.shop;

  try {
    // 1. FTP config fetch
    const [ftpRows] = await pool.query("SELECT * FROM stores WHERE shop = ?", [
      storeDomain,
    ]);

    if (ftpRows.length === 0) {
      return json(
        {
          success: false,
          error: `❌ No FTP config found for ${storeDomain}`,
        },
        { status: 404 },
      );
    }

    const ftpConfig = ftpRows[0];
    console.log("🔍 Testing FTP connection:", {
      host: ftpConfig.ftp_host,
      port: ftpConfig.ftp_port || "NOT SET",
      protocol: ftpConfig.ftp_protocol || "NOT SET",
      username: ftpConfig.ftp_username ? "SET" : "MISSING",
    });

    let testResults = {
      host: ftpConfig.ftp_host,
      username: ftpConfig.ftp_username ? "OK" : "MISSING",
      all_tests_failed: true,
    };

    // 2. Test FTP Port 21 (Most Reliable)
    try {
      console.log("🔄 Testing FTP (port 21)...");
      const ftp = new SftpClient();
      await ftp.connect({
        host: ftpConfig.ftp_host,
        port: 21,
        username: ftpConfig.ftp_username,
        password: ftpConfig.ftp_password,
        protocol: "ftp",
        timeouts: { connectTimeout: 10000 },
      });
      await ftp.end();

      testResults.ftp_port21 = { success: true, time: "✅ Connected!" };
      testResults.all_tests_failed = false;
      console.log("✅ FTP Port 21: SUCCESS");

      return json({
        success: true,
        working_config: { protocol: "ftp", port: 21 },
        message: "FTP Port 21 works perfectly! Use this in your main API.",
        test_results: testResults,
      });
    } catch (ftpError) {
      console.log("❌ FTP Port 21 failed:", ftpError.message);
      testResults.ftp_port21 = { success: false, error: ftpError.message };
    }

    // 3. Test SFTP Port 22
    try {
      console.log("🔄 Testing SFTP (port 22)...");
      const sftp22 = new SftpClient();
      await sftp22.connect({
        host: ftpConfig.ftp_host,
        port: parseInt(ftpConfig.ftp_port) || 22,
        username: ftpConfig.ftp_username,
        password: ftpConfig.ftp_password,
        protocol: "sftp",
        timeouts: { connectTimeout: 10000 },
      });
      await sftp22.end();

      testResults.sftp_port22 = { success: true, time: "✅ Connected!" };
      testResults.all_tests_failed = false;
      console.log("✅ SFTP Port 22: SUCCESS");

      return json({
        success: true,
        working_config: { protocol: "sftp", port: ftpConfig.ftp_port || 22 },
        message: "SFTP works! Use your current config.",
        test_results: testResults,
      });
    } catch (sftpError) {
      console.log("❌ SFTP Port 22 failed:", sftpError.message);
      testResults.sftp_port22 = { success: false, error: sftpError.message };
    }

    // 4. Test SFTP Port 2222 (Common Alternative)
    try {
      console.log("🔄 Testing SFTP (port 2222)...");
      const sftp2222 = new SftpClient();
      await sftp2222.connect({
        host: ftpConfig.ftp_host,
        port: 2222,
        username: ftpConfig.ftp_username,
        password: ftpConfig.ftp_password,
        protocol: "sftp",
        timeouts: { connectTimeout: 5000 },
      });
      await sftp2222.end();

      testResults.sftp_port2222 = { success: true, time: "✅ Connected!" };
      testResults.all_tests_failed = false;
      console.log("✅ SFTP Port 2222: SUCCESS");

      return json({
        success: true,
        working_config: { protocol: "sftp", port: 2222 },
        message: "SFTP Port 2222 works! Update your DB port to 2222.",
        test_results: testResults,
      });
    } catch (port2222Error) {
      console.log("❌ SFTP Port 2222 failed:", port2222Error.message);
      testResults.sftp_port2222 = {
        success: false,
        error: port2222Error.message,
      };
    }

    // 5. All tests failed
    return json(
      {
        success: false,
        error: "❌ All FTP/SFTP tests failed",
        fix_suggestions: [
          "1. Check FTP host/IP address",
          "2. Verify username/password",
          "3. Open ports 21(FTP) or 22/2222(SFTP) on server",
          "4. Try IP address instead of domain",
          "5. Test with FileZilla manually",
        ],
        debug: testResults,
        next_step: "Use FileZilla to test manually first",
      },
      { status: 500 },
    );
  } catch (error) {
    console.error("❌ FTP Test Error:", error);
    return json(
      {
        success: false,
        error: error.message,
        ftp_config_missing: true,
      },
      { status: 500 },
    );
  }
};
