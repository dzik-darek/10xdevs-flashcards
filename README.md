# 10xdevs Flashcards

![Project Status](https://img.shields.io/badge/status-development-orange)
![Astro](https://img.shields.io/badge/astro-5.0-ff5d01)
![React](https://img.shields.io/badge/react-19.0-61dafb)
![TypeScript](https://img.shields.io/badge/typescript-5.0-3178c6)
![License](https://img.shields.io/badge/license-MIT-blue)

**10xdevs Flashcards** is a web-based learning application designed to maximize study efficiency through **Spaced Repetition (FSRS)** and **Generative AI**.

Instead of spending hours manually creating flashcards, users can simply paste their notes, and the integrated AI (powered by OpenAI via OpenRouter) automatically extracts key concepts and generates questions and answers. The application focuses on a desktop-first experience to streamline the workflow between studying materials and reviewing knowledge.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Features

- **AI-Powered Generation**: Paste text notes to automatically generate high-quality flashcards using GPT-4o-mini.
- **Spaced Repetition System**: Implements the FSRS (Free Spaced Repetition Scheduler) algorithm to optimize review intervals.
- **Smart Draft Mode**: Review, edit, or reject AI-generated cards before adding them to your permanent collection.
- **Flashcard Management**: Create, read, update, and delete flashcards with a search function.
- **Study Dashboard**: View daily review counts and progress.
- **Clean UI**: Built with Shadcn/ui and Tailwind CSS 4 for a modern, accessible interface.

## Tech Stack

### Frontend
- **Framework**: [Astro 5](https://astro.build/)
- **UI Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Components**: [Shadcn/ui](https://ui.shadcn.com/) (Radix UI + Lucide React)

### Backend & Services
- **Backend-as-a-Service**: [Supabase](https://supabase.com/) (Auth, PostgreSQL Database)
- **AI Provider**: [OpenRouter](https://openrouter.ai/) (Accessing OpenAI models)
- **Hosting**: Docker / DigitalOcean

### Testing
- **Unit Testing**: [Vitest](https://vitest.dev/) (Fast unit test framework compatible with Vite/Astro)
- **Component Testing**: [Testing Library](https://testing-library.com/) (React component testing utilities)
- **E2E Testing**: [Playwright](https://playwright.dev/) (Cross-browser end-to-end testing)
- **API Mocking**: [MSW](https://mswjs.io/) (Mock Service Worker for API request interception)

## Getting Started Locally

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites

- **Node.js**: Version `22.14.0` or higher (Managed via `.nvmrc`).
- **npm** or **yarn**.

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/10xdevs-flashcards.git
    cd 10xdevs-flashcards
    ```

2.  **Set up Node version**
    If you use `nvm`, simply run:
    ```bash
    nvm use
    ```

3.  **Install dependencies**
    ```bash
    npm install
    ```

### Environment Variables

Create a `.env` file in the root directory to configure your local environment. You will need credentials for Supabase and OpenRouter.

```bash
# Example .env structure
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

### Running Development Server

Start the Astro development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Available Scripts

In the project directory, you can run:

| Script | Description |
| :--- | :--- |
| `npm run dev` | Starts the local development server with hot reloading. |
| `npm run build` | Builds the production application to the `./dist/` folder. |
| `npm run preview` | Previews the production build locally. |
| `npm run lint` | Runs ESLint to identify code quality issues. |
| `npm run lint:fix` | Runs ESLint and automatically fixes fixable issues. |
| `npm run format` | Formats code using Prettier. |
| `npm run test` | Runs unit and component tests with Vitest. |
| `npm run test:ui` | Opens Vitest UI for interactive test debugging. |
| `npm run test:e2e` | Runs end-to-end tests with Playwright. |

## Project Scope

This project is an **MVP (Minimum Viable Product)**.

### ✅ In Scope
- Web Application (Astro + React)
- Authentication (Email/Password via Supabase)
- AI Flashcard Generator (Text-to-Cards)
- Manual CRUD for Flashcards
- FSRS Spaced Repetition Algorithm (open source library - [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs))
- Error handling and validation (Zod)

### ❌ Out of Scope (For Now)
- Mobile Apps (iOS/Android)
- Social Login (Google, GitHub, etc.)
- Password Reset flows
- File Imports (PDF, Images)
- Decks/Tags organization
- Dark Mode (Light Mode only for MVP)
- Progress Charts/Statistics

## Project Status

🚧 **Active Development**

This project is currently in the **MVP** phase. Core features are being implemented according to the Product Requirements Document.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
