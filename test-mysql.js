// test-mysql.js
import mysql from "mysql2/promise";

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: "157.173.220.171",
      user: "apps_db4",
      password: "q4w3noVm8Pqe",
      database: "apps_db4",
      port: 3306,
    });

    console.log("✅ MySQL Connected Successfully!");
    const [rows] = await connection.query("SELECT 1");
    console.log("Query Result:", rows);

    await connection.end();
  } catch (error) {
    console.error("❌ MySQL Connection Failed:");
    console.error(error.message);
  }
}

testConnection();
