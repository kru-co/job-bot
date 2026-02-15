# Job Bot - Automated Job Applications

Automated job application system for Product Manager roles, built with Next.js, Supabase, and Claude AI.

## 🚀 Phase 0 Setup - COMPLETE!

### What's Done

✅ Next.js 14 project structure with TypeScript
✅ Tailwind CSS with warm, organic design system
✅ Supabase integration configured
✅ Claude API configured
✅ Environment variables set up
✅ Database schema ready to deploy
✅ Design tokens and custom components

### Current Status

The foundation is complete! The project structure is ready and configured.

## 📋 Next Steps

### 1. Install Dependencies

Since this environment has network restrictions, you'll need to install dependencies on your local machine:

```bash
cd /path/to/job-bot
npm install
```

### 2. Deploy Database Schema

Go to your Supabase project:
1. Open the SQL Editor in your Supabase dashboard
2. Copy the contents of `supabase-schema.sql`
3. Run the entire SQL script
4. Verify tables were created in the Table Editor

### 3. Create Your First User

In Supabase:
1. Go to Authentication → Users
2. Click "Add User"
3. Email: `joshua.kruger@outlook.com`
4. Password: Choose a secure password
5. Save and confirm email

### 4. Test the Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` - you should see the Job Bot welcome screen with your warm design system!

### 5. Set Up Git Repository

```bash
cd job-bot
git init
git add .
git commit -m "Initial setup - Phase 0 complete"
git remote add origin https://github.com/kru-co/job-bot.git
git branch -M main
git push -u origin main
```

## 📁 Project Structure

```
job-bot/
├── app/
│   ├── globals.css          # Design system with warm tokens
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Homepage
├── components/
│   └── ui/                   # shadcn/ui components (add as needed)
├── lib/
│   ├── supabase.ts           # Supabase client helpers
│   └── utils.ts              # Utility functions
├── public/                   # Static assets
├── .env.local                # Environment variables (DO NOT COMMIT)
├── supabase-schema.sql       # Database schema
├── tailwind.config.ts        # Tailwind with design tokens
└── package.json              # Dependencies
```

## 🎨 Design System

The app uses a warm, organic design system with:
- **Primary Color**: Terracotta/rust (#B76E4B)
- **Accent**: Sage green (#598575)
- **Typography**: Source Sans 3 (UI), Libre Baskerville (headings)
- **Custom Components**: `.card-organic`, `.tag-product`, `.tag-iot`

## 🔐 Environment Variables

Already configured in `.env.local`:
- ✅ Supabase URL and keys
- ✅ Claude API key
- ✅ App URL

## 📊 Database Schema

Comprehensive schema with:
- **Jobs**: Discovered job postings with match quality scoring
- **Applications**: Submission tracking and status
- **Cover Letters**: AI-generated letters for each job
- **Companies**: Target companies with limits
- **Standard Answers**: Pre-filled application responses
- **AI Usage Logs**: Cost tracking for Claude API
- **Weekly Tracking**: Per-company application limits

## 🎯 What's Next - Phase 1

Ready to build! Next phase includes:
1. Authentication system (login page)
2. Protected dashboard routes
3. Basic dashboard with stats
4. Navigation components
5. First API routes

See `implementation-plan.md` for detailed next steps.

## 💡 Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **AI**: Claude 3.5 (Sonnet & Haiku)
- **Automation**: Playwright (Phase 4)

## 📚 Documentation

- `job-bot-requirements.md` - Complete feature requirements
- `job-bot-technical-architecture.md` - System architecture
- `design-guidelines.md` - Design system documentation
- `architecture-review.md` - Architectural analysis and recommendations
- `ui-specifications.md` - Detailed UI specs and wireframes
- `implementation-plan.md` - Phase-by-phase build plan

## 🤝 Contributing

Single-user system for Josh Kruger's job search.

## 📝 License

Private project - All rights reserved

---

**Phase 0 Status**: ✅ COMPLETE
**Next Phase**: Phase 1 - Authentication & Core UI
**Estimated Time**: 5-7 days

Let's build this! 🚀
