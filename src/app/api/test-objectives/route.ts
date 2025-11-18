import { NextRequest, NextResponse } from 'next/server';
import { createObjective, updateObjectiveValue } from '@/lib/db-turso';

export async function POST(request: NextRequest) {
  try {
    // Create test objectives with reverse logic
    const testObjectives = [
      {
        department: 'Sales',
        objective_name: 'Tasso di Insoluto',
        objective_smart: 'Mantenere il tasso di insoluto sotto il 5% per tutto l\'anno',
        type_objective: 'Mantenimento',
        target_numeric: 5,
        number_format: 'percentage',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        reverse_logic: true,
        order_index: 100
      },
      {
        department: 'Financial',
        objective_name: 'Tempo Pagamento Medio',
        objective_smart: 'Ridurre il tempo medio di pagamento clienti a massimo 30 giorni',
        type_objective: 'Ultimo mese',
        target_numeric: 30,
        number_format: 'number',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        reverse_logic: true,
        order_index: 101
      },
      {
        department: 'PM Company',
        objective_name: 'Costi Operativi',
        objective_smart: 'Mantenere i costi operativi sotto €50,000 al mese',
        type_objective: 'Mantenimento',
        target_numeric: 50000,
        number_format: 'currency',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        reverse_logic: true,
        order_index: 102
      }
    ];

    const objectiveIds: number[] = [];

    for (const objData of testObjectives) {
      const result = await createObjective(objData);
      const objectiveId = result.lastInsertRowid as number;
      objectiveIds.push(objectiveId);

      // Add some test values for each objective
      for (let month = 1; month <= 8; month++) {
        let value: number;
        
        if (objData.objective_name === 'Tasso di Insoluto') {
          // Values getting better over time (lower is better)
          value = 6.5 - (month * 0.2); // Starts at 6.3%, improves to 4.9%
        } else if (objData.objective_name === 'Tempo Pagamento Medio') {
          // Days - getting better (lower is better)
          value = 35 - (month * 0.5); // Starts at 34.5 days, improves to 32 days
        } else { // Costi Operativi
          // Costs fluctuating around target (lower is better)
          value = 52000 - (month * 200) + (Math.random() * 2000 - 1000);
        }
        
        await updateObjectiveValue(objectiveId, month, 2025, Math.round(value * 100) / 100);
      }
    }

    return NextResponse.json({ 
      message: `Created ${testObjectives.length} test objectives with reverse logic`,
      objectiveIds 
    });
  } catch (error) {
    console.error('Error creating test objectives:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}