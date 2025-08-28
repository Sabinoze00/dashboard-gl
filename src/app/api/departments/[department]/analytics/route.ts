import { NextRequest, NextResponse } from 'next/server';
import { getEnrichedObjectivesByDepartment } from '@/lib/db-config';
import { Department } from '@/lib/types';

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

    const analyticsData = await getEnrichedObjectivesByDepartment(department);
    
    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}