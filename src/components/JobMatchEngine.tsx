import React from "react";
import { KeywordMatchStruct } from "../types";
import { Check, X, ShieldAlert, BadgeCheck, AlertCircle } from "lucide-react";

interface JobMatchEngineProps {
  matchingPercentage: number;
  keywordMatches: KeywordMatchStruct;
  skillsGap: string[];
  jobTitle: string;
}

export default function JobMatchEngine({
  matchingPercentage,
  keywordMatches,
  skillsGap,
  jobTitle,
}: JobMatchEngineProps) {
  const getMatchLevel = (pct: number) => {
    if (pct >= 85) return { label: "Excellent Match", color: "text-emerald-500 bg-emerald-50 border-emerald-100", pill: "bg-emerald-500" };
    if (pct >= 70) return { label: "Competitive Match", color: "text-amber-500 bg-amber-50 border-amber-100", pill: "bg-amber-500" };
    return { label: "Skill Gap Identified", color: "text-rose-500 bg-rose-50 border-rose-100", pill: "bg-rose-500" };
  };

  const level = getMatchLevel(matchingPercentage);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Match Gauge & Info */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col justify-between">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full">
            Role Relevance
          </span>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight mt-3">Job Matching Score</h2>
          <p className="text-sm text-slate-500 mt-1">
            Relevance for: <span className="font-semibold text-slate-700">{jobTitle || "Not specified"}</span>
          </p>
        </div>

        {/* Circular Gauge */}
        <div className="my-6 flex flex-col items-center">
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* SVG circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                className="stroke-slate-100"
                strokeWidth="10"
                fill="none"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                className="stroke-indigo-600 transition-all duration-1000"
                strokeWidth="10"
                strokeDasharray={440}
                strokeDashoffset={440 - (440 * matchingPercentage) / 100}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-4xl font-extrabold text-slate-800">{matchingPercentage}%</span>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">Match Index</p>
            </div>
          </div>

          <div className={`mt-4 px-4 py-2 rounded-xl text-xs font-bold border ${level.color}`}>
            {level.label}
          </div>
        </div>

        <div className="text-xs text-slate-400 leading-normal text-center bg-slate-50 p-3 rounded-lg">
          The score evaluates matching semantic categories, hard credentials, and direct keywords found in your resume compared to target specifications.
        </div>
      </div>

      {/* Center Column: Keyword Matches */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="mb-4">
          <h3 className="font-bold text-slate-800 text-lg">Parser Keyword Audit</h3>
          <p className="text-sm text-slate-500 mt-0.5">Keywords matched vs missing</p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <BadgeCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Matched Keywords ({keywordMatches?.matched?.length ?? 0})
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {keywordMatches?.matched && keywordMatches.matched.length > 0 ? (
                keywordMatches.matched.map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium bg-emerald-50 text-emerald-700 border border-emerald-100"
                  >
                    <Check className="w-3 h-3 text-emerald-500 shrink-0" /> {kw}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">No matching keywords parsed</span>
              )}
            </div>
          </div>

          <hr className="border-slate-100" />

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Missing Keywords ({keywordMatches?.missing?.length ?? 0})
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {keywordMatches?.missing && keywordMatches.missing.length > 0 ? (
                keywordMatches.missing.map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium bg-rose-50 text-rose-700 border border-rose-100"
                  >
                    <X className="w-3 h-3 text-rose-500 shrink-0" /> {kw}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">Amazing! No critical missing keywords</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Skills Gap */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col justify-between">
        <div>
          <div className="mb-4">
            <h3 className="font-bold text-slate-800 text-lg">Identified Skills Gaps</h3>
            <p className="text-sm text-slate-500 mt-0.5">Top credentials or technologies to add</p>
          </div>

          <div className="space-y-2.5">
            {skillsGap && skillsGap.length > 0 ? (
              skillsGap.map((gap, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 bg-amber-50/40 border border-amber-100/60 rounded-xl p-3"
                >
                  <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800 text-xs md:text-sm block">
                      {gap}
                    </span>
                    <span className="text-xs text-slate-500 leading-tight">
                      Acquiring this would increase your match score significantly.
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-xl">
                <BadgeCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <span className="text-xs text-slate-500 font-medium">No major skills gap discovered!</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-xs text-emerald-700 bg-emerald-50 p-3 rounded-lg flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Tailor your resume highlighting alternative projects matching these gaps of knowledge.</span>
        </div>
      </div>
    </div>
  );
}
