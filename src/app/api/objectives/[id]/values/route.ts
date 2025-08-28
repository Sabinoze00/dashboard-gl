import { NextRequest, NextResponse } from 'next/server';
import { getObjectiveValues, updateObjectiveValue } from '@/lib/db-turso';

export async function GET(
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

    const values = await getObjectiveValues(objectiveId);
    return NextResponse.json(values);
  } catch (error) {
    console.error('Error fetching objective values:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const { month, year, value } = body;

    // Validate required fields
    if (month === undefined || year === undefined || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: month, year, value' },
        { status: 400 }
      );
    }

    // Validate month range
    if (month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Month must be between 1 and 12' },
        { status: 400 }
      );
    }

    // Validate year
    if (year < 2020 || year > 2030) {
      return NextResponse.json(
        { error: 'Year must be between 2020 and 2030' },
        { status: 400 }
      );
    }

    await updateObjectiveValue(objectiveId, month, year, value);
    
    return NextResponse.json(
      { message: 'Objective value updated successfully' }
    );
  } catch (error) {
    console.error('Error updating objective value:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}