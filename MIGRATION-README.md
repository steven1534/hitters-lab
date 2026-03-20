# Coach Steve Hitter's Lab — Migration Guide
## Manus AI → Railway + Supabase

---

## What Changed

| Was (Manus) | Now (Standard) |
|---|---|
| Manus OAuth login | Email + password login |
| MySQL database | PostgreSQL (Supabase) |
| `vite-plugin-manus-runtime` | Removed |
| Manus-specific SDK/OAuth | Standard JWT cookies |
| `openId` user identifier | `email` + `id` |
| Manus hosting | Railway |

Everything else is **identical** — all your drills, components, pages, tRPC routers, Resend emails, OpenAI/Gemini, S3 storage, blast metrics, session notes, practice plans — all untouched.

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

## Step 3: Deploy to Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Push this code to a **new GitHub repo** first:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/hitters-lab.git
   git push -u origin main
   ```
3. In Railway: select your repo → it will auto-detect and build
4. Go to **Variables** and add all values from `.env.example`:
   - `DATABASE_URL` (from Supabase)
   - `JWT_SECRET` (generate at https://generate-secret.vercel.app/32)
   - `OWNER_EMAIL` = `coach@coachstevebaseball.com`
   - `RESEND_API_KEY`
   - `OPENAI_API_KEY`
   - `GEMINI_API_KEY`
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME`
   - `NODE_ENV` = `production`
5. Railway gives you a URL like `your-app.railway.app` — set `APP_URL` to that
6. In **Settings → Networking** → add your custom domain (`coachstevemobilecoach.com`)

---

## Step 4: Create Your Admin Account

Once deployed, go to:
```
https://your-app.railway.app/register
```

Sign up with `coach@coachstevebaseball.com` — it will automatically get the **admin role** because that matches `OWNER_EMAIL`.

---

## Step 5: Invite Athletes

The invite system works exactly the same as before — go to your Coach Dashboard, invite athletes by email. They get an invite link, click it, set a password, and they're in.

---

## Connecting Your Domain

In Railway: Settings → Networking → Custom Domain → enter `coachstevemobilecoach.com`

In your Hostinger DNS: add a CNAME record pointing `coachstevemobilecoach.com` → your Railway URL.

---

## Monthly Cost Estimate

| Service | Cost |
|---|---|
| Railway (Hobby plan) | ~$5/month |
| Supabase (Free tier) | $0 (up to 500MB, 50,000 MAU) |
| Resend (Free tier) | $0 (up to 3,000 emails/month) |
| AWS S3 (video storage) | ~$2-5/month depending on usage |
| **Total** | **~$7-10/month** |

No credit limits. No surprise lockouts.
