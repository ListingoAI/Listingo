import Replicate from 'replicate'
import openai from '@/lib/openai'

export function extractReplicateVideoUrl(output: unknown): string | null {
  if (output == null) return null
  if (typeof output === 'string' && output.startsWith('http')) return output
  if (Array.isArray(output) && output.length > 0) return extractReplicateVideoUrl(output[0])
  if (typeof output === 'object') {
    const o = output as Record<string, unknown> & { url?: unknown }
    if (typeof o.url === 'string' && o.url.startsWith('http')) return o.url
    if (typeof o.url === 'function') {
      try {
        const href = (o.url as () => URL)().href
        if (href.startsWith('http')) return href
      } catch {
        /* ignore */
      }
    }
    const s = String(output)
    if (s.startsWith('http')) return s
    if (typeof o.output === 'string') return extractReplicateVideoUrl(o.output)
    if (Array.isArray(o.output) && o.output.length > 0) return extractReplicateVideoUrl(o.output[0])
  }
  return null
}

const baseInstruction = `
CRITICAL RULES:
1. The product from the input image MUST appear in EVERY frame looking 100% identical — same shape, same color, same texture, same proportions, same details. Do NOT reimagine, redesign, or alter the product.
2. Only animate camera movement and environment — the product itself stays physically unchanged.
3. Lighting on the product should feel natural and match the scene.
4. Ultra realistic, commercial product video quality.
5. Smooth, stable camera motion — no jitter, no jumps.`

const WAN_SCENE_PROMPTS: Record<string, string> = {
  'packshot-rotate': `Slow 360° orbit around the stationary product on pure white. Product fixed center frame. Even softbox light, soft shadow under. Steady camera, e-commerce packshot.
${baseInstruction}`,

  'packshot-zoom': `Slow push-in on the stationary product, white studio. Medium to tight close-up on texture. Diffused light, no harsh shadows. Product unchanged.
${baseInstruction}`,

  'lifestyle-desk': `Product motionless on warm wood desk. Camera dollies back slightly. Morning window light from right, shallow DOF, product sharp. Minimal ambient motion only.
${baseInstruction}`,

  'lifestyle-outdoor': `Product still on wood or stone outdoors. Slow orbit. Golden hour light, foliage bokeh may move gently in breeze. Product unchanged.
${baseInstruction}`,

  'luxury-dark': `Product still on dark velvet. Near-dark start; one key light fades in from upper left, cinematic reveal. Rim light, high contrast. Product unchanged.
${baseInstruction}`,

  'social-dynamic': `Smooth push-in then short orbit around stationary product. Bold studio light, subtle color accents. Social ad energy; product unchanged.
${baseInstruction}`,
}

const SEEDANCE_SCENE_PROMPTS: Record<string, string> = {
  'packshot-rotate': `Professional 360-degree orbital camera rotation around the stationary product. The camera moves in a perfectly smooth full circle; the product remains perfectly still and unchanged in the center. Clean pure white infinity background. High-end cinematography, centered composition, stable gimbal-like movement. Soft studio lighting from all sides, even illumination, soft contact shadow beneath. Sharp focus, highly detailed product texture. E-commerce hero packshot quality.
${baseInstruction}`,

  'packshot-zoom': `Slow cinematic dolly-in toward the stationary product on a seamless white studio cyclorama. Begin medium shot, end on macro detail of surface texture. The product never moves or morphs. Even diffused key and fill, luxury e-commerce aesthetic. Buttery-smooth motion, no motion blur on the product. 8K-grade clarity, commercial polish.
${baseInstruction}`,

  'lifestyle-desk': `The product sits absolutely motionless on a warm natural oak or walnut desk. Camera executes a slow dolly backward to widen the frame and reveal a cozy workspace. Golden morning sunlight from a large window camera-right; dust motes may drift softly in the light. Shallow depth of field — razor-sharp product, creamy bokeh background. The product remains perfectly still and unchanged. Intimate lifestyle commercial, premium brand film.
${baseInstruction}`,

  'lifestyle-outdoor': `The product rests motionless on weathered wood or smooth river stone. Camera performs a slow elegant orbit. Warm golden-hour sun with natural lens flare; background trees and leaves sway subtly in a gentle breeze with rich bokeh. The product stays frozen — only camera and environment move. Aspirational outdoor lifestyle, cinematic color grade, filmic contrast.
${baseInstruction}`,

  'luxury-dark': `The product lies motionless on black velvet in near-total darkness. A single dramatic key light slowly ramps up from upper left, sculpting the form in a prestige reveal. Subtle gold rim accents on edges. The product is identical in every frame — no drift, no redesign. Deep blacks, controlled speculars, ultra-premium luxury campaign aesthetic.
${baseInstruction}`,

  'social-dynamic': `Confident cinematic camera: slight push-in, then a smooth quarter-orbit around the stationary product. Bold contemporary three-point lighting with tasteful color separation (subtle magenta or teal rim optional). The product remains perfectly still and unchanged, always hero-read. Punchy contrast, scroll-stopping energy. Modern TikTok / Reels / paid social ad quality.
${baseInstruction}`,
}

const SCENE_TIER: Record<string, 'standard' | 'premium'> = {
  'packshot-rotate': 'standard',
  'packshot-zoom': 'standard',
  'lifestyle-desk': 'premium',
  'lifestyle-outdoor': 'premium',
  'luxury-dark': 'premium',
  'social-dynamic': 'premium',
}

function getTier(sceneKey: string): 'standard' | 'premium' {
  return SCENE_TIER[sceneKey] ?? 'standard'
}

