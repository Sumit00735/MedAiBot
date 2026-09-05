import { NextResponse } from 'next/server';
import {
  appendRecords,
  deleteFile,
  deleteRow,
  listDates,
  readRecords,
  writeRecords,
} from '@/lib/storage';
import { isValidDate } from '@/lib/constants';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) {
    try {
      const dates = listDates();
      return NextResponse.json({ dates });
    } catch (error) {
      console.error('Error listing dates:', error);
      return NextResponse.json({ error: 'Failed to list dates.' }, { status: 500 });
    }
  }

  if (!isValidDate(date)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 });
  }

  try {
    const data = readRecords(date);
    return NextResponse.json({ date, ...data });
  } catch (error) {
    console.error('Error reading records:', error);
    return NextResponse.json({ error: 'Failed to read records.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { date, meta, items } = await request.json();

    if (!date || !isValidDate(date)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'A non-empty items array is required.' }, { status: 400 });
    }

    appendRecords(date, { meta: meta || {}, items });

    return NextResponse.json({
      success: true,
      message: `Saved ${items.length} item(s) to ${date}.`,
    });
  } catch (error) {
    console.error('Error saving records:', error);
    return NextResponse.json({ error: 'Failed to save records.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { date, meta, items } = await request.json();

    if (!date || !isValidDate(date)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 });
    }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'An items array is required.' }, { status: 400 });
    }

    writeRecords(date, { meta: meta || {}, items });

    return NextResponse.json({
      success: true,
      message: `Updated records for ${date}.`,
    });
  } catch (error) {
    console.error('Error updating records:', error);
    return NextResponse.json({ error: 'Failed to update records.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const rowParam = searchParams.get('row');

  if (!date || !isValidDate(date)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 });
  }

  try {
    if (rowParam !== null && rowParam !== undefined && rowParam !== '') {
      const rowIndex = parseInt(rowParam, 10);
      if (isNaN(rowIndex)) {
        return NextResponse.json({ error: 'Invalid row index.' }, { status: 400 });
      }
      deleteRow(date, rowIndex);
      return NextResponse.json({ success: true, message: `Deleted row ${rowIndex + 1} from ${date}.` });
    }

    deleteFile(date);
    return NextResponse.json({ success: true, message: `Deleted all records for ${date}.` });
  } catch (error) {
    console.error('Error deleting records:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete records.' }, { status: 500 });
  }
}
