import { NextRequest, NextResponse } from 'next/server';
import { createObjective } from '@/lib/db-turso';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['department', 'objective_smart', 'type_objective', 'target_numeric', 'start_date', 'end_date'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate department
    const validDepartments = ['Grafico', 'Sales', 'Financial', 'Agency', 'PM Company', 'Marketing'];
    if (!validDepartments.includes(body.department)) {
      return NextResponse.json(
        { error: 'Invalid department' },
        { status: 400 }
      );
    }

    // Validate objective type
    const validTypes = ['Mantenimento', 'Cumulativo', 'Ultimo mese'];
    if (!validTypes.includes(body.type_objective)) {
      return NextResponse.json(
        { error: 'Invalid objective type' },
        { status: 400 }
      );
    }

    const result = await createObjective(body);
    
    return NextResponse.json(
      { id: result.lastInsertRowid, message: 'Objective created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating objective:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}