import Replicate from 'replicate'
import openai from '@/lib/openai'

/** Replicate SDK: wyciągnij URL obrazu z outputu. */
export function extractReplicateImageUrl(output: unknown): string | null {
  if (output == null) return null
  if (typeof output === 'string' && (output.startsWith('https://') || output.startsWith('http://'))) {
    return output
  }
  if (Array.isArray(output) && output.length > 0) {
    return extractReplicateImageUrl(output[0])
  }
  if (typeof output === 'object') {
    const o = output as Record<string, unknown> & { url?: unknown }
    if (typeof o.url === 'string' && (o.url.startsWith('http://') || o.url.startsWith('https://'))) {
      return o.url
    }
    if (typeof o.url === 'function') {
      try {
        const href = (o.url as () => URL)().href
        if (href.startsWith('http')) return href
      } catch {
        /* ignore */
      }
    }
    const s = String(output)
    if (s.startsWith('http://') || s.startsWith('https://')) return s
    if (typeof o.output === 'string') return extractReplicateImageUrl(o.output)
    if (Array.isArray(o.output) && o.output.length > 0) {
      return extractReplicateImageUrl(o.output[0])
    }
  }
  return null
}

const baseInstruction = `
CRITICAL RULES:
1. The product itself MUST remain 100% identical to the original photo — same shape, same texture, same color, same details, same proportions. Do NOT modify, enhance, redraw, or reimagine the product AT ALL.
2. ONLY change the BACKGROUND and ENVIRONMENT around the product.
3. The lighting on the product should naturally match the new environment.
4. Add a realistic shadow that matches the light direction.
5. The final image must look like a single cohesive professional photograph — not a composite.
6. Ultra realistic result, commercial product photography quality.`

function buildScenePrompts(productHint: string): Record<string, string> {
  return {
    'allegro-main': `${productHint}
Replace the background with a PERFECTLY CLEAN pure white background (#FFFFFF). The product should fill approximately 85% of the frame. Add soft, perfectly even studio lighting from all directions — no harsh shadows. Add only a very subtle, soft drop shadow directly under the product for depth. The result must look like a professional e-commerce product listing main photo that meets Allegro and Amazon standards. No text, no watermarks, no props, no people. Just the product on pure white.
${baseInstruction}`,

    'amazon-main': `${productHint}
This MUST be an Amazon-compliant main product image. Pure white background (#FFFFFF) covering 100% of the background with absolutely zero off-white areas. The product must fill at least 85% of the image frame. Perfectly even, shadowless studio lighting from multiple professional softboxes. Only an extremely subtle contact shadow directly beneath the product. No text, no logos, no borders, no props, no lifestyle elements. Pure clean clinical product photography. This must pass Amazon's automated image verification.
${baseInstruction}`,

    'ecommerce-clean': `${productHint}
Replace the background with a clean, very light grey (#F5F5F5) seamless background. Even soft studio lighting. The product should be centered and fill about 75-80% of the frame. Add a subtle soft shadow underneath. Professional e-commerce product photography style — clean, minimal, trustworthy. Perfect for any online store listing.
${baseInstruction}`,

    'ecommerce-gradient': `${productHint}
Replace the background with an elegant subtle gradient — white at the top fading to very light warm grey at the bottom. Professional studio lighting from the upper left. The product centered, filling about 75% of frame. A natural soft shadow underneath. Modern, clean e-commerce style that looks premium but not extravagant. Perfect for Shopify or branded online stores.
${baseInstruction}`,

    'lifestyle-table': `${productHint}
Place the product on a beautiful warm-toned natural wooden table surface. Warm golden morning light streaming from a window on the right. Shallow depth of field — the product is in sharp focus, the background is softly blurred. Cozy, inviting atmosphere. A small decorative element (plant or cup) slightly out of focus in the far background. Lifestyle product photography that shows the product in a real-life context.
${baseInstruction}`,

    'lifestyle-minimal': `${productHint}
Place the product on a clean light surface in a bright, airy, minimalist room setting. Soft natural daylight from a large window. Very subtle, tasteful environment — perhaps a glimpse of a white wall and a small green plant far in the background, all beautifully out of focus. The product is the clear hero of the image. Scandinavian-inspired lifestyle product photography.
${baseInstruction}`,

    'lifestyle-outdoor': `${productHint}
Place the product on a beautiful natural surface outdoors — aged wood, stone, or a garden table. Warm golden hour sunlight creating a gentle warm glow and long soft shadows. Lush green foliage beautifully blurred in the background with gorgeous bokeh. Relaxed, natural, aspirational lifestyle photography. The product should feel at home in this outdoor setting.
${baseInstruction}`,

    'luxury-marble': `${productHint}
Place the product on an elegant white Carrara marble surface with subtle grey veins. Soft, diffused studio lighting from the upper left with warm undertones. Viewing angle slightly from above. A sophisticated, luxurious, high-end aesthetic. The product should look expensive and desirable. Subtle warm bokeh or gentle out-of-focus elements in the far background. Premium commercial product photography.
${baseInstruction}`,

    'luxury-dark': `${productHint}
Place the product on a luxurious black velvet or dark leather surface. Dramatic moody lighting — a single key light from the upper left creating elegant highlights and deep shadows. Subtle golden warm rim light on the edges. Very dark, mysterious, high-end luxury atmosphere. The product should look prestigious and exclusive. Dark luxury brand product photography.
${baseInstruction}`,

    'luxury-silk': `${productHint}
Place the product on flowing ivory or champagne colored silk fabric with beautiful soft folds catching the light. Soft warm studio lighting creating gentle highlights on the silk. Elegant, sensual, premium aesthetic. The product should feel luxurious and special. High-end fashion brand product photography style.
${baseInstruction}`,

    'seasonal-christmas': `${productHint}
Place the product in a festive Christmas setting — on a rich dark green or burgundy velvet surface. Warm golden bokeh Christmas lights softly glowing in the background. Small pine branch or cinnamon sticks as subtle props at the far edges. Festive, warm, gift-giving atmosphere. The product should look like the perfect Christmas gift. Holiday commercial photography.
${baseInstruction}`,

    'seasonal-spring': `${productHint}
Place the product on a light surface surrounded by fresh spring elements — small pastel flowers (tulips, cherry blossoms) subtly placed around the far edges. Bright, fresh natural daylight. Light, airy, optimistic spring atmosphere. Soft pastel tones. The product should feel fresh and new. Spring seasonal product photography.
${baseInstruction}`,

    'seasonal-summer': `${productHint}
Place the product in a bright summer setting — on a light wooden surface with warm sunlight. Subtle summer elements in the far background: a small seashell, a hint of blue sky, tropical leaf edge. Bright, warm, vacation-mood atmosphere. Saturated warm colors. The product should feel summery and desirable. Summer lifestyle product photography.
${baseInstruction}`,

    'social-aesthetic': `${productHint}
Create an Instagram-worthy aesthetic product photo. Place the product on a visually stunning surface — terrazzo, colorful tiles, or textured concrete. Bold but tasteful styling. Eye-catching colors and composition. Shallow depth of field with gorgeous bokeh. The kind of image that makes people stop scrolling. Trendy, aspirational, share-worthy aesthetic. Instagram product photography.
${baseInstruction}`,

    'social-flatlay': `${productHint}
Create a beautiful flat lay (top-down) product photo. Place the product in the center on a clean surface. Arrange 2-3 small complementary props around it (relevant to the product category — but keep focus on the main product). Even soft lighting from above. Symmetrical, balanced, instagram-worthy composition. Flat lay product photography.
${baseInstruction}`,

    custom: '',
  }
}

