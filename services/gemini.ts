import { GoogleGenAI, Type, Content } from "@google/genai";
import { StorySetup, StorySegment, Memory } from "../types";

// Ensure API Key is present
if (!process.env.API_KEY) {
  console.error("Missing process.env.API_KEY");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-3-pro-preview";

// Schema for the structured output
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    story_segment: {
      type: Type.STRING,
      description: "The narrative content of the story segment. Use markdown for formatting (bold, italics).",
    },
    choices: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 to 4 short, distinct plot options for the user to choose from to continue the story.",
    },
  },
  required: ["story_segment", "choices"],
};

const mapMessagesToContents = (
  setup: StorySetup,
  messages: { role: 'user' | 'model'; text: string }[],
  memories: Memory[]
): Content[] => {
  const history: Content[] = [];

  const activeMemories = memories.filter(m => m.active).map(m => `- ${m.text}`).join('\n');

  // Initial Prompt Context with Memory Injection
  const initialPrompt = `
    Story Configuration:
    - Setting: ${setup.setting}
    - Vibe/Tone: ${setup.vibe}
    - Protagonist: ${setup.protagonist}

    ${activeMemories ? `IMPORTANT MEMORY (Always remember these details):\n${activeMemories}` : ''}
    
    Instruction: Write the next segment of the story based on the history below. 
    If this is the beginning, write the opening scene.
  `;

  history.push({
    role: "user",
    parts: [{ text: initialPrompt }],
  });

  messages.forEach((msg) => {
    history.push({
      role: msg.role,
      parts: [{ text: msg.text }],
    });
  });

  return history;
};

export const generateNextSegment = async (
  setup: StorySetup,
  previousMessages: { role: 'user' | 'model'; text: string }[],
  memories: Memory[],
  newInput?: string
): Promise<StorySegment> => {
  
  const contents = mapMessagesToContents(setup, previousMessages, memories);

  if (newInput) {
    contents.push({
      role: "user",
      parts: [{ text: newInput }],
    });
  }

  const SYSTEM_INSTRUCTION = `
  You are a collaborative novelist. 
  
  STRICT RULES:
  1. Adapt exactly to the user's defined "Vibe", "Setting", and "Protagonist".
  2. INCORPORATE the provided "MEMORY" items into the narrative logic if relevant.
  3. If the user edits a previous message or asks for a change, adapt the story flow immediately to match the new context.
  4. Output JSON with 'story_segment' and 'choices'.
  5. Keep segments engaging (approx 150-250 words).
  `;

  try {
    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.85,
      },
    });

    if (result.text) {
      const parsed = JSON.parse(result.text);
      return {
        content: parsed.story_segment,
        choices: parsed.choices || [],
      };
    } else {
      throw new Error("No text generated");
    }
  } catch (error) {
    console.error("GenAI Error:", error);
    return {
      content: "The ink has run dry momentarily. Please try regenerating.",
      choices: ["Try again"],
    };
  }
};