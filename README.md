# Astroflare

An opinionated starter for Astro on Cloudflare Workers, based on the setup I use for [Innerhelm](https://innerhelm.com), [Evelyn Escobar Art](https://evelynescobar.art), [my personal site](https://tylermercer.net), and other projects.

- Deploys to Cloudflare's global edge network using Workers
- Uses GitHub actions for its deploy pipeline, powering daily builds and PR previews
- Uses the [@astrojs/cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) adapter and Astro's new intelligent `static` build mode. This allows you to opt-in to SSR on a per-route basis by adding `export const prerender = false` to a route.
- Provides other niceties to speed up development, outlined [below](#features).

## Getting started

1.  **Use this repo as a template** by clicking the "Use this template" button at the top of the GitHub page.
2.  **Clone your new repository** to your local machine:
    ```bash
    git clone https://github.com/your-username/your-new-repo.git
    cd your-new-repo
    ```
3.  **Run the initialization script** and follow the instructions:
    ```bash
    bun ./scripts/init.ts
    ```

The script will handle installing dependencies (via `pnpm`), customizing your project name and theme, and setting up the necessary GitHub Secrets for automatic deployment to Cloudflare.

## Google Drive Setup & Environment Secrets

This project includes a custom Astro Content Layer loader (`googleDriveLoader`) that pulls all Google Docs from a specified Google Drive folder and its subfolders at build time.

### 1. Setting up Google Drive Access

1. **Create a Google Cloud Project**:
   - Open the [Google Cloud Console](https://console.cloud.google.com/).
   - Create a new project or select an existing one.
2. **Enable the Google Drive API**:
   - Go to **APIs & Services > Library**.
   - Search for **Google Drive API** and click **Enable**.
3. **Create a Service Account**:
   - Go to **APIs & Services > Credentials**.
   - Click **Create Credentials** > **Service Account**.
   - Fill in the service account details and click **Create and Continue**.
   - Once created, click on the service account, navigate to the **Keys** tab, click **Add Key** > **Create new key**, select **JSON**, and download the key file.
4. **Share Google Drive Folder**:
   - Go to Google Drive and locate the folder containing your recipes or documents.
   - Click **Share**.
   - Copy the `client_email` address from the downloaded JSON key file and share the folder with this email as a **Viewer**.
   - Ensure subfolders are also accessible (folders shared with parent access will automatically share subfolders).
5. **Obtain Folder ID**:
   - Open the folder in Google Drive.
   - Copy the folder ID from the URL (`https://drive.google.com/drive/folders/FOLDER_ID_HERE`).

### 2. Environment Variables & Deployment Secrets

The build step requires three secrets/environment variables:

- `GOOGLE_DRIVE_FOLDER_ID`: The ID of your target Google Drive folder.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: The `client_email` field from your Service Account JSON key.
- `GOOGLE_PRIVATE_KEY`: The `private_key` field from your Service Account JSON key (including newlines).

#### Local Setup (`.env`)
Create a `.env` file in the root directory:
```env
GOOGLE_DRIVE_FOLDER_ID="your_folder_id_here"
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

#### GitHub Actions Deployment
Add the three values to your GitHub repository under **Settings > Secrets and variables > Actions**:
- `GOOGLE_DRIVE_FOLDER_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

*Note: The `Build site` and `Deploy to Cloudflare` steps in `.github/workflows/main.yml` are temporarily disabled (`if: false`). Once you have added the required secrets to GitHub Repository Secrets, edit `.github/workflows/main.yml` to remove the `if: false` condition on those steps to enable automated builds and deploys.*

## Features

### Core folder aliases

The folders in `src` have aliases that make it easy to reference their contents. Instead of needing to import (for example) `../../../utils/foobar.ts` to pull a utility function into a route, you can import `@utils/foobar.ts`, from anywhere in your project.

Aliases are configured for the following directories:

- `assets` - Image and other media files
- `content` - Your Astro Content Collections
- `components` - Reusable components
- `layouts` - Astro layouts
- `pages` - Astro routes
- `utils` - Other utilities. I keep utility functions in this folder, each with their own file.

### Daily builds

Your site will automatically be built and deployed each day at 15:00 UTC. This allows you to do scheduled posts, by filtering out posts with a future date from each build.

**To remove:** Remove the `cron` trigger in `.github/workflows/main.yml`.

### Commit hash logging

`@layouts/Base.astro` invokes the utility function `logCommitHash` (from `@utils`) to log the current build's commit hash on page load. This hash is provided by the deployment pipeline.

**To remove:** Delete `src/utils/logCommitHash.ts`, remove the script tag from `src/layouts/Base.astro`, and delete `PUBLIC_COMMIT_HASH: ${{ ... }}` from `.github/workflows/main.yml`.
