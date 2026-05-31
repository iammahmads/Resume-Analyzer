import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import mammoth from "mammoth";
import * as pdfModule from "pdf-parse";

// Robust parser resolver that works under both typescript TSX runtime (ESM) and Bundled Node (CJS)
async function extractTextFromPdf(dataBuffer: Buffer): Promise<string> {
  let pdfRequire: any = null;
  try {
    const { createRequire } = await import("module");
    const requireFn = createRequire(import.meta.url);
    pdfRequire = requireFn("pdf-parse");
  } catch (e) {
    console.warn("createRequire resolution fallback: ", e);
  }

  if (!pdfRequire) {
    try {
      // @ts-ignore
      pdfRequire = require("pdf-parse");
    } catch (_) {}
  }

  if (!pdfRequire && pdfModule) {
    pdfRequire = pdfModule;
  }

  if (!pdfRequire) {
    throw new Error("Unable to load pdf-parse library on the server side.");
  }

  // Handle modern pdf-parse versions (like 2.4.x) that export a PDFParse class constructor
  if (typeof pdfRequire.PDFParse === "function") {
    try {
      const uint8Array = new Uint8Array(dataBuffer);
      const parserInstance = new pdfRequire.PDFParse(uint8Array);
      await parserInstance.load();
      const textResult = await parserInstance.getText();
      if (typeof textResult === "string") {
        return textResult;
      }
      return textResult.text || "";
    } catch (parseErr: any) {
      console.error("Error parsing with PDFParse class constructor:", parseErr);
      throw new Error("PDF parse object constructor failed: " + parseErr.message);
    }
  }

  // Handle legacy versions of pdf-parse that export a direct function or .default
  let parseFn = typeof pdfRequire === "function" ? pdfRequire : pdfRequire.default;
  if (parseFn && typeof parseFn !== "function" && typeof parseFn.default === "function") {
    parseFn = parseFn.default;
  }

  if (typeof parseFn !== "function") {
    throw new Error("Unable to locate a valid pdf-parse function or constructor on the server side.");
  }

  try {
    const result = await parseFn(dataBuffer);
    return result.text || "";
  } catch (extractErr: any) {
    console.error("Error direct parsing via pdf-parse function:", extractErr);
    throw new Error("Parsing core legacy failed: " + (extractErr.message || extractErr));
  }
}

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: "15mb" }));

// Lazy initializer for Gemini client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required to perform resume analysis. Please configure your key in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Config Status
app.get("/api/config-status", (_req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({
    hasGeminiKey: hasKey,
    port: PORT,
  });
});

