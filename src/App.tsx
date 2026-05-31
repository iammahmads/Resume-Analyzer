import React, { useState, useEffect } from "react";
import {
  UserProfile,
  ResumeAnalysis
} from "./types";
import MetricsBreakdown from "./components/MetricsBreakdown";
import JobMatchEngine from "./components/JobMatchEngine";
import HrEvaluation from "./components/HrEvaluation";
import CoverLetterTab from "./components/CoverLetterTab";
import {
  LogOut,
  Sparkles,
  History,
  Upload,
  Send,
  Plus,
  Trash2,
  Download,
  Users,
  ShieldCheck,
  TrendingUp,
  Award,
  AlertCircle,
  Building,
  CheckCircle,
  Clock,
  Loader2
} from "lucide-react";
import { auth, db } from "./firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, query, collection, where, getDocs, deleteDoc, serverTimestamp, limit } from "firebase/firestore";

const normalizeAnalysis = (d: any): ResumeAnalysis => {
  const data = d.data();
  return {
    _id: d.id,
    ...data,
    metrics: typeof data.metrics === 'string' ? JSON.parse(data.metrics) : data.metrics,
    skillsGap: typeof data.skillsGap === 'string' ? JSON.parse(data.skillsGap) : data.skillsGap,
    keywordMatches: typeof data.keywordMatches === 'string' ? JSON.parse(data.keywordMatches) : data.keywordMatches,
    hrEvaluation: typeof data.hrEvaluation === 'string' ? JSON.parse(data.hrEvaluation) : data.hrEvaluation
  } as ResumeAnalysis;
};

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          if (userSnap.exists()) {
            const uData = userSnap.data() as UserProfile;
            setCurrentUser({ ...uData, _id: user.uid });
          } else {
            setCurrentUser(null);
          }
        } catch (err: any) {
          console.error("Failed fetching user data", err);
          signOut(auth);
          setAuthError(
            err.message?.includes("permission")
            ? "Missing Firestore Permissions. Please go to your Firebase Console -> Firestore Database -> Rules, and set allow read, write: if true; for testing, or deploy proper rules."
            : err.message?.includes("offline") 
            ? "Database connection failed. Please ensure you have created a Firestore Database in your Firebase Console and it is active." 
            : `Failed to load user profile: ${err.message || 'Unknown error'}`
          );
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsub();
  }, []);

  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // System Configuration check
  const [hasGeminiKey, setHasGeminiKey] = useState(true);

  // Active Seeker Tab
  const [activeTab, setActiveTab] = useState<"history" | "analyze">("history");
  // Active Report Analysis Sub-Tab
  const [activeReportTab, setActiveReportTab] = useState<"ats" | "matching" | "letter" | "hr" | "coach">("ats");

  // Seeker Workspace state
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSteps, setAnalysisSteps] = useState<string>("");
  const [newResumeFileName, setNewResumeFileName] = useState("");

  // Data history lists
  const [analyses, setAnalyses] = useState<ResumeAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<ResumeAnalysis | null>(null);

  // Admin Workspace State
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminActiveAnalysis, setAdminActiveAnalysis] = useState<ResumeAnalysis | null>(null);
  const [adminFeedbackText, setAdminFeedbackText] = useState("");
  const [isAdminSubmittingFeedback, setIsAdminSubmittingFeedback] = useState(false);

  // Notification Banner
  const [notification, setNotification] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Load configuration and data on boot
  useEffect(() => {
    checkConfig();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchUserData();
    } else {
      setSelectedAnalysis(null);
      setAdminActiveAnalysis(null);
    }
  }, [currentUser]);

  const checkConfig = async () => {
    try {
      const res = await fetch("/api/config-status");
      const data = await res.json();
      setHasGeminiKey(data.hasGeminiKey);
    } catch (_) {
      setHasGeminiKey(false);
    }
  };

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchUserData = async () => {
    if (!currentUser) return;

    try {
      // 1. Fetch user analyses
      let analysesQuery = currentUser.role === "admin" 
        ? query(collection(db, "analyses"))
        : query(collection(db, "analyses"), where("userId", "==", currentUser._id));
      
      const analysesSnap = await getDocs(analysesQuery);
      const fetchedAnalyses = analysesSnap.docs.map(normalizeAnalysis);
      // Sort by createdAt manually if no composite index yet
      fetchedAnalyses.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      setAnalyses(fetchedAnalyses);
      if (fetchedAnalyses.length > 0 && !selectedAnalysis) {
        setSelectedAnalysis(fetchedAnalyses[fetchedAnalyses.length - 1]);
      }

      // 2. Fetch user resumes list
      let resumesQuery = currentUser.role === "admin"
        ? query(collection(db, "resumes"))
        : query(collection(db, "resumes"), where("userId", "==", currentUser._id));
      
      await getDocs(resumesQuery);

      // 3. Fetch Admin stats if role is admin
      if (currentUser.role === "admin") {
        fetchAdminStats();
      }
    } catch (e) {
      console.error("Failed fetching user workspace profile.", e);
      console.error("Firestore Error: ", JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
    }
  };

  const fetchAdminStats = async () => {
    if (currentUser?.role !== "admin") return;
    try {
      const usersSnap = await getDocs(query(collection(db, "users")));
      const analysesSnap = await getDocs(query(collection(db, "analyses")));
      const resumesSnap = await getDocs(query(collection(db, "resumes")));
      
      const users = usersSnap.docs.map(d => d.data());
      const analyses = analysesSnap.docs.map(normalizeAnalysis);
      
      const seekersCount = users.filter(u => u.role === "seeker").length;
      const adminsCount = users.filter(u => u.role === "admin").length;
      
      let avgAts = 0;
      let avgMatch = 0;
      if (analyses.length > 0) {
        avgAts = Math.round(analyses.reduce((sum, a) => sum + (a.overallScore || 0), 0) / analyses.length);
        avgMatch = Math.round(analyses.reduce((sum, a) => sum + (a.matchingPercentage || 0), 0) / analyses.length);
      }

      setAdminStats({
        totals: {
          users: users.length,
          seekers: seekersCount,
          admins: adminsCount,
          analyses: analyses.length,
          resumes: resumesSnap.size,
        },
        averages: {
          overallScore: avgAts,
          matchingPercentage: avgMatch,
        },
        analyses: analyses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8),
      });
    } catch (e) {
      console.error("Failed fetching administration aggregated indicators.", e);
    }
  };

  // Auth Submit Action
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword);
        
        let role = "seeker";
        try {
          // Determine role (first user is admin, rest are seekers)
          const usersQuery = query(collection(db, "users"), limit(1));
          const usersSnap = await getDocs(usersQuery);
          role = usersSnap.empty ? "admin" : "seeker";

          const newUserData = {
            userId: userCredential.user.uid,
            email: authEmail.trim().toLowerCase(),
            name: authName.trim(),
            role: role,
            createdAt: serverTimestamp(),
          };
          await setDoc(doc(db, "users", userCredential.user.uid), newUserData);
        } catch (dbErr: any) {
           // Delete the orphaned auth user
           await userCredential.user.delete().catch(() => {});
           if (dbErr.message?.includes('permission')) {
             throw new Error("Missing Firestore Permissions. Please go to your Firebase Console -> Firestore Database -> Rules, and set allow read, write: if true; for testing, or copy the rules from firestore.rules file.");
           }
           throw dbErr;
        }

        await sendEmailVerification(userCredential.user);
        showNotification(`Welcome, ${authName.trim()}! A verification email has been sent to your address. Please verify to fully activate your account.`);
        
        // Let's sign them out until they verify
        await signOut(auth);
        setIsSignUp(false);
        setAuthPassword("");
        return; // Don't reset everything yet, let them go to sign in screen with email filled.
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
          if (!userCredential.user.emailVerified) {
            // Keep user object temporarily to send verification email if requested
            try {
              await sendEmailVerification(userCredential.user);
            } catch (e: any) {
              console.error("Failed to resend verification email:", e);
              if (e.code === 'auth/too-many-requests') {
                await signOut(auth);
                throw { code: 'auth/unverified-email', message: 'Please verify your email address before logging in. (Verification email resend paused due to too many requests. Please check your inbox/spam).' };
              }
            }
            await signOut(auth);
            throw { code: 'auth/unverified-email', message: 'Please verify your email address before logging in. A new verification email has been sent. Please check your inbox and spam folder.' };
          }
          showNotification(`Welcome back! Synchronized workspace successfully.`);
      }

      setAuthEmail("");
      setAuthPassword("");
      setAuthName("");
    } catch (err: any) {
      console.error("Auth error:", err);
      
      const isDemoStr = authEmail.trim() === 'admin@analyzer.com' || authEmail.trim() === 'seeker@demo.com';
      if (isDemoStr && (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password')) {
        try {
          const tempName = authEmail.trim() === 'admin@analyzer.com' ? 'System Administrator' : 'Demo Seeker';
          const tempRole = authEmail.trim() === 'admin@analyzer.com' ? 'admin' : 'seeker';
          const userCredential = await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword);
          const newUserData = {
            userId: userCredential.user.uid,
            email: authEmail.trim().toLowerCase(),
            name: tempName,
            role: tempRole,
            createdAt: serverTimestamp(),
          };
          await setDoc(doc(db, "users", userCredential.user.uid), newUserData);
          showNotification(`Welcome, ${tempName}! Demo account initialized successfully.`);
          setAuthEmail("");
          setAuthPassword("");
          setAuthName("");
          setAuthLoading(false);
          return;
        } catch (createErr: any) {
          if (createErr.code !== 'auth/email-already-in-use') {
             setAuthError(createErr.message);
             setAuthLoading(false);
             return;
          }
        }
      }

      let errorMessage = "Failed authentication procedure.";
      
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered. Please log in instead.";
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errorMessage = "Invalid email or password. If this is a demo account, make sure you sign up first.";
      } else if (err.code === 'auth/weak-password') {
        errorMessage = "Password should be at least 6 characters.";
      } else if (err.message?.includes('offline')) {
        errorMessage = "Database offline. Please ensure you have clicked 'Create Database' under Firestore Database in the Firebase Console.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setAuthError(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!authEmail.trim()) {
      setAuthError("Please enter your email address to reset password.");
      return;
    }
    setAuthLoading(true);
    try {
      await sendPasswordResetEmail(auth, authEmail.trim());
      showNotification("Password reset email sent! Please check your inbox.");
    } catch (err: any) {
      console.error("Reset password error:", err);
      setAuthError(err.message || "Failed to send reset email.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign out User
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setAnalyses([]);
      setSelectedAnalysis(null);
      setAdminActiveAnalysis(null);
      showNotification("Logged out safely. Keep optimizing!");
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  // Fast demo user bootstrap login
  const prefillAuth = (role: "seeker" | "admin") => {
    if (role === "admin") {
      setAuthEmail("admin@analyzer.com");
      setAuthPassword("admin123");
      setIsSignUp(false);
    } else {
      setAuthEmail("seeker@demo.com");
      setAuthPassword("seeker123");
      setIsSignUp(false);
    }
  };

  // Upload/Paste simulation parser
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processResumeFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processResumeFile(files[0]);
    }
  };

  const processResumeFile = (file: File) => {
    setNewResumeFileName(file.name);
    
    const isDocx = file.name.toLowerCase().endsWith(".docx");
    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";

    if (isDocx || isPdf) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const dataUrl = event.target?.result as string;
          if (!dataUrl) {
            throw new Error("Unable to read file buffer data");
          }
          
          const base64String = dataUrl.split(",")[1];
          if (!base64String) {
            throw new Error("Failed to construct base64 binary encoding");
          }

          showNotification(`Extracting text from ${isPdf ? "PDF" : "Word"} document...`, "success");
          
          const parseRes = await fetch("/api/document/parse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileBase64: base64String, fileName: file.name }),
          });
          
          if (!parseRes.ok) {
            const err = await parseRes.json();
            throw new Error(err.error || `Failed to extract ${isPdf ? "PDF" : "Word"} contents.`);
          }
          
          const result = await parseRes.json();
          if (!result.text || !result.text.trim()) {
            throw new Error(`Could not extract readable text from the ${isPdf ? "PDF" : "Word"} file.`);
          }
          
          setResumeText(result.text);
          showNotification(`Successfully extracted text from ${file.name}! Check matching metrics now.`);
        } catch (err: any) {
          console.error("Document Parse error: ", err);
          showNotification(err.message || "Error reading document file structure.", "error");
        }
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setResumeText(text);
        showNotification(`Successfully read ${file.name}! Check matching metrics now.`);
      };
      reader.readAsText(file);
    }
  };

  // RUN DEEP AUDIT ANALYZER
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeText.trim()) {
      showNotification("Please supply your resume content either by pasting or dropping a plaintext file.", "error");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisSteps("Reading document contents...");
    
    // Simulate step notification changes for visual premium quality
    const steps = [
      "Securing sandbox alignment...",
      "Analyzing section alignment parameters...",
      "Auditing format whitespace variables...",
      "Predicting interview coaching strategies...",
      "Drafting cover letter accomplishments..."
    ];

    let currentStepIdx = 0;
    const stepInterval = setInterval(() => {
      if (currentStepIdx < steps.length) {
        setAnalysisSteps(steps[currentStepIdx]);
        currentStepIdx++;
      }
    }, 1500);

    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: resumeText.trim(),
          jobTitle: jobTitle.trim(),
          jobDescription: jobDescription.trim(),
          // Passing empty userId prevents the backend from writing to obsolete dbEngine
          userId: "",
          userName: currentUser?.name || "",
          userEmail: currentUser?.email || ""
        }),
      });

      clearInterval(stepInterval);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Gemini parser analysis encountered a fatal error.");
      }

      const parsedData = await response.json();
      let savedAnalysis = { ...parsedData };

      if (currentUser?._id) {
        // Save the analysis report
        const newAnalysisRef = doc(collection(db, "analyses"));
        const analysisDoc = {
          analysisId: newAnalysisRef.id,
          userId: currentUser._id,
          userName: currentUser.name || "Job Seeker",
          userEmail: currentUser.email || "",
          jobTitle: jobTitle.trim() || "General (Not Specified)",
          jobDescription: jobDescription.trim() || "",
          resumeText: resumeText.trim(),
          overallScore: parsedData.overallScore || 0,
          matchingPercentage: parsedData.matchingPercentage || 0,
          metrics: parsedData.metrics || {},
          skillsGap: parsedData.skillsGap || [],
          keywordMatches: parsedData.keywordMatches || { matched: [], missing: [] },
          coverLetter: parsedData.coverLetter || "",
          hrEvaluation: parsedData.hrEvaluation || { strengths: [], weaknesses: [], suitability: "Pending review", interviewQuestions: [] },
          adminFeedback: "",
          createdAt: serverTimestamp(),
        };
        await setDoc(newAnalysisRef, analysisDoc);
        savedAnalysis = { _id: newAnalysisRef.id, ...analysisDoc, createdAt: new Date().toISOString() };
        
        // Save original document
        const newResumeRef = doc(collection(db, "resumes"));
        await setDoc(newResumeRef, {
          resumeId: newResumeRef.id,
          userId: currentUser._id,
          title: jobTitle ? `For: ${jobTitle}` : "General Resume",
          contentText: resumeText,
          createdAt: serverTimestamp()
        });
      }

      // Reload entire workflow data
      await fetchUserData();

      // View result report
      setSelectedAnalysis(savedAnalysis as ResumeAnalysis);
      setActiveTab("history");
      setActiveReportTab("ats");
      
      // Reset workspace
      setJobTitle("");
      setJobDescription("");
      setResumeText("");
      setNewResumeFileName("");
      showNotification("Forensic resume audit completed successfully via Gemini API!");
    } catch (err: any) {
      clearInterval(stepInterval);
      showNotification(err.message || "An unexpected error occurred during deep resume auditing.", "error");
    } finally {
      setIsAnalyzing(false);
      setAnalysisSteps("");
    }
  };

  // Submit Admin Expert Feedback Action
  const handleAdminSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminActiveAnalysis) return;

    setIsAdminSubmittingFeedback(true);
    try {
      const ref = doc(db, "analyses", adminActiveAnalysis._id);
      
      // Using setDoc with merge to do a partial update since updateDoc isn't explicitly imported
      await setDoc(ref, { adminFeedback: adminFeedbackText.trim() }, { merge: true });

      showNotification("Administrative expert advice logged safely!");
      setAdminFeedbackText("");
      setAdminActiveAnalysis(null);
      fetchUserData(); // Reload charts
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setIsAdminSubmittingFeedback(false);
    }
  };

  // Delete evaluation safely
  const handleDeleteAnalysis = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this resume evaluation report permanently?")) return;

    try {
      await deleteDoc(doc(db, "analyses", id));
      
      setAnalyses(prev => prev.filter(x => x._id !== id));
      if (selectedAnalysis?._id === id) {
        setSelectedAnalysis(null);
      }
      showNotification("Evaluation report removed safely from historical record tracker.");
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || "Encountered exception deleting document record.", "error");
    }
  };

  // Quick print handler for PDF export
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Printable Area Target CSS for Window.print() */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header, nav, sidebar, footer, button, .no-print {
            display: none !important;
          }
          .print-full {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white p-2.5 rounded-xl shadow-xs">
              <Sparkles className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 tracking-tight text-lg md:text-xl block">
                AI Resume Analyzer
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block -mt-1">
                Gemini flash optimization engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="font-semibold text-slate-800 text-sm">{currentUser.name}</p>
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                    {currentUser.role === "admin" ? "🛡 Executive Admin" : "📋 Job Seeker"}
                  </p>
                </div>

                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-slate-500">Service active</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Notifications Banner */}
      {notification && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 animate-bounce no-print">
          <div className={`p-4 rounded-xl shadow-md border flex items-center gap-3 ${
            notification.type === 'error' 
              ? 'bg-rose-50 text-rose-800 border-rose-100' 
              : 'bg-emerald-50 text-emerald-800 border-emerald-100'
          }`}>
            <CheckCircle className={`w-5 h-5 ${notification.type === 'error' ? 'text-rose-600' : 'text-emerald-600'}`} />
            <p className="text-xs sm:text-sm font-semibold">{notification.text}</p>
          </div>
        </div>
      )}

      {/* Missing Client Key Banner advice */}
      {!hasGeminiKey && (
        <div className="bg-amber-500 text-white no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-3 text-xs md:text-sm font-bold flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 animate-pulse shrink-0" />
              <span>
                No Gemini API key detected! Configure your key inside <b>Settings &gt; Secrets</b> with key variable <code>GEMINI_API_KEY</code>.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* UNAUTHENTICATED SPLASH LANDING DASHBOARD */}
        {!currentUser ? (
          <div className="max-w-4xl mx-auto my-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-center no-print">
            
            {/* Left Info Pane */}
            <div className="md:col-span-7 space-y-6">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full">
                <Sparkles className="w-3.5 h-3.5" /> Direct Gemini-API Core Verification
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-none">
                Audit Your Resume For <span className="text-indigo-600">Perfect ATS Compatibility</span>
              </h1>
              <p className="text-slate-600 font-normal leading-relaxed text-sm md:text-base">
                An advanced full-stack resume evaluation dashboard checking over Thirty (30+) critical formats, impact benchmarks, vocabulary matrices, alongside matching algorithms.
              </p>

              <div className="grid grid-cols-2 gap-4 pb-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100">
                  <TrendingUp className="w-6 h-6 text-indigo-600 mb-1" />
                  <span className="font-bold text-slate-800 block text-sm">ATS scoring (30+ metrics)</span>
                  <span className="text-xs text-slate-500">Evaluates content alignment, typography, and phrasing.</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100">
                  <Award className="w-6 h-6 text-indigo-600 mb-1" />
                  <span className="font-bold text-slate-800 block text-sm">Cover Letter Generation</span>
                  <span className="text-xs text-slate-500">Automatically creates optimized, ready-to-copy cover letters.</span>
                </div>
              </div>

              {/* Bootstrapped Account Quick Selection Grid */}
              <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100/40 p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  👉 Instant Platform Demo Evaluators (Click to Autofill)
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => prefillAuth("seeker")}
                    className="flex-1 bg-white hover:bg-slate-50 text-left p-3.5 rounded-xl border border-indigo-100 hover:border-indigo-200 transition-all shadow-xs"
                  >
                    <span className="text-[10px] font-bold text-emerald-600 block uppercase tracking-wider">Candidate Seeker Profile</span>
                    <span className="font-bold text-slate-800 text-sm block mt-0.5">Sabbir Shah (Demo Account)</span>
                    <span className="text-xs text-slate-400 block font-mono">seeker@demo.com • seeker123</span>
                  </button>

                  <button
                    onClick={() => prefillAuth("admin")}
                    className="flex-1 bg-white hover:bg-slate-50 text-left p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-all shadow-xs"
                  >
                    <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider">Director Administrator Panel</span>
                    <span className="font-bold text-slate-800 text-sm block mt-0.5">Principal Evaluator</span>
                    <span className="text-xs text-slate-400 block font-mono">admin@analyzer.com • admin123</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Right Logic Auth Form card */}
            <div className="md:col-span-5 bg-white rounded-3xl border border-slate-100 shadow-xl p-6 md:p-8">
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                {isSignUp ? "Create Workspace" : "Workspace Sign In"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isSignUp ? "Configure details to register seeker credentials" : "Authenticate to save resume evaluation reports"}
              </p>

              {authError && (
                <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 font-medium text-xs">
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuth} className="mt-5 space-y-4">
                {isSignUp && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 block uppercase tracking-wider mb-1">
                      Full Display Name
                    </label>
                    <input
                      type="text"
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:indigo-500"
                      placeholder="Jane Doe"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-500 block uppercase tracking-wider mb-1">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:indigo-500"
                    placeholder="you@domain.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block uppercase tracking-wider mb-1">
                    Security password
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:indigo-500"
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded-xl tracking-wide shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {authLoading ? "Processing..." : (isSignUp ? "Register Account" : "Access Workspace")}
                </button>
              </form>

              <hr className="border-slate-100 my-4" />

              {!isSignUp && (
                <button
                  onClick={handleResetPassword}
                  disabled={authLoading}
                  className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-700 disabled:opacity-50 mb-2 p-2 block"
                >
                  Forgot your password? Reset it here.
                </button>
              )}

              <button
                onClick={() => !authLoading && setIsSignUp(!isSignUp)}
                disabled={authLoading}
                className="w-full text-center text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 bg-indigo-50/40 p-2 rounded-lg"
              >
                {isSignUp ? "Log into matching credentials instead" : "Need of new account? Register now"}
              </button>
            </div>
          </div>
        ) : (
          
          /* AUTHENTICATED ACTIVE WORKSPACE */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* ADMIN DASHBOARD VIEW PANEL */}
            {currentUser.role === "admin" ? (
              <div className="md:col-span-12 space-y-8 no-print">
                
                {/* Stats Dashboard */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block text-muted">
                      Total System Users
                    </span>
                    <span className="text-3xl font-extrabold text-slate-800 block mt-2">
                      {adminStats?.totals?.users ?? "Calculating..."}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold mt-1 bg-indigo-50 px-2 py-0.5 rounded-full w-max">
                      <Users className="w-3.5 h-3.5" />
                      <span>{adminStats?.totals?.seekers ?? 0} seekers registered</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block text-muted">
                      Audited Resumes
                    </span>
                    <span className="text-3xl font-extrabold text-slate-800 block mt-2">
                      {adminStats?.totals?.resumes ?? 0}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1.5">Captured in local simulated storage.</p>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block text-muted">
                      Evaluated Genders
                    </span>
                    <span className="text-3xl font-extrabold text-slate-800 block mt-2">
                      {adminStats?.totals?.analyses ?? 0}
                    </span>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md uppercase tracking-wider block mt-1.5 w-max">
                      Gemini models
                    </span>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block text-muted">
                      Average ATS Target Match
                    </span>
                    <span className="text-3xl font-extrabold text-indigo-600 block mt-2">
                      {adminStats?.averages?.overallScore ?? 0}%
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1.5">System-wide performance average index.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: List candidates analysis reports */}
                  <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6">
                    <div className="mb-4">
                      <h3 className="font-extrabold text-slate-900 tracking-tight text-lg">Candidates Audit Log</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Select a candidate evaluation to write expert coaching remarks</p>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {adminStats?.analyses && adminStats.analyses.length > 0 ? (
                        adminStats.analyses.map((item: ResumeAnalysis, idx: number) => {
                          const isSelected = adminActiveAnalysis?._id === item._id;
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                setAdminActiveAnalysis(item);
                                setAdminFeedbackText(item.adminFeedback || "");
                              }}
                              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                                isSelected
                                  ? "border-indigo-600 bg-indigo-50/20"
                                  : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Score: {item.overallScore}%
                                  </span>
                                  <h4 className="font-bold text-slate-800 text-sm mt-1.5">{item.userName}</h4>
                                  <p className="text-xs text-slate-500 truncate max-w-xs">{item.userEmail}</p>
                                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Target: {item.jobTitle}</p>
                                </div>
                                <span className="text-xs font-semibold text-slate-400 shrink-0">
                                  {new Date(item.createdAt).toLocaleDateString()}
                                </span>
                              </div>

                              {item.adminFeedback ? (
                                <div className="mt-3 text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-1 rounded-md max-w-max flex items-center gap-1">
                                  <span>✔ Advice Submitted</span>
                                </div>
                              ) : (
                                <div className="mt-3 text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-1 rounded-md max-w-max">
                                  ⚠️ Needs Expert Review
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <span className="text-xs text-slate-500 font-semibold block">No evaluations requested yet</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Feedback Form */}
                  <div className="lg:col-span-7">
                    {adminActiveAnalysis ? (
                      <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-6">
                        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                          <div>
                            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest block">
                              Active Candidate Audit Workspace
                            </span>
                            <h3 className="font-extrabold text-slate-900 tracking-tight text-xl. mt-1">
                              {adminActiveAnalysis.userName}
                            </h3>
                            <p className="text-xs text-slate-400">
                              Applying for: <span className="font-bold text-slate-600">{adminActiveAnalysis.jobTitle}</span>
                            </p>
                          </div>
                          
                          <div className="px-3.5 py-1.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">ATS score</span>
                            <span className="text-xl font-extrabold text-indigo-600 block">{adminActiveAnalysis.overallScore}%</span>
                          </div>
                        </div>

                        {/* Candidate Data summary box */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 p-4 rounded-xl">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Strengths Highlights</span>
                            <ul className="text-xs text-slate-600 mt-2 list-disc list-inside space-y-1">
                              {adminActiveAnalysis.hrEvaluation?.strengths?.slice(0, 3).map((item, i) => (
                                <li key={i} className="truncate">{item}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="bg-slate-50 p-4 rounded-xl">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Key Missing Keywords</span>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {adminActiveAnalysis.keywordMatches?.missing?.slice(0, 4).map((kw, i) => (
                                <span key={i} className="text-[10px] bg-rose-50 border border-rose-100 rounded text-rose-700 px-1 py-0.5">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Textarea for expert input */}
                        <form onSubmit={handleAdminSubmitFeedback} className="space-y-4">
                          <div>
                            <label className="text-xs font-bold text-slate-500 block uppercase tracking-wider mb-2">
                              🖋 Expert Administrative Feedback & Coach Advice
                            </label>
                            <textarea
                              required
                              value={adminFeedbackText}
                              onChange={(e) => setAdminFeedbackText(e.target.value)}
                              rows={5}
                              className="w-full text-sm md:text-base p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                              placeholder="Provide expert tips, layout edits, or certifications to enhance this audit report..."
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isAdminSubmittingFeedback}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all inline-flex items-center gap-2 text-sm shadow-xs disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                            {isAdminSubmittingFeedback ? "Publishing feedback..." : "Publish expert advisory notes"}
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400">
                        <ShieldCheck className="w-12 h-12 text-indigo-100 mx-auto mb-3" />
                        <h4 className="font-bold text-slate-600 text-base">Select report evaluation for admin view</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          Click on any candidate evaluated card inside the Candidates list to view direct forensic details and comment.
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            ) : (
              
              /* JOB SEEKER DASHBOARD VIEW PANEL */
              <>
                {/* Left Seeker Side layout: Controls and history list */}
                <div className="md:col-span-4 space-y-6 no-print">
                  
                  {/* Seeker Nav buttons */}
                  <div className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => setActiveTab("history")}
                      className={`flex-1 flex justify-center items-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-bold tracking-wide transition-all ${
                        activeTab === "history"
                          ? "bg-slate-900 text-white"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <History className="w-4 h-4" /> Reports History
                    </button>

                    <button
                      onClick={() => setActiveTab("analyze")}
                      className={`flex-1 flex justify-center items-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-bold tracking-wide transition-all ${
                        activeTab === "analyze"
                          ? "bg-indigo-600 text-white"
                          : "text-indigo-600 hover:text-indigo-800"
                      }`}
                    >
                      <Plus className="w-4 h-4" /> Analyze Resume
                    </button>
                  </div>

                  {/* ACTIVE TAB: HISTORY LIST */}
                  {activeTab === "history" && (
                    <div className="bg-white border border-slate-100 rounded-3xl p-6">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">Your Audits</h3>
                          <p className="text-xs text-slate-400 mt-0.5">Historical list of verified report logs</p>
                        </div>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                          {analyses.length} Total
                        </span>
                      </div>

                      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                        {analyses && analyses.length > 0 ? (
                          analyses.map((item: ResumeAnalysis, idx: number) => {
                            const isSelected = selectedAnalysis?._id === item._id;
                            return (
                              <div
                                key={idx}
                                onClick={() => setSelectedAnalysis(item)}
                                className={`p-4 rounded-2xl border cursor-pointer transition-all group relative ${
                                  isSelected
                                    ? "border-indigo-600 bg-indigo-50/20"
                                    : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"
                                }`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="min-w-0">
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                      ATS Score: {item.overallScore}%
                                    </span>
                                    <h4 className="font-bold text-slate-800 text-sm mt-1.5 truncate">
                                      {item.jobTitle || "General Evaluation"}
                                    </h4>
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                                      <Clock className="w-3 h-3" />
                                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                    </div>
                                  </div>

                                  <button
                                    onClick={(e) => handleDeleteAnalysis(item._id, e)}
                                    className="p-1 px-2.5 text-slate-300 hover:text-rose-500 rounded-lg group-hover:block transition-all border border-transparent hover:border-rose-100"
                                    title="Delete Evaluation"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {item.adminFeedback ? (
                                  <div className="mt-2.5 pt-2.5 border-t border-indigo-100/40 text-[10px] text-indigo-700 font-bold flex items-center gap-1">
                                    <span>🌟 Admin Advice attached</span>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <Plus className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                            <span className="text-xs text-slate-500 font-bold block">No resumes audited yet</span>
                            <button
                              onClick={() => setActiveTab("analyze")}
                              className="text-xs font-semibold text-indigo-600 underline mt-1 block w-full text-center"
                            >
                              Run your first audit workspace
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ACTIVE TAB: ANALYZE FORM */}
                  {activeTab === "analyze" && (
                    <div className="bg-white border border-slate-100 rounded-3xl p-6">
                      <div className="mb-4">
                        <h3 className="font-extrabold text-slate-900 tracking-tight text-lg">Parser Workspace</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Submit your target description details and text</p>
                      </div>

                      <form onSubmit={handleAnalyze} className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500 block uppercase tracking-wider mb-1">
                            Target Job Title
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Senior Frontend Engineer"
                            className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:ring-indigo-500"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-500 block uppercase tracking-wider mb-1">
                            Target Job Description
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Paste the core requirements, technologies, and specifications of the target role..."
                            className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:ring-indigo-500 outline-none"
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-500 block uppercase tracking-wider mb-1">
                            Resume Content
                          </label>
                          
                          {/* File input drag drop workspace */}
                          <div
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer bg-slate-50/50 transition-all"
                          >
                            <input
                              type="file"
                              id="resume-file-input"
                              accept=".txt,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              className="hidden"
                              onChange={handleFileChange}
                              disabled={isAnalyzing}
                            />
                            <label htmlFor="resume-file-input" className="cursor-pointer">
                              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                              <p className="text-xs font-semibold text-slate-600">
                                {newResumeFileName ? `File added: ${newResumeFileName}` : "Drag and drop or click to upload PDF or DOCX file"}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">or click standard finder select options</p>
                            </label>
                          </div>

                          <span className="text-[10px] font-bold text-slate-400 block text-center uppercase tracking-widest my-2">OR</span>

                          <textarea
                            rows={5}
                            placeholder="Directly paste full raw contents, text history, education and experience descriptors..."
                            className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:ring-indigo-500 outline-none"
                            value={resumeText}
                            onChange={(e) => setResumeText(e.target.value)}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isAnalyzing}
                          className="w-full py-3.5 bg-indigo-600 hover:bg-slate-900 text-white font-bold text-sm rounded-xl tracking-wide shadow-xs transition-colors inline-flex items-center justify-center gap-2 disabled:bg-slate-800"
                        >
                          <Sparkles className="w-4 h-4 animate-spin-slow" />
                          {isAnalyzing ? "Running forensic audit..." : "Perform AI Audit Analysis"}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* LOADING OVERLAY CARDS */}
                  {isAnalyzing && (
                    <div className="bg-slate-900 text-white rounded-3xl p-6 text-center space-y-4 no-print shadow-xl">
                      <div className="relative inline-flex items-center justify-center mb-1">
                        <div className="w-14 h-14 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                        <Sparkles className="w-5 h-5 text-indigo-400 absolute" />
                      </div>
                      <h4 className="font-bold text-base tracking-tight text-slate-100">AI Deep Auditing Active</h4>
                      <p className="text-xs text-indigo-300 font-mono tracking-wider">
                        {analysisSteps || "Performing calculations..."}
                      </p>
                      <p className="text-[11px] text-slate-400 leading-normal bg-slate-800/40 p-2.5 rounded-lg">
                        Our forensic optimizer is parsing grammar, computing whitespace density, assessing keyword overlap variables, and drafting dynamic cover letter outputs.
                      </p>
                    </div>
                  )}

                </div>

                {/* Right Seeker Workspace: Analysis Report results */}
                <div id="printable-report-card" className="md:col-span-8 print-full">
                  {selectedAnalysis ? (
                    <div className="space-y-6">
                      
                      {/* Premium Summary and Print option Header card */}
                      <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xs relative overflow-hidden">
                        
                        {/* Background subtle color bubble */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50/10 rounded-full blur-2xl pointer-events-none" />

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full uppercase tracking-widest leading-none">
                            Gemini AI Verified Match Report
                          </span>
                          <h1 className="text-2xl md:text-3.5xl font-extrabold text-slate-900 tracking-tight mt-1">
                            {selectedAnalysis.jobTitle || "General Match Report"}
                          </h1>
                          <p className="text-xs text-slate-500">
                            Processed on: <span className="font-semibold text-slate-700">{new Date(selectedAnalysis.createdAt).toLocaleString()}</span>
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2.5 items-center shrink-0 w-full md:w-auto z-10 no-print">
                          <button
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 text-xs bg-slate-950 hover:bg-slate-800 text-white font-bold py-2 px-4 shadow-xs hover:scale-105 transition-all rounded-xl"
                          >
                            <Download className="w-3.5 h-3.5" /> Export PDF
                          </button>
                        </div>
                      </div>

                      {/* Main Navigation Tab buttons for Seeker report segments */}
                      <div className="flex flex-wrap gap-1 bg-white p-1 rounded-2xl border border-slate-100 no-print">
                        <button
                          onClick={() => setActiveReportTab("ats")}
                          className={`flex-1 py-3 px-1 rounded-xl text-center text-xs font-bold tracking-tight transition-all truncate leading-none ${
                            activeReportTab === "ats"
                              ? "bg-slate-900 text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          📊 ATS Matrix Score
                        </button>

                        <button
                          onClick={() => setActiveReportTab("matching")}
                          className={`flex-1 py-3 px-1 rounded-xl text-center text-xs font-bold tracking-tight transition-all truncate leading-none ${
                            activeReportTab === "matching"
                              ? "bg-slate-900 text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          💼 Job Matching Engine
                        </button>

                        <button
                          onClick={() => setActiveReportTab("letter")}
                          className={`flex-1 py-3 px-1 rounded-xl text-center text-xs font-bold tracking-tight transition-all truncate leading-none ${
                            activeReportTab === "letter"
                              ? "bg-slate-900 text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          ✉ Cover Letter
                        </button>

                        <button
                          onClick={() => setActiveReportTab("hr")}
                          className={`flex-1 py-3 px-1 rounded-xl text-center text-xs font-bold tracking-tight transition-all truncate leading-none ${
                            activeReportTab === "hr"
                              ? "bg-slate-900 text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          👨‍💼 HR Suitability
                        </button>

                        <button
                          onClick={() => setActiveReportTab("coach")}
                          className={`flex-1 py-3 px-1 rounded-xl text-center text-xs font-bold tracking-tight transition-all truncate leading-none relative ${
                            activeReportTab === "coach"
                              ? "bg-slate-900 text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          🌟 Advisor Feedback
                          {selectedAnalysis.adminFeedback && (
                            <span className="absolute top-1 right-2 inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
                          )}
                        </button>
                      </div>

                      {/* RENDERING DYNAMIC REPORT CONTENT */}
                      <div className="space-y-6">
                        
                        {/* 1. SEC: ATS CHECKLIST MATRIX (Render on screen or in Print Mode) */}
                        {(activeReportTab === "ats" || window.matchMedia("print").matches) && (
                          <div className={activeReportTab !== "ats" ? "hidden" : "block transition-all"}>
                            <MetricsBreakdown
                              metrics={selectedAnalysis.metrics}
                              overallScore={selectedAnalysis.overallScore}
                            />
                          </div>
                        )}

                        {/* 2. SEC: MATCHING ENGINE DATA (Render on screen or in Print Mode) */}
                        {(activeReportTab === "matching" || window.matchMedia("print").matches) && (
                          <div className={activeReportTab !== "matching" ? "hidden" : "block transition-all"}>
                            <JobMatchEngine
                              matchingPercentage={selectedAnalysis.matchingPercentage}
                              keywordMatches={selectedAnalysis.keywordMatches}
                              skillsGap={selectedAnalysis.skillsGap}
                              jobTitle={selectedAnalysis.jobTitle}
                            />
                          </div>
                        )}

                        {/* 3. SEC: TAILORED COVER LETTER (Render on screen or in Print Mode) */}
                        {(activeReportTab === "letter" || window.matchMedia("print").matches) && (
                          <div className={activeReportTab !== "letter" ? "hidden" : "block transition-all"}>
                            <CoverLetterTab
                              coverLetterText={selectedAnalysis.coverLetter}
                              jobTitle={selectedAnalysis.jobTitle}
                            />
                          </div>
                        )}

                        {/* 4. SEC: HR BENCHMARK REPORT (Render on screen or in Print Mode) */}
                        {(activeReportTab === "hr" || window.matchMedia("print").matches) && (
                          <div className={activeReportTab !== "hr" ? "hidden" : "block transition-all"}>
                            <HrEvaluation evaluation={selectedAnalysis.hrEvaluation} />
                          </div>
                        )}

                        {/* 5. SEC: ADVISOR/EXPERT COACH REMARKS */}
                        {activeReportTab === "coach" && (
                          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
                            <div className="flex items-center gap-2.5">
                              <Building className="text-indigo-600 w-5 h-5 shrink-0" />
                              <h3 className="font-extrabold text-slate-900 tracking-tight text-lg">Expert Executive Advisor Remarks</h3>
                            </div>

                            {selectedAnalysis.adminFeedback ? (
                              <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-xl">
                                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest block">
                                  Response Advice from Career Consultant Team
                                </span>
                                <p className="text-slate-800 text-sm md:text-base leading-relaxed font-sans mt-2 whitespace-pre-line">
                                  {selectedAnalysis.adminFeedback}
                                </p>
                              </div>
                            ) : (
                              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                <span className="text-xs text-slate-500 font-bold block">No direct notes submitted yet</span>
                                <p className="text-[11px] text-slate-400 mt-0.5 px-4 max-w-md mx-auto">
                                  System administrators can access evaluations, read metrics, and post coaching parameters directly into this workspace window inside real-time profiles.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                      </div>

                    </div>
                  ) : (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center text-slate-400">
                      <Sparkles className="w-12 h-12 text-indigo-200 mx-auto mb-3" />
                      <h4 className="font-bold text-slate-600 text-lg">No active evaluation selected</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Please perform a new forensic audit analysis in the workspace tab or load a historic report file to get started.
                      </p>
                    </div>
                  )}
                </div>

              </>
            )}

          </div>
        )}

      </main>

      {/* Humble Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400 mt-12 no-print">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 AI Resume Analyzer • Structured strictly under user intent MongoDB + Gemini Flash APIs</p>
        </div>
      </footer>
    </div>
  );
}
