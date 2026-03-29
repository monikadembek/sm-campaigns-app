import {
  ToneStyle,
  PostIdea,
  GenerateIdeasRequest,
} from '@sm-campaigns-app/datatypes';

export function ideaGenerationSystemPrompt(): string {
  return `You are an expert social media marketing strategist. Your task is to generate creative, engaging post ideas for social media campaigns.

Rules:
- Return ONLY valid JSON — no markdown, no code fences, no extra text.
- The JSON must be an object with a single key "ideas" containing an array of idea objects.
- Each idea object must have these fields:
  - "title": a short, catchy title (max 80 characters)
  - "summary": a 1-2 sentence description of the post idea (max 200 characters)
  - "platform": one of the requested platforms (must match exactly)
  - "suggestedPostType": the best content format for this idea on the given platform
- Generate provided number of ideas for each of the requested platforms.
- Each idea should be unique, actionable, and tailored to the specific platform's audience and format.
- suggestedPostType must be one of: IMAGE, VIDEO, CAROUSEL, REEL, STORY, TEXT, LINK, POLL

Platform-specific guidance for idea types:
- INSTAGRAM: favor IMAGE, CAROUSEL, REEL, STORY
- TWITTER: favor TEXT, IMAGE, POLL
- FACEBOOK: favor IMAGE, VIDEO, LINK, POLL
- LINKEDIN: favor TEXT, IMAGE, CAROUSEL, LINK
- TIKTOK: favor VIDEO, REEL
- YOUTUBE: favor VIDEO
- PINTEREST: favor IMAGE, CAROUSEL`;
}

export function ideaGenerationUserPrompt({
  topic,
  platforms,
  tone,
  numberOfIdeas,
  additionalContext,
}: GenerateIdeasRequest): string {
  let prompt = `Generate social media post ideas for the following:

Topic: <user_input>${topic}</user_input>
Platforms: ${platforms.join(', ')}
Tone: ${tone}
Number of ideas to generate: ${numberOfIdeas}`;

  if (additionalContext) {
    prompt += `\nAdditional context: <user_input>${additionalContext}</user_input>`;
  }

  prompt += `

Return a JSON object with this structure:
{
  "ideas": [
    {
      "title": "string",
      "summary": "string",
      "platform": "PLATFORM_NAME",
      "suggestedPostType": "POST_TYPE"
    }
  ]
}`;

  return prompt;
}

// TODO: for future implemention

export function regenerateIdeaSystemPrompt(): string {
  return `You are an expert social media marketing strategist. Your task is to regenerate a single social media post idea based on feedback.

Rules:
- Return ONLY valid JSON — no markdown, no code fences, no extra text.
- The JSON must be an object with a single key "idea" containing the regenerated idea object.
- The idea object must have: "title", "summary", "platform", "suggestedPostType".
- Keep the same platform as the original idea.
- suggestedPostType must be one of: IMAGE, VIDEO, CAROUSEL, REEL, STORY, TEXT, LINK, POLL
- If feedback is provided, incorporate it into the new idea.
- The new idea should be distinctly different from the original.`;
}

export function regenerateIdeaUserPrompt(
  originalIdea: PostIdea,
  topic: string,
  tone: ToneStyle,
  feedback?: string,
): string {
  let prompt = `Regenerate the following post idea with a fresh approach:

Original idea:
- Title: ${originalIdea.title}
- Summary: ${originalIdea.summary}
- Platform: ${originalIdea.platform}
- Post type: ${originalIdea.suggestedPostType}

Topic: <user_input>${topic}</user_input>
Tone: ${tone}`;

  if (feedback) {
    prompt += `\nUser feedback: <user_input>${feedback}</user_input>`;
  }

  prompt += `

Return a JSON object with this structure:
{
  "idea": {
    "title": "string",
    "summary": "string",
    "platform": "${originalIdea.platform}",
    "suggestedPostType": "POST_TYPE"
  }
}`;

  return prompt;
}
