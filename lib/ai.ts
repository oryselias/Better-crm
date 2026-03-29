import { GoogleGenAI, Type, Schema } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const reportSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        results: {
            type: Type.ARRAY,
            description: "List of all clinical tests and their quantitative or qualitative results",
            items: {
                type: Type.OBJECT,
                properties: {
                    testName: { type: Type.STRING },
                    value: { type: Type.STRING },
                    unit: { type: Type.STRING },
                    referenceRange: { type: Type.STRING },
                    flag: { type: Type.STRING, description: "H (High), L (Low), Abnormal, Normal, or blank" }
                },
                required: ["testName", "value"]
            }
        },
        summary: {
            type: Type.STRING,
            description: "A comprehensive clinical summary of the findings intended for a physician."
        },
        confidenceScore: {
            type: Type.INTEGER,
            description: "A score from 0 to 100 representing how confident you are in the accuracy of the extraction based on PDF legibility."
        }
    },
    required: ["results", "summary", "confidenceScore"]
};

export async function parseLabReportPdf(base64Pdf: string, mimeType: string = "application/pdf") {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY mapping. Please add it to .env.local");
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
            {
                role: "user",
                parts: [
                    { text: "You are an expert AI Medical Scribe. Extract the requested lab test results from this medical document strictly adhering to the JSON schema." },
                    { inlineData: { mimeType, data: base64Pdf } }
                ]
            }
        ],
        config: {
            responseMimeType: "application/json",
            responseSchema: reportSchema,
            temperature: 0.1, // Lower temperature to minimize hallucination on numeric values
        }
    });

    const text = response.text || "";
    try {
        const rawData = JSON.parse(text);
        return {
            payload: rawData.results || [],
            summary: rawData.summary || "No summary provided by AI.",
            confidence: rawData.confidenceScore || 0,
        };
    } catch (error) {
        console.error("Gemini Parse Error: ", text);
        throw new Error("AI returned malformed JSON");
    }
}
