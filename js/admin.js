(function () {
  "use strict";

  const elements = {};
  let accessToken = "";
  let remoteStyles = [];

  function cache() {
    [
      "adminAuth", "adminAuthExplanation", "adminEmail", "adminPassword", "signUpButton", "adminLoginButton",
      "adminAuthStatus", "adminWorkspace", "styleUploadForm", "styleUploadStatus", "comparisonForm",
      "comparisonStatus", "styleASelect", "styleBSelect", "adminStylesBody"
    ].forEach((id) => { elements[id] = document.getElementById(id); });
  }

  function initialize() {
    cache();
    elements.adminLoginButton.addEventListener("click", login);
    elements.signUpButton.addEventListener("click", signUp);
    elements.styleUploadForm.addEventListener("submit", uploadStyle);
    elements.comparisonForm.addEventListener("submit", createComparison);
    if (!window.LV8Storage.isConfigured()) {
      elements.adminAuthExplanation.textContent = "Add the Supabase project URL and publishable key in js/config.js, then run schema.sql. The 13 current styles are already included without an upload.";
      setStatus(elements.adminAuthStatus, "The upload panel needs cloud storage because GitHub Pages cannot store images or responses by itself.", false);
      elements.adminLoginButton.disabled = true;
      elements.signUpButton.disabled = true;
    }
  }

  async function login() {
    setStatus(elements.adminAuthStatus, "Signing in…", false);
    try {
      const session = await window.LV8Storage.signIn(elements.adminEmail.value.trim(), elements.adminPassword.value);
      accessToken = session.access_token;
      await openWorkspace();
    } catch (error) {
      setStatus(elements.adminAuthStatus, error.message || "Sign-in failed.", false);
    }
  }

  async function signUp() {
    setStatus(elements.adminAuthStatus, "Creating account…", false);
    try {
      const result = await window.LV8Storage.signUp(elements.adminEmail.value.trim(), elements.adminPassword.value);
      if (result.access_token) {
        accessToken = result.access_token;
        setStatus(elements.adminAuthStatus, "Account created. Add its user ID to survey_admins as described in the README.", true);
      } else {
        setStatus(elements.adminAuthStatus, "Check your email to confirm the account, then add its user ID to survey_admins and sign in.", true);
      }
    } catch (error) {
      setStatus(elements.adminAuthStatus, error.message || "Account creation failed.", false);
    }
  }

  async function openWorkspace() {
    remoteStyles = await window.LV8Storage.getAdminStyles(accessToken);
    elements.adminAuth.hidden = true;
    elements.adminWorkspace.hidden = false;
    renderStyleOptions();
    renderRemoteStyles();
  }

  function renderStyleOptions() {
    const allStyles = mergeById(window.LV8_SURVEY_DATA.styles, remoteStyles);
    const options = allStyles.map((style) => `<option value="${escapeAttribute(style.id)}">${escapeHtml(style.code)} — ${escapeHtml(style.nameAr)}</option>`).join("");
    elements.styleASelect.innerHTML = `<option value="">Choose Style A</option>${options}`;
    elements.styleBSelect.innerHTML = `<option value="">Choose Style B</option>${options}`;
  }

  function renderRemoteStyles() {
    elements.adminStylesBody.innerHTML = remoteStyles.map((style) => `<tr><td><strong>${escapeHtml(style.code)}</strong></td><td>${escapeHtml(style.nameAr)}</td><td>${escapeHtml(style.audience)}</td><td>${style.images.length}</td></tr>`).join("") || '<tr><td colspan="4">No cloud styles yet. The 13 built-in styles remain available in the site files.</td></tr>';
  }

  async function uploadStyle(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const code = String(formData.get("code") || "").trim().toUpperCase();
    const nameEn = String(formData.get("nameEn") || "").trim();
    const styleId = `${String(formData.get("audience"))}-${slugify(nameEn)}-${Date.now().toString().slice(-6)}`;
    const files = formData.getAll("images").filter((file) => file instanceof File && file.size);
    if (!files.length) return setStatus(elements.styleUploadStatus, "Choose at least one image.", false);
    if (files.some((file) => file.size > 8 * 1024 * 1024)) return setStatus(elements.styleUploadStatus, "Every image must be smaller than 8 MB.", false);

    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    setStatus(elements.styleUploadStatus, "Uploading images and publishing the style…", false);
    try {
      const imageUrls = await window.LV8Storage.uploadStyleImages(accessToken, styleId, files);
      await window.LV8Storage.createStyle(accessToken, {
        id: styleId,
        code,
        audience: formData.get("audience"),
        category: String(formData.get("category") || "").trim(),
        nameAr: String(formData.get("nameAr") || "").trim(),
        nameEn,
        descriptionAr: String(formData.get("descriptionAr") || "").trim(),
        tags: String(formData.get("tags") || "").split(/[،,]/).map((item) => item.trim()).filter(Boolean),
        images: imageUrls
      });
      setStatus(elements.styleUploadStatus, "The style was uploaded and published successfully.", true);
      form.reset();
      remoteStyles = await window.LV8Storage.getAdminStyles(accessToken);
      renderStyleOptions();
      renderRemoteStyles();
    } catch (error) {
      setStatus(elements.styleUploadStatus, error.message || "The style could not be uploaded.", false);
    } finally {
      submit.disabled = false;
    }
  }

  async function createComparison(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const styleA = String(formData.get("styleA") || "");
    const styleB = String(formData.get("styleB") || "");
    if (styleA === styleB) return setStatus(elements.comparisonStatus, "Choose a different style for each side.", false);
    const question = String(formData.get("questionAr") || "").trim();
    const id = `compare-${slugify(question)}-${Date.now().toString().slice(-6)}`;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    setStatus(elements.comparisonStatus, "Publishing comparison…", false);
    try {
      await window.LV8Storage.createComparison(accessToken, {
        id,
        questionAr: question,
        noteAr: String(formData.get("noteAr") || "").trim(),
        audience: formData.get("audience"),
        options: [
          { id: `${id}-a`, styleId: styleA, labelAr: String(formData.get("labelA") || "").trim() },
          { id: `${id}-b`, styleId: styleB, labelAr: String(formData.get("labelB") || "").trim() }
        ]
      });
      setStatus(elements.comparisonStatus, "The comparison is now published in the survey.", true);
      form.reset();
      renderStyleOptions();
    } catch (error) {
      setStatus(elements.comparisonStatus, error.message || "The comparison could not be published.", false);
    } finally {
      submit.disabled = false;
    }
  }

  function mergeById(local, remote) {
    const map = new Map(local.map((item) => [item.id, item]));
    remote.forEach((item) => map.set(item.id, item));
    return [...map.values()];
  }

  function slugify(value) {
    return String(value || "style").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "style";
  }

  function setStatus(element, message, success) {
    element.hidden = false;
    element.className = `status-box${success ? " success" : ""}`;
    element.textContent = message;
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
  }

  function escapeAttribute(value) { return escapeHtml(value).replace(/"/g, "&quot;"); }

  document.addEventListener("DOMContentLoaded", initialize);
})();
