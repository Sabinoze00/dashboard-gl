import { NextRequest, NextResponse } from 'next/server';
import { reorderObjectives } from '@/lib/db-turso';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { department, orderedIds } = body;

    if (!department || !Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: 'Department and orderedIds array are required' },
        { status: 400 }
      );
    }

    await reorderObjectives(department, orderedIds);

    return NextResponse.json({ message: 'Objectives reordered successfully' });
  } catch (error) {
    console.error('Error reordering objectives:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}