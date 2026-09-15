"use client";

import React, { useState } from "react";
import { Upload, FileJson, CheckCircle, AlertCircle, Copy, Check, FileCheck, Info } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import { auth } from "@/lib/firebase";

const MASTER_PROMPT = `# Master Prompt — Quote Generator

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

Save the completed collection as a **downloadable ".json" file** ready for direct upload into the application or Admin Panel.

Use a simple filename based on the selected category, for example:

"daily_quotes.json"

Provide the downloadable JSON file as the final output.
`;

export default function QuotesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const { currentAdmin } = useAdminStore();

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(MASTER_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setStatus("idle");
      setMessage("");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus("uploading");
    setMessage("");

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      if (!Array.isArray(json)) {
        throw new Error("JSON must be an array of quotes");
      }

      // Client-side validation: ensure each object has a valid "text" property
      const invalidQuotes = json.filter((q: any) => {
        const quoteText = (q.text || q.quote || "").trim();
        return !quoteText;
      });

      if (invalidQuotes.length > 0) {
        throw new Error(`Validation Error: Every object in the JSON array must contain a non-empty "text" property.`);
      }

      // Obtain a fresh token from Firebase Auth if currentAdmin.token is missing/expired
      const token = await auth.currentUser?.getIdToken(/* forceRefresh */ true) || currentAdmin?.token;

      if (!token) {
        throw new Error("Authentication token missing. Please sign out and sign back in.");
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8787";
      const res = await fetch(`${baseUrl}/api/admin/quotes/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(json),
      });

      if (!res.ok) {
        throw new Error("Failed to upload quotes to server. Please check your account permissions or try again.");
      }

      setStatus("success");
      setMessage(`Successfully uploaded ${json.length} quotes!`);
      setFile(null);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Failed to process JSON file");
    }
  };

  return (
    <div className="space-y-6 select-none font-ui relative">
      {/* Header Row */}
      <div>
        <h2 className="font-heading text-3xl font-bold text-primary-navy">Quotes Management</h2>
        <p className="text-xs text-primary-navy/40 mt-1 font-light">Generate AI quotes or upload JSON files for the Daily Inspiration card.</p>
      </div>

      {/* Top 2-Column Grid: Upload Component & Guidelines side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Card 1: Upload Quotes JSON */}
        <div className="bg-white border border-border-custom rounded-card p-6 shadow-soft flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-primary-navy font-ui flex items-center gap-2">
                <FileJson size={18} className="text-accent-gold" /> Upload Quotes JSON
              </h3>
              <span className="text-[11px] font-semibold text-accent-gold bg-accent-gold/10 px-2.5 py-1 rounded-full border border-accent-gold/20 font-ui">
                45–65 Chars (~55-60)
              </span>
            </div>

            <div className="border-2 border-dashed border-border-custom hover:border-accent-gold/40 rounded-xl p-8 text-center transition-colors flex flex-col items-center justify-center bg-background/50">
              <div className="p-3 bg-accent-gold/10 rounded-full text-accent-gold mb-3">
                <Upload size={22} />
              </div>
              <h4 className="text-xs font-semibold text-primary-navy mb-1 font-ui">Select JSON File</h4>
              <p className="text-[12px] text-primary-navy/50 mb-5 max-w-xs leading-relaxed font-ui font-light">
                Upload a JSON array of quote objects containing the <code className="text-accent-gold font-mono">text</code> property.
              </p>
              
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                id="json-upload"
              />
              <label
                htmlFor="json-upload"
                className="bg-primary-navy hover:bg-primary-navy/90 text-white text-xs font-semibold px-5 py-2.5 rounded-button cursor-pointer transition-all shadow-soft inline-flex items-center gap-2 font-ui"
              >
                Choose File
              </label>
            </div>
          </div>

          {/* Upload Status / Actions */}
          <div className="space-y-3 pt-2">
            {file && (
              <div className="p-3 bg-background rounded-xl flex items-center justify-between border border-border-custom text-xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileCheck size={16} className="text-accent-gold flex-shrink-0" />
                  <span className="font-medium text-primary-navy truncate">{file.name}</span>
                </div>
                <button
                  onClick={handleUpload}
                  disabled={status === "uploading"}
                  className="bg-primary-navy hover:bg-primary-navy/90 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0 transition-all font-ui shadow-soft"
                >
                  {status === "uploading" ? "Uploading..." : "Upload"}
                </button>
              </div>
            )}

            {status === "success" && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl flex items-center gap-2 border border-emerald-200 text-xs font-ui">
                <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                <span className="font-medium">{message}</span>
              </div>
            )}

            {status === "error" && (
              <div className="p-3 bg-red-50 text-red-800 rounded-xl flex items-center gap-2 border border-red-200 text-xs font-ui">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                <span className="font-medium">{message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Guidelines & Requirements */}
        <div className="bg-white border border-border-custom rounded-card p-6 shadow-soft flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-semibold text-sm text-primary-navy font-ui flex items-center gap-2 border-b border-border-custom/50 pb-3 mb-4">
              <Info size={16} className="text-accent-gold" /> Guidelines & Requirements
            </h3>

            <div className="space-y-3.5">
              <div className="flex items-start gap-2.5">
                <div className="p-1 bg-accent-gold/10 text-accent-gold rounded mt-0.5">
                  <Check size={12} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-primary-navy font-ui">45–65 Character Length</h4>
                  <p className="text-[12px] text-primary-navy/50 leading-relaxed font-ui font-light">
                    Target ~55–60 characters for optimal visual display on mobile cards.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1 bg-accent-gold/10 text-accent-gold rounded mt-0.5">
                  <Check size={12} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-primary-navy font-ui">Single Key JSON Schema</h4>
                  <p className="text-[12px] text-primary-navy/50 leading-relaxed font-ui font-light">
                    Each object must contain only the <code className="text-accent-gold font-mono">"text"</code> key.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1 bg-accent-gold/10 text-accent-gold rounded mt-0.5">
                  <Check size={12} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-primary-navy font-ui">Interactive Prompt Flow</h4>
                  <p className="text-[12px] text-primary-navy/50 leading-relaxed font-ui font-light">
                    Master prompt asks for category and quantity before generating downloadable JSON.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sample JSON snippet */}
          <div className="pt-2">
            <div className="p-3 bg-background rounded-xl border border-border-custom">
              <pre className="text-[11px] text-primary-navy/80 font-mono">
{`[
  {
    "text": "Your habits are the silent architects of your future."
  },
  {
    "text": "Inner stillness reveals what restless thinking conceals."
  }
]`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: AI Master Prompt Generator Card */}
      <div className="bg-white border border-border-custom rounded-card p-6 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-sm text-primary-navy font-ui">AI Master Prompt Generator</h3>
          <p className="text-xs text-primary-navy/50 mt-1 max-w-xl leading-relaxed font-ui font-light">
            Copy the interactive master prompt to ask AI tools (ChatGPT, Claude) for category-based quotes formatted into a downloadable JSON file.
          </p>
        </div>

        <button
          onClick={handleCopyPrompt}
          className="bg-white border border-border-custom hover:border-accent-gold/40 text-primary-navy text-xs font-semibold px-4 py-2.5 rounded-button transition-all shadow-soft flex items-center justify-center gap-2 flex-shrink-0 active:scale-95 cursor-pointer font-ui"
        >
          {copied ? (
            <>
              <Check size={14} className="text-emerald-600" /> Copied Prompt!
            </>
          ) : (
            <>
              <Copy size={14} className="text-primary-navy/50" /> Copy Master Prompt
            </>
          )}
        </button>
      </div>
    </div>
  );
}
