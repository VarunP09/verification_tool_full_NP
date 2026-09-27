/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CardContent } from "../components/CardContent";
import Papa from "papaparse";

import { database, ref, push } from "../../firebaseConfig";
import { get, runTransaction } from "firebase/database";
import instructionVid from "../../Videos/Instruction-Video.mov";

/* -----------------------------
   Intro + Task Closed Screens
------------------------------ */

function IntroScreen({ onDone }) {
  const [videoDuration, setVideoDuration] = useState(0);
  const [watchedEnough, setWatchedEnough] = useState(false);
  const videoRef = useRef(null);
  const watchedSecondsRef = useRef(new Set());

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const t = Math.floor(v.currentTime);
    watchedSecondsRef.current.add(t);
    if (videoDuration > 0) {
      const ratio = watchedSecondsRef.current.size / Math.max(1, Math.floor(videoDuration));
      if (ratio >= 0.98) setWatchedEnough(true);
    }
  };

  const handleLoadedMeta = () => {
    const v = videoRef.current;
    if (!v) return;
    setVideoDuration(v.duration || 0);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold text-center mb-4">
          Video Tool Guide (Please watch before continuing)
        </h1>

        <video
          ref={videoRef}
          src={instructionVid}
          controls
          playsInline
          className="block mx-auto w-full rounded-lg"
          onLoadedMetadata={handleLoadedMeta}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setWatchedEnough(true)}
        />

        <div className="mt-6 flex justify-center">
          <button
            className={
              watchedEnough
                ? "px-5 py-2 rounded text-white bg-blue-600 hover:bg-blue-700"
                : "px-5 py-2 rounded text-white bg-gray-400 cursor-not-allowed"
            }
            disabled={!watchedEnough}
            onClick={onDone}
          >
            Next: Start the Verification Tool
          </button>
        </div>

        <p className="mt-3 text-xs text-center text-gray-500">
          You must watch the full video before continuing.
        </p>
      </div>
    </div>
  );
}

function TaskClosedScreen() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow p-8 border border-gray-200 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Task Closed</h1>
        <p className="text-gray-700 leading-relaxed mb-2">
          This task is no longer accepting responses because the required number of annotations has been completed.
        </p>
        <p className="text-gray-700 leading-relaxed mb-2">
          You may safely return or exit the HIT without submitting.
        </p>
        <p className="text-gray-700 leading-relaxed">Thank you for your interest.</p>
      </div>
    </div>
  );
}

/* -----------------------------
   Paragraph logic (UNCHANGED)
------------------------------ */

function paragraphAdd(text) {
  const words = text.split(/\s+/);
  const paragraphs = [];
  let paragraph = "";
  let wordCount = 0;
  let insideQuote = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    paragraph += word + " ";
    wordCount++;

    if (word.includes('"')) {
      const quoteCount = (word.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0) insideQuote = !insideQuote;
    }

    if (wordCount >= 150 && word.endsWith(".") && !insideQuote) {
      paragraphs.push(paragraph.trim());
      paragraph = "";
      wordCount = 0;
    }
  }

  if (paragraph.trim()) paragraphs.push(paragraph.trim());
  return paragraphs;
}

function titleCapitalization(title) {
  const titleWords = title.split(" ");
  const conjunctions = ["a", "to", "off", "over", "from", "into", "with", "yet", "so", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "the", "up"];
  for (let i = 0; i < titleWords.length; i++) {
    if (!(conjunctions.includes(titleWords[i].toLowerCase()))) {
      titleWords[i] = titleWords[i].charAt(0).toUpperCase() + titleWords[i].slice(1);
    }
  }
  return titleWords.join(" ");
}

/* -----------------------------
   Firebase article assignment
------------------------------ */

const MAX_PER_ARTICLE = 3;

async function logArticleUsage(index) {
  const usageIdxRef = ref(database, `articleUsage/${index}`);
  const result = await runTransaction(usageIdxRef, (curr) => {
    const v = curr ?? 0;
    if (v >= MAX_PER_ARTICLE) return;
    return v + 1;
  });
  return result.committed;
}

