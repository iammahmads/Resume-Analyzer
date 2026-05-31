import React, { useState } from "react";
import { HrEvaluationStruct } from "../types";
import { ThumbsUp, ThumbsDown, UserCheck, ShieldQuestion } from "lucide-react";

interface HrEvaluationProps {
  evaluation: HrEvaluationStruct;
}

export default function HrEvaluation({ evaluation }: HrEvaluationProps) {
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  const toggleAnswer = (idx: number) => {
    setRevealedAnswers((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const suitabilityMap: Record<string, { bg: string, text: string }> = {
    "Highly Recommended": { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", text: "text-emerald-700" },
    "Recommended": { bg: "bg-teal-50 text-teal-700 border-teal-200", text: "text-teal-700" },
    "Highly Recommended (With Gap Alleviations)": { bg: "bg-indigo-50 text-indigo-700 border-indigo-200", text: "text-indigo-700" },
    "Recommended with Reservations": { bg: "bg-amber-50 text-amber-700 border-amber-200", text: "text-amber-700" },
  };

  const suitabilityStyle = suitabilityMap[evaluation?.suitability] || {
    bg: "bg-rose-50 text-rose-700 border-rose-200",
    text: "text-rose-700",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Strengths & Weaknesses */}
      <div className="space-y-6">
        {/* Recruiter Suitability verdict */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 p-2 rounded-xl">
              <UserCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">HR Benchmarking Recommendation</h3>
              <p className="text-xs text-slate-400">Recruiting Committee Recommendation</p>
            </div>
          </div>

          <div className={`mt-4 p-4 rounded-xl border flex items-center justify-between ${suitabilityStyle.bg}`}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-90">HR Stability Verdict</p>
              <p className="text-lg font-bold mt-0.5">{evaluation?.suitability || "Review Underway"}</p>
            </div>
            <div className="text-2xl font-black opacity-80">✔</div>
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ThumbsUp className="w-5 h-5 text-emerald-500" />
              <h4 className="font-bold text-slate-800 text-base">Key Technical Strengths</h4>
            </div>
            <div className="space-y-2">
              {evaluation?.strengths?.map((str, i) => (
                <div key={i} className="flex gap-2.5 items-start text-sm text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-emerald-500 font-bold shrink-0">✦</span>
                  <p>{str}</p>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          <div>
            <div className="flex items-center gap-2 mb-3">
              <ThumbsDown className="w-5 h-5 text-rose-500" />
              <h4 className="font-bold text-slate-800 text-base">Key Identified Weaknesses</h4>
            </div>
            <div className="space-y-2">
              {evaluation?.weaknesses?.map((weak, i) => (
                <div key={i} className="flex gap-2.5 items-start text-sm text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-rose-500 font-bold shrink-0">✦</span>
                  <p>{weak}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interview Prep Questions */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <ShieldQuestion className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Predictive Interview Coaching</h3>
              <p className="text-xs text-slate-500">Gemini AI predicted recruiter challenge questions based on matching gaps</p>
            </div>
          </div>

          <div className="space-y-4">
            {evaluation?.interviewQuestions?.map((item, i) => {
              const isRevealed = !!revealedAnswers[i];
              return (
                <div key={i} className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-all bg-slate-50/50">
                  <div className="flex items-start gap-3">
                    <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      Q{i + 1}
                    </span>
                    <p className="font-semibold text-slate-800 text-sm md:text-base leading-snug">
                      {item.question}
                    </p>
                  </div>

                  <div className="mt-2 text-right">
                    <button
                      onClick={() => toggleAnswer(i)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline transition-all bg-white py-1 px-2.5 rounded-md border border-slate-100"
                    >
                      {isRevealed ? "Hide Expected Answer" : "Reveal Best Practice Answer"}
                    </button>
                  </div>

                  {isRevealed && (
                    <div className="mt-3 bg-white border border-indigo-100 rounded-lg p-3.5 text-xs text-slate-600 leading-relaxed">
                      <p className="font-bold text-indigo-900 border-b border-indigo-50 pb-1 mb-1.5 uppercase tracking-widest text-[10px]">
                        Recommended Response Strategy
                      </p>
                      {item.expectedAnswer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-[11px] text-slate-400 mt-6 pt-3 border-t border-slate-100">
          * These behavioral and technical questions target the exact delta between your specified history and the target benchmarks.
        </div>
      </div>
    </div>
  );
}
