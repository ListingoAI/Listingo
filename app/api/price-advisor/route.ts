import { NextRequest, NextResponse } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"

import openai from "@/lib/openai"
import { getPlatformContext } from "@/lib/prompts/description-generator"

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch {
              /* ignore */
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: "", ...options })
            } catch {
              /* ignore */
            }
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { productName, category, features, platform } = await req.json()

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Jesteś ekspertem od wyceny produktów e-commerce. Na podstawie nazwy produktu, kategorii, cech i platformy sprzedaży, zasugeruj optymalną cenę.

Uwzględnij:
- Typowe ceny na danej platformie i rynku docelowym
- Jakość produktu na podstawie cech
- Sezon (obecna data: ${new Date().toLocaleDateString("pl-PL")})
- Marżę sprzedawcy i prowizje platformy

Odpowiedz JSON:
{
  "suggestedPrice": 189,
  "minPrice": 149,
  "maxPrice": 249,
  "currency": "PLN",
  "confidence": 85,
  "reasoning": "Krótkie wyjaśnienie po polsku dlaczego ta cena",
  "tips": ["Tip 1 jak zwiększyć cenę", "Tip 2"],
  "seasonalNote": "Informacja o sezonie jeśli relevantna"
}`,
        },
        {
          role: "user",
          content: `Produkt: ${productName}\nKategoria: ${category}\nCechy: ${features}\n${getPlatformContext(platform || 'ogolny')}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 500,
      response_format: { type: "json_object" },
    })

    const result = JSON.parse(completion.choices[0].message.content || "{}")
    return NextResponse.json(result)
  } catch (error) {
    console.error("Price Advisor Error:", error)
    return NextResponse.json({ error: "Błąd analizy ceny" }, { status: 500 })
  }
}