async function assignArticleIndex() {
  const usageRef = ref(database, "articleUsage");
  const usageSnap = await get(usageRef);
  const usage = usageSnap.exists() ? usageSnap.val() : {};

  for (let i = 0; i < 12; i++) {
    if (usage[i] === undefined) usage[i] = 0;
  }

  const candidates = Object.keys(usage)
    .map(Number)
    .filter((i) => usage[i] < MAX_PER_ARTICLE);

  if (candidates.length === 0) return null;

  const shuffled = [...candidates].sort(() => Math.random() - 0.5);

  for (const i of shuffled) {
    const ok = await logArticleUsage(i);
    if (ok) return i;
  }

  return null;
}

/* -----------------------------
   Original DropdownItem (kept as-is)
------------------------------ */

const DropdownItem = ({ icon, title, children, openTitle, setOpenTitle, color }) => {
  const isOpen = openTitle === title;
  const handleClick = () => setOpenTitle(isOpen ? null : title);

  const borderColor =
    color === "yellow"
      ? "border-yellow-400"
      : color === "red"
      ? "border-red-400"
      : "border-blue-400";

  return (
    <div
      className={`mb-3 rounded-lg transition-all duration-300 ${
        isOpen
          ? `bg-white/70 ${borderColor} border-l-4 shadow-sm`
          : "hover:bg-gray-50"
      }`}
    >
      <button
        onClick={handleClick}
        className="flex items-center justify-between w-full text-left text-base font-semibold text-gray-900 hover:text-blue-600 focus:outline-none px-2 py-2"
      >
        <span className="flex items-center space-x-2">
          {icon && <span>{icon}</span>}
          <span>{title}</span>
        </span>
        <span
          className={`text-xl leading-none transition-transform duration-300 ${
            isOpen ? "rotate-90 text-blue-500" : "rotate-0 text-gray-500"
          }`}
        >
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen && (
        <div className="mt-2 ml-3 mr-2 text-left text-gray-800 transition-all duration-300 space-y-2 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
};


/* -----------------------------
   Subcategory Definitions (for Verification Popup)
------------------------------ */

const SUBCATEGORY_DEFINITIONS = {
  "exaggeration":
    "When something is made to sound artificially much bigger, better, or worse than it really is — or the opposite: made to sound smaller or less serious than it actually is.",
  "slogans":
    "A short, memorable phrase used to spark emotion or support a cause. Slogans simplify complex ideas into a few words and can promote unity, nationalism, or other sentiments.",
  "bandwagon":
    "Telling people to support something just because “everyone else” already supports it. This relies on social pressure and popularity, not evidence.",
  "casual oversimplification":
    "Blaming a complex issue on just one cause or explaining it with one simple answer, ignoring other factors that are probably involved.",
  "doubt":
    "Language that tries to make the audience question whether a person, group, or institution is competent, honest, or legitimate.",
  "name-calling":
    "Using a loaded positive or negative label to shape how the audience feels about a person, group, or idea, instead of giving evidence.",
  "demonization":
    "Describing people or groups as evil, dangerous, corrupt, disgusting, or less than human to turn the audience against them.",
  "scapegoating":
    "Blaming an entire group for a broad problem or crisis, framing them as the main cause of widespread harm or decline.",
  "no polarizing language":
    "The paragraph is written in a neutral, factual tone and does not use persuasive propaganda or inflammatory language.",
  "no polarizing language selected":
    "The paragraph is written in a neutral, factual tone and does not use persuasive propaganda or inflammatory language.",
};

const getSubcategoryDefinition = (label) => {
  const key = (label || "").toString().trim().toLowerCase();
  return SUBCATEGORY_DEFINITIONS[key] || "";
};

/* -----------------------------
   Main Tool (LLM Verification)
------------------------------ */

function ToolMain() {
  const [taskClosed, setTaskClosed] = useState(false);
  // --- Original side panel UI state (kept as-is for later editing) ---
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showRightInstructions, setShowRightInstructions] = useState(true);
  // (Unused in verification flow, but preserved so the original side panels render exactly as before)
  const [selectedText, setSelectedText] = useState("");
  const [wordCount, setWordCount] = useState(0);

  // --- Completion code flow (restored from original) ---
  const [showThankYou, setShowThankYou] = useState(false);
  const [completionCode, setCompletionCode] = useState("");

  // --- Verification progress ---
  const [readyToSubmit, setReadyToSubmit] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [allArticles, setAllArticles] = useState([]);
  const [articles, setArticles] = useState([]);
  const [currentArticleIndex, setCurrentArticleIndex] = useState(0);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(null);

  const [llmAnnotations, setLlmAnnotations] = useState({});
  const [showPopup, setShowPopup] = useState(false);
  // Hover tooltip for quick label preview (follows cursor)
  const [hoverTooltip, setHoverTooltip] = useState({ visible: false, x: 0, y: 0, label: "" });

  // --- Post-verification survey (shown after all paragraphs are accepted/denied) ---
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyQ1, setSurveyQ1] = useState(null); // confidence in polarizing language (1-5)
  const [surveyQ2, setSurveyQ2] = useState(null); // perceived bias (1-5)
  const [surveyQ3, setSurveyQ3] = useState("");  // free response (min 100 chars)
  const [surveyQ4, setSurveyQ4] = useState("");
  const [surveyFinished, setSurveyFinished] = useState(false);
  const [surveyError, setSurveyError] = useState("");


  const currentArticle = articles[currentArticleIndex];
  const paragraphs = currentArticle ? paragraphAdd(currentArticle.content) : [];

  /* -------- Load article + claim -------- */
  useEffect(() => {
    fetch("/article_dataset_versions/test3_encoding_fixed_300_700_words.csv")
      .then((response) => response.text())
      .then(async (csvText) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: async function (results) {
            const parsedArticles = results.data.map((item, index) => ({
              id: index + 1,
              title: item["Headline"],
              content: item["News body"],
            }));

            setAllArticles(parsedArticles);

            const idx = await assignArticleIndex();
            if (idx !== null) {
              setSelectedIdx(idx);
              setArticles([parsedArticles[idx]]);
            } else {
              setTaskClosed(true);
            }
          },
        });
      });
  }, []);

  /* -------- Load LLMAnnotations for article -------- */
  useEffect(() => {
    if (selectedIdx === null) return;

    // Reset progress for a newly selected article
    setCurrentParagraphIndex(0);
    setReadyToSubmit(false);
    setCompletedCount(0);

    // Reset survey state for the new article
    setShowSurvey(false);
    setSurveyFinished(false);
    setSurveyQ1(null);
    setSurveyQ2(null);
    setSurveyQ3("");
    setSurveyQ4("");
    setSurveyError("");

    const llmRef = ref(database, `LLMAnnotations/${selectedIdx}`);
    get(llmRef).then((snap) => {
      if (snap.exists()) setLlmAnnotations(snap.val());
      else setLlmAnnotations({});
    });
  }, [selectedIdx]);

  /* -------- Voting logic -------- */
  async function submitVote(type) {
    const voteRef = ref(
      database,
      `LLMAnnotations/${selectedIdx}/${currentParagraphIndex}/${type}`
    );
    await runTransaction(voteRef, (curr) => (curr ?? 0) + 1);

    setShowPopup(false);
    setHoverTooltip((prev) => ({ ...prev, visible: false }));

    // Mark this paragraph as completed (exactly 1 vote per paragraph)
    setCompletedCount((prev) => {
      const next = prev + 1;
      if (next >= paragraphs.length) {
        // Finished verifying every paragraph – show post-annotation survey
        setReadyToSubmit(true);
        setShowSurvey(true);
      }
      return next;
    });

    // Only advance if there is a next paragraph
    if (currentParagraphIndex < paragraphs.length - 1) {
      setCurrentParagraphIndex((p) => p + 1);
    }
  }

  /* -------- Highlight renderer -------- */
  function renderParagraph(text, span, subcategoryLabel) {
    const disabled = readyToSubmit;
    const handleClick = () => {
      if (!disabled) {
        setHoverTooltip((prev) => ({ ...prev, visible: false }));
        setShowPopup(true);
      }
    };


    const labelForTooltip = (subcategoryLabel || "").toString().trim() || "Unknown";

    const handleMouseEnter = (e) => {
      if (disabled) return;
      setHoverTooltip({ visible: true, x: e.clientX, y: e.clientY, label: labelForTooltip });
    };

    const handleMouseMove = (e) => {
      if (disabled) return;
      setHoverTooltip((prev) =>
        prev.visible ? { ...prev, x: e.clientX, y: e.clientY } : prev
      );
    };

    const handleMouseLeave = () => {
      setHoverTooltip((prev) => ({ ...prev, visible: false }));
    };


    const cls = disabled
      ? "bg-yellow-200 opacity-60 cursor-not-allowed"
      : "bg-yellow-200 cursor-pointer";

    // No polarizing language: highlight entire paragraph
    if (!span || span === "no polarizing language selected") {
      return (
        <span className={cls} onClick={handleClick} onMouseEnter={handleMouseEnter} onMouseOver={handleMouseEnter} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
          {text}
        </span>
      );
    }

    const idx = text.indexOf(span);
    if (idx === -1) {
      // Fallback: highlight everything if span mismatch
      return (
        <span className={cls} onClick={handleClick} onMouseEnter={handleMouseEnter} onMouseOver={handleMouseEnter} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
          {text}
        </span>
      );
    }

    return (
      <>
        {text.slice(0, idx)}
        <span className={cls} onClick={handleClick} onMouseEnter={handleMouseEnter} onMouseOver={handleMouseEnter} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
          {span}
        </span>
        {text.slice(idx + span.length)}
      </>
    );
  }

  const generateCode = () =>
    `MTURK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const handleFinalSubmit = async () => {
    const ok = !!surveyQ1 && !!surveyQ2 && (surveyQ3 || "").trim().length >= 100 && (surveyQ4 || "").trim().length >= 100;
    if (!ok) {
      setSurveyError("Please answer all questions. Questions 3 & 4 must be at least 100 characters.");
      return;
    }

    try {
      const code = generateCode();
      setCompletionCode(code);

      const ts = Date.now();
      const articleKey = selectedIdx !== null ? String(selectedIdx) : "unknown";

      const submissionPayload = {
        articleTitles: {
          [articleKey]: currentArticle?.title || "",
        },
        code,
        surveyResponses: {
          [articleKey]: {
            bias: surveyQ2,
            confidence: surveyQ1,
            openFeedback1: (surveyQ3 || "").trim(),
            openFeedback2: (surveyQ4 || "").trim(),
          },
        },
        timestamp: ts,
      };

      await push(ref(database, "submissions"), submissionPayload);

      setSurveyFinished(true);
      setSurveyError("");
      setShowThankYou(true);
    } catch (e) {
      setSurveyError("We could not save your responses. Please try again.");
    }
  };


  useEffect(() => {
    if (!showThankYou) return;

    // Completion code is generated at final submit time to ensure it is stored alongside the submission.
  }, [showThankYou]);

  if (taskClosed) return <TaskClosedScreen />;

  if (showThankYou) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-white">
        <div className="max-w-xl text-center p-6 border border-gray-300 rounded shadow">
          <h2 className="text-2xl font-bold mb-4">🎉 Thank You!</h2>
          <p className="mb-4 text-gray-700">
            Thank you for taking part in this study. Your responses have been recorded.
          </p>
          <p className="mb-4 text-gray-700">
            Please copy and paste the following completion code into MTurk:
          </p>
          <div className="bg-gray-100 text-lg font-mono p-4 rounded border border-dashed border-gray-400 mb-4">
            {completionCode}
          </div>
          <p className="text-sm text-gray-500">
            You may now close this window or return to the task page.
          </p>
        </div>
      </div>
    );
  }

  const llmForCurrent = llmAnnotations[currentParagraphIndex];

  return (
    <div className="flex w-full justify-center items-start min-h-screen bg-gray-100 relative">

      {/* Instructions Sidebar (ORIGINAL) */}
      <div
        className={`w-1/4 p-4 bg-gray-200 shadow-md transition-all duration-300 ${
          showRightInstructions
            ? "visible opacity-100 pointer-events-auto"
            : "invisible opacity-0 pointer-events-none"
        }`}
      >
        <h3 className="text-lg font-bold mb-2">Annotation Guide</h3>
        <p className="text-sm mb-2">Use the following categories for labeling:</p>

        {/* Persuasive Propaganda Section */}
        <div className="bg-yellow-100 p-4 rounded mb-4">
          <strong className="text-yellow-700 text-center block mb-4 text-lg font-semibold">
            Persuasive Propaganda
          </strong>

          <DropdownItem
            title="Exaggeration"
            openTitle={openDropdown}
            setOpenTitle={setOpenDropdown}
            color="yellow"
          >
            <div className="mt-2 ml-4 text-left text-gray-800 space-y-2 py-3">
              <p className="text-base leading-relaxed">
                When something is made to sound artificially much bigger, better,
                or worse than it really is — or, the opposite, made to sound
                smaller or less serious than it actually is.
              </p>
              <div className="text-sm leading-relaxed text-gray-700">
                <p className="font-semibold">Examples:</p>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>
                    “A local protest ignited waves of outrage and sent shockwaves
                    through the nation.”
                  </li>
                  <li>
                    “This minor disagreement has become a national catastrophe,
                    easily the worst of the modern era.”
                  </li>
                  <li>
                    “The present scandal is nothing — just political theater —
                    and most Americans aren’t even aware of it.”
                  </li>
                </ul>
              </div>
            </div>
          </DropdownItem>

          <DropdownItem
            title="Slogans"
            openTitle={openDropdown}
            setOpenTitle={setOpenDropdown}
            color="yellow"
          >
            <div className="mt-2 ml-4 text-left text-gray-800 space-y-2 py-3">
              <p className="text-base leading-relaxed">
                A short, memorable phrase used to spark emotion or support a
                cause. Slogans simplify complex ideas into a few words and can
                promote unity, nationalism, or other sentiments. They can be
                positive or negative in tone.
              </p>
              <div className="text-sm leading-relaxed text-gray-700">
                <p className="font-semibold">Examples:</p>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>“Make America Great Again” / “America First”</li>
                  <li>“No Justice, No Peace”</li>
                  <li>“Occupy Wall Street — We Are the 99%”</li>
                </ul>
              </div>
            </div>
          </DropdownItem>

          <DropdownItem
            title="Bandwagon"
            openTitle={openDropdown}
            setOpenTitle={setOpenDropdown}
            color="yellow"
          >
            <div className="mt-2 ml-4 text-left text-gray-800 space-y-2 py-3">
              <p className="text-base leading-relaxed">
                When people are told to support something just because “everyone
                else” already supports it. The message is: if many others believe
                it, you should too. This relies on social pressure and
                popularity, not evidence.
              </p>
              <div className="text-sm leading-relaxed text-gray-700">
                <p className="font-semibold">Examples:</p>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>“Most Americans back this plan, polls show.”</li>
                  <li>
                    “As the Senator emphasized, ‘every true Republican supports
                    this cause.’”
                  </li>
                  <li>
                    “No serious economist still believes raising taxes is a good
                    idea.”
                  </li>
                </ul>
              </div>
            </div>
          </DropdownItem>

          <DropdownItem
            title="Casual Oversimplification"
            openTitle={openDropdown}
            setOpenTitle={setOpenDropdown}
            color="yellow"
          >
            <div className="mt-2 ml-4 text-left text-gray-800 space-y-2 py-3">
              <p className="text-base leading-relaxed">
                When a complex issue is blamed on just one cause or explained
                with one simple answer, ignoring all the other factors that are
                probably involved.
              </p>
              <div className="text-sm leading-relaxed text-gray-700">
                <p className="font-semibold">Examples:</p>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>“The media is the only reason the nation is divided.”</li>
                  <li>
                    “Inflation rose solely because of the president’s policies.”
                  </li>
                  <li>“Crime is up because of progressive prosecutors.”</li>
                </ul>
              </div>
            </div>
          </DropdownItem>

          <DropdownItem
            title="Doubt"
            openTitle={openDropdown}
            setOpenTitle={setOpenDropdown}
            color="yellow"
          >
            <div className="mt-2 ml-4 text-left text-gray-800 space-y-2 py-3">
              <p className="text-base leading-relaxed">
                Language that tries to make the audience question whether a
                person, group, or institution is competent, honest, or
                legitimate.
              </p>
              <div className="text-sm leading-relaxed text-gray-700">
                <p className="font-semibold">Examples:</p>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>“Is he really ready to be the Mayor?”</li>
                  <li>“Is this leader even capable of running the country?”</li>
                  <li>
                    “Some experts question whether the agency’s data can be
                    trusted.”
                  </li>
                </ul>
              </div>
            </div>
          </DropdownItem>
        </div>

        {/* Inflammatory Language Section */}
        <div className="bg-red-100 p-4 rounded mb-6">
          <strong className="text-red-700 text-center block mb-4 text-lg font-semibold">
            Inflammatory Language
          </strong>

          <DropdownItem
            title="Name-Calling"
            openTitle={openDropdown}
            setOpenTitle={setOpenDropdown}
            color="red"
          >
            <div className="mt-2 ml-4 text-left text-gray-800 space-y-2 py-3">
              <p className="text-base leading-relaxed">
                Using a loaded positive or negative label to shape how the
                audience feels about a person, group, or idea. Instead of giving
                evidence, the speaker uses emotionally charged wording to
                discredit or glorify.
              </p>
              <div className="text-sm leading-relaxed text-gray-700">
                <p className="font-semibold">Examples:</p>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>
                    “The movement, composed largely of radical extremists, has
                    demanded sweeping reform.”
                  </li>
                  <li>“Big-money interests continue to profit during the crisis.”</li>
                  <li>
                    “The oft-labeled terrorist sympathizers took to the streets
                    in the latest wave of protests.”
                  </li>
                </ul>
              </div>
            </div>
          </DropdownItem>

          <DropdownItem
            title="Demonization"
            openTitle={openDropdown}
            setOpenTitle={setOpenDropdown}
            color="red"
          >
            <div className="mt-2 ml-4 text-left text-gray-800 space-y-2 py-3">
              <p className="text-base leading-relaxed">
                Describing people or groups as evil, dangerous, corrupt,
                disgusting, or less than human. The goal is to turn the audience
                against the target by making them sound like a threat to
                society.
              </p>
              <div className="text-sm leading-relaxed text-gray-700">
                <p className="font-semibold">Examples:</p>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>“The nation’s bureaucrats are bleeding taxpayers dry.”</li>
                  <li>“Migrants are parasites stealing American jobs.”</li>
                  <li>
                    “These politicians are eating away at the heart of this
                    nation from within.”
                  </li>
                </ul>
              </div>
            </div>
          </DropdownItem>

          <DropdownItem
            title="Scapegoating"
            openTitle={openDropdown}
            setOpenTitle={setOpenDropdown}
            color="red"
          >
            <div className="mt-2 ml-4 text-left text-gray-800 space-y-2 py-3">
              <p className="text-base leading-relaxed">
                Blaming an entire group for a broad problem or crisis. The group
                is framed as the main cause of widespread harm or decline. This
                is almost always aimed at groups (not individuals) and links
                them to larger social, economic, or moral problems.
              </p>
              <div className="text-sm leading-relaxed text-gray-700">
                <p className="font-semibold">Examples:</p>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>
                    “The rising rents — driven as always by greedy landlords —
                    represent a severe strain on families.”
                  </li>
                  <li>
                    “Teachers’ unions are the reason kids are failing in school.”
                  </li>
                  <li>
                    “Homelessness continues to rise because city officials refuse
                    to enforce basic laws.”
                  </li>
                </ul>
              </div>
            </div>
          </DropdownItem>
        </div>

        <h3 className="text-lg font-bold mb-2">Video Tool Guide</h3>
        {
          <video
            src={instructionVid}
            controls
            autoPlay
            muted
            playsInline
            width="600"
            height="300"
            className="block mx-auto"
          />
        }
        <Button
          onClick={() => setShowRightInstructions(false)}
          className="bg-gray-600 text-white w-full"
        >
          Close Guide
        </Button>
      </div>

      {/* Main Content */}
      <div className="w-3/4 max-w-2xl bg-white p-6 rounded-lg shadow-md text-center">
        <Button
          onClick={() => setShowRightInstructions(!showRightInstructions)}
          className="bg-blue-600 text-white mb-4"
        >
          {showRightInstructions ? "Hide Instructions" : "Show Instructions"}
        </Button>

        {articles.length > 0 && (
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {titleCapitalization(articles[currentArticleIndex]?.title)}
            </h2>
            <CardContent>
              <p className="text-gray-700 mb-4">
                {renderParagraph(paragraphs[currentParagraphIndex], llmForCurrent?.span, llmForCurrent?.subcategory)}
              </p>
              {/* Post-Annotation Survey (appears after all paragraphs are verified) */}
              {showSurvey && readyToSubmit && (
                <div className="mt-6 border-t border-gray-200 pt-5 text-left">
                  <h3 className="text-xl font-bold mb-4 text-gray-900">Post-Annotation Survey</h3>

                  <div className="space-y-6">
                    <div>
                      <p className="font-semibold mb-2 text-gray-800">
                        1. How confident are you in your evaluations of the LLM’s annotations in this article?
                      </p>
                      <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <label key={`q1-${v}`} className="flex items-center space-x-2 text-sm text-gray-800">
                            <input
                              type="radio"
                              name="surveyQ1"
                              value={v}
                              checked={surveyQ1 === v}
                              onChange={() => { setSurveyQ1(v); setSurveyError(""); }}
                              disabled={surveyFinished}
                            />
                            <span>
                              {v} — {
                                v === 1 ? "Not at all confident" :
                                v === 2 ? "Slightly confident" :
                                v === 3 ? "Moderately confident" :
                                v === 4 ? "Very confident" :
                                          "Extremely confident"
                              }
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold mb-2 text-gray-800">
                        2. Overall, how accurate did the LLM’s annotations seem in identifying polarizing language in the article?
                      </p>
                      <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <label key={`q2-${v}`} className="flex items-center space-x-2 text-sm text-gray-800">
                            <input
                              type="radio"
                              name="surveyQ2"
                              value={v}
                              checked={surveyQ2 === v}
                              onChange={() => { setSurveyQ2(v); setSurveyError(""); }}
                              disabled={surveyFinished}
                            />
                            <span>
                              {v} — {
                                v === 1 ? "Not at all accurate" :
                                v === 2 ? "Slightly accurate" :
                                v === 3 ? "Moderately accurate" :
                                v === 4 ? "Very accurate" :
                                          "Extremely accurate"
                              }
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold mb-2 text-gray-800">
                        3. Please briefly explain why you agreed or disagreed with the LLM’s annotations.
                        You might reference particular sentences, framing choices, or emotional wording that influenced your decision.
                      </p>
                      <textarea
                        className="w-full min-h-[140px] border border-gray-300 rounded p-3 text-sm text-gray-800"
                        value={surveyQ3}
                        onChange={(e) => { setSurveyQ3(e.target.value); setSurveyError(""); }}
                        placeholder='For example: "I agreed/disagreed with the LLM annotation because..."'
                        disabled={surveyFinished}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Character count: {surveyQ3.length} (minimum 100 characters)
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold mb-2 text-gray-800">
                        4. Aside from the LLM’s annotations, how did you personally feel about the article overall?
                      </p>
                      <textarea
                        className="w-full min-h-[140px] border border-gray-300 rounded p-3 text-sm text-gray-800"
                        value={surveyQ4}
                        onChange={(e) => { setSurveyQ4(e.target.value); setSurveyError(""); }}
                        placeholder='For example: "I felt..."'
                        disabled={surveyFinished}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Character count: {surveyQ4.length} (minimum 100 characters)
                      </p>
                    </div>

                    {/* {surveyError && (
                      <div className="text-sm text-red-600 font-semibold">
                        {surveyError}
                      </div>
                    )} */}
                  </div>

                  <div className="mt-6 flex flex-col items-start space-y-3">
                    <div className="flex flex-col items-start space-y-2">
                    {surveyError && (
                      <div className="text-sm text-red-600">{surveyError}</div>
                    )}
                    <Button
                      onClick={handleFinalSubmit}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
                    >
                      Submit
                    </Button>
                  </div>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        )}

        

{/* Popup */}
        {showPopup && llmForCurrent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center animate-fadeIn">
              <h2 className="text-2xl font-bold mb-3 text-gray-900">Verify LLM Annotation</h2>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-left mb-4">
                <p className="text-xs text-gray-500 mb-1 font-semibold">Highlighted text</p>
                <p className="text-sm text-gray-800 break-words">“{llmForCurrent.span}”</p>
              </div>

              <p className="text-sm text-gray-700 mb-6 leading-relaxed">
                The LLM labeled this highlight as <strong>{llmForCurrent.subcategory}</strong>.
                Please confirm whether you agree.
              </p>


{getSubcategoryDefinition(llmForCurrent.subcategory) && (
  <div className="border border-gray-200 rounded-lg p-4 text-left mb-5 bg-gray-50">
    <p className="text-xs text-gray-500 mb-1 font-semibold capitalize">Definition of {llmForCurrent.subcategory}</p>
    <p className="text-sm text-gray-800 leading-relaxed">
      {getSubcategoryDefinition(llmForCurrent.subcategory)}
    </p>
  </div>
)}

              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => submitVote("deny")}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                >
                  Deny
                </Button>
                <Button
                  onClick={() => submitVote("accept")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded"
                >
                  Accept
                </Button>
              </div>

<div className="mt-3 flex justify-center">
  <Button
    onClick={() => setShowPopup(false)}
    className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs"
  >
    Back to paragraph
  </Button>
</div>

            </div>
          </div>
        )}
      </div>

      {/* Instructions Panel on Right (ORIGINAL) */}
      <div
        className={`w-1/4 p-4 bg-blue transition-all duration-300 ${
          showRightInstructions
            ? "visible opacity-100 pointer-events-auto"
            : "invisible opacity-0 pointer-events-none"
        }`}
      >
        <h3 className="text-lg font-bold mb-3">Instructions</h3>
        <p className="text-sm ml-3 text-left">
          You will verify <strong>1 news article</strong>. Please follow these
          steps for each paragraph:
        </p>
        <div className="h-4 text-left" />
        <div className="h-4 text-left" />
        <ul className="list-decimal text-left ml-5 list-inside text-sm space-y-1">
          <li>
            <strong>Read the paragraph</strong> shown on the screen.
          </li>
          <div className="h-3" />
          <li>
            <strong>Click the highlighted text</strong> to view the LLM's
            subcategory label.
          </li>
          <div className="h-3" />
          <li>
            <strong>Accept</strong> if the label matches the highlighted text,
            or <strong>Deny</strong> if it does not.
          </li>
          <div className="h-3" />
          <li>
            After choosing, you will automatically move to the next paragraph.
          </li>
        </ul>
        <div className="h-4" />
        <p className="text-sm text-gray-500 italic">
          Your responses help us evaluate how well automated systems detect and
          label polarizing language.
        </p>
      </div>

      {/* Hover tooltip that follows cursor over highlighted span */}
      {hoverTooltip.visible && (
        <div
          style={{
            position: "fixed",
            left: hoverTooltip.x + 12,
            top: hoverTooltip.y + 12,
            zIndex: 9999,
            pointerEvents: "none",
          }}
          className="bg-gray-900 text-white text-xs px-3 py-2 rounded shadow-lg max-w-xs"
        >
          <div className="font-semibold">LLM label</div>
          <div className="capitalize">{hoverTooltip.label}</div>
        </div>
      )}

      {/* Sticky Selected Text & Word Count (ORIGINAL, but unused in verification) */}
      {(selectedText || wordCount > 0) && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 border border-gray-300 w-64 z-50">
          {selectedText && (
            <p className="text-sm text-gray-700 mb-2 break-words">
              <strong>Selected:</strong> "{selectedText}"
            </p>
          )}
          {wordCount > 0 && (
            <p className="text-xs text-green-600">Word Count: {wordCount}</p>
          )}
        
      

</div>
      )}
    </div>
  );
}

/* -----------------------------
   Wrapper
------------------------------ */

export default function NewsAnnotationTool() {
  const [introDone, setIntroDone] = useState(false);

  if (!introDone) return <IntroScreen onDone={() => setIntroDone(true)} />;

  return <ToolMain />;
}