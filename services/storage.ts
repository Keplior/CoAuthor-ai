import { Story, User } from "../types";

// This service simulates a backend. 
// To make this work across real devices, replace the localStorage calls 
// with Firebase Firestore, Supabase, or your own API calls.

const DELAY_MS = 600; // Simulate network latency

export const storageService = {
  // Simulate User Login/Register
  async login(email: string): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    // In a real app, you would validate passwords here.
    return {
      id: btoa(email), // Simple mock ID generation
      email: email,
      name: email.split('@')[0]
    };
  },

  // Fetch stories for a specific user
  async getStories(userId: string): Promise<Story[]> {
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    const key = `coauthor_stories_${userId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },

  // Save stories for a specific user
  async saveStories(userId: string, stories: Story[]): Promise<void> {
    // In a real app, this would be a PUT/POST request
    const key = `coauthor_stories_${userId}`;
    localStorage.setItem(key, JSON.stringify(stories));
  },

  // Check for existing session
  getUserSession(): User | null {
    const savedUser = localStorage.getItem('coauthor_user_session');
    return savedUser ? JSON.parse(savedUser) : null;
  },

  saveUserSession(user: User) {
    localStorage.setItem('coauthor_user_session', JSON.stringify(user));
  },

  clearUserSession() {
    localStorage.removeItem('coauthor_user_session');
  }
};