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

Return STRICT JSON format:

{
  "story_segment": "150-250 word story text",
  "choices": [
    "choice 1",
    "choice 2",
    "choice 3"
  ]
}
`;

  const history = [
    {
      role: "system",
      content:
        "You are a collaborative novelist. Always output valid JSON.",
    },
    {
      role: "user",
      content: initialPrompt,
    },
  ];

  messages.forEach((msg) => {
    history.push({
      role: msg.role === "model" ? "assistant" : msg.role,
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
          messages: messages,
          temperature: 0.85,
          response_format: { type: "json_object" },
        }),
      }
    );

    const data = await response.json();

    const text =
      data?.choices?.[0]?.message?.content ||
      '{"story_segment":"Error generating story.","choices":["Try again"]}';

    const parsed = JSON.parse(text);

    return {
      content: parsed.story_segment,
      choices: parsed.choices || [],
    };
  } catch (error) {
    console.error(error);

    return {
      content:
        "Story engine failed. Check API key or redeploy.",
      choices: ["Try again"],
    };
  }
};
