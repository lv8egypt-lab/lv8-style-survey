(function () {
  "use strict";

  const config = window.LV8_CONFIG || {};
  const localResponseKey = `lv8-responses:${config.surveyId || "default"}`;

  function publicApiKey() {
    return String(config.supabasePublishableKey || config.supabaseAnonKey || "").trim();
  }

  function cleanBaseUrl() {
    return String(config.supabaseUrl || "").replace(/\/+$/, "");
  }

  function isConfigured() {
    return Boolean(cleanBaseUrl() && publicApiKey());
  }

  function publicHeaders(extra = {}) {
    const key = publicApiKey();
    const headers = { apikey: key, "Content-Type": "application/json", ...extra };
    // Legacy anon keys are JWTs and may also be used as the bearer token.
    // New sb_publishable_* keys authenticate the application via apikey only.
    if (!key.startsWith("sb_publishable_")) headers.Authorization = `Bearer ${key}`;
    return headers;
  }

  function authHeaders(token, extra = {}) {
    return {
      apikey: publicApiKey(),
      Authorization: `Bearer ${token}`,
      ...extra
    };
  }

  async function request(url, options = {}) {
    const response = await fetch(url, options);
    const text = await response.text();
    let payload = null;
    if (text) {
      try { payload = JSON.parse(text); } catch { payload = text; }
    }
    if (!response.ok) {
      const message = payload?.message || payload?.msg || payload?.error_description || `Request failed (${response.status})`;
      throw new Error(message);
    }
    return payload;
  }

  function getLocalResponses() {
    try {
      return JSON.parse(localStorage.getItem(localResponseKey) || "[]");
    } catch {
      return [];
    }
  }

  function saveLocalResponse(record) {
    const rows = getLocalResponses();
    rows.push(record);
    localStorage.setItem(localResponseKey, JSON.stringify(rows));
  }

  function normalizeStyle(row) {
    return {
      id: row.id,
      code: row.code || row.id,
      audience: row.audience,
      category: row.category,
      nameAr: row.name_ar,
      nameEn: row.name_en,
      descriptionAr: row.description_ar || "",
      tags: row.tags || [],
      images: row.images || [],
      remote: true
    };
  }

  function normalizeComparison(row) {
    return {
      id: row.id,
      audience: row.audience,
      questionAr: row.question_ar,
      noteAr: row.note_ar || "",
      options: row.options || [],
      remote: true
    };
  }

  async function getPublishedStyles() {
    if (!isConfigured()) return [];
    const url = `${cleanBaseUrl()}/rest/v1/styles?survey_id=eq.${encodeURIComponent(config.surveyId)}&status=eq.published&select=*&order=sort_order.asc,created_at.asc`;
    const rows = await request(url, { headers: publicHeaders() });
    return (rows || []).map(normalizeStyle);
  }

  async function getPublishedComparisons() {
    if (!isConfigured()) return [];
    const url = `${cleanBaseUrl()}/rest/v1/comparisons?survey_id=eq.${encodeURIComponent(config.surveyId)}&status=eq.published&select=*&order=sort_order.asc,created_at.asc`;
    const rows = await request(url, { headers: publicHeaders() });
    return (rows || []).map(normalizeComparison);
  }

  async function submitResponse(record) {
    if (!isConfigured()) {
      saveLocalResponse(record);
      return { mode: "local" };
    }

    const body = {
      id: record.id,
      survey_id: config.surveyId,
      profile: record.profile,
      answers: record.answers,
      comparisons: record.comparisons,
      started_at: record.startedAt,
      submitted_at: record.submittedAt,
      user_agent: navigator.userAgent.slice(0, 500)
    };

    try {
      await request(`${cleanBaseUrl()}/rest/v1/survey_responses`, {
        method: "POST",
        headers: publicHeaders({ Prefer: "return=minimal" }),
        body: JSON.stringify(body)
      });
      return { mode: "cloud" };
    } catch (error) {
      saveLocalResponse({ ...record, syncError: error.message });
      return { mode: "local-fallback", error };
    }
  }

  async function signIn(email, password) {
    if (!isConfigured()) throw new Error("Add the Supabase project URL and publishable key in js/config.js first.");
    return request(`${cleanBaseUrl()}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: publicHeaders(),
      body: JSON.stringify({ email, password })
    });
  }

  async function signUp(email, password) {
    if (!isConfigured()) throw new Error("Add the Supabase project URL and publishable key in js/config.js first.");
    return request(`${cleanBaseUrl()}/auth/v1/signup`, {
      method: "POST",
      headers: publicHeaders(),
      body: JSON.stringify({ email, password })
    });
  }

  async function getResponses(token) {
    if (!isConfigured()) return getLocalResponses();
    const url = `${cleanBaseUrl()}/rest/v1/survey_responses?survey_id=eq.${encodeURIComponent(config.surveyId)}&select=*&order=submitted_at.desc`;
    return request(url, { headers: authHeaders(token) });
  }

  async function getAdminStyles(token) {
    const url = `${cleanBaseUrl()}/rest/v1/styles?survey_id=eq.${encodeURIComponent(config.surveyId)}&select=*&order=created_at.desc`;
    const rows = await request(url, { headers: authHeaders(token) });
    return (rows || []).map(normalizeStyle);
  }

  function safeFileName(name) {
    return name.toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-").replace(/-+/g, "-");
  }

  async function uploadStyleImages(token, styleId, files) {
    const urls = [];
    for (const [index, file] of Array.from(files).entries()) {
      const path = `${config.surveyId}/${styleId}/${Date.now()}-${index + 1}-${safeFileName(file.name)}`;
      const url = `${cleanBaseUrl()}/storage/v1/object/survey-styles/${path}`;
      await request(url, {
        method: "POST",
        headers: authHeaders(token, {
          "Content-Type": file.type || "application/octet-stream",
          "x-upsert": "false"
        }),
        body: file
      });
      urls.push(`${cleanBaseUrl()}/storage/v1/object/public/survey-styles/${path}`);
    }
    return urls;
  }

  async function createStyle(token, style) {
    const body = {
      id: style.id,
      survey_id: config.surveyId,
      code: style.code,
      audience: style.audience,
      category: style.category,
      name_ar: style.nameAr,
      name_en: style.nameEn,
      description_ar: style.descriptionAr,
      tags: style.tags,
      images: style.images,
      status: style.status || "published",
      sort_order: style.sortOrder || 100
    };
    await request(`${cleanBaseUrl()}/rest/v1/styles`, {
      method: "POST",
      headers: authHeaders(token, { "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify(body)
    });
  }

  async function createComparison(token, comparison) {
    const body = {
      id: comparison.id,
      survey_id: config.surveyId,
      audience: comparison.audience,
      question_ar: comparison.questionAr,
      note_ar: comparison.noteAr,
      options: comparison.options,
      status: comparison.status || "published",
      sort_order: comparison.sortOrder || 100
    };
    await request(`${cleanBaseUrl()}/rest/v1/comparisons`, {
      method: "POST",
      headers: authHeaders(token, { "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify(body)
    });
  }

  window.LV8Storage = Object.freeze({
    isConfigured,
    getPublishedStyles,
    getPublishedComparisons,
    submitResponse,
    getLocalResponses,
    signIn,
    signUp,
    getResponses,
    getAdminStyles,
    uploadStyleImages,
    createStyle,
    createComparison
  });
})();
