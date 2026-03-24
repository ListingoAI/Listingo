import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import openai from '@/lib/openai'
import { isPaidPlan } from '@/lib/plans'

export async function POST(req: NextRequest) {
  try {
    // Auth
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: CookieOptions) { try { cookieStore.set({ name, value, ...options }) } catch {} },
          remove(name: string, options: CookieOptions) { try { cookieStore.set({ name, value: '', ...options }) } catch {} },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Sprawdź plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    if (!profile || !isPaidPlan(profile.plan)) {
      return NextResponse.json({ error: 'Photo Studio Premium wymaga planu Starter, Pro lub Scale' }, { status: 403 })
    }

    const { imageBase64, scene, productDescription } = await req.json()

    if (!imageBase64 || !scene) {
      return NextResponse.json({ error: 'Brak zdjęcia lub sceny' }, { status: 400 })
    }

    // KROK 1: GPT-4o Vision analizuje produkt ze zdjęcia
    const analysisResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Jesteś ekspertem od fotografii produktowej. Przeanalizuj zdjęcie produktu i opisz go w 2-3 zdaniach po angielsku. Skup się na: typ produktu, kolor, materiał, rozmiar, kształt. Odpowiedz TYLKO opisem produktu, nic więcej.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`,
                detail: 'low',
              },
            },
            {
              type: 'text',
              text: productDescription
                ? `This is: ${productDescription}. Describe it for a product photo scene.`
                : 'Describe this product for a professional product photography scene.',
            },
          ],
        },
      ],
      max_tokens: 200,
    })

    const productAnalysis = analysisResponse.choices[0].message.content || 'a product'

    // KROK 2: DALL-E 3 generuje profesjonalne tło/scenę
    const scenePrompts: Record<string, string> = {
      'marble-luxury': `Top-down close-up photograph of an empty elegant white Carrara marble surface. Camera angle approximately 30 degrees from above. Soft diffused natural lighting from the upper left. Very subtle warm highlights. The marble has fine grey veins. Small area visible, like a tabletop. No objects in the center — leave the center completely empty and clean. The edges of the frame can show very subtle soft shadows. Ultra realistic photograph, 8K, shallow depth of field, the far edges slightly out of focus. Commercial product photography style background.`,

      'lifestyle-coffee': `Top-down close-up photograph of a beautiful warm-toned wooden table surface, like oak or walnut. Camera angle approximately 30 degrees from above. In the far TOP-LEFT corner only — a small part of a white coffee cup edge barely visible. In the far BOTTOM-RIGHT corner — a tiny piece of a green leaf. The CENTER of the image is completely empty and clean. Warm golden morning light from the right side. Cozy cafe atmosphere. Ultra realistic photograph, shallow depth of field, the edges are softly blurred. No hands, no people, no text.`,

      'dark-premium': `Top-down close-up photograph of a luxurious dark surface — black velvet or very dark leather texture. Camera angle approximately 20 degrees from above. Dramatic single-source lighting from the upper left creating a subtle light gradient across the surface. The CENTER is completely empty. Very subtle golden-warm rim light reflections on the surface edges. Moody, high-end, luxury aesthetic. Ultra realistic photograph, 8K quality. No objects, no text, no people. Just the beautiful dark surface with dramatic lighting.`,

      'natural-eco': `Top-down close-up photograph of a natural linen or cotton fabric surface in light beige/cream color. Camera angle approximately 30 degrees from above. In the far top-right corner only — a small sprig of eucalyptus or dried lavender barely entering the frame. The CENTER is completely empty and clean. Soft, even natural daylight. Scandinavian minimalist aesthetic. Gentle fabric texture visible. Ultra realistic photograph, shallow depth of field. No people, no text. Organic and calm mood.`,

      'clean-white': `Top-down close-up photograph of a perfectly clean pure white surface. Seamless white background. Camera angle approximately 15 degrees from above. Very soft, perfectly even studio lighting with no harsh shadows — only the most subtle gradient from pure white to very slightly off-white at the edges. The ENTIRE surface is empty. This is a standard e-commerce product photography white background. Ultra clean, ultra minimal. 8K, pure white #FFFFFF feel. No objects, no texture, no dust. Commercial Amazon/Allegro listing background standard.`,

      'outdoor-nature': `Top-down close-up photograph of a beautiful weathered wooden deck or outdoor table surface. Camera angle approximately 30 degrees from above. Warm golden hour sunlight creating soft long shadows from the upper right. Lush green garden is blurred in the far background (very shallow depth of field). The CENTER of the surface is completely empty. A few tiny scattered flower petals in one far corner only. Relaxed summer afternoon atmosphere. Ultra realistic photograph, beautiful bokeh.`,

      'modern-desk': `Top-down close-up photograph of a clean modern white or very light grey desk surface. Camera angle approximately 25 degrees from above. In the far left edge — the very subtle blurred edge of a silver laptop barely visible. In the far right — a tiny corner of a small green succulent plant pot. The CENTER is completely empty and clean. Even soft office lighting. Modern minimalist workspace aesthetic. Ultra realistic photograph, shallow depth of field, clean and professional.`,

      'christmas-seasonal': `Top-down close-up photograph of a rich dark green velvet or deep burgundy red fabric surface. Camera angle approximately 25 degrees from above. Scattered around the far edges ONLY — a few tiny golden star confetti and the tip of a small pine branch in one corner. Subtle warm golden bokeh light spots in the blurred background. The CENTER is completely empty. Festive, luxurious, gift-giving mood. Ultra realistic photograph, warm and cozy lighting. No people, no text.`,

      'pastel-feminine': `Top-down close-up photograph of a soft pink marble or rose quartz surface. Camera angle approximately 30 degrees from above. In one far corner — a tiny dried pampas grass stem barely entering frame. Subtle rose-gold metallic flecks or dust barely visible on the surface edges. The CENTER is completely empty and clean. Soft, romantic, airy lighting from above. Instagram-worthy feminine aesthetic. Ultra realistic photograph, shallow depth of field, dreamy and delicate.`,

      'concrete-industrial': `Top-down close-up photograph of a raw concrete or polished grey cement surface with subtle texture. Camera angle approximately 20 degrees from above. Dramatic directional lighting from the left creating visible light/shadow gradient across the surface. The CENTER is completely empty. Tiny metallic or copper accent element barely visible in one far corner. Industrial, urban, edgy aesthetic. Ultra realistic photograph, 8K quality, modern and bold. No people, no text.`,
    }

    const prompt = scenePrompts[scene] || scenePrompts['clean-white']

    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'hd',
      style: 'natural',
    })

    const generatedImageUrl = imageResponse.data?.[0]?.url

    if (!generatedImageUrl) {
      throw new Error('DALL-E nie wygenerował obrazu')
    }

    // KROK 3: Pobierz wygenerowany obraz i zwróć jako base64
    const bgResponse = await fetch(generatedImageUrl)
    const bgBuffer = await bgResponse.arrayBuffer()
    const bgBase64 = Buffer.from(bgBuffer).toString('base64')

    return NextResponse.json({
      backgroundImage: `data:image/png;base64,${bgBase64}`,
      productAnalysis,
      scene,
    })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dopasowanie do kontraktu błędów OpenAI
  } catch (error: any) {
    console.error('Photo Studio Error:', error)

    if (error.message?.includes('content_policy')) {
      return NextResponse.json({ error: 'Scena odrzucona przez filtr bezpieczeństwa. Wybierz inną.' }, { status: 400 })
    }

    if (error.message?.includes('rate_limit')) {
      return NextResponse.json({ error: 'Za dużo zapytań. Poczekaj chwilę i spróbuj ponownie.' }, { status: 429 })
    }

    return NextResponse.json(
      { error: 'Błąd generowania sceny. Spróbuj ponownie.' },
      { status: 500 }
    )
  }
}
