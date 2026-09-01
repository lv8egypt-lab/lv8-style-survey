(function () {
  "use strict";

  const elements = {};
  let accessToken = "";
  let responses = [];
  let visibleResponses = [];
  let styles = window.LV8_SURVEY_DATA.styles.map(applyCatalogMedia);
  const archivedStyles = [...(window.LV8_SURVEY_DATA.archivedStyles || [])];
  let comparisons = [...window.LV8_SURVEY_DATA.comparisons];
  const rankStrength = [100, 80, 60, 40, 20];

  function applyCatalogMedia(style) {
    const media = window.LV8_CATALOG_IMAGES?.[style.id];
    return media ? { ...style, images: [...media.images], thumbnails: [...media.thumbnails] } : style;
  }

  function thumbnailFor(style) { return style?.thumbnails?.[0] || style?.images?.[0] || "assets/brand/icon.png"; }

  function cache() {
    [
      "resultsAuth", "authExplanation", "resultsEmail", "resultsPassword", "resultsLoginButton", "resultsAuthStatus",
      "resultsDashboard", "filterAudience", "filterAge", "filterCity", "filterUse", "filterBudget", "filterFit",
      "resetFilters", "filterSummary", "metricResponses", "metricCoverage", "metricWinner", "metricPrice",
      "rankingBody", "reasonBody", "comparisonBody", "topFiveBody", "responseBody", "exportButton",
      "responseDetailDialog", "responseDetailClose", "responseDetailTitle", "responseDetailMeta", "detailAudience",
      "detailStyleCount", "detailAverage", "detailTopChoice", "detailProfile", "detailTopFive", "detailSingleLaunch",
      "detailMissingProduct", "detailAnswers", "detailComparisons"
    ].forEach((id) => { elements[id] = document.getElementById(id); });
  }

  async function initialize() {
    cache();
    populateFilters();
    elements.resultsLoginButton.addEventListener("click", login);
    elements.exportButton.addEventListener("click", exportCsv);
    elements.responseBody.addEventListener("click", handleResponseClick);
    elements.responseDetailClose.addEventListener("click", closeResponseDetail);
    elements.responseDetailDialog.addEventListener("click", (event) => { if (event.target === elements.responseDetailDialog) closeResponseDetail(); });
    [elements.filterAudience, elements.filterAge, elements.filterCity, elements.filterUse, elements.filterBudget, elements.filterFit].forEach((select) => select.addEventListener("change", renderDashboard));
    elements.resetFilters.addEventListener("click", resetFilters);

    if (!window.LV8Storage.isConfigured()) {
      elements.authExplanation.textContent = "The site is in preview mode. Only responses saved on this device will be shown.";
      elements.resultsEmail.hidden = true;
      elements.resultsPassword.hidden = true;
      elements.resultsLoginButton.textContent = "View device data";
    }
  }

  function populateFilters() {
    const source = window.LV8_SURVEY_DATA.profileOptions;
    addOptions(elements.filterAge, source.age);
    addOptions(elements.filterCity, source.city);
    addOptions(elements.filterUse, source.primaryUse);
    addOptions(elements.filterBudget, source.budget);
    addOptions(elements.filterFit, source.fit);
  }

  function addOptions(select, options) {
    options.forEach((option) => select.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(option.id)}">${escapeHtml(option.label)}</option>`));
  }

  async function login() {
    setAuthStatus("Loading results…", false);
    elements.resultsLoginButton.disabled = true;
    try {
      if (window.LV8Storage.isConfigured()) {
        const session = await window.LV8Storage.signIn(elements.resultsEmail.value.trim(), elements.resultsPassword.value);
        accessToken = session.access_token;
        const [remoteStyles, remoteComparisons] = await Promise.all([window.LV8Storage.getPublishedStyles(), window.LV8Storage.getPublishedComparisons()]);
        styles = mergeById(styles, remoteStyles.map(applyCatalogMedia));
        comparisons = mergeById(comparisons, remoteComparisons);
      }
      responses = await window.LV8Storage.getResponses(accessToken);
      elements.resultsAuth.hidden = true;
      elements.resultsDashboard.hidden = false;
      renderDashboard();
    } catch (error) {
      setAuthStatus(error.message || "Sign-in failed.", false);
    } finally {
      elements.resultsLoginButton.disabled = false;
    }
  }

  function mergeById(local, remote) {
    const map = new Map(local.map((item) => [item.id, item]));
    remote.forEach((item) => map.set(item.id, { ...(map.get(item.id) || {}), ...item }));
    return [...map.values()];
  }

  function resultCatalog() { return [...styles, ...archivedStyles]; }

  function setAuthStatus(message, success) {
    elements.resultsAuthStatus.hidden = false;
    elements.resultsAuthStatus.className = `status-box${success ? " success" : ""}`;
    elements.resultsAuthStatus.textContent = message;
  }

  function activeFilters() {
    return {
      audience: elements.filterAudience.value, age: elements.filterAge.value, city: elements.filterCity.value,
      primaryUse: elements.filterUse.value, budget: elements.filterBudget.value, fit: elements.filterFit.value
    };
  }

  function resetFilters() {
    [elements.filterAudience, elements.filterAge, elements.filterCity, elements.filterUse, elements.filterBudget, elements.filterFit].forEach((select) => { select.value = ""; });
    renderDashboard();
  }

  function filterResponses() {
    const filters = activeFilters();
    visibleResponses = responses.filter((response) => Object.entries(filters).every(([key, value]) => !value || response.profile?.[key] === value));
    const active = Object.values(filters).filter(Boolean).length;
    elements.filterSummary.textContent = active ? `Showing ${visibleResponses.length} of ${responses.length} responses across ${active} active filter${active === 1 ? "" : "s"}.` : `Showing all ${responses.length} responses.`;
  }

  function emptyStat(style) {
    return {
      id: style.id, code: style.code || style.id, name: `${style.nameEn || style.nameAr || style.id}${style.archived ? " (archived)" : ""}`,
      ratingTotal: 0, ratingCount: 0, intentPoints: 0, intentCount: 0, rankPoints: 0, rankExposure: 0,
      comparisonWins: 0, comparisonExposure: 0, priceCounts: {}, reasonCounts: {}
    };
  }

  function buildStyleStats() {
    const stats = new Map(resultCatalog().map((style) => [style.id, emptyStat(style)]));
    const get = (styleId) => {
      if (!stats.has(styleId)) stats.set(styleId, emptyStat({ id: styleId, code: styleId, nameEn: styleId }));
      return stats.get(styleId);
    };

    visibleResponses.forEach((response) => {
      const answers = response.answers || {};
      Object.entries(answers).forEach(([styleId, answer]) => {
        const item = get(styleId);
        if (answer.rating) { item.ratingTotal += Number(answer.rating); item.ratingCount += 1; }
        if (["yes", "maybe", "no"].includes(answer.intent)) item.intentCount += 1;
        if (answer.intent === "yes") item.intentPoints += 100;
        if (answer.intent === "maybe") item.intentPoints += 50;
        if (answer.price) item.priceCounts[answer.price] = (item.priceCounts[answer.price] || 0) + 1;
        (Array.isArray(answer.reasons) ? answer.reasons : []).forEach((reasonId) => { item.reasonCounts[reasonId] = (item.reasonCounts[reasonId] || 0) + 1; });
      });

      const ranking = response.final_ranking || response.finalRanking || [];
      if (Array.isArray(ranking) && ranking.length === 5) {
        Object.keys(answers).forEach((styleId) => { if (answers[styleId]?.rating) get(styleId).rankExposure += 1; });
        ranking.slice(0, 5).forEach((styleId, index) => { get(styleId).rankPoints += rankStrength[index]; });
      }

      comparisons.forEach((comparison) => {
        const choice = response.comparisons?.[comparison.id];
        if (!choice) return;
        comparison.options.forEach((option) => { get(option.styleId).comparisonExposure += 1; });
        const winner = comparison.options.find((option) => option.id === choice);
        if (winner) get(winner.styleId).comparisonWins += 1;
      });
    });

    return [...stats.values()].map((item) => {
      item.average = item.ratingCount ? item.ratingTotal / item.ratingCount : 0;
      item.ratingStrength = item.average / 5 * 100;
      item.buyStrength = item.intentCount ? item.intentPoints / item.intentCount : 0;
      item.topFiveStrength = item.rankExposure ? item.rankPoints / item.rankExposure : 0;
      item.comparisonStrength = item.comparisonExposure ? item.comparisonWins / item.comparisonExposure * 100 : 50;
      item.topPrice = topKey(item.priceCounts);
      item.launchScore = item.ratingStrength * 0.35 + item.buyStrength * 0.25 + item.topFiveStrength * 0.30 + item.comparisonStrength * 0.10;
      return item;
    }).filter((item) => item.ratingCount).sort((a, b) => b.launchScore - a.launchScore || b.average - a.average);
  }

  function renderDashboard() {
    filterResponses();
    const stats = buildStyleStats();
    const answerCounts = visibleResponses.map((row) => Object.keys(row.answers || {}).length);
    const totalAnswers = answerCounts.reduce((sum, value) => sum + value, 0);
    elements.metricResponses.textContent = visibleResponses.length;
    elements.metricCoverage.textContent = visibleResponses.length ? (totalAnswers / visibleResponses.length).toFixed(1) : "0";
    elements.metricWinner.textContent = stats[0]?.code || "—";
    elements.metricPrice.textContent = priceLabel(stats[0]?.topPrice);

    elements.rankingBody.innerHTML = stats.map((item, index) => `<tr>
      <td><span class="rank-number">${index + 1}</span></td>
      <td><strong>${escapeHtml(item.code)} — ${escapeHtml(item.name)}</strong></td>
      <td><strong>${item.launchScore.toFixed(1)}</strong><div class="mini-bar"><span style="width:${Math.min(100, item.launchScore)}%"></span></div></td>
      <td>${item.average.toFixed(2)} / 5</td><td>${Math.round(item.buyStrength)}%</td><td>${Math.round(item.topFiveStrength)}%</td>
      <td>${Math.round(item.comparisonStrength)}%</td><td>${item.ratingCount}</td><td>${escapeHtml(priceLabel(item.topPrice))}</td>
    </tr>`).join("") || emptyRow(9);

    renderReasons(stats);
    renderComparisons();
    renderTopFiveResults();
    renderIndividualResponses();
  }

  function renderReasons(stats) {
    const rows = stats.filter((item) => Object.keys(item.reasonCounts).length).map((item) => {
      const total = Object.values(item.reasonCounts).reduce((sum, count) => sum + count, 0);
      const topReason = topKey(item.reasonCounts);
      const tags = Object.entries(item.reasonCounts).sort((a, b) => b[1] - a[1]).map(([id, count]) => `${reasonLabel(id)} (${count})`).join(", ");
      return `<tr><td><strong>${escapeHtml(item.code)} — ${escapeHtml(item.name)}</strong></td><td>${escapeHtml(reasonLabel(topReason))}</td><td>${Math.round(item.reasonCounts[topReason] / total * 100)}%</td><td class="reason-tags">${escapeHtml(tags)}</td></tr>`;
    });
    elements.reasonBody.innerHTML = rows.join("") || emptyRow(4, "No reason tags have been collected yet.");
  }

  function renderComparisons() {
    const rows = [];
    comparisons.forEach((comparison) => {
      const counts = Object.fromEntries(comparison.options.map((option) => [option.id, 0]));
      visibleResponses.forEach((response) => { const choice = response.comparisons?.[comparison.id]; if (choice) counts[choice] = (counts[choice] || 0) + 1; });
      const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
      if (!total) return;
      const winnerId = topKey(counts);
      const winner = comparison.options.find((option) => option.id === winnerId);
      rows.push(`<tr><td>${escapeHtml(comparison.questionAr)}</td><td><strong>${escapeHtml(winner?.labelAr || winnerId)}</strong></td><td>${Math.round(counts[winnerId] / total * 100)}%</td><td>${total}</td></tr>`);
    });
    elements.comparisonBody.innerHTML = rows.join("") || emptyRow(4);
  }

  function renderTopFiveResults() {
    const styleMap = new Map(resultCatalog().map((style) => [style.id, style]));
    const pointsByPlace = [5, 4, 3, 2, 1];
    const stats = new Map();
    visibleResponses.forEach((response) => {
      const ranking = response.final_ranking || response.finalRanking || [];
      if (!Array.isArray(ranking)) return;
      ranking.slice(0, 5).forEach((styleId, index) => {
        const item = stats.get(styleId) || { styleId, points: 0, votes: 0, firsts: 0, podiums: 0 };
        item.points += pointsByPlace[index]; item.votes += 1;
        if (index === 0) item.firsts += 1;
        if (index < 3) item.podiums += 1;
        stats.set(styleId, item);
      });
    });
    const ranked = [...stats.values()].sort((a, b) => b.points - a.points || b.firsts - a.firsts || b.podiums - a.podiums);
    elements.topFiveBody.innerHTML = ranked.map((item, index) => {
      const style = styleMap.get(item.styleId);
      return `<tr><td><span class="rank-number">${index + 1}</span></td><td><strong>${escapeHtml(styleLabel(style, item.styleId))}</strong></td><td>${item.points}</td><td>${item.votes}</td><td>${item.firsts}</td><td>${item.podiums}</td></tr>`;
    }).join("") || emptyRow(6, "No final Top Five rankings yet.");
  }

  function renderIndividualResponses() {
    elements.responseBody.innerHTML = visibleResponses.map((row, index) => {
      const answers = Object.values(row.answers || {});
      const average = answers.length ? answers.reduce((sum, answer) => sum + Number(answer.rating || 0), 0) / answers.length : 0;
      const nickname = row.profile?.nickname || "Anonymous";
      return `<tr><td><button class="respondent-link" type="button" data-response-index="${index}">${escapeHtml(nickname)}</button></td><td>${audienceLabel(row.profile?.audience)}</td><td>${escapeHtml(profileLabel("primaryUse", row.profile?.primaryUse))}</td><td>${answers.length}</td><td>${average.toFixed(1)} / 5</td><td>${formatDate(row.submitted_at || row.submittedAt)}</td></tr>`;
    }).join("") || emptyRow(6);
  }

  function handleResponseClick(event) {
    const button = event.target.closest("[data-response-index]");
    if (!button) return;
    const response = visibleResponses[Number(button.dataset.responseIndex)];
    if (response) openResponseDetail(response);
  }

  function openResponseDetail(response) {
    const catalog = resultCatalog();
    const styleMap = new Map(catalog.map((style) => [style.id, style]));
    const styleOrder = new Map(catalog.map((style, index) => [style.id, index]));
    const answerEntries = Object.entries(response.answers || {}).sort((a, b) => (styleOrder.get(a[0]) ?? 999) - (styleOrder.get(b[0]) ?? 999));
    const savedRanking = response.final_ranking || response.finalRanking;
    const ranking = Array.isArray(savedRanking) ? savedRanking.slice(0, 5) : [];
    const rankByStyle = new Map(ranking.map((styleId, index) => [styleId, index + 1]));
    const average = answerEntries.length ? answerEntries.reduce((sum, [, answer]) => sum + Number(answer.rating || 0), 0) / answerEntries.length : 0;
    const nickname = response.profile?.nickname || "Anonymous";

    elements.responseDetailTitle.textContent = nickname;
    elements.responseDetailMeta.textContent = `Submitted ${formatDate(response.submitted_at || response.submittedAt)}`;
    elements.detailAudience.textContent = audienceLabel(response.profile?.audience);
    elements.detailStyleCount.textContent = answerEntries.length;
    elements.detailAverage.textContent = `${average.toFixed(1)} / 5`;
    elements.detailTopChoice.textContent = ranking.length ? styleLabel(styleMap.get(ranking[0]), ranking[0], true) : "Not ranked";
    elements.detailProfile.innerHTML = [
      ["Age", profileLabel("age", response.profile?.age)], ["City / region", profileLabel("city", response.profile?.city)],
      ["Main use", profileLabel("primaryUse", response.profile?.primaryUse)], ["Budget", profileLabel("budget", response.profile?.budget)],
      ["Preferred fit", profileLabel("fit", response.profile?.fit)]
    ].map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join("");

    elements.detailTopFive.innerHTML = ranking.length ? ranking.map((styleId, index) => {
      const style = styleMap.get(styleId);
      return `<article class="detail-top-five-card"><span class="detail-rank">#${index + 1}</span><img src="${escapeHtml(thumbnailFor(style))}" alt="${escapeHtml(styleLabel(style, styleId))}" loading="lazy"><strong>${escapeHtml(styleLabel(style, styleId))}</strong></article>`;
    }).join("") : detailEmpty("This response was submitted before final Top Five ranking was added.");

    elements.detailSingleLaunch.textContent = response.profile?.singleLaunchChoice ? styleLabel(styleMap.get(response.profile.singleLaunchChoice), response.profile.singleLaunchChoice) : "Not provided";
    elements.detailMissingProduct.textContent = response.profile?.missingProduct || "Not provided";

    elements.detailAnswers.innerHTML = answerEntries.length ? answerEntries.map(([styleId, answer]) => {
      const style = styleMap.get(styleId);
      const rank = rankByStyle.get(styleId);
      const note = String(answer.note || "").trim();
      const reasons = (Array.isArray(answer.reasons) ? answer.reasons : []).map(reasonLabel);
      return `<article class="response-answer-card"><div class="response-answer-image"><img src="${escapeHtml(thumbnailFor(style))}" alt="${escapeHtml(styleLabel(style, styleId))}" loading="lazy">${rank ? `<span>#${rank}</span>` : ""}</div><div class="response-answer-copy"><div class="response-answer-heading"><strong>${escapeHtml(styleLabel(style, styleId))}</strong><span class="answer-stars">${ratingStars(answer.rating)}</span></div><dl class="response-answer-values"><div><dt>Rating</dt><dd>${Number(answer.rating || 0)} / 5</dd></div><div><dt>Maximum price</dt><dd>${escapeHtml(priceLabel(answer.price))}</dd></div><div><dt>Purchase intent</dt><dd>${escapeHtml(intentLabel(answer.intent))}</dd></div><div><dt>Final rank</dt><dd>${rank ? `#${rank}` : "Not ranked"}</dd></div></dl>${reasons.length ? `<p class="response-note"><span>Reasons</span>${escapeHtml(reasons.join(" · "))}</p>` : ""}${note ? `<p class="response-note"><span>Note</span>${escapeHtml(note)}</p>` : ""}</div></article>`;
    }).join("") : detailEmpty("No product ratings were saved in this response.");

    const comparisonEntries = Object.entries(response.comparisons || {});
    elements.detailComparisons.innerHTML = comparisonEntries.length ? comparisonEntries.map(([comparisonId, optionId]) => {
      const comparison = comparisons.find((item) => item.id === comparisonId);
      const option = comparison?.options?.find((item) => item.id === optionId);
      return `<article class="response-comparison-card"><span>${escapeHtml(comparison?.questionAr || comparisonId)}</span><strong>${escapeHtml(option?.labelAr || optionId)}</strong></article>`;
    }).join("") : detailEmpty("No direct comparison choices were saved in this response.");

    if (typeof elements.responseDetailDialog.showModal === "function") elements.responseDetailDialog.showModal();
    else elements.responseDetailDialog.setAttribute("open", "");
  }

  function closeResponseDetail() {
    if (typeof elements.responseDetailDialog.close === "function") elements.responseDetailDialog.close();
    else elements.responseDetailDialog.removeAttribute("open");
  }

  function exportCsv() {
    const rows = [["response_id", "submitted_at", "nickname", "audience", "age", "city", "primary_use", "budget", "fit", "single_launch_choice", "missing_product", "style_id", "rating", "price", "intent", "reasons", "final_rank", "note"]];
    visibleResponses.forEach((response) => {
      const ranking = response.final_ranking || response.finalRanking || [];
      const rankByStyle = new Map((Array.isArray(ranking) ? ranking : []).map((styleId, index) => [styleId, index + 1]));
      Object.entries(response.answers || {}).forEach(([styleId, answer]) => rows.push([
        response.id, response.submitted_at || response.submittedAt, response.profile?.nickname || "", response.profile?.audience || "",
        response.profile?.age || "", response.profile?.city || "", response.profile?.primaryUse || "", response.profile?.budget || "", response.profile?.fit || "",
        response.profile?.singleLaunchChoice || "", response.profile?.missingProduct || "", styleId, answer.rating || "", answer.price || "", answer.intent || "",
        (answer.reasons || []).join("|"), rankByStyle.get(styleId) || "", answer.note || ""
      ]));
    });
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `lv8-survey-results-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function profileLabel(group, value) {
    if (!value) return "Not provided";
    const option = window.LV8_SURVEY_DATA.profileOptions[group]?.find((item) => item.id === value);
    return option?.label || value;
  }

  function reasonLabel(value) {
    return window.LV8_SURVEY_DATA.reasonOptions.find((item) => item.id === value)?.label || value || "Not provided";
  }

  function allPriceOptions() {
    return [...window.LV8_SURVEY_DATA.priceRanges, ...Object.values(window.LV8_SURVEY_DATA.priceGroups).flatMap((group) => group.options)];
  }

  function priceLabel(value) { return allPriceOptions().find((item) => item.id === value)?.label || (value ? value.replaceAll("-", "–") : "—"); }
  function intentLabel(value) { return window.LV8_SURVEY_DATA.purchaseIntents.find((item) => item.id === value)?.label || value || "No answer"; }
  function styleLabel(style, fallback, compact = false) { if (!style) return fallback; return compact ? style.code : `${style.code} — ${style.nameEn || style.nameAr}`; }
  function ratingStars(value) { const rating = Math.max(0, Math.min(5, Number(value || 0))); return `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`; }
  function detailEmpty(message) { return `<p class="detail-empty">${escapeHtml(message)}</p>`; }
  function topKey(object) { return Object.entries(object || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || ""; }
  function audienceLabel(value) { return value === "men" ? "Men" : value === "women" ? "Women" : "All products"; }
  function formatDate(value) { if (!value) return "—"; try { return new Intl.DateTimeFormat("en-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); } catch { return value; } }
  function csvCell(value) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }
  function emptyRow(columns, message = "No responses yet.") { return `<tr><td colspan="${columns}">${escapeHtml(message)}</td></tr>`; }
  function escapeHtml(value) { const div = document.createElement("div"); div.textContent = String(value ?? ""); return div.innerHTML; }

  document.addEventListener("DOMContentLoaded", initialize);
})();
