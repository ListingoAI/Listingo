import fs from "fs"

const p = new URL("../app/dashboard/generate/page.tsx", import.meta.url)
const lines = fs.readFileSync(p, "utf8").split("\n")

const newNav = [
  `      <div className="-mx-1 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5">`,
  `        {TABS.map((tab) => {`,
  `          const Icon = tab.icon`,
  `          const isActive = activeTab === tab.id`,
  `          return (`,
  `            <motion.button`,
  `              key={tab.id}`,
  `              type="button"`,
  `              whileTap={{ scale: [1, 1.15, 1] }}`,
  `              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}`,
  `              onClick={() => setActiveTab(tab.id)}`,
  `              className={cn(`,
  `                "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform",`,
  `                isActive`,
  `                  ? "border-transparent bg-[rgba(16,185,129,0.1)] text-teal-200 shadow-[0_0_0_1px_rgba(45,212,191,0.45),0_0_28px_-6px_rgba(16,185,129,0.35)]"`,
  `                  : "border-white/10 bg-white/[0.03] text-muted-foreground hover:scale-[1.02] hover:border-white/20 hover:text-foreground"`,
  `              )}`,
  `            >`,
  `              <Icon className="h-4 w-4" />`,
  `              {tab.label}`,
  `            </motion.button>`,
  `          )`,
  `        })}`,
  `      </div>`,
  ``,
  `      <div className="min-w-0">`,
]

const formPremium = [
  `      {activeTab === "form" ? (`,
  `        <FormTabPremium`,
  `          productName={productName}`,
  `          setProductName={setProductName}`,
  `          category={category}`,
  `          setCategory={setCategory}`,
  `          features={features}`,
  `          setFeatures={setFeatures}`,
  `          platform={platform}`,
  `          setPlatform={setPlatform}`,
  `          tone={tone}`,
  `          setTone={setTone}`,
  `          useBrandVoice={useBrandVoice}`,
  `          setUseBrandVoice={setUseBrandVoice}`,
  `          brandVoiceData={brandVoiceData}`,
  `          loading={loading}`,
  `          loadingStep={loadingStep}`,
  `          loadingMessages={LOADING_STEPS}`,
  `          handleGenerate={handleGenerate}`,
  `          result={result}`,
  `          showPreview={showPreview}`,
  `          setShowPreview={setShowPreview}`,
  `          error={error}`,
  `          setError={setError}`,
  `          creditsRemaining={creditsRemaining}`,
  `        />`,
  `      ) : null}`,
]

const iNavStart = lines.findIndex((l) => l.includes("{/* Mobile: horizontal scroll tabs */}"))
const iNavEnd = lines.findIndex(
  (l, i) => i > iNavStart && l.includes('{activeTab === "form"')
)
if (iNavStart === -1 || iNavEnd === -1) {
  console.error("nav markers", { iNavStart, iNavEnd })
  process.exit(1)
}

const withoutNav = [...lines.slice(0, iNavStart), ...newNav, ...lines.slice(iNavEnd)]

const iForm = withoutNav.findIndex(
  (l) => l.includes('activeTab === "form"') && l.includes("?")
)
const iSocial = withoutNav.findIndex((l) => l.trim().startsWith('{activeTab === "social"'))
if (iForm === -1 || iSocial === -1) {
  console.error("form markers", { iForm, iSocial })
  process.exit(1)
}

const patched = [
  ...withoutNav.slice(0, iForm),
  ...formPremium,
  ...withoutNav.slice(iSocial),
]

let text = patched.join("\n")
text = text.replace(
  /\s*<\/div>\{\/\* end right column \*\/\}\s*\n\s*<\/div>\{\/\* end flex gap-6 \*\/\}/,
  "\n      </div>"
)

fs.writeFileSync(p, text)
console.log("ok", { iNavStart, iNavEnd, iForm, iSocial })
