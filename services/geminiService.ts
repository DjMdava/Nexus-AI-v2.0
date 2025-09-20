
import { GoogleGenAI, Modality } from "@google/genai";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

type AspectRatio = '1:1' | '16:9' | '9:16';

export interface EditedImageResponse {
    imageUrl: string | null;
    text: string | null;
}

export const generateImage = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio,
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
      throw new Error("No image was generated.");
    }
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Failed to communicate with the image generation service.");
  }
};

export const editImage = async (prompt: string, image: { data: string; mimeType: string }): Promise<EditedImageResponse> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: image.data,
                            mimeType: image.mimeType,
                        },
                    },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        let imageUrl: string | null = null;
        let text: string | null = null;

        if (response.candidates && response.candidates.length > 0) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && !imageUrl) { // Take the first image found
                    const base64ImageBytes: string = part.inlineData.data;
                    const mimeType: string = part.inlineData.mimeType;
                    imageUrl = `data:${mimeType};base64,${base64ImageBytes}`;
                } else if (part.text) {
                    text = (text ? text + '\n' : '') + part.text;
                }
            }
        }

        if (!imageUrl) {
            if (text) {
                throw new Error(`The model responded with text but no image: "${text}"`);
            }
            throw new Error("No image was returned from the editing service.");
        }

        return { imageUrl, text };
    } catch (error) {
        console.error("Error editing image:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Failed to communicate with the image editing service.");
    }
};

export const generateVideo = async (prompt: string, onProgress: () => void): Promise<string> => {
    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: prompt,
            config: {
                numberOfVideos: 1
            }
        });

        while (!operation.done) {
            onProgress();
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error("Video generation completed but no download link was found.");
        }
        
        // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch video file: ${response.statusText}`);
        }
        
        const videoBlob = await response.blob();
        return URL.createObjectURL(videoBlob);

    } catch (error) {
        console.error("Error generating video:", error);
        throw new Error("Failed to communicate with the video generation service.");
    }
};
