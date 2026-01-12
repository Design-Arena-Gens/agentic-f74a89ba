import { NextResponse } from "next/server";

type Role = "user" | "assistant" | "system";

type Message = {
  role: Role;
  content: string;
};

const promptStyle = `You are a concise, upbeat digital guide named Nova. You draw from the conversation history, think step by step, and offer practical, actionable help in plain language.`;

const patternResponses: Array<{
  pattern: RegExp;
  handler: (input: string, history: Message[]) => string;
}> = [
  {
    pattern: /(plan|schedule|organize)/i,
    handler: (input) => {
      return [
        "Here’s a lightweight plan you can adapt:",
        "1. Capture a quick list of everything on your mind.",
        "2. Rank the list by urgency/energy required.",
        "3. Block focused time for the hardest thing while you’re most alert.",
        "4. Batch similar tasks so you don’t mode-switch all day.",
        "5. Keep a 5-minute buffer between commitments to reset.",
        "Wrap up by reviewing what worked and what to adjust tomorrow."
      ].join("\n");
    }
  },
  {
    pattern: /(recipe|cook|dinner|meal)/i,
    handler: () => {
      return [
        "Try this 20-minute skillet pasta:",
        "• Sauté garlic and cherry tomatoes in olive oil until blistered.",
        "• Toss in spinach, a pinch of chili flakes, and cooked pasta.",
        "• Finish with lemon zest, parmesan, and a drizzle of the tomato juices.",
        "Bonus: swap spinach for kale or add chickpeas for protein."
      ].join("\n");
    }
  },
  {
    pattern: /(productivity|focus|motivation|procrastinate)/i,
    handler: () => {
      return [
        "Quick focus reset:",
        "• Pick a single target outcome for the next 25 minutes.",
        "• Clear the desk, mute notifications, and lower screen brightness a touch.",
        "• Start with a 3-minute warmup task to build momentum.",
        "• End the sprint by writing the very next action so restarting is easy."
      ].join("\n");
    }
  },
  {
    pattern: /(learn|teach|explain)/i,
    handler: (input) => {
      const topicMatch = input.match(/about ([a-z\s]+)/i);
      const topic = topicMatch ? topicMatch[1].trim() : "something new";
      return `In two bites on ${topic}:\n• Start with the big picture so your brain sees how pieces connect.\n• Anchor it to something you already know, then teach it back in your own words.`;
    }
  },
  {
    pattern: /(hello|hi|hey|good (morning|afternoon|evening))/i,
    handler: () =>
      "Hey there! What’s on your mind today? I can help with planning, ideas, or just friendly brainstorming."
  }
];

function formatHistory(history: Message[]): string {
  return history
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");
}

function generateResponse(history: Message[]): string {
  const lastUser = [...history]
    .reverse()
    .find((message) => message.role === "user");

  if (!lastUser) {
    return "I’m ready when you are!";
  }

  for (const { pattern, handler } of patternResponses) {
    if (pattern.test(lastUser.content)) {
      return handler(lastUser.content, history);
    }
  }

  const followUps = [
    "Anything else you’d like to explore?",
    "Want to dive deeper or switch topics?",
    "Curious about another angle? I’m game."
  ];

  const fallback = [
    "Here’s what I’m picking up:",
    `• ${summarize(lastUser.content)}`,
    "• I can break it down, offer ideas, or map next steps—just point me where to help.",
    followUps[Math.floor(Math.random() * followUps.length)]
  ].join("\n");

  return fallback;
}

function summarize(input: string): string {
  const sanitized = input.replace(/\s+/g, " ").trim();
  if (sanitized.length <= 120) {
    return sanitized;
  }
  return `${sanitized.slice(0, 117)}...`;
}

export async function POST(request: Request) {
  try {
    const { messages } = (await request.json()) as {
      messages?: Message[];
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required." },
        { status: 400 }
      );
    }

    const filtered = messages.filter((message) => message.content.trim().length > 0);
    const reply = generateResponse([
      { role: "system", content: promptStyle },
      ...filtered
    ]);

    return NextResponse.json({ reply });
  } catch (error) {
    const description =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: description }, { status: 500 });
  }
}
