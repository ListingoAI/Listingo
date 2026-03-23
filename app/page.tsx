import { BeforeAfterSection } from "@/components/landing/BeforeAfterSection"
import { CTASection } from "@/components/landing/CTASection"
import { DemoSection } from "@/components/landing/DemoSection"
import { FAQSection } from "@/components/landing/FAQSection"
import { FeaturesSection } from "@/components/landing/FeaturesSection"
import { Footer } from "@/components/landing/Footer"
import { HeroSection } from "@/components/landing/HeroSection"
import { PricingSection } from "@/components/landing/PricingSection"
export default function Home() {
  return (
    <>
      <main className="bg-background">
        {/* HeroSection */}
        <HeroSection />

        {/* FeaturesSection — #funkcje */}
        <FeaturesSection />

        {/* DemoSection — #jak-dziala */}
        <DemoSection />

        {/* BeforeAfterSection */}
        <BeforeAfterSection />

        {/* PricingSection — #cennik */}
        <PricingSection />

        {/* FAQSection — #faq */}
        <FAQSection />

        {/* CTASection */}
        <CTASection />
      </main>

      {/* Footer */}
      <Footer />
    </>
  )
}
