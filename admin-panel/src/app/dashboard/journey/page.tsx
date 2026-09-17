"use client";

import React, { useState } from "react";
import { Upload, FileJson, CheckCircle, AlertCircle, Copy, Check, FileCheck, Info } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import { auth } from "@/lib/firebase";
import { apiService } from "@/services/api";

const MASTER_PROMPT = `# Master Prompt — Inner Journey Generator

You are a content generation assistant for Atmik AI ("Your Inner Journey" section). Generate original, soothing, reflective daily reflection bundles grounded in mindfulness, spiritual self-inquiry, and inner awareness.

## Step 1 — Ask the User

Before generating reflection bundles, ask these two questions:

1. **Number of Days:** How many days of daily reflection bundles would you like to generate? (e.g., 7 days, 30 days, 90 days). The total number of reflection objects in the JSON array MUST equal the exact number of days requested (with IDs formatted as "day_01", "day_02", ... "day_N").

2. **Category:** Which categories would you like to focus on?

   Suggest a varied selection of core Atmik AI categories:
   **Mindfulness & Presence, Emotional Balance & Healing, Inner Self-Inquiry & Awareness, Compassion & Relationships, Stress Relief & Calm, Gratitude & Contentment, and Spiritual Wisdom.**

   Also ask: **Would you like to provide custom categories instead?**

Do not generate content until both answers are provided.

## JSON Structure

Each daily reflection object MUST strictly follow this exact JSON structure:

\`\`\`json
[
  {
    "id": "day_01",
    "todaysReflection": {
      "question": "What is occupying your mind right now?",
      "helperText": "Take a moment to pause and listen.",
      "backHelperText": "There is nothing you need to get right.",
      "responseTemplate": "Sometimes simply noticing what's heavy is the first step toward lightness."
    },
    "lookWithin": {
      "question": "What do you need a little more of today?",
      "options": ["Space", "Clarity", "Courage", "Rest"],
      "responses": {
        "Space": "Perhaps you don't need to solve everything today. A little space can be meaningful too.",
        "Clarity": "Clarity often comes when we stop trying so hard to find it. Just breathe.",
        "Courage": "You have survived 100% of your hardest days. The courage is already within you.",
        "Rest": "It is not a weakness to rest. It is how you heal."
      }
    },
    "thoughtToCarry": {
      "quote": "Not everything that asks for your attention deserves your energy.",
      "author": "Dr. Swatantra Jain"
    }
  }
]
\`\`\`

## Generation Rules

* Generate unique, soothing, and reflective questions grounded in mindfulness and spiritual self-inquiry.
* The total number of items in the JSON array MUST equal the exact number of days requested by the user.
* The \`lookWithin\` options MUST be an array of 4 short choices.
* The \`lookWithin\` responses MUST be a JSON object mapping each option string to a compassionate 1-2 sentence response.
* Ensure all quotes under \`thoughtToCarry\` are inspiring and attributed properly (e.g., "Dr. Swatantra Jain" or relevant spiritual sources).

## Final Validation & Delivery

Before delivery, verify:
* The exact requested number of daily bundles is included.
* All JSON structures match the schema perfectly.
* The output is valid JSON.

Save the completed collection as a **downloadable ".json" file** (e.g., \`inner_journey_pool.json\`) ready for direct upload into the application or Admin Panel. Provide the downloadable JSON file as the final output.
`;

