import { NextRequest, NextResponse } from 'next/server';
import { getObjectivesByDepartment } from '@/lib/db-turso'; // Force Turso
import { Department } from '@/lib/types';
import { jsonResponse } from '@/lib/bigint-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { department: string } }
) {
  try {
    const department = decodeURIComponent(params.department) as Department;
    
    // Validate department
    const validDepartments = ['Grafico', 'Sales', 'Financial', 'Agency', 'PM Company', 'Marketing'];
    if (!validDepartments.includes(department)) {
      return NextResponse.json(
        { error: 'Invalid department' },
        { status: 400 }
      );
    }

    const objectives = await getObjectivesByDepartment(department);
    
    return jsonResponse(objectives);
  } catch (error) {
    console.error('Error fetching objectives:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}