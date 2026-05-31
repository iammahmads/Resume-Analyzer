import React, { useState } from "react";
import { Copy, Check, FileText } from "lucide-react";

interface CoverLetterTabProps {
  coverLetterText: string;
  jobTitle: string;
}

export default function CoverLetterTab({ coverLetterText, jobTitle }: CoverLetterTabProps) {
  const [copied, setCopied] = useState(false);
  const [editableText, setEditableText] = useState(coverLetterText);

  const handleCopy = () => {
    navigator.clipboard.writeText(editableText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
        <div>
          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-widest border border-amber-100">
            ✉ Generated Resource
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-3 tracking-tight">Tailored Cover Letter Workspace</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Auto-structured specifically for: <span className="font-semibold text-slate-800">{jobTitle || "the target organization"}</span>
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-all shadow-xs self-start md:self-center"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" /> Letter Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" /> Copy Letter text
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Editor Instructions Pane */}
        <div className="lg:col-span-1 bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm md:text-base">Workspace Guidelines</h3>
            </div>
            <ul className="text-xs text-slate-500 space-y-2.5 list-inside list-disc">
              <li>Feel free to edit the address and placeholders inside the workspace editor directly.</li>
              <li>Calculated from matching accomplishments, optimizing keywords identified.</li>
              <li>Includes explicit focus on missing competencies bridged effectively.</li>
            </ul>
          </div>

          <div className="mt-6 text-[11px] text-slate-400 bg-white border border-slate-100 p-2.5 rounded-lg leading-normal">
            * Remember to replace general hiring manager addresses with standard target team labels for the best results.
          </div>
        </div>

        {/* Workspace Textarea */}
        <div className="lg:col-span-3">
          <textarea
            value={editableText}
            onChange={(e) => setEditableText(e.target.value)}
            className="w-full h-[400px] p-5 border border-slate-200 rounded-xl font-sans text-sm md:text-base text-slate-700 leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/20"
            placeholder="No cover letter text generated yet. Paste or perform an audit to create a cover letter."
          />
        </div>
      </div>
    </div>
  );
}
