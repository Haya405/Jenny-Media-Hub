# Jenny Media hub — setup & deployment

This is a mobile-friendly static frontend with Supabase Auth, a hosted database, and cloud file storage. The scaffold is not live until you connect a Supabase project and deploy it.

## 1. Create the cloud backend
1. Create a project at https://supabase.com/.
2. In **Authentication → Users**, create the owner account with email/password. Keep the password private.
3. Copy that user's **UUID** from the user details.
4. In **Storage**, create a bucket named `media` and set it to **Public** if visitors should download media without logging in. Public means anyone who has/obtains a file URL can access it.
5. Open **SQL Editor**, paste `supabase/setup.sql`, replace every `OWNER_UID_PLACEHOLDER` with the owner's UUID, then run it.
6. In **Project Settings → API**, copy the Project URL and the anon/publishable key. Never use the `service_role` or secret key in browser code.

## 2. Configure the frontend
Open `app.js` and replace:
- `YOUR_SUPABASE_PROJECT_URL`
- `YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY`
- `YOUR_OWNER_AUTH_USER_UUID`

Use only the anon/publishable key in client-side code. RLS policies are the security boundary; keep the owner UUID consistent in app.js and SQL.

## 3. Publish the website
Recommended: https://vercel.com/ or https://www.netlify.com/
- Upload/extract this project into a Git repository, connect the repository to your hosting provider, and deploy the project root.
- This is a static site, so no build command is required.
- After deployment, test owner sign-in, uploading, public gallery browsing, video playback, downloads, and deletion.
- Use the HTTPS URL provided by your host. You can connect a custom domain from the host's dashboard.

## Included features
- Responsive mobile layout
- Public gallery, photo preview, video player and download links
- Email/password owner sign-in
- Owner-only upload and delete enforced by Supabase Row Level Security and Storage policies
- Cloud database metadata and cloud file storage

## Important notes
- This starter uses email/password sign-in (not SMS OTP). Email login satisfies email sign-in; phone OTP needs enabling/configuring a provider in Supabase Auth.
- Public bucket media is publicly downloadable by URL. For private media, use a private bucket and signed download URLs plus an explicit access policy instead.
- Configure allowed MIME types and file size limits in Supabase Storage settings. Large video limits depend on your plan; resumable uploads may be appropriate for large files.
- Add a privacy notice, content moderation/reporting process, backups and domain configuration before using this as a public service.
- Never upload content you do not have permission to share.