export default function InnerJourneyAdminPage() {
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
      let json: any;
      try {
        json = JSON.parse(text);
      } catch (pErr) {
        throw new Error("Invalid JSON file format. Please check the JSON syntax.");
      }

      const itemsArray = Array.isArray(json) 
        ? json 
        : (json.items || json.data || json.journey || (json.todaysReflection ? [json] : null));

      if (!itemsArray || itemsArray.length === 0) {
        throw new Error("JSON must contain an array of inner journey objects.");
      }

      // Client-side validation & normalization: ensure each object has required fields
      const normalizedItems = itemsArray.map((item: any, i: number) => {
        const todaysReflection = item.todaysReflection || item.todayReflection;
        const lookWithin = item.lookWithin;
        const thoughtToCarry = item.thoughtToCarry || item.thoughtsToCarry;

        if (!todaysReflection || !lookWithin || !thoughtToCarry) {
          throw new Error(`Validation Error: Item #${i + 1} is missing required fields (todaysReflection, lookWithin, or thoughtToCarry).`);
        }

        return {
          id: item.id || `day_${String(i + 1).padStart(2, '0')}`,
          todaysReflection,
          lookWithin,
          thoughtToCarry
        };
      });

      const res = await apiService.uploadJourneyJSON(normalizedItems);

      setStatus("success");
      setMessage(res.message || `Successfully uploaded ${normalizedItems.length} inner journey items!`);
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
        <h2 className="font-heading text-3xl font-bold text-primary-navy">Inner Journey Management</h2>
        <p className="text-xs text-primary-navy/40 mt-1 font-light">Generate AI daily journey bundles or upload JSON files for the Your Inner Journey cards.</p>
      </div>

      {/* Top 2-Column Grid: Upload Component & Guidelines side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Card 1: Upload Journey JSON */}
        <div className="bg-white border border-border-custom rounded-card p-6 shadow-soft flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-primary-navy font-ui flex items-center gap-2">
                <FileJson size={18} className="text-accent-gold" /> Upload Journey JSON
              </h3>
              <span className="text-[11px] font-semibold text-accent-gold bg-accent-gold/10 px-2.5 py-1 rounded-full border border-accent-gold/20 font-ui">
                Daily Pool Array
              </span>
            </div>

            <div className="border-2 border-dashed border-border-custom hover:border-accent-gold/40 rounded-xl p-8 text-center transition-colors flex flex-col items-center justify-center bg-background/50">
              <div className="p-3 bg-accent-gold/10 rounded-full text-accent-gold mb-3">
                <Upload size={22} />
              </div>
              <h4 className="text-xs font-semibold text-primary-navy mb-1 font-ui">Select JSON File</h4>
              <p className="text-[12px] text-primary-navy/50 mb-5 max-w-xs leading-relaxed font-ui font-light">
                Upload a JSON array of journey objects containing <code className="text-accent-gold font-mono">todaysReflection</code>, <code className="text-accent-gold font-mono">lookWithin</code>, and <code className="text-accent-gold font-mono">thoughtToCarry</code>.
              </p>
              
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                id="journey-json-upload"
              />
              <label
                htmlFor="journey-json-upload"
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
                  <h4 className="text-xs font-semibold text-primary-navy font-ui">3 Core Card Bundle Components</h4>
                  <p className="text-[12px] text-primary-navy/50 leading-relaxed font-ui font-light">
                    Every daily bundle requires Today's Reflection, Look Within (with 4 choices), and Thought to Carry.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1 bg-accent-gold/10 text-accent-gold rounded mt-0.5">
                  <Check size={12} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-primary-navy font-ui">Strict JSON Schema</h4>
                  <p className="text-[12px] text-primary-navy/50 leading-relaxed font-ui font-light">
                    JSON must be an array of objects matching the schema structure.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1 bg-accent-gold/10 text-accent-gold rounded mt-0.5">
                  <Check size={12} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-primary-navy font-ui">Dynamic Non-Repeating Rotation</h4>
                  <p className="text-[12px] text-primary-navy/50 leading-relaxed font-ui font-light">
                    The backend serves unused items daily and automatically resets the cycle when complete.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sample JSON snippet */}
          <div className="pt-2">
            <div className="p-3 bg-background rounded-xl border border-border-custom overflow-x-auto">
              <pre className="text-[10.5px] text-primary-navy/80 font-mono">
{`[
  {
    "todaysReflection": { "question": "..." },
    "lookWithin": { "question": "...", "options": ["..."], "responses": {...} },
    "thoughtToCarry": { "quote": "...", "author": "..." }
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
            Copy the master prompt to ask AI tools (ChatGPT, Claude) for daily journey bundles formatted into a downloadable JSON file.
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
