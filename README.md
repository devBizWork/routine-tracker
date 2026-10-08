# Routine Tracker

An iPhone-first Progressive Web App for time-blocking a day: block out the day, follow the
blocks, log what happened, and review two adherence scores. Everything stays on the phone
(no server, no account) and the app works offline once installed.

Project context and rules are in [CLAUDE.md](CLAUDE.md), the full feature list is in
[docs/feature-spec.md](docs/feature-spec.md), and progress is tracked in
[PROGRESS.md](PROGRESS.md).

## Run it on your computer

You need Node.js (22.22 or newer) and npm.

```bash
npm install        # once, to download the libraries
npm run dev        # starts the app at http://localhost:5173/routine-tracker/
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm run check` | Runs everything below, in order: type check, lint, tests, production build |
| `npm run typecheck` | Checks the TypeScript code for mistakes |
| `npm run lint` | Checks code style and common bugs |
| `npm test` | Runs the unit tests |
| `npm run build` | Builds the real app into `dist/` |
| `npm run preview` | Serves the built app at http://localhost:4173/routine-tracker/ (this is the one that includes the offline service worker) |
| `npm run icons` | Redraws the placeholder app icons in `public/` |

## Deploy

The live site is hosted free on GitHub Pages and rebuilds on every push to `main`. The
workflow is in `.github/workflows/deploy.yml`. The address will be
`https://<your-github-username>.github.io/routine-tracker/`.

First time only:

1. **Create the repository.** On github.com click **+ > New repository**. Name it
   `routine-tracker`, choose **Public**, and do not add a README, .gitignore or license
   (this project already has them). Click **Create repository**.
2. **Push the code.** In a terminal in this folder (replace `<your-github-username>`):

   ```bash
   git remote add origin https://github.com/<your-github-username>/routine-tracker.git
   git push -u origin main
   ```

   Or, with the GitHub CLI, do steps 1 and 2 in one command:

   ```bash
   gh repo create routine-tracker --public --source=. --remote=origin --push
   ```

3. **Turn on Pages.** In the repository go to **Settings > Pages**. Under **Build and
   deployment**, set **Source** to **GitHub Actions**.
4. **Watch the deploy.** Open the **Actions** tab. The run called "Deploy to GitHub Pages"
   shows a yellow dot while it works and a green tick when it is done (about a minute).
   If it ran before you did step 3, open it and click **Re-run all jobs**.
5. **Find the live link.** It is shown at the end of the finished run (under the `deploy`
   job), and in **Settings > Pages** at the top.

After that, every `git push` to `main` updates the live site by itself.

### Making a change (pull requests)

Changes go to `main` through a pull request, not by pushing straight to `main`:

1. Work on a branch (for example `step-3`) and push it. The **Checks** workflow runs on the
   pull request and shows a green tick or a red cross next to it.
2. Open the pull request on GitHub (or with `gh pr create`), read the description, and click
   **Merge pull request** when the checks are green.
3. Merging starts the **Deploy to GitHub Pages** workflow, which updates the live site.
4. **Only after the merge is done**, update your computer and tag the step. The tag goes on
   the merged `main`, so do not run these before you have clicked Merge:

   ```bash
   git checkout main
   git pull
   git tag step-3
   git push origin tag step-3
   ```

   The word `tag` in the last line matters: the branch and the tag have the same name
   (`step-3`), and without it Git says "matches more than one" and refuses.

### If you name the repository something else

The folder name in the web address comes from the repository name. If you use a different
name, change `REPO_NAME` in `config/app.config.ts` (one line). The Vite base, the manifest
(`start_url`, `scope`) and the service worker all follow it. Then update the links above.

### Open it on your iPhone

1. Open the live link in **Safari** (it must be Safari, not Chrome).
2. Tap the **Share** button (square with an arrow), scroll down, tap **Add to Home Screen**,
   then **Add**.
3. Open **Routine** from the Home Screen. It runs full screen, like a normal app.
