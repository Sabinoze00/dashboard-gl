import { createClient } from '@libsql/client';

// Database configuration for Turso
const tursoUrl = process.env.TURSO_DATABASE_URL!;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN!;

// Create Turso client
const db = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

// Create tables for Turso
const createTables = async () => {
  try {
    // Enable foreign key constraints
    await db.execute('PRAGMA foreign_keys = ON');

    // Objectives table
    await db.execute(`
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

    // Objective values table
    await db.execute(`
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

    console.log('Turso tables created successfully');
  } catch (error) {
    console.error('Error creating Turso tables:', error);
    throw error;
  }
};

// Initialize database only in production or when explicitly requested
if (process.env.NODE_ENV === 'production' || process.env.INIT_TURSO_DB === 'true') {
  createTables().catch(console.error);
}

export default db;

// Database helper functions adapted for Turso
export const getObjectivesByDepartment = async (department: string) => {
  try {
    // Get objectives
    const objectivesResult = await db.execute({
      sql: `SELECT * FROM objectives WHERE department = ? ORDER BY order_index ASC, created_at DESC`,
      args: [department]
    });
    
    const objectives = objectivesResult.rows;
    
    // Get values for each objective
    const enrichedObjectives = await Promise.all(
      objectives.map(async (objective) => {
        const valuesResult = await db.execute({
          sql: `SELECT * FROM objective_values WHERE objective_id = ? ORDER BY year, month`,
          args: [objective.id]
        });
        
        return {
          ...objective,
          values: valuesResult.rows
        };
      })
    );
    
    return enrichedObjectives;
  } catch (error) {
    console.error('Error fetching objectives by department:', error);
    throw error;
  }
};

export const getObjectiveValues = async (objectiveId: number) => {
  try {
    const result = await db.execute({
      sql: `SELECT * FROM objective_values WHERE objective_id = ? ORDER BY year, month`,
      args: [objectiveId]
    });
    return result.rows;
  } catch (error) {
    console.error('Error fetching objective values:', error);
    throw error;
  }
};

export const createObjective = async (objective: {
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
  try {
    const result = await db.execute({
      sql: `
        INSERT INTO objectives (department, objective_name, objective_smart, type_objective, target_numeric, number_format, start_date, end_date, order_index, reverse_logic)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
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
      ]
    });
    return { lastInsertRowid: result.lastInsertRowid };
  } catch (error) {
    console.error('Error creating objective:', error);
    throw error;
  }
};

export const updateObjectiveValue = async (objectiveId: number, month: number, year: number, value: number) => {
  try {
    const result = await db.execute({
      sql: `
        INSERT OR REPLACE INTO objective_values (objective_id, month, year, value)
        VALUES (?, ?, ?, ?)
      `,
      args: [objectiveId, month, year, value]
    });
    return result;
  } catch (error) {
    console.error('Error updating objective value:', error);
    throw error;
  }
};

export const deleteObjective = async (id: number) => {
  try {
    const result = await db.execute({
      sql: 'DELETE FROM objectives WHERE id = ?',
      args: [id]
    });
    return result;
  } catch (error) {
    console.error('Error deleting objective:', error);
    throw error;
  }
};

export const deleteObjectives = async (ids: number[]) => {
  try {
    const placeholders = ids.map(() => '?').join(',');
    const result = await db.execute({
      sql: `DELETE FROM objectives WHERE id IN (${placeholders})`,
      args: ids
    });
    return result;
  } catch (error) {
    console.error('Error deleting objectives:', error);
    throw error;
  }
};

export const updateObjectiveOrder = async (objectiveId: number, newOrderIndex: number) => {
  try {
    const result = await db.execute({
      sql: 'UPDATE objectives SET order_index = ? WHERE id = ?',
      args: [newOrderIndex, objectiveId]
    });
    return result;
  } catch (error) {
    console.error('Error updating objective order:', error);
    throw error;
  }
};

export const reorderObjectives = async (department: string, orderedIds: number[]) => {
  try {
    // Turso doesn't support transactions in the same way as better-sqlite3
    // We'll execute the updates sequentially
    const results = [];
    for (let i = 0; i < orderedIds.length; i++) {
      const result = await updateObjectiveOrder(orderedIds[i], i);
      results.push(result);
    }
    return results;
  } catch (error) {
    console.error('Error reordering objectives:', error);
    throw error;
  }
};

// Enhanced API function for AI with all calculated analytics - adapted for async
export const getEnrichedObjectivesByDepartment = async (department: string) => {
  try {
    const objectives = await getObjectivesByDepartment(department);
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
      
      const sortedValues = values.sort((a, b) => Number(a.year) - Number(b.year) || Number(a.month) - Number(b.month));
      const lastValue = Number(sortedValues[sortedValues.length - 1]?.value) || 0;
      const previousValue = Number(sortedValues[sortedValues.length - 2]?.value) || 0;
      
      if (lastValue > previousValue) return 'Improving';
      if (lastValue < previousValue) return 'Declining';
      return 'Stable';
    };
    
    // Helper function to calculate current value based on objective type
    const calculateCurrentValue = (objective: any) => {
      const values = objective.values.filter((v: any) => Number(v.year) === currentYear);
      
      switch (objective.type_objective) {
        case 'Cumulativo':
          return values.reduce((sum: number, v: any) => sum + Number(v.value), 0);
        case 'Mantenimento':
          if (values.length === 0) return 0;
          return values.reduce((sum: number, v: any) => sum + Number(v.value), 0) / values.length;
        case 'Ultimo mese':
          if (values.length === 0) return 0;
          const sortedValues = values.sort((a: any, b: any) => Number(b.month) - Number(a.month));
          return Number(sortedValues[0]?.value) || 0;
        default:
          return 0;
      }
    };
    
    // Calculate enriched data for each objective
    const enrichedObjectives = objectives.map(objective => {
      const currentValue = calculateCurrentValue(objective);
      const progressPercentage = Number(objective.target_numeric) > 0 ? (currentValue / Number(objective.target_numeric)) * 100 : 0;
      
      // Calculate time elapsed percentage
      const startDate = new Date(String(objective.start_date));
      const endDate = new Date(String(objective.end_date));
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
      const trend = getTrend(objective.values, String(objective.type_objective));
      
      // Last update
      const lastUpdate = objective.values
        .filter((v: any) => Number(v.year) === currentYear)
        .sort((a: any, b: any) => Number(b.month) - Number(a.month))[0];
      
      const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                         'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
      
      const lastUpdateFormatted = lastUpdate ? {
        month: monthNames[Number(lastUpdate.month) - 1],
        value: Number(lastUpdate.value)
      } : null;
      
      // Monthly values formatted
      const monthlyValues = objective.values
        .filter((v: any) => Number(v.year) === currentYear)
        .map((v: any) => ({
          month: monthNames[Number(v.month) - 1],
          value: Number(v.value)
        }));
      
      return {
        // Basic identifiers
        id: objective.id,
        objectiveName: objective.objective_name || String(objective.objective_smart).substring(0, 50) + (String(objective.objective_smart).length > 50 ? '...' : ''),
        objectiveSmartDescription: objective.objective_smart,
        department: objective.department,
        objectiveType: objective.type_objective,
        numberFormat: objective.number_format || 'number',
        
        // Target data
        targetValue: Number(objective.target_numeric),
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
  } catch (error) {
    console.error('Error getting enriched objectives:', error);
    throw error;
  }
};