export type RunPhotoStudioSceneParams = {
  imageBase64: string
  scene: string
  productDescription?: string
  customPrompt?: string
}

/**
 * Flux Kontext (Pro → Dev → DALL-E fallback) — to samo co Photo Studio Premium API.
 */
export async function runPhotoStudioPremiumScene(
  params: RunPhotoStudioSceneParams
): Promise<{ resultImage: string; scene: string; note?: string }> {
  const { imageBase64, scene, productDescription, customPrompt } = params

  const productHint = productDescription
    ? `The main product in this photo is: ${productDescription}. Keep this product PERFECTLY INTACT — every detail, every texture, every color, every shape must remain exactly as in the original photo.`
    : 'There is a product in this photo. Keep the product PERFECTLY INTACT — do not alter, reimagine, or change the product in any way whatsoever.'

  const scenePrompts = buildScenePrompts(productHint)

  let prompt: string
  if (scene === 'custom' && customPrompt) {
    prompt = `${productHint}\n${customPrompt}\n${baseInstruction}`
  } else {
    const sceneKey = typeof scene === 'string' ? scene : ''
    prompt = scenePrompts[sceneKey] || scenePrompts['allegro-main']
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('Brak klucza Replicate')
  }

  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
    useFileOutput: false,
  })

  let output: unknown

  try {
    output = await replicate.run('black-forest-labs/flux-kontext-pro', {
      input: {
        prompt,
        input_image: imageBase64,
        aspect_ratio: 'match_input_image',
        output_format: 'jpg',
        safety_tolerance: 2,
      },
    })
  } catch (fluxError: unknown) {
    const fluxMsg = fluxError instanceof Error ? fluxError.message : String(fluxError)
    console.error('Flux Kontext Pro failed:', fluxMsg)
    try {
      output = await replicate.run('black-forest-labs/flux-kontext-dev', {
        input: {
          prompt,
          input_image: imageBase64,
          aspect_ratio: 'match_input_image',
          output_format: 'jpg',
          output_quality: 90,
        },
      })
    } catch (devError: unknown) {
      const devMsg = devError instanceof Error ? devError.message : String(devError)
      console.error('Flux Kontext Dev also failed:', devMsg)
      return await generateFallbackWithDalle(prompt, productDescription)
    }
  }

  const imageUrl = extractReplicateImageUrl(output)
  if (!imageUrl) {
    throw new Error('Model nie zwrócił obrazu')
  }

  return { resultImage: imageUrl, scene }
}

async function generateFallbackWithDalle(
  scenePrompt: string,
  productDesc?: string
): Promise<{ resultImage: string; scene: string; note: string }> {
  const dallePrompt = `Professional product photography. ${productDesc ? `Product: ${productDesc}.` : ''} ${scenePrompt.substring(0, 500)} Ultra realistic commercial photography.`

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: dallePrompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
    style: 'natural',
  })

  const url = response.data?.[0]?.url
  if (!url) throw new Error('DALL-E no URL')

  const imgRes = await fetch(url)
  const buf = await imgRes.arrayBuffer()
  const b64 = Buffer.from(buf).toString('base64')

  return {
    resultImage: `data:image/png;base64,${b64}`,
    scene: 'fallback',
    note: 'Generated with DALL-E (no input image editing)',
  }
}
