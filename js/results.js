(function () {
  "use strict";

  const elements = {};
  let accessToken = "";
  let responses = [];
  let styles = [...window.LV8_SURVEY_DATA.styles];
  let comparisons = [...window.LV8_SURVEY_DATA.comparisons];

  function cache() {
    [
      "resultsAuth", "authExplanation", "resultsEmail", "resultsPassword", "resultsLoginButton",
      "resultsAuthStatus", "resultsDashboard", "metricResponses", "metricCoverage", "metricWinner",
      "metricPrice", "rankingBody", "comparisonBody", "responseBody", "exportButton"
    ].forEach((id) => { elements[id] = document.getElementById(id); });
  }

  async function initialize() {
    cache();
    elements.resultsLoginButton.addEventListener("click", login);
    elements.exportButton.addEventListener("click", exportCsv);

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

  function setAuthStatus(message, success) {
    elements.resultsAuthStatus.hidden = false;
    elements.resultsAuthStatus.className = `status-box${success ? " success" : ""}`;
    elements.resultsAuthStatus.textContent = message;
  }

  function buildStyleStats() {
    const stats = new Map(styles.map((style) => [style.id, {
      id: style.id,
      code: style.code,
      name: style.nameAr,
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
    elements.responseBody.innerHTML = responses.slice(0, 30).map((row) => {
      const answers = Object.values(row.answers || {});
      const average = answers.length ? answers.reduce((sum, answer) => sum + Number(answer.rating || 0), 0) / answers.length : 0;
      return `<tr><td>${escapeHtml(row.profile?.nickname || "Anonymous")}</td><td>${audienceLabel(row.profile?.audience)}</td><td>${answers.length}</td><td>${average.toFixed(1)} / 5</td><td>${formatDate(row.submitted_at || row.submittedAt)}</td></tr>`;
    }).join("") || emptyRow(5);
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
    const rows = [["response_id", "submitted_at", "nickname", "audience", "style_id", "rating", "price", "intent", "note"]];
    responses.forEach((response) => Object.entries(response.answers || {}).forEach(([styleId, answer]) => {
      rows.push([response.id, response.submitted_at || response.submittedAt, response.profile?.nickname || "", response.profile?.audience || "", styleId, answer.rating || "", answer.price || "", answer.intent || "", answer.note || ""]);
    }));
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
    try { return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); } catch { return value; }
  }

  function csvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function emptyRow(columns) {
    return `<tr><td colspan="${columns}">No responses yet.</td></tr>`;
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
