// import { json } from "@remix-run/node";
// import { Client } from "basic-ftp";

// export const config = { runtime: "nodejs" };

// export const action = async ({ request }) => {
//   const client = new Client();
//   client.ftp.verbose = true; // Enable logging for debugging

//   let testResults = {
//     host: "bellevillecastrol.com",
//     username: "developer@bellevillecastrol.com",
//     all_tests_failed: true,
//   };

//   try {
//     console.log("🔄 Testing FTP (port 21)...");

//     // Connect using basic-ftp
//     await client.access({
//       host: "bellevillecastrol.com",
//       port: 21,
//       user: "developer@bellevillecastrol.com",
//       password: "Welcome@456##",
//       secure: false, // Plain FTP (not FTPS)
//     });

//     console.log("✅ FTP Connected successfully!");

//     // Optional: Test listing directory
//     const list = await client.list();
//     console.log("Directory contents:", list);

//     testResults.ftp_port21 = {
//       success: true,
//       message: "✅ Connected!",
//       files_found: list.length,
//     };
//     testResults.all_tests_failed = false;

//     client.close();

//     return json({
//       success: true,
//       working_config: {
//         host: "bellevillecastrol.com",
//         port: 21,
//         username: "developer@bellevillecastrol.com",
//         protocol: "ftp",
//       },
//       message: "✅ FTP Port 21 works! Connection successful.",
//       test_results: testResults,
//       directory_listing: list,
//     });
//   } catch (error) {
//     console.log("❌ FTP failed:", error.message);
//     testResults.ftp_port21 = {
//       success: false,
//       error: error.message,
//       code: error.code,
//     };

//     client.close();

//     return json(
//       {
//         success: false,
//         error: "FTP connection failed",
//         debug: testResults,
//         error_details: error.message,
//         fix: "Check credentials, firewall rules, or server IP restrictions",
//       },
//       { status: 500 },
//     );
//   }
// };

import { json } from "@remix-run/node";
import SFTPClient from "ssh2-sftp-client";

export const config = { runtime: "nodejs" };

export const action = async ({ request }) => {
  const sftp = new SFTPClient();

  let testResults = {
    host: "bellevillecastrol.com",
    username: "developer@bellevillecastrol.com",
    all_tests_failed: true,
  };

  try {
    console.log("🔄 Testing SFTP (port 22)...");

    // Connect using SFTP
    await sftp.connect({
      host: "bellevillecastrol.com",
      port: 22, // SFTP port
      username: "developer@bellevillecastrol.com",
      password: "Welcome@456##",
      readyTimeout: 50000,
      retries: 2,
      retry_minTimeout: 2000,
    });

    console.log("✅ SFTP Connected successfully!");

    // Test listing directory
    const list = await sftp.list("/");
    console.log("Directory contents:", list);

    testResults.sftp_port22 = {
      success: true,
      message: "✅ Connected!",
      files_found: list.length,
    };
    testResults.all_tests_failed = false;

    await sftp.end();

    return json({
      success: true,
      working_config: {
        host: "bellevillecastrol.com",
        port: 22,
        username: "developer@bellevillecastrol.com",
        protocol: "sftp",
      },
      message: "✅ SFTP Port 22 works! Connection successful.",
      test_results: testResults,
      directory_listing: list.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        modified: file.modifyTime,
      })),
    });
  } catch (error) {
    console.log("❌ SFTP failed:", error.message);

    testResults.sftp_port22 = {
      success: false,
      error: error.message,
      code: error.code,
    };

    try {
      await sftp.end();
    } catch (closeError) {
      // Ignore close errors
    }

    return json(
      {
        success: false,
        error: "SFTP connection failed",
        debug: testResults,
        error_details: error.message,
        fix: "Check credentials, SSH access, or verify SFTP is enabled on server",
      },
      { status: 500 },
    );
  }
};
