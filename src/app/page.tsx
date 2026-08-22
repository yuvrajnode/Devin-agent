import Link from "next/link";
import { HeroConsole } from "@/components/site/hero-console";
import { ObjectiveLauncher } from "@/components/site/objective-launcher";
import { PipelineDiagram } from "@/components/site/pipeline-diagram";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";
import { TOOLS } from "@/lib/agent/types";

const FACTS = [
  { value: "7", label: "planning intents" },
  { value: "6", label: "sandboxed tools" },
  { value: "0", label: "credentials required" },
  { value: "9", label: "event types, one reducer" },
];

const STAGES = [
  {
    n: "01",
    title: "Classify the objective",
    body: "The objective is scored against seven intent vocabularies — bug, feature, refactor, test, performance, security, docs. The winner selects a recipe.",
  },
  {
    n: "02",
    title: "Expand into a plan",
    body: "Each recipe expands into four to seven ordered steps. Every step carries the tool it needs, the file or command it acts on, and why it exists.",
  },
  {
    n: "03",
    title: "Execute and stream",
    body: "The engine walks the plan as an async generator. Output, patches and timings leave the server as Server-Sent Events, paced by how fast you read them.",
  },
  {
    n: "04",
    title: "Hand back a changeset",
    body: "Every patch lands in one reviewable diff, with the step that produced it and the reasoning attached — the review artefact, not a chat log.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b">
          <div className="rule-grid pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div className="animate-rise">
              <p className="label">Autonomous software engineering</p>
              <h1 className="mt-4 text-4xl leading-[1.08] font-medium tracking-tight text-balance sm:text-5xl">
                It reads the code before it changes it.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-content-secondary">
                Devin turns an objective into an ordered plan, executes each step
                against a real checkout, and hands back a diff you can review —
                with the reasoning for every step still attached.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/workspace"
                  className="inline-flex h-11 items-center rounded-hair bg-accent-solid px-5 text-sm font-medium text-white transition-colors hover:bg-accent-solid-hover"
                >
                  Open the workspace
                </Link>
                <a
                  href="#architecture"
                  className="inline-flex h-11 items-center rounded-hair border border-line-strong px-5 text-sm font-medium transition-colors hover:border-content-muted"
                >
                  How it is built
                </a>
              </div>
            </div>

            <div className="animate-rise [animation-delay:120ms]">
              <HeroConsole />
            </div>
          </div>
        </section>

        {/* Facts */}
        <section className="border-b">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
            {FACTS.map((fact) => (
              <div key={fact.label} className="px-5 py-6 sm:px-8">
                <dt className="label">{fact.label}</dt>
                <dd className="mt-1 font-mono text-3xl text-content-primary">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* How it works */}
        <section id="how" className="border-b scroll-mt-14">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="max-w-2xl">
              <p className="label">The loop</p>
              <h2 className="mt-3 text-2xl font-medium tracking-tight sm:text-3xl">
                Four stages, and nothing hidden between them.
              </h2>
              <p className="mt-4 text-content-secondary">
                Agents fail in the gap between what they claimed and what they
                did. Devin closes it by making the plan the interface: the same
                object the engine executes is the one you watch.
              </p>
            </div>

            <ol className="mt-12 grid gap-px overflow-hidden rounded-panel border bg-line-hair sm:grid-cols-2 lg:grid-cols-4">
              {STAGES.map((stage) => (
                <li key={stage.n} className="bg-surface-base p-5">
                  <span className="font-mono text-2xs text-accent">{stage.n}</span>
                  <h3 className="mt-3 text-sm font-medium text-content-primary">
                    {stage.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-content-secondary">
                    {stage.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Capabilities */}
        <section id="tools" className="border-b scroll-mt-14">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className="label">Capabilities</p>
                <h2 className="mt-3 text-2xl font-medium tracking-tight sm:text-3xl">
                  Six tools, each with a reason to exist.
                </h2>
              </div>
              <p className="max-w-sm text-sm text-content-secondary">
                A step declares exactly one tool. That constraint is what keeps
                the log readable and every action attributable.
              </p>
            </div>

            <ul className="mt-10 grid gap-px overflow-hidden rounded-panel border bg-line-hair sm:grid-cols-2 lg:grid-cols-3">
              {TOOLS.map((tool) => (
                <li key={tool.name} className="bg-surface-base p-5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-2xs tracking-widest text-accent uppercase">
                      {tool.name}
                    </span>
                    <span className="h-px flex-1 bg-line-hair" />
                  </div>
                  <h3 className="mt-3 text-sm font-medium">{tool.label}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-content-secondary">
                    {tool.summary}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Architecture */}
        <section id="architecture" className="border-b scroll-mt-14">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div>
              <p className="label">Architecture</p>
              <h2 className="mt-3 text-2xl font-medium tracking-tight sm:text-3xl">
                One event stream, one reducer, one source of truth.
              </h2>
              <div className="mt-5 space-y-4 text-content-secondary">
                <p>
                  The engine is an async generator, so back-pressure is free: a
                  slow client slows production instead of filling a buffer. Every
                  event it yields is applied by the same pure reducer in the
                  browser and in the test suite.
                </p>
                <p>
                  Planning is pluggable. With no credentials the heuristic
                  planner runs; with an API key a model plans instead and returns
                  the identical shape. A planning outage degrades to offline
                  rather than taking the product down.
                </p>
              </div>
            </div>

            <figure className="rounded-panel border bg-surface-base p-5">
              <figcaption className="label">Request path</figcaption>
              <div className="mt-4">
                <PipelineDiagram />
              </div>
            </figure>
          </div>
        </section>

        {/* Launch */}
        <section className="relative overflow-hidden">
          <div className="rule-grid pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative mx-auto max-w-3xl px-5 py-20 text-center sm:px-8">
            <p className="label">Start a run</p>
            <h2 className="mt-3 text-2xl font-medium tracking-tight text-balance sm:text-3xl">
              Give it something to change in checkout-service.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-content-secondary">
              The repository is a real five-file service with a genuine bug in it.
              Ask for the fix, or for anything else.
            </p>
            <div className="mt-8 text-left">
              <ObjectiveLauncher />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
