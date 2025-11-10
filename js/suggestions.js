const STOP_WORDS = new Set([
  "the",
  "is",
  "and",
  "you",
  "to",
  "a",
  "of",
  "in",
  "it",
  "for",
  "on",
  "with",
  "that",
  "this",
  "as",
  "are",
  "be",
  "or",
  "about",
]);

const MAX_TOPICS = 3;

function tokenize(text) {
  return (text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.has(word) && word.length > 2);
}

function collateTopics(conversations) {
  const topicFrequency = new Map();
  conversations.forEach((entry) => {
    const words = tokenize(entry.text);
    words.forEach((word) => {
      const count = topicFrequency.get(word) ?? 0;
      topicFrequency.set(word, count + 1);
    });
  });

  const sorted = Array.from(topicFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TOPICS);

  return sorted.map(([topic]) => topic);
}

function getRecentMessage(conversations) {
  for (let index = conversations.length - 1; index >= 0; index -= 1) {
    const entry = conversations[index];
    if (entry.role === "user") {
      return entry;
    }
  }
  return conversations[conversations.length - 1] ?? null;
}

function createFollowUpSuggestions(topics, recentMessage) {
  if (!topics.length && !recentMessage) {
    return [
      {
        title: "Start the conversation",
        body: "Share something you're working on or curious about to get tailored support.",
      },
    ];
  }

  const suggestions = [];

  topics.forEach((topic) => {
    suggestions.push({
      title: `Dive deeper into ${topic}`,
      body: `Ask a follow-up like “What are advanced strategies about ${topic}?” for more insight.`,
    });
  });

  if (recentMessage) {
    suggestions.push({
      title: "Continue the thread",
      body: `Build on your last note: “${recentMessage.text.slice(0, 80)}...” by asking for examples or next steps.`,
    });
  }

  return suggestions;
}

function createProductivityTips(topics) {
  if (!topics.length) {
    return [
      {
        title: "Stay organised",
        body: "Group related questions together and use the knowledge search to keep track of useful answers.",
      },
    ];
  }

  return [
    {
      title: "Summarise progress",
      body: `Capture quick summaries after each ${topics[0]} discussion to keep your notes actionable.`,
    },
    {
      title: "Pin what matters",
      body: `Save the most useful outputs from ${topics.join(", ")} in your workspace so they're easy to revisit.`,
    },
  ];
}

function createPreferenceSuggestion(preferences) {
  if (!preferences) return null;
  const { theme } = preferences;
  if (theme === "dark") {
    return {
      title: "Dark mode engaged",
      body: "Dark theme is active. If you collaborate in bright environments, toggle back to light mode anytime.",
    };
  }
  return {
    title: "Personalise the experience",
    body: "Prefer working at night? Enable the dark theme for a calmer reading experience.",
  };
}

export function generateSuggestions(conversations, preferences) {
  const topics = collateTopics(conversations);
  const recentMessage = getRecentMessage(conversations);

  const suggestions = [
    ...createFollowUpSuggestions(topics, recentMessage),
    ...createProductivityTips(topics),
  ];

  const preferenceTip = createPreferenceSuggestion(preferences);
  if (preferenceTip) {
    suggestions.push(preferenceTip);
  }

  // Encourage knowledge search usage when topics exist
  if (topics.length) {
    suggestions.push({
      title: "Search the knowledge base",
      body: `Try a targeted query like “Latest insights about ${topics[0]}” in the knowledge tab.`,
    });
  }

  return suggestions;
}
