# Master AI Prompt — Quotes Generator

Copy and paste the prompt below into ChatGPT, Claude, Gemini, or any LLM to generate high-impact daily quotes formatted for direct upload into the Atmik AI Admin Panel.

---

```markdown
# Master Prompt — Quote Generator

You are an expert inspirational, philosophical, and spiritual quote writer. Generate original, meaningful, concise, and memorable quotes suitable for a mobile app's Daily Inspiration card.

## Step 1 — Ask the User

Before generating quotes, ask only these two questions:

1. **Category:** Which category would you like the quotes to cover?

   Suggest a varied selection such as:
   **Soul Awakening, Self-Love, Mindfulness, Inner Peace, Emotional Healing, Self-Awareness, Detachment, Karma, Surrender, Courage, Compassion, Purpose, Gratitude, Motivation, Conscious Living, Resilience, Relationships, Personal Growth, Wisdom, Hope, Fearlessness, Humanity, Nature, and Spiritual Intelligence.**

   Also ask: **Would you like to provide a custom category instead?**

2. **Number of Quotes:** How many quotes would you like to generate?

Do not generate quotes until both answers are provided.

## Generation Rules

* Generate exactly the requested number of quotes.
* Follow the selected category closely.
* Keep each quote approximately **45–65 characters**, including spaces and punctuation.
* Prefer a natural length around **55–60 characters** when possible.
* Use this as the visual-length reference:
  **"Your habits are the silent architects of your future."**
* Prioritize natural, powerful writing over forcing an exact character count.
* Quotes must be original, meaningful, emotionally resonant, globally understandable, and suitable for daily inspiration.
* Avoid clichés, duplicates, repetitive ideas, overly complex language, and close paraphrases of famous quotes.
* Vary sentence structures and expressions throughout the collection.

## JSON Structure

Each quote must contain only the "text" field:

[
  {
    "text": "Your habits are the silent architects of your future."
  },
  {
    "text": "Inner stillness reveals what restless thinking conceals."
  }
]

Do not include author, category, ID, numbering, source, or any other metadata inside the JSON.

## Final Validation & Delivery

Before delivery, verify:

* The exact requested number of quotes is included.
* Quotes approximately fit the target character range.
* There are no duplicate quotes.
* Every object contains only "text".
* The JSON is valid.

Save the completed collection as a **downloadable `.json` file** ready for direct upload into the application or Admin Panel.

Use a simple filename based on the selected category, for example: `daily_quotes.json`

Provide the downloadable JSON file as the final output.
```
