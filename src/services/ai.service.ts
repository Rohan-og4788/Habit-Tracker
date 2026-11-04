import { getHabitReport } from "@/services/report.service";

export interface CoachResult {
  provider: "local" | "openai";
  message: string;
  configured: boolean;
  consentRequired: boolean;
}

function buildLocalAdvice(report: Awaited<ReturnType<typeof getHabitReport>>): string {
  if (report.habits.length === 0) {
    return "You have not created any habits yet. Start with one small daily habit you can do in under two minutes — consistency beats intensity.";
  }

  const lines: string[] = [];
  lines.push(
    `Over the last ${report.days} days you completed ${report.completed} of ${report.scheduled} scheduled check-ins (${report.completionRate}%).`
  );

  if (report.bestDay) {
    lines.push(`Your strongest day was ${report.bestDay.date} at ${report.bestDay.completionRate}%.`);
  }

  const weakest = [...report.habits].sort((a, b) => a.completionRate - b.completionRate)[0];
  if (weakest && weakest.completionRate < 60) {
    lines.push(
      `"${weakest.name}" is your hardest habit right now (${weakest.completionRate}%). Try shrinking it or attaching it to an existing routine.`
    );
  }

  const strongest = report.habits[0];
  if (strongest && strongest.completionRate >= 70) {
    lines.push(`Keep leaning on "${strongest.name}" — it is working well at ${strongest.completionRate}%.`);
  }

  if (report.focusMinutes > 0) {
    lines.push(`You logged ${report.focusMinutes} focus minutes across ${report.focusSessions} sessions.`);
  }

  lines.push("Pick one improvement for tomorrow and write it in your journal tonight.");
  return lines.join(" ");
}

/**
 * Server-side AI coach. Uses OpenAI only when AI_API_KEY is configured and the
 * user has explicitly consented to AI processing; otherwise returns a
 * deterministic, privacy-safe local analysis.
 */
export async function getCoachAdvice(
  userId: string,
  timezone: string,
  aiConsent: boolean,
  days = 30
): Promise<CoachResult> {
  const report = await getHabitReport(userId, timezone, days);
  const apiKey = process.env.AI_API_KEY;
  const configured = Boolean(apiKey);

  if (!configured) {
    return {
      provider: "local",
      message: buildLocalAdvice(report),
      configured: false,
      consentRequired: false,
    };
  }

  if (!aiConsent) {
    return {
      provider: "local",
      message:
        "AI coaching is available but requires your consent. Enable AI insights in Settings to get personalised recommendations. In the meantime: " +
        buildLocalAdvice(report),
      configured: true,
      consentRequired: true,
    };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o-mini",
        max_tokens: 350,
        temperature: 0.6,
        messages: [
          {
            role: "system",
            content:
              "You are HabitForge's habit coach. Be concise, encouraging, and specific. Use only the supplied aggregate statistics. Never invent personal data. Return 3-5 short sentences.",
          },
          {
            role: "user",
            content: JSON.stringify({
              days: report.days,
              completionRate: report.completionRate,
              scheduled: report.scheduled,
              completed: report.completed,
              bestDay: report.bestDay,
              habits: report.habits.slice(0, 8),
              focusMinutes: report.focusMinutes,
              journalEntries: report.journalEntries,
            }),
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`AI provider returned ${res.status}`);
    const data = await res.json();
    const message = data?.choices?.[0]?.message?.content?.trim();
    if (!message) throw new Error("Empty AI response");

    return { provider: "openai", message, configured: true, consentRequired: false };
  } catch (err) {
    console.error("AI coach fallback:", err);
    return {
      provider: "local",
      message:
        "The AI provider is temporarily unavailable, so here is your local analysis: " +
        buildLocalAdvice(report),
      configured: true,
      consentRequired: false,
    };
  }
}
