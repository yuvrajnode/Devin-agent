"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { MIN_OBJECTIVE_LENGTH } from "@/lib/server/validate";
import type { ChatMessage } from "@/lib/agent/types";

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <li className="px-3 py-2.5">
      <p className={cn("label mb-1", isUser && "text-accent")}>
        {isUser ? "You" : "Devin"}
      </p>
      <p
        className={cn(
          "text-sm leading-relaxed",
          isUser ? "text-content-primary" : "text-content-secondary",
        )}
      >
        {message.text}
      </p>
    </li>
  );
}

export function ChatPanel({
  messages,
  running,
  onSubmit,
  onStop,
}: {
  messages: ChatMessage[];
  running: boolean;
  onSubmit: (objective: string) => void;
  onStop: () => void;
}) {
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only chase the tail once there is a conversation; the empty state is
    // centred and must not be scrolled off the top of a short panel.
    const node = scroller.current;
    if (node && messages.length > 0) node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  const ready = draft.trim().length >= MIN_OBJECTIVE_LENGTH && !running;

  function submit() {
    if (!ready) return;
    onSubmit(draft.trim());
    setDraft("");
  }

  return (
    <Panel className="h-full">
      <PanelHeader title="Conversation" />

      <PanelBody ref={scroller}>
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6">
            <p className="max-w-[16rem] text-center text-sm text-content-muted">
              Describe a change to make in{" "}
              <span className="font-mono">checkout-service</span>. The agent will
              plan it before touching anything.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {messages.map((message) => (
              <Bubble key={message.id} message={message} />
            ))}
          </ul>
        )}
      </PanelBody>

      <div className="shrink-0 border-t p-2.5">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              submit();
            }
          }}
          rows={3}
          maxLength={400}
          disabled={running}
          placeholder="Fix the bug where bursts slip through at the window boundary…"
          className="hide-scrollbar w-full resize-none rounded-hair border bg-surface-inset px-2.5 py-2 text-sm leading-relaxed text-content-primary placeholder:text-content-muted focus:border-accent-line focus:outline-none disabled:opacity-50"
        />

        <div className="mt-2 flex items-center gap-2">
          <span className="label hidden sm:inline">
            <Kbd>⌘</Kbd> <Kbd>↵</Kbd> to run
          </span>
          <span className="ml-auto flex items-center gap-2">
            {running ? (
              <Button variant="danger" size="sm" onClick={onStop}>
                Stop run
              </Button>
            ) : null}
            <Button variant="primary" size="sm" onClick={submit} disabled={!ready}>
              Start run
            </Button>
          </span>
        </div>
      </div>
    </Panel>
  );
}
