import { NextRequest, NextResponse } from 'next/server';
import { deleteObjective } from '@/lib/db-config';
import { updateObjective } from '@/lib/db-update-functions';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const objectiveId = parseInt(params.id);
    if (isNaN(objectiveId)) {
      return NextResponse.json(
        { error: 'Invalid objective ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { objective_smart, objective_name, type_objective, target_numeric, number_format, start_date, end_date, reverse_logic, order_index } = body;

    // Validate objective type if provided
    if (type_objective) {
      const validTypes = ['Mantenimento', 'Cumulativo', 'Ultimo mese'];
      if (!validTypes.includes(type_objective)) {
        return NextResponse.json(
          { error: 'Invalid objective type' },
          { status: 400 }
        );
      }
    }

    // Validate number format if provided
    if (number_format) {
      const validFormats = ['number', 'currency', 'percentage', 'decimal'];
      if (!validFormats.includes(number_format)) {
        return NextResponse.json(
          { error: 'Invalid number format' },
          { status: 400 }
        );
      }
    }

    const result = await updateObjective(objectiveId, {
      objective_smart,
      objective_name,
      type_objective,
      target_numeric,
      number_format,
      start_date,
      end_date,
      reverse_logic,
      order_index
    });
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Objective not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Objective updated successfully' }
    );
  } catch (error) {
    console.error('Error updating objective:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const objectiveId = parseInt(params.id);
    if (isNaN(objectiveId)) {
      return NextResponse.json(
        { error: 'Invalid objective ID' },
        { status: 400 }
      );
    }

    const result = await deleteObjective(objectiveId);
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Objective not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Objective deleted successfully' }
    );
  } catch (error) {
    console.error('Error deleting objective:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}