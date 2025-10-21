/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image for the ${context}. ` + 
        (textFeedback 
            ? `The model responded with text: "${textFeedback}"`
            : "This can happen due to safety filters or if the request is too complex. Please try rephrasing your prompt to be more direct.");

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

/**
 * Generates an edited image using generative AI based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspot The {x, y} coordinates on the image to focus the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    console.log('Starting generative edit at:', hotspot);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, localized edit on the provided image based on the user's request.
User Request: "${userPrompt}"
Edit Location: Focus on the area around pixel coordinates (x: ${hotspot.x}, y: ${hotspot.y}).

Editing Guidelines:
- The edit must be realistic and blend seamlessly with the surrounding area.
- The rest of the image (outside the immediate edit area) must remain identical to the original.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model.', response);

    return handleApiResponse(response, 'edit');
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    console.log(`Starting filter generation: ${filterPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to apply a stylistic filter to the entire image based on the user's request. Do not change the composition or content, only apply the style.
Filter Request: "${filterPrompt}"

Safety & Ethics Policy:
- Filters may subtly shift colors, but you MUST ensure they do not alter a person's fundamental race or ethnicity.
- YOU MUST REFUSE any request that explicitly asks to change a person's race (e.g., 'apply a filter to make me look Chinese').

Output: Return ONLY the final filtered image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and filter prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for filter.', response);
    
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    console.log(`Starting global adjustment generation: ${adjustmentPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, global adjustment to the entire image based on the user's request.
User Request: "${adjustmentPrompt}"

Editing Guidelines:
- The adjustment must be applied across the entire image.
- The result must be photorealistic.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final adjusted image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and adjustment prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for adjustment.', response);
    
    return handleApiResponse(response, 'adjustment');
};

/**
 * Generates a new image by whisking a subject, scene, and style image.
 * @param subjectImage The image containing the main subject.
 * @param sceneImage The image providing the background/scene.
 * @param styleImage The image providing the artistic style.
 * @returns A promise that resolves to the data URL of the whisked image.
 */
export const generateWhiskedImage = async (
    subjectImage: File,
    sceneImage: File,
    styleImage: File,
): Promise<string> => {
    console.log('Starting image whisk generation...');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const subjectPart = await fileToPart(subjectImage);
    const scenePart = await fileToPart(sceneImage);
    const stylePart = await fileToPart(styleImage);

    const prompt = `You are a visionary AI artist. Your task is to creatively remix three images into a single, cohesive masterpiece.
1.  **Subject Image:** This image contains the primary subject. Extract the subject.
2.  **Scene Image:** This image provides the background and environment. Place the extracted subject into this scene.
3.  **Style Image:** This image defines the artistic style. Apply the visual style (colors, textures, lighting, mood) of this image to the combined scene.

Guidelines:
- The final image must be a seamless and photorealistic or artistically coherent blend.
- The subject should be naturally integrated into the new scene.
- The overall aesthetic must strongly reflect the style image.

Output: Return ONLY the final generated image. Do not return any text.`;

    const textPart = { text: prompt };

    console.log('Sending whisk request to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [
            textPart,
            {text: "\n\nSubject Image:\n"}, subjectPart,
            {text: "\n\nScene Image:\n"}, scenePart,
            {text: "\n\nStyle Image:\n"}, stylePart
        ] },
    });
    console.log('Received response from model for whisk.', response);
    
    return handleApiResponse(response, 'whisk');
};

/**
 * Extends the backdrop of an image to fill the canvas.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the image with the extended backdrop.
 */
export const generateExtendedBackdrop = async (
    originalImage: File,
): Promise<string> => {
    console.log(`Starting backdrop extension.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editing AI specializing in outpainting and background extension. The user has provided an image where the background may not cover the entire frame; there might be transparent, white, or black areas around the subject.

Your task is to:
1.  **Identify the Subject and the Existing Background**: Accurately distinguish the main subject from the partial background scene.
2.  **Analyze the Existing Background**: Carefully study the textures, patterns, lighting, and content of the existing background.
3.  **Fill and Extend**: Naturally extend the existing background to fill ALL missing areas of the image canvas. This includes any transparent, solid-colored, or incomplete parts of the frame. The extension should be context-aware and blend seamlessly with the original background, making it look like a complete, single photograph.
4.  **Preserve the Subject**: The main subject and the original parts of the background must remain completely unchanged. You are only filling in the missing pieces.

The final output should be an image where the background naturally covers the entire frame. Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and backdrop extension prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for backdrop extension.', response);
    
    return handleApiResponse(response, 'backdrop extension');
};

/**
 * Replaces the background of an image with a new one from a reference image.
 * @param originalImage The image containing the subject.
 * @param backgroundImage The image to use as the new background.
 * @returns A promise that resolves to the data URL of the composited image.
 */
export const generateReplacedBackdrop = async (
    originalImage: File,
    backgroundImage: File,
): Promise<string> => {
    console.log(`Starting backdrop replacement.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const backgroundImagePart = await fileToPart(backgroundImage);
    
    const prompt = `You are an expert photo editor AI. You will be given an 'Original Image' and a 'New Background Image'. 
Your task is to flawlessly replace the background of the 'Original Image' with the 'New Background Image'.
1. Precisely identify and isolate the primary subject(s) from the 'Original Image'.
2. Place the isolated subject(s) onto the 'New Background Image'.
3. The most critical step is to blend the subject seamlessly. You must adjust the subject's lighting, shadows, color grading, and perspective to perfectly match the new environment provided by the 'New Background Image'. The result must be photorealistic and look like a single, well-shot photograph.
Return ONLY the final composited image. Do not return text.`;

    console.log('Sending images and backdrop replacement prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [
            { text: prompt },
            { text: "\n\nOriginal Image:\n" }, originalImagePart,
            { text: "\n\nNew Background Image:\n" }, backgroundImagePart,
        ] },
    });
    console.log('Received response from model for backdrop replacement.', response);
    
    return handleApiResponse(response, 'backdrop replacement');
};

/**
 * Enhances the quality of an image by upscaling and reducing noise.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the enhanced image.
 */
export const generateEnhancedImage = async (
    originalImage: File,
): Promise<string> => {
    console.log('Starting image quality enhancement.');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are a professional photo restoration and enhancement AI. Your task is to upscale the provided image, increasing its resolution while intelligently reducing noise and compression artifacts. The goal is to produce a sharper, cleaner, and higher-quality version of the original photo. Do not alter the content or style of the image; only enhance its technical quality. Return ONLY the final enhanced image.`;
    const textPart = { text: prompt };

    console.log('Sending image and enhancement prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for enhancement.', response);
    
    return handleApiResponse(response, 'enhancement');
};
