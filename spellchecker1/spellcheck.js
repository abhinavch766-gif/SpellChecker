 
 /*
 const textarea = document.getElementById("wordInput");
const highlightLayer = document.getElementById("highlightLayer");
const result = document.getElementById("result");

let typingTimer;
const delay = 10; // ms delay after user stops typing

textarea.addEventListener("input", () => {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(checkSpelling, delay);
});

async function checkSpelling() {
  const text = textarea.value;
  const words = text.split(/\s+/);
  let highlightedText = "";
  let suggestionsOutput = "";

  for (let word of words) {
    if (!word.trim()) continue;

    const cleanWord = word.replace(/[^a-zA-Z']/g, ""); // remove punctuation
    if (cleanWord) {
      const isValid = await checkWordAPI(cleanWord);

      if (!isValid) {
        highlightedText += `<span class="misspelled" title="Not found in dictionary">${word}</span> `;
        const suggestion = await fetchSuggestion(cleanWord);
        const definition = await fetchDefinition(suggestion.split(", ")[0] || cleanWord);

        suggestionsOutput += `
          <div class="definition-box">
            <b>âŒ ${cleanWord}</b><br>
            ðŸ”¹ Suggestions: ${suggestion}<br>
            ðŸ“˜ ${definition}
          </div>
        `;
      } else {
        highlightedText += `${word} `;
      }
    } else {
      highlightedText += `${word} `;
    }
  }

  highlightLayer.innerHTML = highlightedText;
  result.innerHTML = suggestionsOutput || "âœ… All words are correct!";
}

// âœ… Check word existence (Free Dictionary API)
async function checkWordAPI(word) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
    return res.ok;
  } catch {
    return false;
  }
}

// ðŸ’¡ Get suggestions (Datamuse API)
async function fetchSuggestion(word) {
  try {
    const res = await fetch(`https://api.datamuse.com/sug?s=${word}`);
    const data = await res.json();
    if (data.length > 0) {
      return data.slice(0, 3).map(d => d.word).join(", ");
    } else {
      return "No suggestions found";
    }
  } catch {
    return "No suggestions";
  }
}

// ðŸ“˜ Get definition (Free Dictionary API)
async function fetchDefinition(word) {
  if (!word) return "No definition available.";
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
    const data = await res.json();
    const meaning = data[0]?.meanings?.[0]?.definitions?.[0]?.definition;
    return meaning ? meaning : "No definition found.";
  } catch {
    return "No definition available.";
  }
}
  */



// spellcheck.js
//"use strict";

/*
 Optimized Spellcheck JS
 - Debounce input
 - Batch & parallel API calls
 - Caching for checks, suggestions, definitions
 - Preserves original spacing (split by capture groups)
 - Sync highlight scroll to textarea
 - Safe HTML escaping
*/

// DOM refs
const textarea = document.getElementById("wordInput");
const highlightLayer = document.getElementById("highlightLayer");
const result = document.getElementById("result");

// Tunable debounce delay (ms). Increase to reduce requests in rapid typing.
const DEBOUNCE_DELAY = 400;

// Caches to avoid repeated network calls
const checkCache = new Map();       // word -> boolean (exists)
const suggestionCache = new Map();  // word -> suggestion string
const definitionCache = new Map();  // word -> definition string

let typingTimer = null;

// Utility: escape user text for safe HTML injection
function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>"'`=\/]/g, s => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;", "/":"&#x2F;", "`":"&#96;", "=":"&#61;"
  })[s]);
}

// Sync highlight scroll with textarea
textarea.addEventListener("scroll", () => {
  highlightLayer.scrollTop = textarea.scrollTop;
  highlightLayer.scrollLeft = textarea.scrollLeft;
});

// Debounce input
textarea.addEventListener("input", () => {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(checkSpelling, DEBOUNCE_DELAY);
});

