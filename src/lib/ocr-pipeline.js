import { GoogleGenAI, Type } from '@google/genai';

const MODELS = ['gemini-2.5-flash-8b', 'gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.7-flash'];

const ai = new GoogleGenAI({});

const itemSchema = {
  type: Type.OBJECT,
  properties: {
    sn: { type: Type.STRING },
    productName: { type: Type.STRING },
    quantity: { type: Type.STRING },
    batchNumber: { type: Type.STRING },
    exp: { type: Type.STRING },
    rate: { type: Type.STRING },
    amount: { type: Type.STRING },
  },
};

const structureSchema = {
  type: Type.OBJECT,
  properties: {
    documentType: { type: Type.STRING },
    meta: {
      type: Type.OBJECT,
      properties: {
        irn: { type: Type.STRING },
        ackNo: { type: Type.STRING },
        ackDate: { type: Type.STRING },
        customerName: { type: Type.STRING },
        billDate: { type: Type.STRING },
        totalAmount: { type: Type.STRING },
      },
    },
    items: { type: Type.ARRAY, items: itemSchema },
    extractionNotes: { type: Type.STRING },
  },
};

const STRUCTURE_PROMPT = `You are a highly advanced pharmaceutical extraction AI. You extract data from Indian medicine invoices, challans, and direct medicine packaging (blister packs, strips, boxes).

Given the image, extract ONLY the requested data into structured JSON.

CRITICAL RULES FOR EXTRACTION:
1. Extract ONLY these fields for items: Item Name (productName), Qty (quantity), Batch (batchNumber), Expiry (exp), Rate (rate), and Amount (amount). Ignore all other table columns.
2. READ BLURRY TEXT: Many images will be slightly blurry, out of focus, or have glare. DO NOT GIVE UP. You MUST try your absolute best to guess and read the blurry text, especially for Batch and Expiry dates. Use context clues (e.g. standard batch formats, typical expiry date formats like MM/YYYY) to decipher hard-to-read text.
3. IF MEDICINE PACK (blister pack/strip/box): 
   - Extract the Medicine Name -> save to 'productName'.
   - Extract the Batch Number (Look for B.No, B.N., Batch, or stickers) -> save to 'batchNumber'.
   - Extract the Expiry Date (Look for Exp.Dt, Exp, Expiry, or MM/YY formats) -> save to 'exp'.
   - Extract the Rate (Look for MRP Rs., M.R.P., etc) -> save to 'rate'.
   - Return this as a SINGLE item in the items array.
4. AUTO-CALCULATION: If you find Qty and Rate, calculate and fill in the Amount field (Amount = Qty * Rate). 
   - CRITICAL FOR MEDICINE PACKS: The Qty should represent the number of packs/strips scanned (default to 1). Do NOT set Qty to the number of tablets (e.g., if it says "10 Tablets", Qty is still 1 strip). The Rate (MRP) is for the entire pack.
5. PARTIAL DATA: Even if some fields are completely missing (e.g. you can't see the medicine name because of the photo angle), you MUST STILL return an item object containing whatever fields you CAN find (like Batch, Expiry, MRP). Never return an empty item object.
6. MISSING FIELDS: If a field is missing or unreadable, leave it as an empty string "". DO NOT use terms like "null", "UNKNOWN", "N/A", or "None".
7. Fill in missing logical data if you can infer it from the rest of the image.

Make this extraction as completely filled out and useful for the user as humanly possible, specifically focusing on deciphering blurry batch/expiry numbers. Return ONLY valid JSON matching the schema.`;

export function parseJsonSafely(text) {
  if (!text) throw new Error('Empty AI response');
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch (innerErr) {
        // Fall through to error
      }
    }
    console.error('--- RAW AI RESPONSE THAT FAILED TO PARSE ---');
    console.error(text);
    console.error('--------------------------------------------');
    throw new Error('Could not parse AI JSON response: ' + err.message);
  }
}

function computeMissingFields(items) {
  const fieldMap = {
    productName: 'Item Name',
    batchNumber: 'Batch',
    exp: 'Expiry',
    quantity: 'Qty',
    rate: 'Rate',
    amount: 'Amount',
  };
  const missing = new Set();
  items.forEach((item) => {
    Object.entries(fieldMap).forEach(([key, label]) => {
      if (!item[key] || String(item[key]).trim() === '') missing.add(label);
    });
  });
  return Array.from(missing);
}

function renumberItems(items) {
  return items.map((item, i) => ({ ...item, sn: String(i + 1) }));
}

/**
 * Highly optimized, purely Multimodal Gemini pipeline.
 */
export async function runOcrPipeline({ base64Data, mimeType, rawText }, onProgress) {
  const emitProgress = (msg) => {
    if (onProgress) onProgress(msg);
  };

  emitProgress(rawText ? 'Starting fast text structuring...' : 'Starting AI vision analysis...');

  let lastError = null;

  for (const model of MODELS) {
    try {
      emitProgress(`Calling Gemini model (${model})...`);
      
      const parts = [{ text: STRUCTURE_PROMPT }];
      
      if (rawText) {
        parts.push({ text: `\n\n--- OCR EXTRACTED TEXT ---\n${rawText}` });
      } else if (base64Data) {
        parts.push({ inlineData: { data: base64Data, mimeType } });
      } else {
        throw new Error('No image or text provided to pipeline');
      }
      
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: structureSchema,
          temperature: 0.1,
          maxOutputTokens: 65536,
        },
      });

      emitProgress('Parsing AI response...');
      const structured = parseJsonSafely(response.text);
      
      let items = structured.items || [];
      items = renumberItems(items);

      emitProgress('Extraction complete.');

      return {
        documentType: structured.documentType || 'unknown',
        meta: structured.meta || {},
        items,
        missingFields: computeMissingFields(items),
        extractionNotes: structured.extractionNotes || (rawText ? 'Extracted via Fast Hybrid OCR' : 'Extracted via Gemini Vision'),
        rawText: rawText ? 'Extracted via Fast Hybrid OCR' : 'Extracted directly via Gemini Multimodal Vision',
        source: rawText ? 'tesseract-gemini-hybrid' : 'gemini-vision-only',
      };
    } catch (error) {
      const status = error.status || error.response?.status;
      if (status === 404 || status === 429 || status === 401) {
        emitProgress(`Model ${model} unavailable (status ${status}), trying next...`);
        continue;
      }
      
      console.error(`[OCR] Vision structuring failed on ${model}:`, error);
      emitProgress(`Error with ${model}: ${error.message}`);
      lastError = error;
    }
  }

  throw lastError || new Error('All Gemini models failed to process the image.');
}

export { computeMissingFields };
