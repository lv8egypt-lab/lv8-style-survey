(function () {
  "use strict";

  const collectionVersion = "2026-09-01-v7";
  const surveyId = window.LV8_CONFIG?.surveyId || "default";
  const draftKey = `lv8-survey-draft:${surveyId}:${collectionVersion}`;
  const ratingLabels = ["Not for me", "Weak", "Average", "Strong", "Must launch"];
  const maxSurveyStyles = 18;
  const maxReasons = 3;
  let styles = window.LV8_SURVEY_DATA.styles.map(applyCatalogMedia);
  let comparisons = [...window.LV8_SURVEY_DATA.comparisons];
  let filteredStyles = [];
  let filteredComparisons = [];
  let currentStyleIndex = 0;
  let currentImageIndex = 0;
  let state = makeFreshState();
  const elements = {};

  function makeId() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function applyCatalogMedia(style) {
    const media = window.LV8_CATALOG_IMAGES?.[style.id];
    return media ? { ...style, images: [...media.images], thumbnails: [...media.thumbnails] } : style;
  }

  function thumbnailFor(style, index = 0) {
    return style.thumbnails?.[index] || style.images?.[index] || "assets/brand/og-cover.png";
  }

  function makeFreshState() {
    return {
      id: makeId(),
      seed: Math.floor(Math.random() * 2147483646) + 1,
      profile: {
        audience: "both", nickname: "", age: "", city: "", primaryUse: "", budget: "", fit: "",
        singleLaunchChoice: "", missingProduct: "", shortlist: [], styleOrder: [], comparisonOrder: []
      },
      answers: {}, comparisons: {}, shortlist: [], finalRanking: [], startedAt: new Date().toISOString()
    };
  }

  function hashString(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededShuffle(items, seed) {
    const result = [...items];
    let value = (Number(seed) || 1) >>> 0;
    for (let index = result.length - 1; index > 0; index -= 1) {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      const target = value % (index + 1);
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  }

  function cacheElements() {
    [
      "welcomeView", "surveyView", "compareView", "rankingView", "successView", "startForm", "nickname",
      "profileAge", "profileCity", "profileUse", "profileBudget", "profileFit", "modeBadge", "styleCount",
      "currentNumber", "totalNumber", "progressBar", "mainStyleImage", "thumbnailStrip", "imageCounter",
      "expandImageButton", "styleCode", "styleCategory", "styleName", "styleDescription", "styleTags",
      "starRating", "ratingOutput", "priceQuestion", "priceHint", "priceChoices", "intentChoices",
      "reasonChoices", "reasonHint", "styleNote", "previousStyleButton", "nextStyleButton", "saveExitButton",
      "validationMessage", "comparisonList", "backToStylesButton", "submitSurveyButton", "comparisonValidation",
      "shortlistList", "shortlistStatus", "alternativeList", "rankingList", "rankingProgress", "resetRankingButton",
      "singleLaunchChoices", "missingProduct", "backToComparisonsButton", "finalSubmitButton", "rankingValidation",
      "successMessage", "successSummary", "restartButton", "imageDialog", "dialogImage", "closeImageDialog", "toast"
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
          window.LV8Storage.getPublishedStyles(), window.LV8Storage.getPublishedComparisons()
        ]);
        styles = mergeById(styles, remoteStyles.map(applyCatalogMedia));
        comparisons = mergeById(comparisons, remoteComparisons);
      } catch {
        showToast("Cloud additions could not be loaded. The built-in styles are still available.");
      }
    }
    updateStyleCount();
  }

  function mergeById(local, remote) {
    const map = new Map(local.map((item) => [item.id, item]));
    remote.forEach((item) => map.set(item.id, { ...(map.get(item.id) || {}), ...item }));
    return [...map.values()];
  }

  function setModeBadge() {
    const live = window.LV8Storage.isConfigured();
    elements.modeBadge.textContent = live ? "Response collection live" : "Local preview mode";
    elements.modeBadge.className = `mode-badge ${live ? "live" : "demo"}`;
  }

  function bindEvents() {
    elements.startForm.addEventListener("submit", startSurvey);
    elements.startForm.querySelectorAll('input[name="audience"]').forEach((input) => input.addEventListener("change", updateStyleCount));
    elements.previousStyleButton.addEventListener("click", previousStyle);
    elements.nextStyleButton.addEventListener("click", nextStyle);
    elements.saveExitButton.addEventListener("click", saveAndExit);
    elements.backToStylesButton.addEventListener("click", () => showView("survey"));
    elements.submitSurveyButton.addEventListener("click", openTopFive);
    elements.backToComparisonsButton.addEventListener("click", () => showView("compare"));
    elements.resetRankingButton.addEventListener("click", resetRanking);
    elements.missingProduct.addEventListener("input", () => { state.profile.missingProduct = elements.missingProduct.value.trim(); persistDraft(); });
    elements.finalSubmitButton.addEventListener("click", submitSurvey);
    elements.restartButton.addEventListener("click", restartSurvey);
    elements.expandImageButton.addEventListener("click", openCurrentImage);
    elements.closeImageDialog.addEventListener("click", () => elements.imageDialog.close());
    elements.imageDialog.addEventListener("click", (event) => { if (event.target === elements.imageDialog) elements.imageDialog.close(); });
    elements.styleNote.addEventListener("input", saveCurrentNote);
  }

  function updateStyleCount() {
    const audience = new FormData(elements.startForm).get("audience") || "both";
    const eligible = styles.filter((style) => audience === "both" || style.audience === audience).length;
    elements.styleCount.textContent = Math.min(maxSurveyStyles, eligible);
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
    renderChoiceButtons(elements.intentChoices, window.LV8_SURVEY_DATA.purchaseIntents, "intent");
    renderReasons();
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

  function renderReasons() {
    elements.reasonChoices.innerHTML = "";
    window.LV8_SURVEY_DATA.reasonOptions.forEach((reason) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `reason-button ${reason.sentiment}`;
      button.dataset.value = reason.id;
      button.textContent = reason.label;
      button.addEventListener("click", () => toggleReason(reason.id));
      elements.reasonChoices.appendChild(button);
    });
  }

  function loadDraftHint() {
    const draft = readDraft();
    if (draft && Object.keys(draft.answers || {}).length) showToast("You have a saved response on this device. Select Start to continue it.", 5000);
  }

  function readDraft() {
    try { return JSON.parse(localStorage.getItem(draftKey) || "null"); } catch { return null; }
  }

  function persistDraft() {
    localStorage.setItem(draftKey, JSON.stringify({ ...state, currentStyleIndex }));
  }

  function profileFromForm(formData) {
    return {
      audience: formData.get("audience") || "both",
      nickname: String(formData.get("nickname") || "").trim(),
      age: String(formData.get("age") || ""), city: String(formData.get("city") || ""),
      primaryUse: String(formData.get("primaryUse") || ""), budget: String(formData.get("budget") || ""),
      fit: String(formData.get("fit") || "")
    };
  }

  function balancedStyleSample(audience, seed) {
    const eligible = styles.filter((style) => audience === "both" || style.audience === audience);
    if (eligible.length <= maxSurveyStyles) return seededShuffle(eligible, seed);
    if (audience !== "both") return seededShuffle(eligible, seed).slice(0, maxSurveyStyles);
    const men = seededShuffle(eligible.filter((style) => style.audience === "men"), seed ^ hashString("men"));
    const women = seededShuffle(eligible.filter((style) => style.audience === "women"), seed ^ hashString("women"));
    const menQuota = Math.min(men.length, Math.floor(maxSurveyStyles / 2));
    const womenQuota = Math.min(women.length, maxSurveyStyles - menQuota);
    const selected = [...men.slice(0, menQuota), ...women.slice(0, womenQuota)];
    const remaining = [...men.slice(menQuota), ...women.slice(womenQuota)];
    selected.push(...remaining.slice(0, maxSurveyStyles - selected.length));
    return seededShuffle(selected, seed ^ hashString("all-products"));
  }

  function prepareSessionOrder() {
    const styleMap = new Map(styles.map((style) => [style.id, style]));
    const savedStyles = (state.profile.styleOrder || []).map((id) => styleMap.get(id)).filter(Boolean);
    filteredStyles = savedStyles.length ? savedStyles : balancedStyleSample(state.profile.audience, state.seed);
    state.profile.styleOrder = filteredStyles.map((style) => style.id);
    const selectedStyleIds = new Set(filteredStyles.map((style) => style.id));
    const eligibleComparisons = comparisons.filter((item) =>
      (state.profile.audience === "both" || item.audience === state.profile.audience || item.audience === "both") &&
      item.options.every((option) => selectedStyleIds.has(option.styleId))
    );
    const comparisonMap = new Map(eligibleComparisons.map((item) => [item.id, item]));
    const savedComparisons = (state.profile.comparisonOrder || []).map((id) => comparisonMap.get(id)).filter(Boolean);
    filteredComparisons = savedComparisons.length ? savedComparisons : seededShuffle(eligibleComparisons, state.seed ^ hashString("comparisons"));
    state.profile.comparisonOrder = filteredComparisons.map((item) => item.id);
  }

  async function startSurvey(event) {
    event.preventDefault();
    if (!elements.startForm.reportValidity()) return;
    const formProfile = profileFromForm(new FormData(elements.startForm));
    const draft = readDraft();
    if (draft && draft.profile?.audience === formProfile.audience && Object.keys(draft.answers || {}).length) {
      state = { ...makeFreshState(), ...draft, profile: { ...makeFreshState().profile, ...draft.profile, ...formProfile } };
      currentStyleIndex = Math.max(0, Number(draft.currentStyleIndex) || 0);
    } else {
      state = makeFreshState();
      state.profile = { ...state.profile, ...formProfile };
      currentStyleIndex = 0;
    }
    state.answers ||= {};
    state.comparisons ||= {};
    state.shortlist = Array.isArray(state.shortlist) ? state.shortlist : [];
    state.finalRanking = Array.isArray(state.finalRanking) ? state.finalRanking : [];
    prepareSessionOrder();
    currentStyleIndex = Math.min(currentStyleIndex, filteredStyles.length - 1);
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

  function currentStyle() { return filteredStyles[currentStyleIndex]; }

  function ensureVote() {
    const style = currentStyle();
    if (!state.answers[style.id]) state.answers[style.id] = { rating: null, price: null, intent: null, reasons: [], note: "" };
    state.answers[style.id].reasons = Array.isArray(state.answers[style.id].reasons) ? state.answers[style.id].reasons : [];
    return state.answers[style.id];
  }

  function priceGroupFor(style) {
    if (style.id === "men-pace-short") return window.LV8_SURVEY_DATA.priceGroups.short;
    if (style.id === "men-signal-panel-shell" || style.id === "women-full-zip-crew") return window.LV8_SURVEY_DATA.priceGroups.outerwear;
    if (["women-pace-essential-tee", "women-asymmetric-modest-top", "women-oversized-crew", "women-half-zip-crew"].includes(style.id)) return window.LV8_SURVEY_DATA.priceGroups.top;
    return window.LV8_SURVEY_DATA.priceGroups.set;
  }

  function renderStyle() {
    const style = currentStyle();
    if (!style) return;
    currentImageIndex = 0;
    elements.currentNumber.textContent = currentStyleIndex + 1;
    elements.progressBar.style.width = `${((currentStyleIndex + 1) / filteredStyles.length) * 100}%`;
    elements.styleCode.textContent = style.code;
    elements.styleCategory.textContent = style.category;
    elements.styleName.textContent = style.nameEn || style.nameAr;
    elements.styleDescription.textContent = style.descriptionAr;
    elements.styleTags.innerHTML = (style.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
    renderGallery(style);
    const group = priceGroupFor(style);
    elements.priceQuestion.textContent = group.question;
    elements.priceHint.textContent = group.hint;
    renderChoiceButtons(elements.priceChoices, group.options, "price");
    renderCurrentVote();
    elements.previousStyleButton.disabled = currentStyleIndex === 0;
    elements.nextStyleButton.innerHTML = currentStyleIndex === filteredStyles.length - 1 ? 'Start comparisons <span aria-hidden="true">→</span>' : 'Next <span aria-hidden="true">→</span>';
    elements.validationMessage.textContent = "";
    persistDraft();
    preloadNextStyle();
  }

  function renderGallery(style) {
    elements.thumbnailStrip.innerHTML = "";
    const images = style.images?.length ? style.images : ["assets/brand/og-cover.png"];
    images.forEach((src, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `thumbnail-button${index === 0 ? " selected" : ""}`;
      button.setAttribute("aria-label", `View image ${index + 1}`);
      const image = document.createElement("img");
      image.src = thumbnailFor(style, index);
      image.alt = "";
      image.loading = index === 0 ? "eager" : "lazy";
      image.decoding = "async";
      button.appendChild(image);
      button.addEventListener("click", () => setGalleryImage(style, index));
      elements.thumbnailStrip.appendChild(button);
    });
    setGalleryImage({ ...style, images }, 0);
  }

  function setGalleryImage(style, index) {
    currentImageIndex = index;
    elements.mainStyleImage.src = style.images[index];
    elements.mainStyleImage.alt = `${style.nameEn || style.nameAr} — image ${index + 1}`;
    elements.imageCounter.textContent = `${index + 1} / ${style.images.length}`;
    [...elements.thumbnailStrip.children].forEach((button, buttonIndex) => button.classList.toggle("selected", buttonIndex === index));
  }

  function preloadNextStyle() {
    if (navigator.connection?.saveData) return;
    const src = filteredStyles[currentStyleIndex + 1]?.images?.[0];
    if (src) { const image = new Image(); image.src = src; }
  }

  function previewStars(rating) {
    [...elements.starRating.children].forEach((button) => button.classList.toggle("preview", Number(button.dataset.value) <= rating));
    elements.ratingOutput.textContent = `${rating}/5 — ${ratingLabels[rating - 1]}`;
  }

  function setVoteField(field, value) {
    ensureVote()[field] = value;
    renderCurrentVote();
    persistDraft();
  }

  function toggleReason(reasonId) {
    const vote = ensureVote();
    const index = vote.reasons.indexOf(reasonId);
    if (index >= 0) vote.reasons.splice(index, 1);
    else if (vote.reasons.length < maxReasons) vote.reasons.push(reasonId);
    else { elements.reasonHint.textContent = "Choose up to 3 reasons. Remove one before adding another."; return; }
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
    [...elements.reasonChoices.children].forEach((button) => button.classList.toggle("selected", vote.reasons.includes(button.dataset.value)));
    elements.reasonHint.textContent = vote.reasons.length ? `${vote.reasons.length} of ${maxReasons} selected.` : "Optional, but it helps us understand the score.";
    elements.styleNote.value = vote.note || "";
    elements.nextStyleButton.disabled = !(vote.rating && vote.price && vote.intent);
  }

  function saveCurrentNote() {
    if (!filteredStyles.length) return;
    ensureVote().note = elements.styleNote.value.trim();
    persistDraft();
  }

  function nextStyle() {
    saveCurrentNote();
    const vote = ensureVote();
    if (!vote.rating || !vote.price || !vote.intent) {
      elements.validationMessage.textContent = "Choose a star rating, maximum price, and purchase answer before continuing.";
      return;
    }
    if (currentStyleIndex < filteredStyles.length - 1) {
      currentStyleIndex += 1;
      renderStyle();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      renderComparisons();
      showView("compare");
    }
  }

  function previousStyle() { saveCurrentNote(); if (currentStyleIndex > 0) { currentStyleIndex -= 1; renderStyle(); } }

  function saveAndExit() { saveCurrentNote(); persistDraft(); showView("welcome"); showToast("Your progress has been saved on this device."); }

  function renderComparisons() {
    const styleMap = new Map(styles.map((style) => [style.id, style]));
    elements.comparisonList.innerHTML = "";
    filteredComparisons.forEach((comparison, index) => {
      const card = document.createElement("article");
      card.className = "comparison-card";
      card.innerHTML = `<span class="style-code">COMPARE ${String(index + 1).padStart(2, "0")}</span><span class="comparison-control">Test only: ${escapeHtml(comparison.testVariable || "the named design difference")}</span><h2>${escapeHtml(comparison.questionAr)}</h2><p>${escapeHtml(comparison.noteAr)}</p>`;
      const options = document.createElement("div");
      options.className = "comparison-options";
      seededShuffle(comparison.options, state.seed ^ hashString(comparison.id)).forEach((option) => {
        const style = styleMap.get(option.styleId);
        if (!style) return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = `compare-option${state.comparisons[comparison.id] === option.id ? " selected" : ""}`;
        button.dataset.value = option.id;
        button.innerHTML = `<img src="${escapeAttribute(thumbnailFor(style))}" alt="${escapeAttribute(option.labelAr)}" loading="lazy" decoding="async"><span>${escapeHtml(option.labelAr)}</span>`;
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
      elements.comparisonList.querySelector(".comparison-card:not(:has(.compare-option.selected))")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const ordered = rankedPool();
    const ratedIds = new Set(ordered.map((item) => item.style.id));
    state.shortlist = [...new Set(state.shortlist || [])].filter((id) => ratedIds.has(id)).slice(0, 5);
    if (state.shortlist.length < 5) {
      for (const item of ordered) if (!state.shortlist.includes(item.style.id) && state.shortlist.length < 5) state.shortlist.push(item.style.id);
    }
    state.finalRanking = [...new Set(state.finalRanking || [])].filter((id) => state.shortlist.includes(id));
    if (!state.shortlist.includes(state.profile.singleLaunchChoice)) state.profile.singleLaunchChoice = "";
    renderTopFive();
    showView("ranking");
  }

  function rankedPool() {
    const intentWeight = { yes: 3, maybe: 2, no: 0 };
    return filteredStyles.map((style, originalIndex) => ({
      style, vote: state.answers[style.id] || {}, originalIndex,
      rating: Number(state.answers[style.id]?.rating || 0), intentWeight: intentWeight[state.answers[style.id]?.intent] ?? 1
    })).filter((item) => item.rating).sort((a, b) => b.rating - a.rating || b.intentWeight - a.intentWeight || a.originalIndex - b.originalIndex);
  }

  function renderTopFive() {
    const pool = rankedPool();
    const poolMap = new Map(pool.map((item) => [item.style.id, item]));
    const shortlist = state.shortlist.map((id) => poolMap.get(id)).filter(Boolean);
    elements.shortlistStatus.textContent = `${shortlist.length} / 5 selected`;
    elements.shortlistList.innerHTML = "";
    shortlist.forEach(({ style, vote }) => {
      const card = document.createElement("article");
      card.className = "shortlist-card";
      card.innerHTML = `<img src="${escapeAttribute(thumbnailFor(style))}" alt="${escapeAttribute(style.nameEn || style.nameAr)}" loading="lazy"><div><strong>${escapeHtml(style.code)} — ${escapeHtml(style.nameEn || style.nameAr)}</strong><small>${Number(vote.rating || 0)}/5 · ${escapeHtml(intentLabel(vote.intent))}</small></div><button type="button" aria-label="Remove ${escapeAttribute(style.nameEn || style.nameAr)}">Remove</button>`;
      card.querySelector("button").addEventListener("click", () => removeFromShortlist(style.id));
      elements.shortlistList.appendChild(card);
    });
    elements.alternativeList.innerHTML = "";
    pool.filter((item) => !state.shortlist.includes(item.style.id)).forEach(({ style, vote }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "alternative-option";
      button.disabled = state.shortlist.length >= 5;
      button.innerHTML = `<img src="${escapeAttribute(thumbnailFor(style))}" alt="" loading="lazy"><span><strong>${escapeHtml(style.code)} — ${escapeHtml(style.nameEn || style.nameAr)}</strong><small>${Number(vote.rating || 0)}/5 · Add to shortlist</small></span>`;
      button.addEventListener("click", () => addToShortlist(style.id));
      elements.alternativeList.appendChild(button);
    });
    renderRanking(poolMap);
    renderSingleLaunch(poolMap);
    elements.missingProduct.value = state.profile.missingProduct || "";
    validateRanking(false);
    persistDraft();
  }

  function removeFromShortlist(styleId) {
    state.shortlist = state.shortlist.filter((id) => id !== styleId);
    state.finalRanking = state.finalRanking.filter((id) => id !== styleId);
    if (state.profile.singleLaunchChoice === styleId) state.profile.singleLaunchChoice = "";
    renderTopFive();
  }

  function addToShortlist(styleId) { if (state.shortlist.length < 5) { state.shortlist.push(styleId); renderTopFive(); } }

  function renderRanking(poolMap) {
    elements.rankingList.innerHTML = "";
    state.shortlist.forEach((styleId) => {
      const item = poolMap.get(styleId);
      if (!item) return;
      const { style, vote } = item;
      const rank = state.finalRanking.indexOf(style.id) + 1;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `ranking-option${rank ? " selected" : ""}`;
      button.setAttribute("aria-pressed", rank ? "true" : "false");
      button.innerHTML = `<span class="ranking-image"><img src="${escapeAttribute(thumbnailFor(style))}" alt="${escapeAttribute(style.nameEn || style.nameAr)}" loading="lazy"><strong class="ranking-badge">${rank ? `#${rank}` : "+"}</strong></span><span class="ranking-copy"><strong>${escapeHtml(style.code)} — ${escapeHtml(style.nameEn || style.nameAr)}</strong><small>${Number(vote.rating || 0)}/5 · ${escapeHtml(intentLabel(vote.intent))}</small></span>`;
      button.addEventListener("click", () => toggleRankedStyle(style.id));
      elements.rankingList.appendChild(button);
    });
  }

  function renderSingleLaunch(poolMap) {
    elements.singleLaunchChoices.innerHTML = "";
    state.shortlist.forEach((styleId) => {
      const style = poolMap.get(styleId)?.style;
      if (!style) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `single-choice-button${state.profile.singleLaunchChoice === styleId ? " selected" : ""}`;
      button.textContent = `${style.code} — ${style.nameEn || style.nameAr}`;
      button.addEventListener("click", () => { state.profile.singleLaunchChoice = styleId; renderSingleLaunch(poolMap); validateRanking(false); persistDraft(); });
      elements.singleLaunchChoices.appendChild(button);
    });
  }

  function toggleRankedStyle(styleId) {
    const index = state.finalRanking.indexOf(styleId);
    if (index >= 0) state.finalRanking.splice(index, 1);
    else if (state.finalRanking.length < 5) state.finalRanking.push(styleId);
    renderTopFive();
  }

  function resetRanking() { state.finalRanking = []; renderTopFive(); }

  function validateRanking(showMessage = true) {
    const completeShortlist = state.shortlist.length === 5;
    const completeRanking = state.finalRanking.length === 5 && state.finalRanking.every((id) => state.shortlist.includes(id));
    const completeFinalChoice = state.shortlist.includes(state.profile.singleLaunchChoice);
    elements.rankingProgress.textContent = completeRanking ? "Top Five complete" : `Choose your #${state.finalRanking.length + 1}`;
    elements.finalSubmitButton.disabled = !(completeShortlist && completeRanking && completeFinalChoice);
    if (showMessage) {
      if (!completeShortlist) elements.rankingValidation.textContent = "Your shortlist must contain exactly five styles.";
      else if (!completeRanking) elements.rankingValidation.textContent = "Rank all five shortlisted styles from first to fifth.";
      else if (!completeFinalChoice) elements.rankingValidation.textContent = "Choose the one style LV8 should launch first.";
      else elements.rankingValidation.textContent = "";
    } else if (completeShortlist && completeRanking && completeFinalChoice) elements.rankingValidation.textContent = "";
    return completeShortlist && completeRanking && completeFinalChoice;
  }

  function intentLabel(intent) {
    if (intent === "yes") return "Would buy";
    if (intent === "maybe") return "Maybe buy";
    if (intent === "no") return "Not for me";
    return "No purchase answer";
  }

  async function submitSurvey() {
    state.profile.missingProduct = elements.missingProduct.value.trim();
    state.profile.shortlist = [...state.shortlist];
    if (!validateRanking(true)) return;
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
    if (mode === "cloud") elements.successMessage.textContent = "Your response is in and will help rank the styles and shape the first drop.";
    else if (mode === "local-fallback") elements.successMessage.textContent = "The response was saved on this device because the connection failed. Check the database setup before sharing the link.";
    else elements.successMessage.textContent = "This is a local preview. Connect Supabase before sharing the link so responses from every device are collected.";
    showView("success");
  }

  function restartSurvey() {
    state = makeFreshState();
    currentStyleIndex = 0;
    filteredStyles = [];
    filteredComparisons = [];
    localStorage.removeItem(draftKey);
    elements.finalSubmitButton.disabled = true;
    elements.finalSubmitButton.innerHTML = 'Submit final ranking <span aria-hidden="true">→</span>';
    elements.startForm.reset();
    updateStyleCount();
    showView("welcome");
  }

  function openCurrentImage() {
    const style = currentStyle();
    elements.dialogImage.src = style.images[currentImageIndex];
    elements.dialogImage.alt = `${style.nameEn || style.nameAr} — image ${currentImageIndex + 1}`;
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

  function escapeAttribute(value) { return escapeHtml(value).replace(/"/g, "&quot;"); }

  document.addEventListener("DOMContentLoaded", initialize);
})();
