import { GoogleGenAI, Type } from '@google/genai'
import { GithubPullRequest, ReleaseNoteResult } from '../types/gemini'
import { ServiceError } from '@/lib/errors'

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY // Ensure GEMINI_API_KEY is configured for server-side use
  if (!apiKey) {
    throw new ServiceError('Gemini API Key is missing')
  }
  return new GoogleGenAI({ apiKey })
}

// --- NEW: Generate Structured Release Notes ---
export const generateReleaseNotes = async (
  mergedPrs: GithubPullRequest[],
  version: string
): Promise<ReleaseNoteResult> => {
  if (!mergedPrs || mergedPrs.length === 0) {
    return {
      version,
      markdown: 'No merged PRs to report.',
      categories: { features: [], fixes: [], chores: [] },
    }
  }
  const client = getClient()

  const prSummaries = mergedPrs.map((p) => ({
    number: p.number,
    title: p.title,
    author: p.user.login,
    merged_at: p.merged_at,
    body: p.body ? p.body.substring(0, 1000) : '',
  }))

  const prompt = `
    You are a Release Manager.
    I have a list of merged Pull Requests.

    Goal: Generate professional Release Notes for version ${version}.

    1. Categorize each PR into 'Features', 'Bug Fixes', or 'Maintenance/Chores'.
    2. Write a user-friendly summary for each entry.
    3. Output a structured JSON containing the raw markdown report and the categorized lists.

    Merged PRs:
    ${JSON.stringify(prSummaries)}
  `

  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  const response = await client.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          version: { type: Type.STRING },
          markdown: { type: Type.STRING },
          categories: {
            type: Type.OBJECT,
            properties: {
              features: { type: Type.ARRAY, items: { type: Type.STRING } },
              fixes: { type: Type.ARRAY, items: { type: Type.STRING } },
              chores: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
        },
        required: ['version', 'markdown', 'categories'],
      },
    },
  })

  const text = response.text || '{}'
  return JSON.parse(text) as ReleaseNoteResult
}
