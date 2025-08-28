// Additional database functions for updates and complex operations
import { DATABASE_TYPE } from './db-config';

// Update objective function that works with both databases
export const updateObjective = async (
  id: number,
  updates: {
    objective_smart?: string;
    objective_name?: string;
    type_objective?: string;
    target_numeric?: number;
    number_format?: string;
    start_date?: string;
    end_date?: string;
    reverse_logic?: boolean;
    order_index?: number;
  }
) => {
  if (DATABASE_TYPE === 'turso') {
    const { default: db } = await import('./db-turso');
    
    const updateFields = [];
    const values = [];
    
    if (updates.objective_smart !== undefined) {
      updateFields.push('objective_smart = ?');
      values.push(updates.objective_smart);
    }
    
    if (updates.objective_name !== undefined) {
      updateFields.push('objective_name = ?');
      values.push(updates.objective_name);
    }
    
    if (updates.type_objective !== undefined) {
      updateFields.push('type_objective = ?');
      values.push(updates.type_objective);
    }
    
    if (updates.target_numeric !== undefined) {
      updateFields.push('target_numeric = ?');
      values.push(updates.target_numeric);
    }
    
    if (updates.number_format !== undefined) {
      updateFields.push('number_format = ?');
      values.push(updates.number_format);
    }
    
    if (updates.start_date !== undefined) {
      updateFields.push('start_date = ?');
      values.push(updates.start_date);
    }
    
    if (updates.end_date !== undefined) {
      updateFields.push('end_date = ?');
      values.push(updates.end_date);
    }
    
    if (updates.reverse_logic !== undefined) {
      updateFields.push('reverse_logic = ?');
      values.push(updates.reverse_logic ? 1 : 0);
    }
    
    if (updates.order_index !== undefined) {
      updateFields.push('order_index = ?');
      values.push(updates.order_index);
    }
    
    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }
    
    values.push(id);
    
    const result = await db.execute({
      sql: `UPDATE objectives SET ${updateFields.join(', ')} WHERE id = ?`,
      args: values
    });
    
    return { changes: result.rowsAffected };
  } else {
    // SQLite version
    const { default: db } = await import('./db');
    
    const updateFields = [];
    const values = [];
    
    if (updates.objective_smart !== undefined) {
      updateFields.push('objective_smart = ?');
      values.push(updates.objective_smart);
    }
    
    if (updates.objective_name !== undefined) {
      updateFields.push('objective_name = ?');
      values.push(updates.objective_name);
    }
    
    if (updates.type_objective !== undefined) {
      updateFields.push('type_objective = ?');
      values.push(updates.type_objective);
    }
    
    if (updates.target_numeric !== undefined) {
      updateFields.push('target_numeric = ?');
      values.push(updates.target_numeric);
    }
    
    if (updates.number_format !== undefined) {
      updateFields.push('number_format = ?');
      values.push(updates.number_format);
    }
    
    if (updates.start_date !== undefined) {
      updateFields.push('start_date = ?');
      values.push(updates.start_date);
    }
    
    if (updates.end_date !== undefined) {
      updateFields.push('end_date = ?');
      values.push(updates.end_date);
    }
    
    if (updates.reverse_logic !== undefined) {
      updateFields.push('reverse_logic = ?');
      values.push(updates.reverse_logic ? 1 : 0);
    }
    
    if (updates.order_index !== undefined) {
      updateFields.push('order_index = ?');
      values.push(updates.order_index);
    }
    
    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }
    
    values.push(id);
    
    const stmt = db.prepare(`
      UPDATE objectives 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);
    
    return stmt.run(...values);
  }
};