const { TableServiceClient } = require("@azure/data-tables");
require('dotenv').config();

const conn = process.env.STORAGE_CONNECTION_STRING;
if (!conn) {
  console.error("❌ STORAGE_CONNECTION_STRING not set");
  process.exit(1);
}

(async () => {
  try {
    console.log("📊 Mencari tabel yang tersedia di Azure Storage...\n");
    
    const serviceClient = TableServiceClient.fromConnectionString(conn);
    const tables = [];
    
    for await (const table of serviceClient.listTables()) {
      tables.push(table.name);
      console.log(`✓ ${table.name}`);
    }
    
    if (tables.length === 0) {
      console.log("⚠️  Tidak ada tabel ditemukan!");
      process.exit(0);
    }
    
    console.log(`\n📦 Total tabel: ${tables.length}`);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
})();
