const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function migrateToTurso() {
  console.log('🚀 Starting migration from SQLite to Turso...\n');

  // Check if Turso credentials are configured
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('❌ Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured in .env.local');
    process.exit(1);
  }

  // Connect to local SQLite database
  const dbPath = path.join(__dirname, 'database.sqlite');
  let sqliteDb;
  
  try {
    sqliteDb = new Database(dbPath);
    console.log('✅ Connected to local SQLite database');
  } catch (error) {
    console.error('❌ Error connecting to SQLite database:', error.message);
    process.exit(1);
  }

  // Connect to Turso database
  let tursoDb;
  
  try {
    tursoDb = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    console.log('✅ Connected to Turso database');
  } catch (error) {
    console.error('❌ Error connecting to Turso database:', error.message);
    process.exit(1);
  }

  try {
    // Create tables in Turso
    console.log('\n📋 Creating tables in Turso...');
    
    await tursoDb.execute('PRAGMA foreign_keys = ON');
    
    // Create objectives table
    await tursoDb.execute(`
      CREATE TABLE IF NOT EXISTS objectives (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        department TEXT NOT NULL CHECK (department IN ('Grafico', 'Sales', 'Financial', 'Agency', 'PM Company', 'Marketing')),
        objective_smart TEXT NOT NULL,
        type_objective TEXT NOT NULL CHECK (type_objective IN ('Mantenimento', 'Cumulativo', 'Ultimo mese')),
        target_numeric DECIMAL NOT NULL,
        number_format TEXT DEFAULT 'number' CHECK (number_format IN ('number', 'currency', 'percentage', 'decimal')),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        objective_name TEXT,
        order_index INTEGER DEFAULT 0,
        reverse_logic BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create objective_values table
    await tursoDb.execute(`
      CREATE TABLE IF NOT EXISTS objective_values (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        objective_id INTEGER NOT NULL,
        month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
        year INTEGER NOT NULL,
        value DECIMAL NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE,
        UNIQUE(objective_id, month, year)
      )
    `);

    console.log('✅ Tables created in Turso');

    // Migrate objectives
    console.log('\n📦 Migrating objectives...');
    const objectives = sqliteDb.prepare('SELECT * FROM objectives').all();
    console.log(`Found ${objectives.length} objectives to migrate`);

    for (const objective of objectives) {
      await tursoDb.execute({
        sql: `
          INSERT INTO objectives (
            id, department, objective_smart, type_objective, target_numeric, 
            number_format, start_date, end_date, objective_name, order_index, 
            reverse_logic, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          objective.id,
          objective.department,
          objective.objective_smart,
          objective.type_objective,
          objective.target_numeric,
          objective.number_format,
          objective.start_date,
          objective.end_date,
          objective.objective_name,
          objective.order_index || 0,
          objective.reverse_logic || 0,
          objective.created_at
        ]
      });
    }

    console.log('✅ Objectives migrated successfully');

    // Migrate objective values
    console.log('\n📊 Migrating objective values...');
    const values = sqliteDb.prepare('SELECT * FROM objective_values').all();
    console.log(`Found ${values.length} objective values to migrate`);

    for (const value of values) {
      await tursoDb.execute({
        sql: `
          INSERT INTO objective_values (id, objective_id, month, year, value, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        args: [
          value.id,
          value.objective_id,
          value.month,
          value.year,
          value.value,
          value.updated_at
        ]
      });
    }

    console.log('✅ Objective values migrated successfully');

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const tursoObjectivesResult = await tursoDb.execute('SELECT COUNT(*) as count FROM objectives');
    const tursoValuesResult = await tursoDb.execute('SELECT COUNT(*) as count FROM objective_values');
    
    const tursoObjectivesCount = tursoObjectivesResult.rows[0].count;
    const tursoValuesCount = tursoValuesResult.rows[0].count;

    console.log(`SQLite objectives: ${objectives.length}`);
    console.log(`Turso objectives: ${tursoObjectivesCount}`);
    console.log(`SQLite values: ${values.length}`);
    console.log(`Turso values: ${tursoValuesCount}`);

    if (objectives.length === tursoObjectivesCount && values.length === tursoValuesCount) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Update .env.local: SET USE_TURSO=true');
      console.log('2. Test your application with: npm run dev:turso');
      console.log('3. Deploy to Vercel when ready');
    } else {
      console.log('\n⚠️  Migration completed but counts don\'t match. Please verify manually.');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    sqliteDb?.close();
  }
}

// Run migration
migrateToTurso().catch(console.error);