// Main function
async function checkSpelling() {
  const text = textarea.value || "";
  // Split into tokens while keeping whitespace separators
  const tokens = text.split(/(\s+)/);

  // Identify unique candidate words to check (lowercased)
  const candidateSet = new Set();
  const tokenToClean = []; // same index as tokens -> cleaned word or null

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok.trim()) {
      tokenToClean.push(null);
      continue;
    }
    // Keep punctuation in display, but clean for API
    const clean = tok.replace(/[^a-zA-Z']/g, "").trim();
    if (clean) {
      const lower = clean.toLowerCase();
      tokenToClean.push(lower);
      candidateSet.add(lower);
    } else {
      tokenToClean.push(null);
    }
  }

  const candidates = Array.from(candidateSet);

  // 1) Parallelize "check existence" with caching
  await Promise.all(candidates.map(async (w) => {
    if (checkCache.has(w)) return;
    const exists = await checkWordAPI(w);
    checkCache.set(w, exists);
  }));

  // 2) For words not in dictionary, fetch suggestions and definitions in parallel (with caching)
  const misspelled = candidates.filter(w => !checkCache.get(w));
  // Fetch suggestions
  await Promise.all(misspelled.map(async (w) => {
    if (!suggestionCache.has(w)) {
      const sug = await fetchSuggestion(w);
      suggestionCache.set(w, sug);
    }
  }));
  // Fetch definitions for top suggestion (or original) in parallel
  await Promise.all(misspelled.map(async (w) => {
    if (!definitionCache.has(w)) {
      const topSuggestion = (suggestionCache.get(w) || "").split(", ")[0] || w;
      const def = await fetchDefinition(topSuggestion);
      definitionCache.set(w, def);
    }
  }));

  // 3) Build highlighted text and suggestions output
  let highlightedHTML = "";
  let suggestionsHTML = "";

  // Build a map for quick lookup
  // For misspelled words (lowercase) -> suggestion & definition
  const missMap = {};
  for (const w of misspelled) {
    missMap[w] = {
      suggestion: suggestionCache.get(w),
      definition: definitionCache.get(w)
    };
  }

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const clean = tokenToClean[i]; // lowercased cleaned word or null
    const escapedTok = escapeHTML(tok);

    if (!clean) {
      // whitespace or tokens without letters -> just append as-is
      highlightedHTML += escapedTok;
    } else {
      const exists = checkCache.get(clean);
      if (!exists) {
        // Highlight misspelled token; include original punctuation
        highlightedHTML += `<span class="misspelled" title="Not found in dictionary">${escapedTok}</span>`;
        const info = missMap[clean];
        suggestionsHTML += `
          <div class="definition-box" style="margin-bottom:12px;">
            <b>❌ ${escapeHTML(clean)}</b><br>
            🔍 Suggestions: ${escapeHTML(info.suggestion || "No suggestions found")}<br>
            📘 ${escapeHTML(info.definition || "No definition available.")}
          </div>
        `;
      } else {
        highlightedHTML += escapedTok;
      }
    }
  }

  highlightLayer.innerHTML = highlightedHTML || "";
  result.innerHTML = suggestionsHTML || "✔️ All words are correct!";
}

// ---- API helper functions ----

// Check word existence (uses cache in caller)
async function checkWordAPI(word) {
  // Word is lowercase clean form
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    return res.ok;
  } catch (err) {
    // On network error, treat as unknown to be safe
    return false;
  }
}

// Get suggestions (Datamuse). Returns comma-separated string
async function fetchSuggestion(word) {
  try {
    const res = await fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(word)}`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    if (!res.ok) return "No suggestions found";
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return "No suggestions found";
    // pick up to 3 suggestions
    return data.slice(0, 3).map(d => d.word).join(", ");
  } catch (err) {
    return "No suggestions";
  }
}

// Get definition for a word (Free Dictionary API)
async function fetchDefinition(word) {
  if (!word) return "No definition available.";
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    if (!res.ok) return "No definition found.";
    const data = await res.json();
    const meaning = data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition;
    return meaning ? meaning : "No definition found.";
  } catch (err) {
    return "No definition available.";
  }
}





