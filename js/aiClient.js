const knowledgeBase = [
  {
    title: "Productivity rituals for makers",
    snippet:
      "Set focused blocks of time, capture end-of-day summaries, and keep a running log of blockers.",
    tags: ["productivity", "habits", "planning"],
  },
  {
    title: "Deep work prompts",
    snippet:
      "Use prompts like ‘What would break if…’ or ‘How can I automate…’ to uncover deeper insights.",
    tags: ["questions", "prompts", "deep work"],
  },
  {
    title: "Retrospective checklist",
    snippet:
      "Review wins, friction points, and experiments. Convert reflections into next-week actions.",
    tags: ["retrospective", "team", "process"],
  },
  {
    title: "Learning quickstart for new domains",
    snippet:
      "Start with fundamental concepts, find real-world examples, and apply spaced repetition.",
    tags: ["learning", "education", "guides"],
  },
  {
    title: "Collaboration frameworks",
    snippet:
      "Adopt lightweight rituals such as daily syncs, async updates, and shared decision logs.",
    tags: ["collaboration", "teamwork", "communication"],
  },
];

function normalise(text) {
  return text.toLowerCase();
}

function includesQuery(item, query) {
  const normalised = normalise(query);
  return (
    normalise(item.title).includes(normalised) ||
    normalise(item.snippet).includes(normalised) ||
    item.tags.some((tag) => normalise(tag).includes(normalised))
  );
}

export const aiClient = {
  async search(query) {
    if (!query || !query.trim()) {
      return [];
    }

    await new Promise((resolve) => setTimeout(resolve, 250));

    const trimmed = query.trim();
    const matches = knowledgeBase.filter((item) => includesQuery(item, trimmed));

    if (matches.length) {
      return matches.map((item) => ({ ...item, query: trimmed }));
    }

    // Fall back to fuzzy suggestions
    const inference = knowledgeBase
      .filter((item) =>
        item.tags.some((tag) => normalise(trimmed).split(/\s+/).includes(tag))
      )
      .slice(0, 3);

    return inference.map((item) => ({ ...item, query: trimmed }));
  },
};
