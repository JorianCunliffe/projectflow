import express from "express";
import path from "path";
import cors from "cors";
import { Resend } from "resend";
import { createServer as createViteServer } from "vite";

import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const resend = new Resend(process.env.RESEND_API_KEY);

  app.post("/api/gemini/generateProjectStructure", async (req, res) => {
    try {
      const { name, type } = req.body;
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
      const text = response.text;
      res.status(200).json(text ? JSON.parse(text) : null);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/gemini/brainstormSubtasks", async (req, res) => {
    try {
      const { milestoneName, projectContext } = req.body;
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
      res.status(200).json(response.text ? JSON.parse(response.text) : []);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/send-email", async (req, res) => {
    try {
      const { to, subject, html } = req.body;
      
      const { data, error } = await resend.emails.send({
        from: "automation@projectflow.online",
        to,
        subject,
        html,
      });

      if (error) {
        return res.status(400).json({ error });
      }

      res.status(200).json({ data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: String(error) });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
