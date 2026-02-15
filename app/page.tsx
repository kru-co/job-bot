export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
      <div className="card-organic max-w-2xl w-full p-12 text-center space-y-6">
        <div className="flex justify-center mb-8">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight opacity-0 animate-fade-in-up">
          Job Bot
        </h1>

        <p className="text-lg text-muted-foreground opacity-0 animate-fade-in-up delay-100">
          Automated job applications for Product Manager roles
        </p>

        <div className="pt-8 opacity-0 animate-fade-in-up delay-200">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-sage animate-pulse" />
            <span>Phase 0: Setup Complete</span>
          </div>
        </div>

        <div className="pt-4 text-sm text-muted-foreground opacity-0 animate-fade-in-up delay-300">
          <p>Next.js + Supabase + Claude API</p>
        </div>
      </div>
    </main>
  )
}
