# Coach Steve's Hitters Lab — Deployment Guide
## Render + Supabase

---

## Architecture

| Component | Service |
|---|---|
| Frontend + API | Render (Web Service) |
| Database | Supabase (PostgreSQL) |
| Email | Resend |
| AI | OpenAI + Gemini |
| File Storage | AWS S3 |

---

## Step 1: Set Up Supabase (Database)

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a name like `coach-steve-hitters-lab`
3. Set a strong database password (save it!)
4. After project creates: go to **Settings → Database → Connection string → URI**
5. Copy the **Transaction pooler** URL (port 6543)
6. It looks like: `postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

---

## Step 2: Push the Database Schema

On your computer with Node.js installed:

```bash
# Clone or unzip this project
cd coach-steve-hitters-lab

# Install dependencies
npm install -g pnpm
pnpm install

# Create your .env file
cp .env.example .env
# Edit .env and fill in DATABASE_URL + JWT_SECRET at minimum

# Push the schema to Supabase (creates all tables)
pnpm run db:push
```

---

## Step 3: Deploy to Render

1. Push this code to a **GitHub repo**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/hitters-lab.git
   git push -u origin main
   ```
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Render will detect the `render.yaml` config automatically, or set manually:
   - **Build command:** `pnpm install && pnpm build`
   - **Start command:** `node dist/index.js`
5. Add environment variables:
   - `DATABASE_URL` (from Supabase)
   - `JWT_SECRET` (generate at https://generate-secret.vercel.app/32)
   - `OWNER_EMAIL` = `coach@coachstevebaseball.com`
   - `RESEND_API_KEY`
   - `OPENAI_API_KEY`
   - `GEMINI_API_KEY`
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME`
   - `NODE_ENV` = `production`
   - `NODE_VERSION` = `22`
6. Set `APP_URL` to your Render URL (e.g. `https://coach-steves-hitters-lab.onrender.com`)

---

## Step 4: Create Your Admin Account

Once deployed, go to:
```
https://your-render-url.onrender.com/register
```

Sign up with `coach@coachstevebaseball.com` — it will automatically get the **admin role** because that matches `OWNER_EMAIL`.

---

## Step 5: Invite Athletes

Go to your Coach Dashboard, invite athletes by email. They get an invite link, click it, set a password, and they're in.

---

## Connecting Your Domain

In Render: Settings → Custom Domains → add `coachstevemobilecoach.com`

In your DNS provider: add a CNAME record pointing your domain → your Render URL.

---

## Monthly Cost Estimate

| Service | Cost |
|---|---|
| Render (Free tier) | $0 (750 hrs/month) |
| Supabase (Free tier) | $0 (up to 500MB, 50,000 MAU) |
| Resend (Free tier) | $0 (up to 3,000 emails/month) |
| AWS S3 (video storage) | ~$2-5/month depending on usage |
| **Total** | **~$2-5/month** |
