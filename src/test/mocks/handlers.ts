import { http, HttpResponse } from "msw";

/**
 * Mock Service Worker handlers for testing
 * Use these handlers to mock API responses in tests
 */
export const handlers = [
  // Mock authentication endpoints
  http.post("/api/auth/login", () => {
    return HttpResponse.json({
      user: {
        id: "test-user-id",
        email: "test@example.com",
      },
    });
  }),

  http.post("/api/auth/register", () => {
    return HttpResponse.json({
      user: {
        id: "test-user-id",
        email: "test@example.com",
      },
    });
  }),

  http.post("/api/auth/logout", () => {
    return HttpResponse.json({ success: true });
  }),

  // Mock flashcard endpoints
  http.get("/api/flashcards", () => {
    return HttpResponse.json([
      {
        id: "1",
        question: "What is React?",
        answer: "A JavaScript library for building user interfaces",
        user_id: "test-user-id",
        created_at: new Date().toISOString(),
      },
    ]);
  }),

  http.post("/api/flashcards", () => {
    return HttpResponse.json({
      id: "2",
      question: "New flashcard",
      answer: "New answer",
      user_id: "test-user-id",
      created_at: new Date().toISOString(),
    });
  }),

  // Mock AI generation endpoint
  http.post("/api/ai/generate", () => {
    return HttpResponse.json({
      flashcards: [
        {
          question: "Generated question 1",
          answer: "Generated answer 1",
        },
        {
          question: "Generated question 2",
          answer: "Generated answer 2",
        },
      ],
    });
  }),
];
