# PromptArchitect

> **A professional-grade IDE for the engineering, optimization, and execution of LLM prompts.**

PromptArchitect is a specialized development environment designed for Prompt Engineers. It treats prompts as version-controlled software artifacts rather than transient text, offering advanced tooling for optimization, variable injection, and systematic testing against the Google Gemini API.

![Theme](https://img.shields.io/badge/Theme-Cyber--Void-06b6d4?style=flat-square)
![Stack](https://img.shields.io/badge/Tech-React_19_%7C_TypeScript_%7C_Tailwind-white?style=flat-square)
![Model](https://img.shields.io/badge/Engine-Gemini_2.5_%26_3.0-8b5cf6?style=flat-square)

---

## ⚡ Key Features

### 1. Professional Prompt Editor
*   **Hybrid View:** Switch between a GUI Form designer and raw YAML Frontmatter source code.
*   **Variable Typing:** Strongly typed variables support:
    *   `Text`: Standard string injection.
    *   `File`: Drag-and-drop file context loading.
    *   `Selection`: Optimized for injecting IDE/Clipboard selections.
    *   `Stdin`: Terminal log/piped input handling.
*   **Template Engine:** Built-in support for Handlebars syntax (e.g., `{{variable_name}}`).

### 2. Algorithmic Optimization
Don't just write prompts; architect them using proven research strategies built directly into the execution pipeline:
*   **Step-Back Prompting:** Automatically generates high-level abstractions and principles before answering specific queries to reduce hallucination.
*   **Chain of Density (CoD):** A recursive optimization loop that iteratively densifies summaries to maximize information per token.

### 3. Intelligent Retrieval System
A sophisticated "Spotlight-like" library search engine (`Cmd+K`) powered by a Hybrid Ranking Algorithm:
*   **Vector Similarity:** Uses `text-embedding-004` for semantic understanding.
*   **Keyword Matching:** Exact string matching for specific tags or names.
*   **Recency & Frequency:** Boosts prompts based on how often and how recently they are used.

### 4. Production-Grade Execution
*   **Model Routing:** Switch between **Fast** (Gemini 2.5 Flash), **Smart** (Gemini 3.0 Pro), and **Reasoning** (Thinking Budget enabled) modes.
*   **Rate Limiting:** Implements a local Token Bucket algorithm to strictly adhere to API limits (15 RPM / 2 RPM), persisting state across reloads.
*   **Resilience:** Automatic exponential backoff retry logic for handling 503/500 API errors.

### 5. Cyber-Void Interface
*   **Offline-First:** All data is persisted locally via `localStorage`.
*   **Data Portability:** Full JSON Import/Export capabilities.
*   **Responsive:** "Glassmorphism" UI that adapts from Desktop Sidebars to Mobile Bottom Navigation.

---

## 🛠 Technical Architecture

The application is built as a client-side Single Page Application (SPA) using **React 19**.

### Core Stack
*   **Frontend:** React 19, TypeScript, Vite
*   **Styling:** Tailwind CSS (Custom "Cyber-Void" configuration)
*   **Icons:** Lucide React
*   **AI SDK:** `@google/genai` (v1.30+)

### Directory Structure
*   `components/`: UI modules (Library, Editor, Execution, CommandPalette).
*   `services/`:
    *   `geminiService.ts`: Handles API communication, embedding generation, and implementation of CoD/Step-Back algorithms.
    *   `storageService.ts`: Local persistence layer and Hybrid Search ranking logic.
*   `types.ts`: TypeScript definitions for the Prompt Schema.

---

## 🚀 Getting Started

### Prerequisites
*   A valid **Google Gemini API Key**.

### Installation
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set your API Key in the environment (or injected via the framework):
    ```bash
    export API_KEY="your_gemini_api_key"
    ```
4.  Start the development server:
    ```bash
    npm start
    ```

### Usage Guide
1.  **Create:** Open the Editor to draft a new protocol. Define variables using `{{brackets}}`.
2.  **Configure:** Select your variable types (e.g., change a code input to `File` type).
3.  **Optimize:** Enable "Step-Back" for reasoning tasks or "Chain of Density" for summarization.
4.  **Execute:** Hit Run. The system handles context injection and displays the output in a terminal-style console.
5.  **Search:** Use `Cmd+K` (Mac) or `Ctrl+K` (Windows) to access the global command palette.

---

## 🔒 Privacy & Security
*   **Local Storage:** Your prompt library lives entirely in your browser's Local Storage. No external database is used.
*   **API Usage:** Prompts are sent directly from your browser to Google's servers.

---

*Architected for the post-GPT era.*
