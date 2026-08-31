(function () {
  "use strict";

  const collectionVersion = "2026-09-01-v3";
  const draftKey = `lv8-survey-draft:${window.LV8_CONFIG?.surveyId || "default"}:${collectionVersion}`;
  const ratingLabels = ["Not for me", "Weak", "Average", "Strong", "Must launch"];
  let styles = [...window.LV8_SURVEY_DATA.styles];
  let comparisons = [...window.LV8_SURVEY_DATA.comparisons];
  let filteredStyles = [];
  let filteredComparisons = [];
  let topFiveCandidates = [];
  let currentStyleIndex = 0;
  let currentImageIndex = 0;
  let state = makeFreshState();

  const elements = {};

  function makeId() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function makeFreshState() {
    return {
      id: makeId(),
      profile: { audience: "both", nickname: "" },
      answers: {},
      comparisons: {},
      finalRanking: [],
      startedAt: new Date().toISOString()
    };
  }

  function cacheElements() {
    [
      "welcomeView", "surveyView", "compareView", "rankingView", "successView", "startForm", "nickname",
      "modeBadge", "styleCount", "currentNumber", "totalNumber", "progressBar", "styleStage",
      "mainStyleImage", "thumbnailStrip", "imageCounter", "expandImageButton", "styleCode",
      "styleCategory", "styleName", "styleDescription", "styleTags", "starRating", "ratingOutput",
      "priceChoices", "intentChoices", "styleNote", "previousStyleButton", "nextStyleButton",
      "saveExitButton", "validationMessage", "comparisonList", "backToStylesButton",
      "submitSurveyButton", "comparisonValidation", "rankingList", "rankingProgress", "resetRankingButton",
      "backToComparisonsButton", "finalSubmitButton", "rankingValidation", "successMessage", "successSummary", "restartButton",
      "imageDialog", "dialogImage", "closeImageDialog", "toast"
    ].forEach((id) => { elements[id] = document.getElementById(id); });
  }

  async function initialize() {
    cacheElements();
    setModeBadge();
    bindEvents();
    renderChoiceDefinitions();
    loadDraftHint();

    if (window.LV8Storage.isConfigured()) {
      try {
        const [remoteStyles, remoteComparisons] = await Promise.all([
          window.LV8Storage.getPublishedStyles(),
          window.LV8Storage.getPublishedComparisons()
        ]);
        styles = mergeById(styles, remoteStyles);
        comparisons = mergeById(comparisons, remoteComparisons);
      } catch (error) {
        showToast("Cloud additions could not be loaded. The built-in styles are still available.");
      }
    }

    elements.styleCount.textContent = styles.length;
  }

  function mergeById(local, remote) {
    const map = new Map(local.map((item) => [item.id, item]));
    remote.forEach((item) => map.set(item.id, item));
    return [...map.values()];
  }

  function setModeBadge() {
    const live = window.LV8Storage.isConfigured();
    elements.modeBadge.textContent = live ? "Response collection live" : "Local preview mode";
    elements.modeBadge.className = `mode-badge ${live ? "live" : "demo"}`;
  }

  function bindEvents() {
    elements.startForm.addEventListener("submit", startSurvey);
    elements.previousStyleButton.addEventListener("click", previousStyle);
    elements.nextStyleButton.addEventListener("click", nextStyle);
    elements.saveExitButton.addEventListener("click", saveAndExit);
    elements.backToStylesButton.addEventListener("click", () => showView("survey"));
    elements.submitSurveyButton.addEventListener("click", openTopFive);
    elements.backToComparisonsButton.addEventListener("click", () => showView("compare"));
    elements.resetRankingButton.addEventListener("click", resetRanking);
    elements.finalSubmitButton.addEventListener("click", submitSurvey);
    elements.restartButton.addEventListener("click", restartSurvey);
    elements.expandImageButton.addEventListener("click", openCurrentImage);
    elements.closeImageDialog.addEventListener("click", () => elements.imageDialog.close());
    elements.imageDialog.addEventListener("click", (event) => {
      if (event.target === elements.imageDialog) elements.imageDialog.close();
    });
    elements.styleNote.addEventListener("input", saveCurrentNote);
  }

  function renderChoiceDefinitions() {
    elements.starRating.innerHTML = "";
    for (let rating = 1; rating <= 5; rating += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "star-button";
      button.dataset.value = rating;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-label", `${rating} out of 5`);
      button.setAttribute("aria-checked", "false");
      button.textContent = "★";
      button.addEventListener("mouseenter", () => previewStars(rating));
      button.addEventListener("mouseleave", renderCurrentVote);
      button.addEventListener("click", () => setVoteField("rating", rating));
      elements.starRating.appendChild(button);
    }

    renderChoiceButtons(elements.priceChoices, window.LV8_SURVEY_DATA.priceRanges, "price");
    renderChoiceButtons(elements.intentChoices, window.LV8_SURVEY_DATA.purchaseIntents, "intent");
  }

  function renderChoiceButtons(container, options, field) {
    container.innerHTML = "";
    options.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-button";
      button.dataset.value = option.id;
      button.textContent = option.label;
      button.addEventListener("click", () => setVoteField(field, option.id));
      container.appendChild(button);
    });
  }

  function loadDraftHint() {
    const draft = readDraft();
    if (!draft || !Object.keys(draft.answers || {}).length) return;
    showToast("You have a saved response on this device. Select Start to continue it.", 5000);
  }

  function readDraft() {
    try { return JSON.parse(localStorage.getItem(draftKey) || "null"); } catch { return null; }
  }

  function persistDraft() {
    localStorage.setItem(draftKey, JSON.stringify({ ...state, currentStyleIndex }));
  }

  async function startSurvey(event) {
    event.preventDefault();
    const formData = new FormData(elements.startForm);
    const audience = formData.get("audience") || "both";
    const nickname = String(formData.get("nickname") || "").trim();
    const draft = readDraft();

    if (draft && draft.profile?.audience === audience && Object.keys(draft.answers || {}).length) {
      state = draft;
      state.profile.nickname = nickname || state.profile.nickname || "";
      state.comparisons = state.comparisons || {};
      state.finalRanking = Array.isArray(state.finalRanking) ? state.finalRanking : [];
      currentStyleIndex = Math.min(Number(draft.currentStyleIndex) || 0, styles.length - 1);
    } else {
      state = makeFreshState();
      state.profile = { audience, nickname };
      currentStyleIndex = 0;
    }

    filteredStyles = styles.filter((style) => audience === "both" || style.audience === audience);
    filteredComparisons = comparisons.filter((item) => audience === "both" || item.audience === audience || item.audience === "both");
    if (currentStyleIndex >= filteredStyles.length) currentStyleIndex = 0;
    elements.totalNumber.textContent = filteredStyles.length;
    showView("survey");
    renderStyle();
  }

  function showView(name) {
    elements.welcomeView.hidden = name !== "welcome";
    elements.surveyView.hidden = name !== "survey";
    elements.compareView.hidden = name !== "compare";
    elements.rankingView.hidden = name !== "ranking";
    elements.successView.hidden = name !== "success";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function currentStyle() {
    return filteredStyles[currentStyleIndex];
  }

  function ensureVote() {
    const style = currentStyle();
    if (!state.answers[style.id]) state.answers[style.id] = { rating: null, price: null, intent: null, note: "" };
    return state.answers[style.id];
  }

  function renderStyle() {
    const style = currentStyle();
    if (!style) return;
    currentImageIndex = 0;
    elements.currentNumber.textContent = currentStyleIndex + 1;
    elements.progressBar.style.width = `${((currentStyleIndex + 1) / filteredStyles.length) * 100}%`;
    elements.styleCode.textContent = style.code;
    elements.styleCategory.textContent = style.category;
    elements.styleName.textContent = style.nameAr;
    elements.styleDescription.textContent = style.descriptionAr;
    elements.styleTags.innerHTML = style.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
    elements.mainStyleImage.alt = `${style.nameAr} — image 1`;
    renderGallery(style);
    renderCurrentVote();
    elements.previousStyleButton.disabled = currentStyleIndex === 0;
    elements.nextStyleButton.innerHTML = currentStyleIndex === filteredStyles.length - 1 ? "Start comparisons <span aria-hidden=\"true\">→</span>" : "Next <span aria-hidden=\"true\">→</span>";
    elements.validationMessage.textContent = "";
    persistDraft();
  }

  function renderGallery(style) {
    elements.thumbnailStrip.innerHTML = "";
    style.images.forEach((src, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `thumbnail-button${index === 0 ? " selected" : ""}`;
      button.setAttribute("aria-label", `View image ${index + 1}`);
      const image = document.createElement("img");
      image.src = src;
      image.alt = "";
      image.loading = index > 4 ? "lazy" : "eager";
      button.appendChild(image);
      button.addEventListener("click", () => setGalleryImage(style, index));
      elements.thumbnailStrip.appendChild(button);
    });
    setGalleryImage(style, 0);
  }

  function setGalleryImage(style, index) {
    currentImageIndex = index;
    elements.mainStyleImage.src = style.images[index];
    elements.mainStyleImage.alt = `${style.nameAr} — image ${index + 1}`;
    elements.imageCounter.textContent = `${index + 1} / ${style.images.length}`;
    [...elements.thumbnailStrip.children].forEach((button, buttonIndex) => button.classList.toggle("selected", buttonIndex === index));
  }

  function previewStars(rating) {
    [...elements.starRating.children].forEach((button) => button.classList.toggle("preview", Number(button.dataset.value) <= rating));
    elements.ratingOutput.textContent = `${rating}/5 — ${ratingLabels[rating - 1]}`;
  }

  function setVoteField(field, value) {
    const vote = ensureVote();
    vote[field] = value;
    renderCurrentVote();
    persistDraft();
  }

  function renderCurrentVote() {
    if (!filteredStyles.length) return;
    const vote = ensureVote();
    [...elements.starRating.children].forEach((button) => {
      const selected = Number(button.dataset.value) <= Number(vote.rating || 0);
      button.classList.remove("preview");
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-checked", Number(button.dataset.value) === Number(vote.rating) ? "true" : "false");
    });
    elements.ratingOutput.textContent = vote.rating ? `${vote.rating}/5 — ${ratingLabels[vote.rating - 1]}` : "Choose from 1 to 5";
    [...elements.priceChoices.children].forEach((button) => button.classList.toggle("selected", button.dataset.value === vote.price));
    [...elements.intentChoices.children].forEach((button) => button.classList.toggle("selected", button.dataset.value === vote.intent));
    elements.styleNote.value = vote.note || "";
    elements.nextStyleButton.disabled = !(vote.rating && vote.price);
  }

  function saveCurrentNote() {
    if (!filteredStyles.length) return;
    ensureVote().note = elements.styleNote.value.trim();
    persistDraft();
  }

  function nextStyle() {
    saveCurrentNote();
    const vote = ensureVote();
    if (!vote.rating || !vote.price) {
      elements.validationMessage.textContent = "Choose a star rating and a price range before continuing.";
      return;
    }
    if (currentStyleIndex < filteredStyles.length - 1) {
      currentStyleIndex += 1;
      renderStyle();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    renderComparisons();
    showView("compare");
  }

  function previousStyle() {
    saveCurrentNote();
    if (currentStyleIndex > 0) {
      currentStyleIndex -= 1;
      renderStyle();
    }
  }

  function saveAndExit() {
    saveCurrentNote();
    persistDraft();
    showView("welcome");
    showToast("Your progress has been saved on this device.");
  }

  function renderComparisons() {
    const styleMap = new Map(styles.map((style) => [style.id, style]));
    elements.comparisonList.innerHTML = "";
    filteredComparisons.forEach((comparison, index) => {
      const card = document.createElement("article");
      card.className = "comparison-card";
      card.innerHTML = `<span class="style-code">COMPARE ${String(index + 1).padStart(2, "0")}</span><h2>${escapeHtml(comparison.questionAr)}</h2><p>${escapeHtml(comparison.noteAr)}</p>`;
      const options = document.createElement("div");
      options.className = "comparison-options";
      comparison.options.forEach((option) => {
        const style = styleMap.get(option.styleId);
        if (!style) return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = `compare-option${state.comparisons[comparison.id] === option.id ? " selected" : ""}`;
        button.dataset.value = option.id;
        button.innerHTML = `<img src="${escapeAttribute(style.images[0])}" alt="${escapeAttribute(option.labelAr)}"><span>${escapeHtml(option.labelAr)}</span>`;
        button.addEventListener("click", () => {
          state.comparisons[comparison.id] = option.id;
          [...options.children].forEach((child) => child.classList.toggle("selected", child === button));
          elements.comparisonValidation.textContent = "";
          persistDraft();
        });
        options.appendChild(button);
      });
      card.appendChild(options);
      elements.comparisonList.appendChild(card);
    });
  }

  function openTopFive() {
    const unanswered = filteredComparisons.filter((comparison) => !state.comparisons[comparison.id]);
    if (unanswered.length) {
      elements.comparisonValidation.textContent = `${unanswered.length} comparison${unanswered.length === 1 ? " still needs" : "s still need"} a choice.`;
      document.querySelector(".comparison-card:not(:has(.compare-option.selected))")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    topFiveCandidates = buildTopFiveCandidates();
    const candidateIds = new Set(topFiveCandidates.map((item) => item.style.id));
    state.finalRanking = [...new Set(state.finalRanking || [])].filter((styleId) => candidateIds.has(styleId));
    renderTopFive();
    showView("ranking");
  }

  function buildTopFiveCandidates() {
    const intentWeight = { yes: 3, maybe: 2, "": 1, no: 0 };
    return filteredStyles
      .map((style, originalIndex) => {
        const vote = state.answers[style.id] || {};
        return {
          style,
          vote,
          originalIndex,
          rating: Number(vote.rating || 0),
          intentWeight: intentWeight[vote.intent || ""] ?? 1
        };
      })
      .sort((a, b) => b.rating - a.rating || b.intentWeight - a.intentWeight || a.originalIndex - b.originalIndex)
      .slice(0, 5);
  }

  function renderTopFive() {
    elements.rankingList.innerHTML = "";
    topFiveCandidates.forEach(({ style, vote }) => {
      const rank = state.finalRanking.indexOf(style.id) + 1;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `ranking-option${rank ? " selected" : ""}`;
      button.setAttribute("aria-pressed", rank ? "true" : "false");
      button.setAttribute("aria-label", rank ? `${style.nameAr}, ranked number ${rank}. Select to remove.` : `${style.nameAr}. Select as number ${state.finalRanking.length + 1}.`);
      button.innerHTML = `
        <span class="ranking-image">
          <img src="${escapeAttribute(style.images[0])}" alt="${escapeAttribute(style.nameAr)}">
          <strong class="ranking-badge">${rank ? `#${rank}` : "+"}</strong>
        </span>
        <span class="ranking-copy">
          <strong>${escapeHtml(style.code)} — ${escapeHtml(style.nameAr)}</strong>
          <small>${Number(vote.rating || 0)}/5 · ${escapeHtml(intentLabel(vote.intent))}</small>
        </span>`;
      button.addEventListener("click", () => toggleRankedStyle(style.id));
      elements.rankingList.appendChild(button);
    });

    const rankedCount = state.finalRanking.length;
    elements.rankingProgress.textContent = rankedCount === 5 ? "Top Five complete" : `Choose your #${rankedCount + 1}`;
    elements.finalSubmitButton.disabled = rankedCount !== 5;
    elements.rankingValidation.textContent = "";
    persistDraft();
  }

  function toggleRankedStyle(styleId) {
    const existingIndex = state.finalRanking.indexOf(styleId);
    if (existingIndex >= 0) {
      state.finalRanking.splice(existingIndex, 1);
    } else if (state.finalRanking.length < 5) {
      state.finalRanking.push(styleId);
    }
    renderTopFive();
  }

  function resetRanking() {
    state.finalRanking = [];
    renderTopFive();
  }

  function intentLabel(intent) {
    if (intent === "yes") return "Would buy";
    if (intent === "maybe") return "Maybe buy";
    if (intent === "no") return "Not for me";
    return "No purchase answer";
  }

  async function submitSurvey() {
    if (state.finalRanking.length !== 5) {
      elements.rankingValidation.textContent = `Choose ${5 - state.finalRanking.length} more style${state.finalRanking.length === 4 ? "" : "s"} to complete your Top Five.`;
      return;
    }

    elements.finalSubmitButton.disabled = true;
    elements.finalSubmitButton.textContent = "Submitting…";
    state.submittedAt = new Date().toISOString();
    const result = await window.LV8Storage.submitResponse(state);
    localStorage.removeItem(draftKey);
    showSuccess(result.mode);
  }

  function showSuccess(mode) {
    const answers = Object.values(state.answers);
    const average = answers.length ? answers.reduce((total, item) => total + Number(item.rating || 0), 0) / answers.length : 0;
    elements.successSummary.innerHTML = `<span>${answers.length} styles rated</span><span>Your average ${average.toFixed(1)} / 5</span><span>${Object.keys(state.comparisons).length} comparisons</span><span>Top 5 ranked</span>`;
    if (mode === "cloud") {
      elements.successMessage.textContent = "Your response is in and will help rank the styles and shape the first drop.";
    } else if (mode === "local-fallback") {
      elements.successMessage.textContent = "The response was saved on this device because the connection failed. Check the database setup before sharing the link.";
    } else {
      elements.successMessage.textContent = "This is a local preview. Connect Supabase before sharing the link so responses from every device are collected.";
    }
    showView("success");
  }

  function restartSurvey() {
    state = makeFreshState();
    currentStyleIndex = 0;
    localStorage.removeItem(draftKey);
    topFiveCandidates = [];
    elements.finalSubmitButton.disabled = true;
    elements.finalSubmitButton.innerHTML = "Submit final ranking <span aria-hidden=\"true\">→</span>";
    elements.startForm.reset();
    showView("welcome");
  }

  function openCurrentImage() {
    const style = currentStyle();
    elements.dialogImage.src = style.images[currentImageIndex];
    elements.dialogImage.alt = `${style.nameAr} — image ${currentImageIndex + 1}`;
    elements.imageDialog.showModal();
  }

  function showToast(message, duration = 3200) {
    elements.toast.textContent = message;
    elements.toast.classList.add("visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => elements.toast.classList.remove("visible"), duration);
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/"/g, "&quot;");
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
