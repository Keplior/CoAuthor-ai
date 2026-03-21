import { StorySetup, StorySegment, Memory } from "../types";

const MODEL_NAME = "deepseek-chat";

const mapMessagesToContents = (
  setup: StorySetup,
  messages: { role: "user" | "model"; text: string }[],
  memories: Memory[]
) => {
  const activeMemories = memories
    .filter((m) => m.active)
    .map((m) => `- ${m.text}`)
    .join("\n");

  const initialPrompt = `
Story Configuration:
- Setting: ${setup.setting}
- Vibe/Tone: ${setup.vibe}
- Protagonist: ${setup.protagonist}

${activeMemories ? `IMPORTANT MEMORY:\n${activeMemories}` : ""}

Instruction:
Write the next segment of the story.
Keep length around 150-250 words.

After the story, give 3-4 short plot choices.
Return JSON like:

{
"story_segment": "...",
"choices": ["choice1","choice2","choice3"]
}
`;

  const history = [
    {
      role: "system",
      content: initialPrompt,
    },
  ];

  messages.forEach((msg) => {
    history.push({
      role: msg.role === "model" ? "assistant" : "user",
      content: msg.text,
    });
  });

  return history;
};

export const generateNextSegment = async (
  setup: StorySetup,
  previousMessages: { role: "user" | "model"; text: string }[],
  memories: Memory[],
  newInput?: string
): Promise<StorySegment> => {
  try {
    const apiKey = import.meta.env.VITE_API_KEY;

    if (!apiKey) {
      throw new Error("Missing API key");
    }

    const messages = mapMessagesToContents(
      setup,
      previousMessages,
      memories
    );

    if (newInput) {
      messages.push({
        role: "user",
        content: newInput,
      });
    }

    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages,
          temperature: 0.85,
        }),
      }
    );

    const data = await response.json();

    let text = data.choices?.[0]?.message?.content || "";

    // 尝试解析 JSON
    try {
      const parsed = JSON.parse(text);

      return {
        content: parsed.story_segment,
        choices: parsed.choices || [],
      };
    } catch {
      return {
        content: text,
        choices: ["Continue", "Add conflict", "Change direction"],
      };
    }
  } catch (error) {
    console.error(error);

    return {
      content:
        "Something went wrong. Check API key or network.",
      choices: ["Try again"],
    };
  }
};
