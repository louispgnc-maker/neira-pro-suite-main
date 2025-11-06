# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/22971231-7f53-4007-a2aa-9da47248d99c

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/22971231-7f53-4007-a2aa-9da47248d99c) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Environment setup

This app expects Supabase credentials from Vite environment variables. Create a `.env.local` at the project root (never commit secrets) based on `.env.example`:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Then run the dev server:

```
npm run dev
```

If these variables are missing, the app will fail fast at startup to avoid using incorrect defaults.

## Supabase schema & migrations

Schema SQL lives under `supabase/`. To provision the latest tables (including `dossiers` and association tables), run the migration in your Supabase project's SQL editor:

- Open `supabase/migrations/2025-11-06_add_dossiers.sql`
- Copy/paste its content into Supabase SQL editor and execute

Idempotent by design: running it multiple times is safe. Ensure RLS policies are applied as included.

## Troubleshooting: local vs online differences

If the online app behaves differently than localhost, check:

1) Environment variables
	- The deployed site must have `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set to the correct project.
2) Database schema
	- Apply the latest SQL migration(s) in your live Supabase project. Errors like `relation "public.dossiers" does not exist` mean migrations haven't run.
3) Policies/Row Level Security
	- Verify RLS policies exist and allow your queries for the current user (owner_id, role, etc.).
4) Cache/deploy
	- Invalidate CDN cache or redeploy if static assets are stale.
5) Multiple Supabase projects
	- Confirm both local and online point to the same Supabase project (URLs/keys).

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/22971231-7f53-4007-a2aa-9da47248d99c) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
