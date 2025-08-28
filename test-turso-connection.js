const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

async function testTursoConnection() {
  console.log('🧪 Testing Turso database connection...\n');

  // Check environment variables
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('❌ Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured in .env.local');
    console.log('\nMake sure your .env.local contains:');
    console.log('TURSO_DATABASE_URL=libsql://your-database-name.turso.io');
    console.log('TURSO_AUTH_TOKEN=your-auth-token-here');
    return;
  }

  console.log('🔗 Database URL:', process.env.TURSO_DATABASE_URL.replace(/\/\/.*@/, '//***@'));
  console.log('🔑 Auth Token:', process.env.TURSO_AUTH_TOKEN.substring(0, 20) + '...\n');

  try {
    // Create Turso client
    const db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    console.log('🔌 Attempting to connect to Turso...');

    // Test basic connection
    const result = await db.execute('SELECT 1 as test');
    console.log('✅ Connection successful!');
    
    // Check if tables exist
    console.log('\n📋 Checking tables...');
    
    const tables = await db.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('objectives', 'objective_values')
      ORDER BY name
    `);

    if (tables.rows.length === 0) {
      console.log('⚠️  No tables found. You need to:');
      console.log('   1. Run the migration script: node migrate-to-turso.js');
      console.log('   2. Or set INIT_TURSO_DB=true in .env.local and start the app');
    } else {
      console.log('✅ Found tables:', tables.rows.map(row => row.name).join(', '));
      
      // Count records
      for (const table of tables.rows) {
        const count = await db.execute(`SELECT COUNT(*) as count FROM ${table.name}`);
        console.log(`   ${table.name}: ${count.rows[0].count} records`);
      }
    }

    console.log('\n🎉 Turso database is ready to use!');
    console.log('\nNext steps:');
    console.log('1. If tables are empty, run: node migrate-to-turso.js');
    console.log('2. Test the app with Turso: npm run dev:turso');
    console.log('3. Set USE_TURSO=true in .env.local for permanent switch');

  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Check your internet connection');
    console.log('2. Verify TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are correct');
    console.log('3. Make sure the database exists: turso db list');
    console.log('4. Try regenerating the auth token: turso db tokens create [database-name]');
  }
}

testTursoConnection().catch(console.error);