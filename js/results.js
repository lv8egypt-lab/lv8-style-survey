(function () {
  "use strict";

  const elements = {};
  let accessToken = "";
  let responses = [];
  let styles = [...window.LV8_SURVEY_DATA.styles];
  const archivedStyles = [...(window.LV8_SURVEY_DATA.archivedStyles || [])];
  let comparisons = [...window.LV8_SURVEY_DATA.comparisons];

  function cache() {
    [
      "resultsAuth", "authExplanation", "resultsEmail", "resultsPassword", "resultsLoginButton",
      "resultsAuthStatus", "resultsDashboard", "metricResponses", "metricCoverage", "metricWinner",
      "metricPrice", "rankingBody", "comparisonBody", "topFiveBody", "responseBody", "exportButton",
      "responseDetailDialog", "responseDetailClose", "responseDetailTitle", "responseDetailMeta",
      "detailAudience", "detailStyleCount", "detailAverage", "detailTopChoice", "detailTopFive",
      "detailAnswers", "detailComparisons"
    ].forEach((id) => { elements[id] = document.getElementById(id); });
  }

  async function initialize() {
    cache();
    elements.resultsLoginButton.addEventListener("click", login);
    elements.exportButton.addEventListener("click", exportCsv);
    elements.responseBody.addEventListener("click", handleResponseClick);
    elements.responseDetailClose.addEventListener("click", closeResponseDetail);
    elements.responseDetailDialog.addEventListener("click", (event) => {
      if (event.target === elements.responseDetailDialog) closeResponseDetail();
    });

    if (!window.LV8Storage.isConfigured()) {
      elements.authExplanation.textContent = "The site is in preview mode. Only responses saved on this device will be shown.";
      elements.resultsEmail.hidden = true;
      elements.resultsPassword.hidden = true;
      elements.resultsLoginButton.textContent = "View device data";
    }
  }

  async function login() {
    setAuthStatus("Loading results…", false);
    elements.resultsLoginButton.disabled = true;
    try {
      if (window.LV8Storage.isConfigured()) {
        const session = await window.LV8Storage.signIn(elements.resultsEmail.value.trim(), elements.resultsPassword.value);
        accessToken = session.access_token;
        const [remoteStyles, remoteComparisons] = await Promise.all([
          window.LV8Storage.getPublishedStyles(),
          window.LV8Storage.getPublishedComparisons()
        ]);
        styles = mergeById(styles, remoteStyles);
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
    remote.forEach((item) => map.set(item.id, item));
    return [...map.values()];
  }

  function resultCatalog() {
    return [...styles, ...archivedStyles];
  }

  function setAuthStatus(message, success) {
    elements.resultsAuthStatus.hidden = false;
    elements.resultsAuthStatus.className = `status-box${success ? " success" : ""}`;
    elements.resultsAuthStatus.textContent = message;
  }

  function buildStyleStats() {
    const stats = new Map(resultCatalog().map((style) => [style.id, {
      id: style.id,
      code: style.code,
      name: `${style.nameAr}${style.archived ? " (archived)" : ""}`,
      ratingTotal: 0,
      ratingCount: 0,
      intentYes: 0,
      intentMaybe: 0,
      priceCounts: { "1000-1500": 0, "1500-2000": 0, "2000-3000": 0 }
    }]));

    responses.forEach((response) => {
      Object.entries(response.answers || {}).forEach(([styleId, answer]) => {
        if (!stats.has(styleId)) stats.set(styleId, { id: styleId, code: styleId, name: styleId, ratingTotal: 0, ratingCount: 0, intentYes: 0, intentMaybe: 0, priceCounts: {} });
        const item = stats.get(styleId);
        if (answer.rating) {
          item.ratingTotal += Number(answer.rating);
          item.ratingCount += 1;
        }
        if (answer.intent === "yes") item.intentYes += 1;
        if (answer.intent === "maybe") item.intentMaybe += 1;
        if (answer.price) item.priceCounts[answer.price] = (item.priceCounts[answer.price] || 0) + 1;
      });
    });

    return [...stats.values()].map((item) => {
      item.average = item.ratingCount ? item.ratingTotal / item.ratingCount : 0;
      item.buyRate = item.ratingCount ? ((item.intentYes + item.intentMaybe * 0.5) / item.ratingCount) * 100 : 0;
      item.topPrice = topKey(item.priceCounts);
      item.score = item.average * 0.7 + (item.buyRate / 20) * 0.3;
      return item;
    }).filter((item) => item.ratingCount).sort((a, b) => b.score - a.score);
  }

  function renderDashboard() {
    const stats = buildStyleStats();
    const answerCounts = responses.map((row) => Object.keys(row.answers || {}).length);
    const totalAnswers = answerCounts.reduce((sum, value) => sum + value, 0);
    const allPrices = {};
    responses.forEach((row) => Object.values(row.answers || {}).forEach((answer) => {
      if (answer.price) allPrices[answer.price] = (allPrices[answer.price] || 0) + 1;
    }));

    elements.metricResponses.textContent = responses.length;
    elements.metricCoverage.textContent = responses.length ? (totalAnswers / responses.length).toFixed(1) : "0";
    elements.metricWinner.textContent = stats[0]?.code || "—";
    elements.metricPrice.textContent = shortPrice(topKey(allPrices));

    elements.rankingBody.innerHTML = stats.map((item, index) => `
      <tr>
        <td><span class="rank-number">${index + 1}</span></td>
        <td><strong>${escapeHtml(item.code)} — ${escapeHtml(item.name)}</strong></td>
        <td>${item.average.toFixed(2)} / 5</td>
        <td>${item.ratingCount}</td>
        <td>${Math.round(item.buyRate)}%</td>
        <td>${shortPrice(item.topPrice)}</td>
        <td><div class="mini-bar"><span style="width:${Math.min(100, item.score * 20)}%"></span></div></td>
      </tr>`).join("") || emptyRow(7);

    renderComparisons();
    renderTopFiveResults();
    elements.responseBody.innerHTML = responses.map((row, index) => {
      const answers = Object.values(row.answers || {});
      const average = answers.length ? answers.reduce((sum, answer) => sum + Number(answer.rating || 0), 0) / answers.length : 0;
      const nickname = row.profile?.nickname || "Anonymous";
      return `<tr><td><button class="respondent-link" type="button" data-response-index="${index}" aria-label="View complete survey from ${escapeHtml(nickname)}">${escapeHtml(nickname)}</button></td><td>${audienceLabel(row.profile?.audience)}</td><td>${answers.length}</td><td>${average.toFixed(1)} / 5</td><td>${formatDate(row.submitted_at || row.submittedAt)}</td></tr>`;
    }).join("") || emptyRow(5);
  }

  function handleResponseClick(event) {
    const button = event.target.closest("[data-response-index]");
    if (!button) return;
    const response = responses[Number(button.dataset.responseIndex)];
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

    elements.detailTopFive.innerHTML = ranking.length ? ranking.map((styleId, index) => {
      const style = styleMap.get(styleId);
      const image = style?.images?.[0] || "assets/brand/icon.png";
      return `<article class="detail-top-five-card">
        <span class="detail-rank">#${index + 1}</span>
        <img src="${escapeHtml(image)}" alt="${escapeHtml(styleLabel(style, styleId))}" loading="lazy">
        <strong>${escapeHtml(styleLabel(style, styleId))}</strong>
      </article>`;
    }).join("") : detailEmpty("This response was submitted before final Top Five ranking was added.");

    elements.detailAnswers.innerHTML = answerEntries.length ? answerEntries.map(([styleId, answer]) => {
      const style = styleMap.get(styleId);
      const image = style?.images?.[0] || "assets/brand/icon.png";
      const rank = rankByStyle.get(styleId);
      const note = String(answer.note || "").trim();
      return `<article class="response-answer-card">
        <div class="response-answer-image">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(styleLabel(style, styleId))}" loading="lazy">
          ${rank ? `<span>#${rank}</span>` : ""}
        </div>
        <div class="response-answer-copy">
          <div class="response-answer-heading">
            <strong>${escapeHtml(styleLabel(style, styleId))}</strong>
            <span class="answer-stars" aria-label="${Number(answer.rating || 0)} out of 5 stars">${ratingStars(answer.rating)}</span>
          </div>
          <dl class="response-answer-values">
            <div><dt>Rating</dt><dd>${Number(answer.rating || 0)} / 5</dd></div>
            <div><dt>Expected price</dt><dd>${escapeHtml(priceLabel(answer.price))}</dd></div>
            <div><dt>Purchase intent</dt><dd>${escapeHtml(intentLabel(answer.intent))}</dd></div>
            <div><dt>Final rank</dt><dd>${rank ? `#${rank}` : "Not ranked"}</dd></div>
          </dl>
          ${note ? `<p class="response-note"><span>Note</span>${escapeHtml(note)}</p>` : ""}
        </div>
      </article>`;
    }).join("") : detailEmpty("No product ratings were saved in this response.");

    const comparisonEntries = Object.entries(response.comparisons || {});
    elements.detailComparisons.innerHTML = comparisonEntries.length ? comparisonEntries.map(([comparisonId, optionId]) => {
      const comparison = comparisons.find((item) => item.id === comparisonId);
      const option = comparison?.options?.find((item) => item.id === optionId);
      return `<article class="response-comparison-card">
        <span>${escapeHtml(comparison?.questionAr || comparisonId)}</span>
        <strong>${escapeHtml(option?.labelAr || optionId)}</strong>
      </article>`;
    }).join("") : detailEmpty("No direct comparison choices were saved in this response.");

    if (typeof elements.responseDetailDialog.showModal === "function") elements.responseDetailDialog.showModal();
    else elements.responseDetailDialog.setAttribute("open", "");
  }

  function closeResponseDetail() {
    if (typeof elements.responseDetailDialog.close === "function") elements.responseDetailDialog.close();
    else elements.responseDetailDialog.removeAttribute("open");
  }

  function styleLabel(style, fallback, compact = false) {
    if (!style) return fallback;
    return compact ? style.code : `${style.code} — ${style.nameEn || style.nameAr}`;
  }

  function priceLabel(value) {
    const match = window.LV8_SURVEY_DATA.priceRanges.find((item) => item.id === value);
    return match?.label || shortPrice(value);
  }

  function intentLabel(value) {
    const match = window.LV8_SURVEY_DATA.purchaseIntents.find((item) => item.id === value);
    return match?.label || value || "No answer";
  }

  function ratingStars(value) {
    const rating = Math.max(0, Math.min(5, Number(value || 0)));
    return `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
  }

  function detailEmpty(message) {
    return `<p class="detail-empty">${escapeHtml(message)}</p>`;
  }

  function renderTopFiveResults() {
    const styleMap = new Map(resultCatalog().map((style) => [style.id, style]));
    const pointsByPlace = [5, 4, 3, 2, 1];
    const stats = new Map();

    responses.forEach((response) => {
      const ranking = response.final_ranking || response.finalRanking || [];
      if (!Array.isArray(ranking)) return;
      ranking.slice(0, 5).forEach((styleId, index) => {
        const item = stats.get(styleId) || { styleId, points: 0, votes: 0, firsts: 0, podiums: 0 };
        item.points += pointsByPlace[index];
        item.votes += 1;
        if (index === 0) item.firsts += 1;
        if (index < 3) item.podiums += 1;
        stats.set(styleId, item);
      });
    });

    const ranked = [...stats.values()].sort((a, b) => b.points - a.points || b.firsts - a.firsts || b.podiums - a.podiums);
    elements.topFiveBody.innerHTML = ranked.map((item, index) => {
      const style = styleMap.get(item.styleId);
      const label = style ? `${style.code} — ${style.nameAr}` : item.styleId;
      return `<tr>
        <td><span class="rank-number">${index + 1}</span></td>
        <td><strong>${escapeHtml(label)}</strong></td>
        <td>${item.points}</td>
        <td>${item.votes}</td>
        <td>${item.firsts}</td>
        <td>${item.podiums}</td>
      </tr>`;
    }).join("") || emptyRow(6, "No final Top Five rankings yet.");
  }

  function renderComparisons() {
    const rows = [];
    comparisons.forEach((comparison) => {
      const counts = Object.fromEntries(comparison.options.map((option) => [option.id, 0]));
      responses.forEach((response) => {
        const choice = response.comparisons?.[comparison.id];
        if (choice) counts[choice] = (counts[choice] || 0) + 1;
      });
      const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
      if (!total) return;
      const winnerId = topKey(counts);
      const winner = comparison.options.find((option) => option.id === winnerId);
      rows.push(`<tr><td>${escapeHtml(comparison.questionAr)}</td><td><strong>${escapeHtml(winner?.labelAr || winnerId)}</strong></td><td>${Math.round((counts[winnerId] / total) * 100)}%</td><td>${total}</td></tr>`);
    });
    elements.comparisonBody.innerHTML = rows.join("") || emptyRow(4);
  }

  function exportCsv() {
    const rows = [["response_id", "submitted_at", "nickname", "audience", "style_id", "rating", "price", "intent", "final_rank", "note"]];
    responses.forEach((response) => {
      const ranking = response.final_ranking || response.finalRanking || [];
      const rankByStyle = new Map((Array.isArray(ranking) ? ranking : []).map((styleId, index) => [styleId, index + 1]));
      Object.entries(response.answers || {}).forEach(([styleId, answer]) => {
        rows.push([response.id, response.submitted_at || response.submittedAt, response.profile?.nickname || "", response.profile?.audience || "", styleId, answer.rating || "", answer.price || "", answer.intent || "", rankByStyle.get(styleId) || "", answer.note || ""]);
      });
    });
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `lv8-survey-results-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function topKey(object) {
    const entries = Object.entries(object || {});
    if (!entries.length) return "";
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }

  function shortPrice(value) {
    return value ? value.replace("-", "–") : "—";
  }

  function audienceLabel(value) {
    return value === "men" ? "Men" : value === "women" ? "Women" : "All";
  }

  function formatDate(value) {
    if (!value) return "—";
    try { return new Intl.DateTimeFormat("en-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); } catch { return value; }
  }

  function csvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function emptyRow(columns, message = "No responses yet.") {
    return `<tr><td colspan="${columns}">${escapeHtml(message)}</td></tr>`;
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
