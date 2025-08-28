// Database configuration - switch between local SQLite and Turso
import * as sqliteDb from './db';
import * as tursoDb from './db-turso';

const isProduction = process.env.NODE_ENV === 'production';
const useTurso = process.env.USE_TURSO === 'true' || isProduction;

// Export database type indicator
export const DATABASE_TYPE = useTurso ? 'turso' : 'sqlite';
export const IS_USING_TURSO = useTurso;

// Select the appropriate database implementation
const db = useTurso ? tursoDb : sqliteDb;

if (useTurso) {
  console.log('🚀 Using Turso database');
} else {
  console.log('🔧 Using local SQLite database');
}

// Export database functions
export const getObjectivesByDepartment = db.getObjectivesByDepartment;
export const getEnrichedObjectivesByDepartment = db.getEnrichedObjectivesByDepartment;
export const getObjectives = db.getObjectives;
export const createObjective = db.createObjective;
export const updateObjective = db.updateObjective;
export const deleteObjective = db.deleteObjective;
export const getObjectiveValues = db.getObjectiveValues;
export const createObjectiveValue = db.createObjectiveValue;
export const updateObjectiveValue = db.updateObjectiveValue;
export const deleteObjectiveValue = db.deleteObjectiveValue;