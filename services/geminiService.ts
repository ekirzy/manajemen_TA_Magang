import { GoogleGenAI } from "@google/genai";

// Helper to safely get API key
const getApiKey = (): string => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      return process.env.API_KEY || '';
    }
  } catch (e) {
    console.warn("Process env not available");
  }
  return '';
};

// Helper to check for paid key for advanced features
export const ensureApiKey = async (): Promise<boolean> => {
  const win = window as any;
  if (win.aistudio && win.aistudio.hasSelectedApiKey) {
    const hasKey = await win.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      try {
        await win.aistudio.openSelectKey();
        return true;
      } catch (e) {
        console.error("Error selecting key:", e);
        return false;
      }
    }
    return true;
  }
  return true; // Fallback if not running in specific environment
};

export const generateVeoVideo = async (
  prompt: string,
  base64Image: string,
  aspectRatio: '16:9' | '9:16'
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key not found in environment");

  const ai = new GoogleGenAI({ apiKey });

  // Remove data URL prefix if present for the SDK
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt || "Animate this image",
    image: {
      imageBytes: cleanBase64,
      mimeType: 'image/png', // Assuming PNG for simplicity, SDK handles most types
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio
    }
  });

  // Polling
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed or no URI returned.");

  // Fetch the actual video blob
  const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
  const videoBlob = await videoResponse.blob();
  return URL.createObjectURL(videoBlob);
};

export const generateProImage = async (
  prompt: string,
  size: '1K' | '2K' | '4K'
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key not found in environment");

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        { text: prompt }
      ]
    },
    config: {
      imageConfig: {
        imageSize: size,
        aspectRatio: "1:1" // Defaulting to square for this demo
      }
    }
  });

  // Extract image
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image data found in response");
};