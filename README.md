# LV8 Style Pick

Static Arabic product-research website built with HTML, CSS and vanilla JavaScript for GitHub Pages.

## What is ready

- 13 seeded LV8 style directions using all 70 reference images currently in the project.
- Five-star rating for every style.
- Expected-price vote: EGP 1,000–1,500, 1,500–2,000 or 2,000–3,000.
- Purchase-intent and optional comments.
- Direct A/B comparisons, including full zip versus pullover for the modest set.
- Draft saving on the current device.
- Private results dashboard with ranking, price and comparison summaries.
- CSV export.
- Admin page for uploading additional styles and creating comparisons.
- Mobile-first responsive UI following the LV8 visual identity.

## Important: GitHub Pages does not store responses

The survey interface works without configuration, but unconfigured responses are saved only in the respondent's browser. Before sharing the link, connect the included free Supabase backend so all responses arrive in one database.

## Connect Supabase

1. Create a Supabase project.
2. Open **SQL Editor**, paste the complete contents of `supabase/schema.sql`, and run it.
3. Open **Project Settings > API Keys** and copy the Project URL and public `sb_publishable_...` key.
4. Put both values in `js/config.js`. Never use a secret key or legacy `service_role` key in browser code.
5. Publish the site, open `admin.html`, and create the first account.
6. In **Authentication > Users**, copy that account's UUID.
7. Run the final commented `insert into public.survey_admins...` statement from `schema.sql` using that UUID and email.
8. Sign in through `admin.html`. You can now upload styles and build comparisons.
9. Open `results.html` with the same account to see aggregated responses.

The Row Level Security policies allow anyone to submit a response but only registered admins to read responses or change styles. Uploaded images are public because respondents must be able to view them.

## Publish on GitHub Pages

### Option A — this whole LV8 workspace is the repository

1. Push the workspace to a private or public GitHub repository.
2. In **Settings > Pages**, choose **Deploy from a branch**.
3. Select `main` and `/docs`.
4. Save. GitHub will show the public URL when deployment finishes.

### Option B — a separate survey repository

Copy the contents of this `docs` directory into the root of a new repository, then choose `main` and `/(root)` under **Settings > Pages**.

Do not send the link to respondents until `index.html` shows the green **Response collection live** badge. An amber **Local preview mode** badge means responses are not being aggregated yet.

## Pages

- `index.html` — respondent survey.
- `admin.html` — private style uploader and comparison builder.
- `results.html` — private aggregate results and CSV export.

## Add or edit seeded styles

The current 13 styles are in `js/data.js`. Existing source images were copied into `assets/styles`; the original files outside this folder were not changed.

The names in the survey are working research names, not approved retail product names.
