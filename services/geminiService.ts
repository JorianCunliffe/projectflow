
import { GoogleGenAI, Type } from "@google/genai";
import { ProjectType } from "../types";

export class GeminiService {
  async generateProjectStructure(name: string, type: ProjectType) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a logical project structure for a project named "${name}" of type "${type}". 
      The response must be a JSON object containing milestones. 
      Each milestone must have a unique ID, a name, a list of subtasks, and an array of 'dependsOn' milestone IDs to form a sequence or parallel paths.
      Ensure there is at least one start milestone (empty dependsOn).
      Each subtask needs a name, description, and status.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            milestones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  dependsOn: { type: Type.ARRAY, items: { type: Type.STRING } },
                  subtasks: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING }
                      },
                      required: ["name", "description"]
                    }
                  }
                },
                required: ["id", "name", "dependsOn", "subtasks"]
              }
            }
          }
        }
      }
    });

    try {
      const text = response.text;
      if (!text) return null;
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse AI response", e);
      return null;
    }
  }

  async brainstormSubtasks(milestoneName: string, projectContext: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Given a milestone called "${milestoneName}" in a project described as "${projectContext}", suggest 5 critical subtasks that might be required.
      Return a JSON array of objects, each with 'name' and 'description'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["name", "description"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text || "[]");
    } catch (e) {
      return [];
    }
  }
}

export const geminiService = new GeminiService();
