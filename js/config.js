/*
 * LV8 Survey configuration
 *
 * The survey works in demo mode while the two Supabase values are empty.
 * Add the public Project URL and publishable key to collect responses from every device.
 * Never put a Supabase secret key or legacy service-role key in this file.
 */
window.LV8_CONFIG = Object.freeze({
  surveyId: "lv8-launch-style-test-v1",
  supabaseUrl: "https://dihojkxihgymurcnkyvr.supabase.co",
  supabasePublishableKey: "",
  // Legacy fallback only. Prefer supabasePublishableKey for new projects.
  supabaseAnonKey: "",
  adminEmails: []
});
