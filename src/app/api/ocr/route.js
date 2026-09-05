import { NextResponse } from 'next/server';
import { runOcrPipeline } from '@/lib/ocr-pipeline';

export const maxDuration = 300;

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export async function POST(request) {
  try {
    const { image, rawText, targetType } = await request.json();

    if (!image && !rawText) {
      return NextResponse.json({ error: 'No image or text provided' }, { status: 400 });
    }

    let base64Data = null;
    let mimeType = null;

    if (image) {
      const commaIndex = image.indexOf(',');
      if (commaIndex === -1) {
        return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
      }

      base64Data = image.substring(commaIndex + 1);
      mimeType = image.substring(image.indexOf(':') + 1, image.indexOf(';'));

      if (base64Data.length > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: 'Image too large. Maximum allowed size is 10MB.' }, { status: 413 });
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const safeEnqueue = (data) => {
          try {
            controller.enqueue(encoder.encode(data));
          } catch (e) {
            console.error('Failed to enqueue (client likely disconnected):', e.message);
          }
        };

        const emitLog = (msg) => {
          safeEnqueue(`data: ${JSON.stringify({ type: 'log', message: msg })}\n\n`);
        };

        try {
          emitLog('Starting AI vision analysis...');
          
          const result = await runOcrPipeline({
            base64Data,
            mimeType,
            rawText,
            targetType,
          }, emitLog);

          safeEnqueue(`data: ${JSON.stringify({ type: 'result', data: result })}\n\n`);
        } catch (error) {
          console.error('[OCR] Pipeline failed:', error);
          safeEnqueue(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        } finally {
          try {
            controller.close();
          } catch (e) {
            // Ignore close errors
          }
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Server Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
