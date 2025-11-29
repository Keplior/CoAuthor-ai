export interface StorySetup {
  setting: string;
  vibe: string;
  protagonist: string;
}

export interface StorySegment {
  content: string; // The narrative text
  choices: string[]; // Options for the user
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  choices?: string[]; // Only present if role is model
}

export interface Memory {
  id: string;
  text: string;
  active: boolean;
}

export interface Story {
  id: string;
  title: string;
  setup: StorySetup;
  messages: Message[];
  memory: Memory[];
  createdAt: number;
  lastUpdated: number;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  setup: StorySetup | null;
}

export interface User {
  id: string;
  email: string;
  name?: string;
}