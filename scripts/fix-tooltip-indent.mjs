import { readFileSync, writeFileSync } from 'fs';

const p = 'c:/Users/mike9/Desktop/listingo-app/components/generate/hub/FormTabPremium.tsx';
let c = readFileSync(p, 'utf8');

// Replace the mis-indented Tooltip block in the features "Fakty i parametry" card header
const lines = c.split('\n');

// Find the line with the misindented <Tooltip> after "Fakty i parametry"
let startIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('aria-label="Pomoc: fakty o produkcie"')) {
    // walk back to find the <Tooltip> opener
    for (let j = i; j >= Math.max(0, i - 3); j--) {
      if (lines[j].trimStart().startsWith('<Tooltip>')) {
        startIdx = j;
        break;
      }
    }
    break;
  }
}

if (startIdx === -1) {
  console.log('Start not found');
  process.exit(1);
}

// Find the closing </Tooltip>
let endIdx = -1;
for (let i = startIdx + 1; i < lines.length; i++) {
  if (lines[i].trimStart().startsWith('</Tooltip>')) {
    endIdx = i;
    break;
  }
}

if (endIdx === -1) {
  console.log('End not found');
  process.exit(1);
}

console.log(`Found block lines ${startIdx + 1}–${endIdx + 1}`);

// Re-indent the block from whatever indent to 24 spaces (6 levels x 2)
const baseIndent = '                        '; // 24 spaces
const innerIndent = '                          '; // 26
const inner2 = '                            '; // 28
const inner3 = '                              '; // 30

const newBlock = [
  `${baseIndent}<Tooltip>`,
  `${innerIndent}<TooltipTrigger asChild>`,
  `${inner2}<button type="button" className={HUB_INFO_TRIGGER} aria-label="Pomoc: fakty o produkcie">`,
  `${inner3}<Info className="h-3.5 w-3.5" strokeWidth={2} />`,
  `${inner2}</button>`,
  `${innerIndent}</TooltipTrigger>`,
  `${innerIndent}<TooltipContent`,
  `${inner2}side="top"`,
  `${inner2}sideOffset={8}`,
  `${inner2}arrowClassName={HUB_TOOLTIP_ARROW}`,
  `${inner2}className={cn(HUB_TOOLTIP_CLASS, "max-w-[min(90vw,320px)]")}`,
  `${innerIndent}>`,
  `${inner2}<p>`,
  `${inner3}Materiał, wymiary, stan, zestaw, EAN — to, co możesz potwierdzić. Jedna linia = jedna`,
  `${inner3}cecha. Chip dodaje szablon \u201eEtykieta: \u201d.`,
  `${inner2}</p>`,
  `${inner2}<p className="mt-2 text-[12px] text-gray-300/90">`,
  `${inner3}<strong className="font-medium text-gray-200">Ton sprzedaży i obietnice</strong> — w`,
  `${inner3}polu \u201eKąt sprzedaży\u201d niżej, nie tutaj.`,
  `${inner2}</p>`,
  `${inner2}<p className="mt-2 text-[11px] font-medium text-gray-400">Przykład:</p>`,
  `${inner2}<p className="mt-1 whitespace-pre-line font-mono text-[11px] leading-relaxed text-gray-300/85">`,
  `${inner3}{FEATURES_EXAMPLE_LINES}`,
  `${inner2}</p>`,
  `${innerIndent}</TooltipContent>`,
  `${baseIndent}</Tooltip>`,
];

lines.splice(startIdx, endIdx - startIdx + 1, ...newBlock);
writeFileSync(p, lines.join('\n'), 'utf8');
console.log('Done — tooltip re-indented');
