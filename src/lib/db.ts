import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

// Enable foreign key constraints
db.pragma('foreign_keys = ON');

// Create tables
const createTables = () => {
  // Objectives table
  db.exec(`
    CREATE TABLE IF NOT EXISTS objectives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department TEXT NOT NULL CHECK (department IN ('Grafico', 'Sales', 'Financial', 'Agency', 'PM Company', 'Marketing')),
      objective_smart TEXT NOT NULL,
      type_objective TEXT NOT NULL CHECK (type_objective IN ('Mantenimento', 'Cumulativo', 'Ultimo mese')),
      target_numeric DECIMAL NOT NULL,
      number_format TEXT DEFAULT 'number' CHECK (number_format IN ('number', 'currency', 'percentage', 'decimal')),
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add number_format column to existing table if it doesn't exist
  try {
    db.exec(`ALTER TABLE objectives ADD COLUMN number_format TEXT DEFAULT 'number' CHECK (number_format IN ('number', 'currency', 'percentage', 'decimal'))`);
  } catch (e) {
    // Column already exists, ignore error
  }

  // Add objective_name column to existing table if it doesn't exist
  try {
    db.exec(`ALTER TABLE objectives ADD COLUMN objective_name TEXT`);
  } catch (e) {
    // Column already exists, ignore error
  }

  // Add order_index column to existing table if it doesn't exist
  try {
    db.exec(`ALTER TABLE objectives ADD COLUMN order_index INTEGER DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore error
  }

  // Add reverse_logic column to existing table if it doesn't exist
  try {
    db.exec(`ALTER TABLE objectives ADD COLUMN reverse_logic BOOLEAN DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore error
  }

  // Objective values table
  db.exec(`
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
};

// Initialize database
createTables();

export default db;

// Database helper functions
export const getObjectivesByDepartment = (department: string) => {
  const objectivesStmt = db.prepare(`
    SELECT * FROM objectives 
    WHERE department = ? 
    ORDER BY order_index ASC, created_at DESC
  `);
  
  const valuesStmt = db.prepare(`
    SELECT * FROM objective_values 
    WHERE objective_id = ? 
    ORDER BY year, month
  `);
  
  const objectives = objectivesStmt.all(department);
  
  return objectives.map(objective => ({
    ...objective,
    values: valuesStmt.all(objective.id)
  }));
};

export const getObjectiveValues = (objectiveId: number) => {
  const stmt = db.prepare(`
    SELECT * FROM objective_values 
    WHERE objective_id = ? 
    ORDER BY year, month
  `);
  return stmt.all(objectiveId);
};

export const createObjective = (objective: {
  department: string;
  objective_name?: string;
  objective_smart: string;
  type_objective: string;
  target_numeric: number;
  number_format?: string;
  start_date: string;
  end_date: string;
  order_index?: number;
  reverse_logic?: boolean;
}) => {
  const stmt = db.prepare(`
    INSERT INTO objectives (department, objective_name, objective_smart, type_objective, target_numeric, number_format, start_date, end_date, order_index, reverse_logic)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    objective.department,
    objective.objective_name || null,
    objective.objective_smart,
    objective.type_objective,
    objective.target_numeric,
    objective.number_format || 'number',
    objective.start_date,
    objective.end_date,
    objective.order_index || 0,
    objective.reverse_logic ? 1 : 0
  );
};

export const updateObjectiveValue = (objectiveId: number, month: number, year: number, value: number) => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO objective_values (objective_id, month, year, value)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(objectiveId, month, year, value);
};

export const deleteObjective = (id: number) => {
  const stmt = db.prepare('DELETE FROM objectives WHERE id = ?');
  return stmt.run(id);
};

export const deleteObjectives = (ids: number[]) => {
  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`DELETE FROM objectives WHERE id IN (${placeholders})`);
  return stmt.run(...ids);
};

export const updateObjectiveOrder = (objectiveId: number, newOrderIndex: number) => {
  const stmt = db.prepare('UPDATE objectives SET order_index = ? WHERE id = ?');
  return stmt.run(newOrderIndex, objectiveId);
};

export const reorderObjectives = (department: string, orderedIds: number[]) => {
  const transaction = db.transaction(() => {
    orderedIds.forEach((objectiveId, index) => {
      updateObjectiveOrder(objectiveId, index);
    });
  });
  return transaction();
};

// Enhanced API function for AI with all calculated analytics
export const getEnrichedObjectivesByDepartment = (department: string) => {
  const objectives = getObjectivesByDepartment(department);
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  // Helper function to calculate health status
  const getHealthStatus = (progressPercentage: number, expectedProgressPercentage: number) => {
    const variance = progressPercentage - expectedProgressPercentage;
    if (progressPercentage >= 100) return 'Exceeded';
    if (variance > -10) return 'On Track';
    if (variance > -25) return 'At Risk';
    return 'Behind';
  };
  
  // Helper function to calculate trend
  const getTrend = (values: any[], objectiveType: string) => {
    if (values.length < 2) return 'Stable';
    
    const sortedValues = values.sort((a, b) => a.year - b.year || a.month - b.month);
    const lastValue = sortedValues[sortedValues.length - 1]?.value || 0;
    const previousValue = sortedValues[sortedValues.length - 2]?.value || 0;
    
    if (lastValue > previousValue) return 'Improving';
    if (lastValue < previousValue) return 'Declining';
    return 'Stable';
  };
  
  // Helper function to calculate current value based on objective type
  const calculateCurrentValue = (objective: any) => {
    const values = objective.values.filter((v: any) => v.year === currentYear);
    
    switch (objective.type_objective) {
      case 'Cumulativo':
        return values.reduce((sum: number, v: any) => sum + v.value, 0);
      case 'Mantenimento':
        if (values.length === 0) return 0;
        return values.reduce((sum: number, v: any) => sum + v.value, 0) / values.length;
      case 'Ultimo mese':
        if (values.length === 0) return 0;
        const sortedValues = values.sort((a: any, b: any) => b.month - a.month);
        return sortedValues[0]?.value || 0;
      default:
        return 0;
    }
  };
  
  // Calculate enriched data for each objective
  const enrichedObjectives = objectives.map(objective => {
    const currentValue = calculateCurrentValue(objective);
    const progressPercentage = objective.target_numeric > 0 ? (currentValue / objective.target_numeric) * 100 : 0;
    
    // Calculate time elapsed percentage
    const startDate = new Date(objective.start_date);
    const endDate = new Date(objective.end_date);
    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const timeElapsedPercentage = Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100));
    
    // Expected progress (linear)
    const expectedProgressPercentage = timeElapsedPercentage;
    
    // Variance
    const variancePercentage = progressPercentage - expectedProgressPercentage;
    
    // Health status
    const healthStatus = getHealthStatus(progressPercentage, expectedProgressPercentage);
    
    // Trend
    const trend = getTrend(objective.values, objective.type_objective);
    
    // Last update
    const lastUpdate = objective.values
      .filter((v: any) => v.year === currentYear)
      .sort((a: any, b: any) => b.month - a.month)[0];
    
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                       'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    
    const lastUpdateFormatted = lastUpdate ? {
      month: monthNames[lastUpdate.month - 1],
      value: lastUpdate.value
    } : null;
    
    // Monthly values formatted
    const monthlyValues = objective.values
      .filter((v: any) => v.year === currentYear)
      .map((v: any) => ({
        month: monthNames[v.month - 1],
        value: v.value
      }));
    
    return {
      // Basic identifiers
      id: objective.id,
      objectiveName: objective.objective_name || objective.objective_smart.substring(0, 50) + (objective.objective_smart.length > 50 ? '...' : ''),
      objectiveSmartDescription: objective.objective_smart,
      department: objective.department,
      objectiveType: objective.type_objective,
      numberFormat: objective.number_format || 'number',
      
      // Target data
      targetValue: objective.target_numeric,
      startDate: objective.start_date,
      endDate: objective.end_date,
      
      // Performance data
      currentValue,
      progressPercentage: Math.round(progressPercentage * 10) / 10,
      lastUpdate: lastUpdateFormatted,
      
      // Analytics data
      expectedProgressPercentage: Math.round(expectedProgressPercentage * 10) / 10,
      variancePercentage: Math.round(variancePercentage * 10) / 10,
      healthStatus,
      trend,
      timeElapsedPercentage: Math.round(timeElapsedPercentage * 10) / 10,
      
      // Raw data
      monthlyValues
    };
  });
  
  // Calculate department summary
  const totalObjectives = enrichedObjectives.length;
  const overallProgressAverage = totalObjectives > 0 
    ? enrichedObjectives.reduce((sum, obj) => sum + obj.progressPercentage, 0) / totalObjectives
    : 0;
  
  const objectivesByHealthStatus = enrichedObjectives.reduce((acc, obj) => {
    acc[obj.healthStatus] = (acc[obj.healthStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Ensure all health statuses are represented
  ['Exceeded', 'On Track', 'At Risk', 'Behind'].forEach(status => {
    if (!objectivesByHealthStatus[status]) {
      objectivesByHealthStatus[status] = 0;
    }
  });
  
  const topPerformer = enrichedObjectives.reduce((best, current) => 
    current.progressPercentage > (best?.progressPercentage || -1) ? current : best, null);
  
  const worstPerformer = enrichedObjectives.reduce((worst, current) => 
    current.progressPercentage < (worst?.progressPercentage || 999) ? current : worst, null);
  
  const countByType = enrichedObjectives.reduce((acc, obj) => {
    acc[obj.objectiveType] = (acc[obj.objectiveType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Ensure all types are represented
  ['Cumulativo', 'Mantenimento', 'Ultimo mese'].forEach(type => {
    if (!countByType[type]) {
      countByType[type] = 0;
    }
  });
  
  const departmentSummary = {
    departmentName: department,
    totalObjectives,
    overallProgressAverage: Math.round(overallProgressAverage * 10) / 10,
    objectivesByHealthStatus,
    topPerformer: topPerformer ? {
      name: topPerformer.objectiveName,
      progressPercentage: topPerformer.progressPercentage
    } : null,
    worstPerformer: worstPerformer ? {
      name: worstPerformer.objectiveName,
      progressPercentage: worstPerformer.progressPercentage
    } : null,
    countByType
  };
  
  return {
    departmentSummary,
    objectives: enrichedObjectives
  };
};