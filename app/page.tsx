
import Link from "next/link";

const features = [
  {
    number: "01",
    title: "SEO Score Analysis",
    description:
      "Understand your website's SEO health with a clear score and actionable insights.",
  },
  {
    number: "02",
    title: "Technical SEO",
    description:
      "Identify technical issues that may affect your website's search performance.",
  },
  {
    number: "03",
    title: "Actionable Recommendations",
    description:
      "Get practical recommendations to improve your website's SEO performance.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#080d1b] text-white">
      {/* Navigation */}
      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-bold">
              S
            </div>
            <span className="text-xl font-bold tracking-tight">
              StorePilot<span className="text-blue-400"> AI</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#free-audit" className="transition hover:text-white">
              Free SEO Audit
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white sm:block"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-blue-500"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-5 pb-24 pt-24 sm:px-8 sm:pt-32">
        <div className="absolute left-1/2 top-0 -z-0 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/20 blur-[120px]" />

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-xs font-medium text-blue-300">
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            Your smarter website SEO companion
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            Grow Your Store.
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Improve Your SEO.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
            Analyze your website, discover SEO issues, and get actionable
            insights to improve your search visibility — all from one
            intelligent platform.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="#free-audit"
              className="rounded-xl bg-blue-600 px-7 py-4 text-sm font-semibold shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-500"
            >
              Run Free SEO Audit →
            </a>
            <Link
              href="/signup"
              className="rounded-xl border border-white/15 bg-white/5 px-7 py-4 text-sm font-semibold transition hover:bg-white/10"
            >
              Create Free Account
            </Link>
          </div>

          <p className="mt-5 text-xs text-slate-500">
            No signup required for your basic SEO audit.
          </p>
        </div>
      </section>

      {/* Free Audit */}
      <section id="free-audit" className="scroll-mt-10 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-black/20 sm:p-12">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
              Free Website Analysis
            </span>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              How healthy is your website?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400">
              Enter your website URL to get started with a basic SEO audit.
              No account required.
            </p>
          </div>

          <form
            action="/audit"
            method="GET"
            className="mx-auto mt-9 flex max-w-2xl flex-col gap-3 sm:flex-row"
          >
            <input
              type="url"
              name="url"
              required
              placeholder="https://yourwebsite.com"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0c1426] px-5 py-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
            />
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-7 py-4 text-sm font-semibold transition hover:bg-blue-500"
            >
              Analyze Website →
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-500">
            Basic SEO analysis · No signup · Free to get started
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
              Platform Features
            </span>
            <h2 className="mt-4 text-3xl font-bold sm:text-5xl">
              Everything you need to understand your SEO.
            </h2>
            <p className="mt-5 leading-7 text-slate-400">
              Make smarter decisions with clear website insights and
              practical recommendations.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.number}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-7 transition hover:-translate-y-1 hover:border-blue-500/40"
              >
                <span className="text-sm font-semibold text-blue-400">
                  {feature.number}
                </span>
                <h3 className="mt-7 text-xl font-semibold">
                  {feature.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl bg-gradient-to-r from-blue-700 to-blue-500 px-7 py-14 text-center sm:px-14">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to take control of your SEO?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-blue-100">
            Create your free account and manage your website audits from one
            organized workspace.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex rounded-xl bg-white px-7 py-4 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
          >
            Get Started for Free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <p className="text-sm font-semibold">
            StorePilot <span className="text-blue-400">AI</span>
          </p>
          <p className="text-xs text-slate-500">
            © 2026 StorePilot AI. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
