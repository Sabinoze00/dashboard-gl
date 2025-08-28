import { NextResponse } from 'next/server';
import seedData from '@/lib/seed';

export async function POST() {
  try {
    await seedData();
    return NextResponse.json(
      { message: 'Database seeded successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}