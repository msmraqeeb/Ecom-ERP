import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

const handleGeminiError = (error: any): string => {
  // Detailed error parsing to handle different SDK error structures
  const status = error?.status;
  const code = error?.code || error?.error?.code;
  const message = error?.message || error?.error?.message || '';
  
  // Safe string check
  let stringifiedError = '';
  try {
      stringifiedError = typeof error === 'string' ? error : JSON.stringify(error);
  } catch (e) {
      stringifiedError = 'Circular error structure';
  }

  const isQuotaError = 
    status === 429 || 
    code === 429 || 
    code === 'RESOURCE_EXHAUSTED' ||
    message.includes('429') || 
    message.toLowerCase().includes('quota') || 
    message.includes('RESOURCE_EXHAUSTED') ||
    stringifiedError.includes('RESOURCE_EXHAUSTED');

  if (isQuotaError) {
    // Log as warning to avoid cluttering console with errors for expected limits
    console.warn("Gemini API Quota Exceeded: The request was rate limited.");
    return "Usage limit reached. AI features will resume shortly.";
  }

  console.error("Gemini API Error:", error);
  return "Unable to generate content. Please try again.";
};

export const generateProductDescription = async (productName: string, category: string, keyFeatures: string) => {
  try {
    const ai = getClient();
    const prompt = `Write a creative, enticing, and short product description (max 50 words) for a kids' product.
    
    Product Name: ${productName}
    Category: ${category}
    Key Features/Keywords: ${keyFeatures}
    
    Tone: Playful, safe, and exciting for parents and kids.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No description generated.";
  } catch (error) {
    return handleGeminiError(error);
  }
};

export const analyzeSalesTrend = async (data: any[]) => {
  try {
    const ai = getClient();
    // Simplified data payload to minimize token usage
    const prompt = `Analyze this sales trend data briefly (max 2 sentences) and give a strategic tip. Data: ${JSON.stringify(data)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Trends analysis unavailable.";
  } catch (error) {
    return handleGeminiError(error);
  }
};