import { NextRequest, NextResponse } from 'next/server';
import { createObjective, updateObjectiveValue } from '@/lib/db-config';

export async function POST(request: NextRequest) {
  try {
    // Create test objectives with various expiration scenarios
    const expiredObjectives = [
      {
        department: 'Grafico',
        objective_name: 'Progetti Q3 2024 (Scaduto)',
        objective_smart: 'Completare 50 progetti grafici entro settembre 2024',
        type_objective: 'Cumulativo',
        target_numeric: 50,
        number_format: 'number',
        start_date: '2024-07-01',
        end_date: '2024-09-30', // Already expired
        reverse_logic: false,
        order_index: 200
      },
      {
        department: 'Financial',
        objective_name: 'Budget 2024 (Scaduto)',
        objective_smart: 'Mantenere spese sotto budget fino a dicembre 2024',
        type_objective: 'Mantenimento',
        target_numeric: 100000,
        number_format: 'currency',
        start_date: '2024-01-01',
        end_date: '2024-12-31', // Recently expired
        reverse_logic: false,
        order_index: 201
      },
      {
        department: 'Sales',
        objective_name: 'Campagna Natale (Scade Presto)',
        objective_smart: 'Raggiungere 1000 vendite per la campagna natalizia',
        type_objective: 'Cumulativo',
        target_numeric: 1000,
        number_format: 'number',
        start_date: '2025-08-01',
        end_date: '2025-09-15', // Expires in ~18 days from today (Aug 28)
        reverse_logic: false,
        order_index: 202
      },
      {
        department: 'Agency',
        objective_name: 'ROI Immediato (Scade Domani)',
        objective_smart: 'Migliorare ROI campagne al 15% entro fine agosto',
        type_objective: 'Ultimo mese',
        target_numeric: 15,
        number_format: 'percentage',
        start_date: '2025-08-01',
        end_date: '2025-08-29', // Expires tomorrow
        reverse_logic: false,
        order_index: 203
      }
    ];

    const objectiveIds: number[] = [];

    for (const objData of expiredObjectives) {
      const result = await createObjective(objData);
      const objectiveId = result.lastInsertRowid as number;
      objectiveIds.push(objectiveId);

      // Add realistic values for each objective
      const isExpired = new Date(objData.end_date) < new Date();
      const monthsToAdd = isExpired ? 12 : 8; // Full year for expired, current progress for active

      for (let month = 1; month <= monthsToAdd; month++) {
        let value: number;
        
        if (objData.objective_name.includes('Progetti Q3')) {
          // Partially completed project - got to 75% before expiry
          value = month <= 9 ? Math.floor((objData.target_numeric * 0.75 / 9) * month) : 37;
        } else if (objData.objective_name.includes('Budget 2024')) {
          // Exceeded budget by end of year
          value = 95000 + (month * 800) + (month > 10 ? month * 400 : 0);
        } else if (objData.objective_name.includes('Campagna Natale')) {
          // Current progress - 60% complete
          value = Math.floor((objData.target_numeric * 0.6 / 8) * month);
        } else { // ROI Immediato
          // Getting close to target
          value = 12 + (month * 0.3);
        }
        
        // Only add values for months that have passed
        const year = objData.start_date.includes('2024') ? 2024 : 2025;
        if (year === 2024 || (year === 2025 && month <= 8)) {
          await updateObjectiveValue(objectiveId, month, year, Math.round(value * 100) / 100);
        }
      }
    }

    return NextResponse.json({ 
      message: `Created ${expiredObjectives.length} test objectives with expiration scenarios`,
      objectiveIds,
      scenarios: [
        "Expired since Sept 2024",
        "Expired Dec 2024", 
        "Expires in ~18 days",
        "Expires tomorrow"
      ]
    });
  } catch (error) {
    console.error('Error creating expired test objectives:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}