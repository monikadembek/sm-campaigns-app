import {
  ToneStyle,
  PlatformType,
  PostIdea,
  GeneratedPostContent,
} from '@sm-campaigns-app/datatypes';

const PLATFORM_RULES: Record<PlatformType, string> = {
  TWITTER:
    'Keep content under 280 characters. Use 2-5 relevant hashtags. Be concise, punchy, and shareable. Use line breaks for readability.',
  INSTAGRAM:
    'Content can be up to 2200 characters. Use 15-30 hashtags (mix of popular and niche). Start with a hook. Use emojis strategically. Include a call-to-action.',
  LINKEDIN:
    'Professional tone. Content up to 3000 characters. Use 3-5 industry-relevant hashtags. Open with a compelling hook. Include data or insights when possible. End with a question or call-to-action to drive engagement.',
  FACEBOOK:
    'Conversational and relatable. Around 500 characters for optimal engagement. Use 1-3 hashtags. Ask questions to drive comments. Include a clear call-to-action.',
  TIKTOK:
    'Casual, trendy, and authentic. Write as a video caption/description. Use 3-5 trending and niche hashtags. Reference trends or challenges when relevant. Keep it fun and energetic.',
  YOUTUBE:
    'Write as a video description optimized for SEO. Include relevant keywords naturally. Structure with a brief intro, key points, and links section. Use timestamps format if applicable.',
  PINTEREST:
    'Keyword-rich description for search discovery. Use 2-5 hashtags. Focus on actionable, inspirational, or educational value. Include relevant keywords naturally for Pinterest SEO.',
};

export function contentGenerationSystemPrompt(): string {
  return `You are an expert social media content creator and copywriter. Your task is to generate platform-optimized post content based on post ideas.

Platform-specific rules:
${Object.entries(PLATFORM_RULES)
  .map(([platform, rules]) => `- ${platform}: ${rules}`)
  .join('\n')}

Rules:
- Return ONLY valid JSON — no markdown, no code fences, no extra text.
- The JSON must be an object with a single key "posts" containing an array of post objects.
- Each post object must have:
  - "ideaId": the id of the original idea this content is based on
  - "platform": the platform (must match the idea's platform)
  - "postType": the post type (must match the idea's suggestedPostType)
  - "content": the full post content, following platform-specific rules above
  - "hashtags": an array of hashtag strings (without the # symbol)
- Adapt writing style to match the requested tone while respecting platform norms.
- Content must be ready to post — no placeholders, no "[insert X]" markers.`;
}

export function contentGenerationUserPrompt(
  ideas: PostIdea[],
  tone: ToneStyle,
  topic: string,
): string {
  const ideasList = ideas
    .map(
      (idea, i) =>
        `${i + 1}. [ID: ${idea.id}] "${idea.title}" — ${idea.summary} (Platform: ${idea.platform}, Type: ${idea.suggestedPostType})`,
    )
    .join('\n');

  return `Generate full post content for each of the following ideas:

Topic: <user_input>${topic}</user_input>
Tone: ${tone}

Ideas:
${ideasList}

Return a JSON object with this structure:
{
  "posts": [
    {
      "ideaId": "the-idea-id",
      "platform": "PLATFORM_NAME",
      "postType": "POST_TYPE",
      "content": "The full post content...",
      "hashtags": ["hashtag1", "hashtag2"]
    }
  ]
}`;
}

// TODO: for future implementation
export function regenerateContentSystemPrompt(): string {
  return `You are an expert social media content creator and copywriter. Your task is to regenerate a single piece of post content based on feedback.

Platform-specific rules:
${Object.entries(PLATFORM_RULES)
  .map(([platform, rules]) => `- ${platform}: ${rules}`)
  .join('\n')}

Rules:
- Return ONLY valid JSON — no markdown, no code fences, no extra text.
- The JSON must be an object with a single key "post" containing the regenerated post object.
- The post object must have: "ideaId", "platform", "postType", "content", "hashtags".
- Keep the same platform and postType as the original.
- If feedback is provided, incorporate it into the new content.
- The new content should be distinctly different from the original.
- Content must be ready to post — no placeholders.`;
}

export function regenerateContentUserPrompt(
  post: GeneratedPostContent,
  tone: ToneStyle,
  topic: string,
  feedback?: string,
): string {
  let prompt = `Regenerate the following post content with a fresh approach:

Original post:
- Platform: ${post.platform}
- Post type: ${post.postType}
- Content: <user_input>${post.content}</user_input>
- Hashtags: ${post.hashtags.join(', ')}

Topic: <user_input>${topic}</user_input>
Tone: ${tone}`;

  if (feedback) {
    prompt += `\nUser feedback: <user_input>${feedback}</user_input>`;
  }

  prompt += `

Return a JSON object with this structure:
{
  "post": {
    "ideaId": "${post.ideaId}",
    "platform": "${post.platform}",
    "postType": "${post.postType}",
    "content": "The new post content...",
    "hashtags": ["hashtag1", "hashtag2"]
  }
}`;

  return prompt;
}