// DEEP FORENSIC GEMINI DIRECT AUDIT & RECORD CREATION
app.post("/api/gemini/analyze", async (req, res) => {
  const { resumeText, jobTitle, jobDescription } = req.body;

  if (!resumeText) {
    res.status(400).json({ error: "Resume text content is required" });
    return;
  }

  try {
    const ai = getGeminiClient();

    const systemInstruction = 
      "You are a master HR Evaluator and ATS (Applicant Tracking System) optimizer. " +
      "Your goal is to parse and perform a deep, forensic analysis of the candidate's resume " +
      "against a targeted job title and job description (if provided), or provide a highly granular " +
      "critique for general suitability if no job description is available. " +
      "You must be critical, objective, and realistic, like a senior recruiting manager. " +
      "You MUST return your response in raw JSON format matching the schema requested below. Do not wrap in markdown blocks, just raw JSON.";

    const prompt = `
Please analyze the following Resume and target Job details:

RESUME TEXT:
"""
${resumeText}
"""

TARGET JOB TITLE: ${jobTitle || "General (Not Specified)"}
TARGET JOB DESCRIPTION:
"""
${jobDescription || "Provide general comprehensive ATS auditing and resume structure enhancement."}
"""

You MUST provide an extremely rigorous ATS scoring evaluation. The final result MUST be a single JSON object.
Enforce the following JSON schema:
{
  "overallScore": 85, // Integer out of 100, aggregate score
  "matchingPercentage": 80, // Integer out of 100, matching percent matching target JD
  "metrics": {
    "format": {
      "avgScore": 88, // Average out of 100
      "items": [
        { "name": "White Space & Margins", "score": 90, "assessment": "Generous margins and clear vertical spaces. Easy to skim." },
        { "name": "Font Consistency", "score": 85, "assessment": "Standard clean body font is consistent, though header sizing can be improved." },
        { "name": "Section Hierarchy", "score": 90, "assessment": "Bold and intuitive section markers are perfectly recognized by parsers." },
        { "name": "Bullet Point Formatting", "score": 80, "assessment": "Consistent round bullets used, standard list structures." },
        { "name": "Contact Details Presence", "score": 95, "assessment": "Email, phone number, and LinkedIn are well placed at the top." },
        { "name": "Document Margins", "score": 85, "assessment": "Clean margins, standard 0.75-1 inch bounds detected." },
        { "name": "Length & Page Size", "score": 80, "assessment": "Page count matches experience length, no unnecessary padding." },
        { "name": "Parser Integrity", "score": 100, "assessment": "Clean layout prevents text overlaps and parsing errors." }
      ]
    },
    "experience": {
      "avgScore": 82,
      "items": [
        { "name": "Quantifiable Achievements", "score": 70, "assessment": "Lacks dollar terms, percentages, or concrete metrics on several projects." },
        { "name": "Action Verbs Density", "score": 85, "assessment": "Good implementation of verbs like 'spearheaded', 'orchestrated' and 'engineered'." },
        { "name": "Leadership Showcase", "score": 75, "assessment": "Shows team collaboration, but could amplify administrative or mentor leadership." },
        { "name": "Career Progression Display", "score": 90, "assessment": "Chronology displays clear growth and increased scope of responsibility." },
        { "name": "Date Alignment Correctness", "score": 85, "assessment": "Standard date syntax (Month Year - Present) is consistently structured." },
        { "name": "Project Highlight Detail", "score": 80, "assessment": "Highlights contain core technologies used, matching expectations." },
        { "name": "Active Voice Consistency", "score": 80, "assessment": "Generally uses active tone, minimal passive verbs." },
        { "name": "Chronological Sequence", "score": 95, "assessment": "Flawless chronological layout, standard reverse ordering." }
      ]
    },
    "skills": {
      "avgScore": 80,
      "items": [
        { "name": "Core Technical Match", "score": 80, "assessment": "Good alignment but lacks a few specific stack elements mentioned in the JD." },
        { "name": "Hard & Soft Balance", "score": 85, "assessment": "Good coverage of toolkits alongside management/collaboration descriptors." },
        { "name": "Tech Stack Depth", "score": 75, "assessment": "Skill definitions are descriptive; should categorize by proficiency." },
        { "name": "Credentials & Certs", "score": 80, "assessment": "Relevant certifications mapped correctly, adding weight to skills." },
        { "name": "Skill Over-Indexing Avoidance", "score": 85, "assessment": "Well balanced pool, avoids listing redundant obsolete technologies." },
        { "name": "Recency of Tech Stack Use", "score": 80, "assessment": "Latest jobs showcase current modern tech, decreasing stale skills impact." },
        { "name": "Specific Domain Vocabulary", "score": 75, "assessment": "Uses sector terminology, but missing specialized core definitions." },
        { "name": "Tooling and Environment Detail", "score": 80, "assessment": "Specific tooling is present but missing major cloud/deployment bounds." }
      ]
    },
    "language": {
      "avgScore": 90,
      "items": [
        { "name": "Grammatical Compliance", "score": 95, "assessment": "Flawless syntax and spelling verified across all strings." },
        { "name": "Punctuation Correctness", "score": 95, "assessment": "Punctuation is standard, consistent ending layouts on bullet strings." },
        { "name": "Buzzword Cliché Avoidance", "score": 75, "assessment": "Contains empty slogans like 'results-oriented team player'; replace with facts." },
        { "name": "Readability Score Equivalent", "score": 85, "assessment": "Reading levels are appropriate for technical/management assessors." },
        { "name": "Active vs Passive Ratio", "score": 90, "assessment": "High ratio of active verbs to passive descriptions, conveying strong ownership." },
        { "name": "Professional Styling Tone", "score": 95, "assessment": "Objective, robust, third-person formal industry styling." },
        { "name": "Acronym Declarations", "score": 85, "assessment": "Acronyms are standard; clear meaning within the professional domain." },
        { "name": "First-Person Avoidance", "score": 100, "assessment": "Excellent. Fully avoids 'I', 'Me', or 'My' references." }
      ]
    }
  }, // MUST cover exactly 4 categories of 8 items each (32 metrics in total) to provide a rich 30+ metric assessment.
  "skillsGap": [
    "AWS Lambda / Serverless",
    "CI/CD Tooling (GitHub Actions, Docker)",
    "Redux Toolkit / State Optimization"
  ], // Array of strings (missing technical or soft skills in resume relative to JD)
  "keywordMatches": {
    "matched": ["React", "TypeScript", "Express", "Node.js", "REST APIs", "SQL", "Git"],
    "missing": ["Docker", "Kubernetes", "AWS Cloud", "Jest", "TDD"]
  }, // Matched & missing keywords
  "coverLetter": "Dear hiring manager, ...", // A ready-to-use cover letter tailored for this exact job description, highlighting accomplishments.
  "hrEvaluation": {
    "strengths": [
      "Extremely robust background with modern Web technologies (React, NodeJS)",
      "Excellent technical language tone and strong reverse-chronological presentation",
      "Consistent clean layout showing visual professionalism"
    ],
    "weaknesses": [
      "Lack of specific cloud orchestration metrics or production scaling definitions",
      "No measurable metrics on business impact or user-engagement metrics"
    ],
    "suitability": "Highly Recommended (With Gap Alleviations)", // String describing recruiter verdict
    "interviewQuestions": [
      {
        "question": "Can you walk through how you optimized a React or Express application for production scale?",
        "expectedAnswer": "Discuss lazy loading, pagination, using caching layer, and proper indexing of SQL/NoSQL databases to manage loads."
      },
      {
        "question": "Your resume details several web platforms, but how have you handled testing/TDD or CI/CD pipelines?",
        "expectedAnswer": "Highlight experiences using Docker, orchestrating web hooks, or implementing testing rigs using Jest or Playwright."
      }
    ]
  }
}

Ensure the values returned are fully tailored to the actual Resume Text and Target Job parameters, but conform EXACTLY to the structure requested. All 4 categories under metrics, and all 8 items in each category MUST be parsed specifically corresponding to the content.
Return strictly RAW JSON only. Do not wrap in markdown or prefix/suffix content.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    // Just return the raw analysis Data for the client to store accurately in Firestore
    res.json(parsedData);
    
  } catch (error: any) {
    console.error("Gemini server error: ", error);
    let errorMsg = error.message || "An error occurred during resume analysis";
    if (errorMsg.includes("API key not valid") || errorMsg.includes("API_KEY_INVALID")) {
      errorMsg = "Invalid Gemini API Key. Please update your GEMINI_API_KEY in Settings > Secrets.";
    }
    res.status(500).json({ error: errorMsg });
  }
});

// PARSE DOCUMENT FILE ENDPOINT (BASE64 EXTRACTOR)
app.post("/api/document/parse", async (req, res) => {
  const { fileBase64, fileName } = req.body;
  if (!fileBase64 || !fileName) {
    res.status(400).json({ error: "Missing fileBase64 or fileName data in request body" });
    return;
  }

  try {
    const dataBuffer = Buffer.from(fileBase64, "base64");
    
    if (fileName.toLowerCase().endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      return res.json({ text: result.value });
    } else if (fileName.toLowerCase().endsWith(".pdf")) {
      let extractedText = "";
      try {
        extractedText = await extractTextFromPdf(dataBuffer);
      } catch (err) {
        console.warn("pdf-parse failed, falling back to Gemini OCR", err);
      }

      // If text is very short, it's likely a scanned document. Use Gemini for better quality OCR.
      if (!extractedText || extractedText.trim().length < 150) {
        console.log("Using Gemini for PDF OCR extraction...");
        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            "Extract all text exactly as it appears in this document with clear newlines. Perform OCR if needed. Output *only* the extracted text without any other comments.",
            {
              inlineData: {
                data: fileBase64,
                mimeType: "application/pdf"
              }
            }
          ]
        });
        extractedText = response.text || extractedText;
      }
      
      res.json({ text: extractedText });
    } else {
      res.status(400).json({ error: "Unsupported file format. Please provide .docx or .pdf" });
    }
  } catch (error: any) {
    console.error("Document text extraction error: ", error);
    let errorMsg = error.message || "Failed to extract text from document";
    if (errorMsg.includes("API key not valid") || errorMsg.includes("API_KEY_INVALID")) {
      errorMsg = "Invalid Gemini API Key. Please update your GEMINI_API_KEY in Settings > Secrets.";
    }
    res.status(500).json({ error: errorMsg });
  }
});

// Vite Middleware & Static Web Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Resume Analyzer Server booted on port ${PORT}`);
  });
}

startServer();