function scenePromptFor(sceneKey: string, tier: 'standard' | 'premium'): string {
  const map = tier === 'premium' ? SEEDANCE_SCENE_PROMPTS : WAN_SCENE_PROMPTS
  return map[sceneKey] ?? map['packshot-rotate']
}

function buildFullPrompt(sceneKey: string, productHint: string, tier: 'standard' | 'premium'): string {
  return `${productHint}${scenePromptFor(sceneKey, tier)}`
}

export async function productHintFromVision(imageBase64: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return ''

  const imageUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`

  try {
    const analysisResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You describe products for AI video generation. In 2–3 short English sentences: product type, colors, materials, shape. Output ONLY the description, no preamble.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageUrl, detail: 'low' },
            },
            {
              type: 'text',
              text: 'Describe this product for a commercial product video. The video will only move the camera; the product must stay identical.',
            },
          ],
        },
      ],
      max_tokens: 200,
    })

    const text = analysisResponse.choices[0]?.message?.content?.trim()
    if (!text) return ''
    return `The main product in this video is: ${text}. `
  } catch (e) {
    console.warn('Video Studio: GPT-4o vision hint skipped:', e instanceof Error ? e.message : e)
    return ''
  }
}

export type RunProductVideoParams = {
  imageBase64: string
  scene?: string
  productDescription?: string
  aspectRatio?: '16:9' | '9:16' | '1:1'
  duration?: number
}

export type ModelUsed = 'wan' | 'seedance' | 'kling'

/**
 * Generuje wideo produktowe (Replicate) — ta sama logika co POST /api/video-studio.
 */
export async function runProductVideo(
  params: RunProductVideoParams
): Promise<{ videoUrl: string; scene: string; modelUsed: ModelUsed }> {
  const {
    imageBase64,
    scene,
    productDescription,
    aspectRatio = '16:9',
    duration = 5,
  } = params

  const sceneKey = typeof scene === 'string' ? scene : 'packshot-rotate'
  const tier = getTier(sceneKey)

  let productHint = productDescription?.trim()
    ? `The main product in this video is: ${productDescription.trim()}. `
    : await productHintFromVision(imageBase64)

  const fullPrompt = buildFullPrompt(sceneKey, productHint, tier)

  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('Brak klucza Replicate')
  }

  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
    useFileOutput: false,
  })

  const validDuration = duration === 8 || duration === 10 ? duration : 5
  const replicateDurationSeconds = validDuration <= 5 ? 5 : 10

  const replicateAspectRatio =
    aspectRatio === '9:16' ? '9:16' : aspectRatio === '1:1' ? '1:1' : '16:9'

  const numFrames = validDuration <= 5 ? 81 : 121

  let width = 832
  let height = 480
  if (aspectRatio === '9:16') {
    width = 480
    height = 832
  } else if (aspectRatio === '1:1') {
    width = 640
    height = 640
  }

  let output: unknown
  let modelUsed: ModelUsed = tier === 'premium' ? 'seedance' : 'wan'

  console.log(`Video Studio: tier=${tier}, primary=${modelUsed}, scene=${sceneKey}`)

  try {
    if (tier === 'premium') {
      output = await replicate.run('bytedance/seedance-1-pro', {
        input: {
          image: imageBase64,
          prompt: fullPrompt,
          duration: replicateDurationSeconds,
          resolution: '1080p',
          aspect_ratio: replicateAspectRatio,
        },
      })
    } else {
      output = await replicate.run('wan-video/wan-2.2-i2v-fast', {
        input: {
          prompt: fullPrompt,
          image: imageBase64,
          num_frames: numFrames,
          fps: 16,
          width,
          height,
          num_inference_steps: 20,
          guidance_scale: 5,
        },
      })
    }
  } catch (primaryError: unknown) {
    const primaryMsg = primaryError instanceof Error ? primaryError.message : String(primaryError)
    console.error(`${tier === 'premium' ? 'Seedance 1 Pro' : 'Wan 2.2 I2V Fast'} failed:`, primaryMsg)

    const klingInput = {
      prompt: fullPrompt,
      start_image: imageBase64,
      duration: replicateDurationSeconds,
      aspect_ratio: replicateAspectRatio,
    }

    try {
      console.log('Video Studio: trying Kling v2.5 Turbo Pro fallback…')
      modelUsed = 'kling'
      output = await replicate.run('kwaivgi/kling-v2.5-turbo-pro', { input: klingInput })
    } catch (fallbackError: unknown) {
      const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
      const rateLimited = /429|throttl/i.test(fallbackMsg)

      if (rateLimited) {
        console.warn('Video Studio: Kling throttled — waiting 3.5s, one retry…')
        await new Promise((r) => setTimeout(r, 3500))
        try {
          output = await replicate.run('kwaivgi/kling-v2.5-turbo-pro', { input: klingInput })
        } catch (retryErr: unknown) {
          const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr)
          console.error('Kling v2.5 Turbo Pro retry failed:', retryMsg)
          throw new Error('Za dużo zapytań do serwera wideo. Odczekaj ok. minutę i spróbuj ponownie.')
        }
      } else {
        console.error('Kling v2.5 Turbo Pro also failed:', fallbackMsg)
        throw new Error('Nie udało się wygenerować wideo. Spróbuj ponownie za chwilę.')
      }
    }
  }

  const videoUrl = extractReplicateVideoUrl(output)
  if (!videoUrl) {
    throw new Error('Model nie zwrócił wideo')
  }

  console.log(`Video Studio success (${modelUsed}) URL prefix:`, videoUrl.slice(0, 80))

  return { videoUrl, scene: sceneKey, modelUsed }
}
