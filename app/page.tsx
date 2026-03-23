import Navbar from "@/components/shared/Navbar"
import HeroSection from "@/components/landing/HeroSection"
import FeaturesSection from "@/components/landing/FeaturesSection"
import DemoSection from "@/components/landing/DemoSection"
import BeforeAfterSection from "@/components/landing/BeforeAfterSection"
import SocialProofSection from "@/components/landing/SocialProofSection"
import PricingSection from "@/components/landing/PricingSection"
import FAQSection from "@/components/landing/FAQSection"
import CTASection from "@/components/landing/CTASection"
import Footer from "@/components/landing/Footer"

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="bg-background">
        <HeroSection />
        <FeaturesSection />
        <DemoSection />
        <BeforeAfterSection />
        <SocialProofSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
