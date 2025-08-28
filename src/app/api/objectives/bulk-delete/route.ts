import { NextRequest, NextResponse } from 'next/server';
import { deleteObjectives } from '@/lib/db-config';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { objectiveIds } = body;

    if (!Array.isArray(objectiveIds) || objectiveIds.length === 0) {
      return NextResponse.json(
        { error: 'ObjectiveIds array is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Validate all IDs are numbers
    const validIds = objectiveIds.every(id => typeof id === 'number' && id > 0);
    if (!validIds) {
      return NextResponse.json(
        { error: 'All objective IDs must be valid positive numbers' },
        { status: 400 }
      );
    }

    const result = await deleteObjectives(objectiveIds);

    return NextResponse.json({ 
      message: `${result.changes} objectives deleted successfully`,
      deletedCount: result.changes
    });
  } catch (error) {
    console.error('Error deleting objectives:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}