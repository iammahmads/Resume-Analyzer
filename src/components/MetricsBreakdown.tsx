import React, { useState } from "react";
import { AllMetrics, MetricItem } from "../types";
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

interface MetricsBreakdownProps {
  metrics: AllMetrics;
  overallScore: number;
}

export default function MetricsBreakdown({ metrics, overallScore }: MetricsBreakdownProps) {
  const [activeTab, setActiveTab] = useState<"format" | "experience" | "skills" | "language">("format");
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const categories = [
    { key: "format", label: "Page & Format (8 Metrics)", data: metrics?.format },
    { key: "experience", label: "Experience & Impact (8 Metrics)", data: metrics?.experience },
    { key: "skills", label: "Skills Alignment (8 Metrics)", data: metrics?.skills },
    { key: "language", label: "Language & Style (8 Metrics)", data: metrics?.language },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-500 bg-emerald-50 border-emerald-100";
    if (score >= 75) return "text-amber-500 bg-amber-50 border-amber-100";
    return "text-rose-500 bg-rose-50 border-rose-100";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return "bg-emerald-500 text-white";
    if (score >= 75) return "bg-amber-500 text-white";
    return "bg-rose-500 text-white";
  };

  const getStatusIcon = (score: number) => {
    if (score >= 90) return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
    if (score >= 75) return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
    return <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />;
  };

  const activeCategory = categories.find((c) => c.key === activeTab);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Granular ATS Audit Matrix</h2>
          <p className="text-sm text-slate-500 mt-1">
            Thirty-two (32) individual professional checkpoints analyzed by Gemini AI
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 self-start">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Aggregate ATS</span>
          <span className={`text-xl font-bold px-3 py-1 rounded-lg ${getScoreBadge(overallScore)}`}>
            {overallScore}%
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        {categories.map((cat) => {
          const score = cat.data?.avgScore ?? 0;
          const isSelected = activeTab === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveTab(cat.key as any)}
              className={`p-3.5 rounded-xl border text-left transition-all relative ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-500/10"
                  : "border-slate-100 hover:bg-slate-50 hover:border-slate-200"
              }`}
            >
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">
                {cat.key}
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-xl font-bold text-slate-800">{score}</span>
                <span className="text-xs font-semibold text-slate-400">/100</span>
              </div>
              {isSelected && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-indigo-600 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Checklist items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {activeCategory?.label}
          </span>
          <span className="text-xs text-slate-400">Click row for full HR analysis</span>
        </div>

        {activeCategory?.data?.items?.map((item: MetricItem, index: number) => {
          const isExpanded = expandedMetric === `${activeTab}-${index}`;
          return (
            <div
              key={index}
              onClick={() => setExpandedMetric(isExpanded ? null : `${activeTab}-${index}`)}
              className={`border rounded-xl transition-all cursor-pointer ${
                isExpanded
                  ? "border-slate-300 bg-slate-50/50 shadow-xs"
                  : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/30"
              } p-4`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {getStatusIcon(item.score)}
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm md:text-base leading-tight">
                      {item.name}
                    </h4>
                    <p className="text-slate-500 text-xs mt-0.5 truncate max-w-lg">
                      {item.assessment}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`px-2.5 py-1 text-xs font-bold rounded-md border ${getScoreColor(item.score)}`}>
                    {item.score}/100
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs md:text-sm text-slate-600 leading-relaxed bg-white p-3 rounded-lg border">
                  <p className="font-medium text-slate-800 mb-1">AI Assessor Notes:</p>
                  {item.assessment}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span className="text-xs text-indigo-600 font-medium">Verified by AI Resume Analyzer</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
