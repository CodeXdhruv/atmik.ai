"use client";

import React, { useState } from "react";
import { Upload, FileJson, CheckCircle, AlertCircle, Copy, Check, FileCheck, Info } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import { auth } from "@/lib/firebase";
import { apiService } from "@/services/api";

const MASTER_PROMPT = `# Master Prompt — For You Today Generator

You are a content generation assistant for Atmik AI ("For You Today" / Micro-Experience section). Generate original, soothing, reflective release and renewal micro-experiences grounded in mindfulness, spiritual self-inquiry, and emotional letting go.

## Step 1 — Ask the User

Before generating micro-experience bundles, ask these two questions:

1. **Number of Micro-Experiences:** How many daily micro-experience objects would you like to generate? (e.g., 7 items, 30 items, 90 items). The total number of objects in the JSON array MUST equal the exact number requested (with IDs formatted as "let_go_01", "let_go_02", ... "let_go_N").

2. **Category / Focus Theme:** Which themes would you like to focus on?

   Suggest a varied selection of core Atmik AI release themes:
   **Softening Self-Criticism, Releasing Control & Worry, Loosening Expectations, Emotional Unburdening, Cultivating Peace & Rest, Inviting Clarity & Presence, and Heart Renewal.**

   Also ask: **Would you like to provide custom themes instead?**

Do not generate content until both answers are provided.

## JSON Structure

Each micro-experience object MUST strictly follow this exact JSON structure:

\`\`\`json
[
  {
    "id": "let_go_01",
    "label": "RELEASE",
    "question": "What can you leave behind today?",
    "helper": "Tap one to release it.",
    "releaseOptions": [
      "Worry",
      "Comparison",
      "Control"
    ],
    "transitionLabel": "MAKE SPACE",
    "secondQuestion": "What would you like to make space for?",
    "spaceOptions": [
      "Peace",
      "Clarity",
      "Joy"
    ],
    "completion": {
      "title": "A little more space.",
      "message_template": null,
      "message_templates": [
        "You noticed {first_choice} and made space for {second_choice}. Let that be enough for this moment.",
        "You chose to set down {first_choice} and welcome {second_choice}. Carry that choice gently into your day.",
        "You let {first_choice} become a little lighter, and chose {second_choice} in its place. Stay with that feeling.",
        "Today you made room by releasing {first_choice} and choosing {second_choice}. Nothing more needs to be added."
      ],
      "message_selection": {
        "strategy": "deterministic_from_selected_choices",
        "formula": "(firstChoiceIndex + secondChoiceIndex + experienceIndex) % message_templates.length",
        "fallbackIndex": 0
      }
    },
    "response_messages": {
      "first_choice": {},
      "second_choice": {}
    }
  }
]
\`\`\`

## Generation Rules

* Generate unique, soothing, and reflective questions for daily release and renewal micro-experiences.
* The total number of items in the JSON array MUST equal the exact number requested by the user.
* The \`releaseOptions\` MUST be an array of EXACTLY 3 short choices to let go (1-2 words each).
* The \`spaceOptions\` MUST be an array of EXACTLY 3 short choices to welcome in (1-2 words each).
* The \`completion\` object MUST contain \`title\` and \`message_templates\` array containing 4 formatted template strings with \`{first_choice}\` and \`{second_choice}\` placeholders.

## Final Validation & Delivery

Before delivery, verify:
* The exact requested number of daily bundles is included.
* All JSON structures match the schema perfectly.
* The output is valid JSON.

Save the completed collection as a **downloadable ".json" file** (e.g., \`for_you_today.json\`) ready for direct upload into the application or Admin Panel. Provide the downloadable JSON file as the final output.
`;

