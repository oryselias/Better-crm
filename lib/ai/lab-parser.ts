import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKET = "lab-reports";

interface ParsedPayload {
  patient_info?: {
    name?: string;
    age?: string;
    gender?: string;
    date?: string;
  };
  tests: Array<{
    test_name: string;
    result: string;
    unit?: string;
    reference_range?: string;
    status: "normal" | "high" | "low" | "critical";
  }>;
  summary?: string;
  recommendations?: string[];
}

interface ParseResult {
  success: boolean;
  parsed_payload: ParsedPayload;
  confidence: number;
  error?: string;
}

export async function parseLabReportPDF(reportId: string): Promise<ParseResult> {
  const supabase = createSupabaseAdminClient();

  // Fetch the report record
  const { data: report, error: fetchError } = await supabase
    .from("lab_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (fetchError || !report) {
    return {
      success: false,
      parsed_payload: { tests: [] },
      confidence: 0,
      error: fetchError?.message || "Report not found",
    };
  }

  // Download the PDF from storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(report.source_file_path);

  if (downloadError || !fileData) {
    return {
      success: false,
      parsed_payload: { tests: [] },
      confidence: 0,
      error: downloadError?.message || "Failed to download PDF",
    };
  }

  // Check for AI provider (Claude or Gemini)
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      parsed_payload: { tests: [] },
      confidence: 0,
      error: "No AI API key configured",
    };
  }

  try {
    const base64Pdf = await blobToBase64(fileData);

    let parsed_payload: ParsedPayload;
    let confidence: number;

    if (process.env.ANTHROPIC_API_KEY) {
      // Use Claude
      const result = await parseWithClaude(base64Pdf);
      parsed_payload = result.payload;
      confidence = result.confidence;
    } else if (process.env.GEMINI_API_KEY) {
      // Use Gemini
      const result = await parseWithGemini(base64Pdf);
      parsed_payload = result.payload;
      confidence = result.confidence;
    } else {
      throw new Error("No AI provider configured");
    }

    // Update the report with parsed data
    const { error: updateError } = await supabase
      .from("lab_reports")
      .update({
        parsed_payload,
        parser_confidence: confidence,
        parser_version: "ai-v1",
        extracted_summary: parsed_payload.summary,
        // BUG-005: confidence is float 0.0–1.0 (NOT 0–100). Threshold of 0.8 = 80% confidence.
        // lib/ai.ts uses a separate 0–100 integer scale via Gemini schema — do not mix them.
        review_state: confidence > 0.8 ? "reviewed" : "pending",
      })
      .eq("id", reportId);

    if (updateError) {
      return {
        success: false,
        parsed_payload,
        confidence,
        error: updateError.message,
      };
    }

    return { success: true, parsed_payload, confidence };
  } catch (error) {
    return {
      success: false,
      parsed_payload: { tests: [] },
      confidence: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function parseWithClaude(
  base64Pdf: string
): Promise<{ payload: ParsedPayload; confidence: number }> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      // NOTE: This must remain server-side only — never move to a client component or the API key leaks
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Pdf,
              },
            },
            {
              type: "text",
              text: `Extract lab report data from this PDF. Return a JSON object with this exact structure:
{
  "patient_info": { "name": string, "age": string, "gender": string, "date": string },
  "tests": [{ "test_name": string, "result": string, "unit": string, "reference_range": string, "status": "normal"|"high"|"low"|"critical" }],
  "summary": string,
  "recommendations": string[]
}
Only include tests where you have clear values. Mark status as "critical" if values are dangerously outside ranges.`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error("No response from Claude");
  }

  // Parse JSON from response
  const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || [null, content];
  const jsonStr = jsonMatch[1] || content;

  try {
    const parsed = JSON.parse(jsonStr) as ParsedPayload;
    // Estimate confidence based on completeness
    const confidence =
      parsed.tests.length > 0
        ? Math.min(0.95, 0.6 + parsed.tests.length * 0.05)
        : 0.5;
    return { payload: parsed, confidence };
  } catch {
    throw new Error("Failed to parse Claude response as JSON");
  }
}

async function parseWithGemini(
  base64Pdf: string
): Promise<{ payload: ParsedPayload; confidence: number }> {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const apiKey = process.env.GEMINI_API_KEY!;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: "application/pdf",
                  data: base64Pdf,
                },
              },
              {
                text: `Extract lab report data from this PDF. Return ONLY valid JSON with this exact structure:
{
  "patient_info": { "name": "", "age": "", "gender": "", "date": "" },
  "tests": [{ "test_name": "", "result": "", "unit": "", "reference_range": "", "status": "normal" }],
  "summary": "",
  "recommendations": []
}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const jsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!jsonStr) {
    throw new Error("No response from Gemini");
  }

  try {
    const parsed = JSON.parse(jsonStr) as ParsedPayload;
    const confidence =
      parsed.tests.length > 0
        ? Math.min(0.95, 0.6 + parsed.tests.length * 0.05)
        : 0.5;
    return { payload: parsed, confidence };
  } catch {
    throw new Error("Failed to parse Gemini response as JSON");
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString("base64");
}
