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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://listingo.pl"

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Listingo",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Jeden asystent AI pod opisy, social media, ceny i zdjęcia. Allegro, Shopify, WooCommerce. Plan darmowy z limitami.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "PLN",
    description: "Plan darmowy z limitami",
  },
  url: siteUrl,
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main id="main-content" className="bg-background" tabIndex={-1}>
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