export default function ForYouAdminPage() {
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
        : (json.experiences || json.items || json.data || (json.question ? [json] : null));

      if (!itemsArray || itemsArray.length === 0) {
        throw new Error("JSON must contain an array of 'For You' micro-experience objects.");
      }

      // Client-side validation & normalization: ensure each object has required fields
      const normalizedItems = itemsArray.map((item: any, i: number) => {
        if (!item.question || !item.releaseOptions || !item.secondQuestion || !item.spaceOptions) {
          throw new Error(`Validation Error: Item #${i + 1} is missing required fields (question, releaseOptions, secondQuestion, or spaceOptions).`);
        }

        if (!Array.isArray(item.releaseOptions) || item.releaseOptions.length === 0) {
          throw new Error(`Validation Error: Item #${i + 1} releaseOptions must be a non-empty array.`);
        }

        if (!Array.isArray(item.spaceOptions) || item.spaceOptions.length === 0) {
          throw new Error(`Validation Error: Item #${i + 1} spaceOptions must be a non-empty array.`);
        }

        return {
          id: item.id || `let_go_${String(i + 1).padStart(2, '0')}`,
          label: item.label || 'RELEASE',
          question: item.question,
          helper: item.helper || 'Choose what you can put down.',
          releaseOptions: item.releaseOptions,
          transitionLabel: item.transitionLabel || 'MAKE SPACE',
          secondQuestion: item.secondQuestion,
          spaceOptions: item.spaceOptions,
          completion: item.completion || {
            title: 'A little more space.',
            message_template: null,
            message_templates: [
              'You noticed {first_choice} and made space for {second_choice}. Let that be enough for this moment.',
              'You released {first_choice}. Now there is a little more room for {second_choice}.',
              'From {first_choice} to {second_choice}—a small shift, but a meaningful one.',
              'You simply noticed {first_choice} and chose {second_choice}.'
            ],
            message_selection: {
              strategy: 'deterministic_from_selected_choices',
              formula: '(firstChoiceIndex + secondChoiceIndex + experienceIndex) % message_templates.length',
              fallbackIndex: 0
            }
          },
          response_messages: item.response_messages || { first_choice: {}, second_choice: {} }
        };
      });

      const res = await apiService.uploadForYouJSON(normalizedItems);

      setStatus("success");
      setMessage(res.message || `Successfully uploaded ${normalizedItems.length} 'For You Today' micro-experiences!`);
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
        <h2 className="font-heading text-3xl font-bold text-primary-navy">For You Today Management</h2>
        <p className="text-xs text-primary-navy/40 mt-1 font-light">Generate AI daily micro-experiences or upload JSON files for the For You Today cards.</p>
      </div>

      {/* Top 2-Column Grid: Upload Component & Guidelines side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Card 1: Upload For You JSON */}
        <div className="bg-white border border-border-custom rounded-card p-6 shadow-soft flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-primary-navy font-ui flex items-center gap-2">
                <FileJson size={18} className="text-accent-gold" /> Upload For You JSON
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
                Upload a JSON array of micro-experience objects containing <code className="text-accent-gold font-mono">releaseOptions</code>, <code className="text-accent-gold font-mono">spaceOptions</code>, and <code className="text-accent-gold font-mono">completion</code>.
              </p>
              
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                id="for-you-json-upload"
              />
              <label
                htmlFor="for-you-json-upload"
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
                  <h4 className="text-xs font-semibold text-primary-navy font-ui">3 Release & 3 Space Choices</h4>
                  <p className="text-[12px] text-primary-navy/50 leading-relaxed font-ui font-light">
                    Every daily experience requires release choices, space choices, and completion message templates.
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
                    JSON must be an array of objects matching the micro-experience structure.
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
    "id": "let_go_01",
    "label": "RELEASE",
    "question": "What can you leave behind today?",
    "releaseOptions": ["Worry", "Comparison", "Control"],
    "secondQuestion": "What would you like to make space for?",
    "spaceOptions": ["Peace", "Clarity", "Joy"]
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
            Copy the master prompt to ask AI tools (ChatGPT, Claude) for daily micro-experience bundles formatted into a downloadable JSON file.
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
