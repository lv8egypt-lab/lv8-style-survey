# LV8 Style Pick

English product-research survey built with HTML, CSS, and vanilla JavaScript for GitHub Pages.

## Live website

- Survey: https://lv8egypt-lab.github.io/lv8-style-survey/
- Private results: https://lv8egypt-lab.github.io/lv8-style-survey/results.html
- Style administration: https://lv8egypt-lab.github.io/lv8-style-survey/admin.html

## Current status

- 23 seeded LV8 style directions using 130 current collection images supplied for the survey.
- Five-star design ratings, expected-price voting, purchase intent, optional comments, direct product comparisons, and a personalized final Top Five ranking.
- English, mobile-first survey experience.
- Shared response collection connected to Supabase.
- Row Level Security enabled on every exposed survey table.
- Public respondents can submit answers but cannot read collected responses.
- Private results dashboard with style rankings, price summaries, comparison results, weighted Top Five results, and CSV export.
- Admin workspace for adding styles, comparisons, and images.
- GitHub Pages deployment from the `main` branch and repository root.

## One-time admin activation

The public survey is ready to share. The results and style-management pages require one administrator account:

1. Open `admin.html` and create the first account with the owner's preferred email and password.
2. In Supabase, open **Authentication > Users** and copy that account's UUID.
3. Run the final commented `insert into public.survey_admins...` statement in `supabase/schema.sql` using the UUID and email.
4. Sign in through `admin.html` or `results.html`.

Never put a Supabase secret key or legacy `service_role` key in browser code. The site uses only the public `sb_publishable_...` key; authorization is enforced by Postgres grants and Row Level Security.

## Main files

- `index.html` — respondent survey.
- `admin.html` — private style uploader and comparison builder.
- `results.html` — private aggregate results and CSV export.
- `js/data.js` — 23 seeded research styles and seven direct-comparison questions.
- `scripts/sync-collections.ps1` — republishes the current project collection folders into normalized website galleries without deleting existing assets.
- `supabase/schema.sql` — reproducible tables, indexes, grants, policies, and storage setup.

The survey names are working research names, not approved retail product names. Original reference files outside this repository were not changed.
