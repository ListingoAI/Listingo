import { readFileSync, writeFileSync } from 'fs';

const p = 'c:/Users/mike9/Desktop/listingo-app/components/generate/hub/FormTabPremium.tsx';
let c = readFileSync(p, 'utf8');

// Remove stale nested wrappers after Tooltip block in features card
const old1 = `                            </Tooltip>
                          </div>
                          <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-muted-foreground/90">
                            Wpisz potwierdzone fakty, liczby i parametry. To z tych danych AI buduje opis i tytuł.
                          </p>
                          {platform === "allegro" ? (
                            <p className="mt-2 max-w-2xl rounded-lg border border-cyan-500/20 bg-cyan-950/20 px-2.5 py-2 text-[10px] leading-relaxed text-cyan-50/90">
                              <span className="font-semibold text-cyan-200/95">Allegro:</span> fakty z tego pola trafiają
                              do promptu AI (m.in. opis i tytuł).{" "}
                              <span className="text-cyan-100/80">
                                Parametry w filtrach i powiązanie z katalogiem produktu ustawiasz w formularzu oferty —
                                osobno od treści wygenerowanej tutaj.
                              </span>
                            </p>
                          ) : null}
                        </div>
                      </div>`;

const new1 = `                          </Tooltip>
                      </div>
                      <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground/85">
                        Potwierdzone fakty, liczby i parametry — stąd AI buduje opis i tytuł.{" "}
                        {platform === "allegro" ? (
                          <span className="text-cyan-100/65">Parametry filtrów Allegro dodajesz osobno w panelu wystawiania.</span>
                        ) : null}
                      </p>`;

// Fix indentation of tooltip inside new flat header
const old2 = `                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className={HUB_INFO_TRIGGER} aria-label="Pomoc: fakty o produkcie">
                                  <Info className="h-3.5 w-3.5" strokeWidth={2} />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                sideOffset={8}
                                arrowClassName={HUB_TOOLTIP_ARROW}
                                className={cn(HUB_TOOLTIP_CLASS, "max-w-[min(90vw,320px)]")}
                              >
                                <p>
                                  Materiał, wymiary, stan, zestaw, EAN — to, co możesz potwierdzić. Jedna linia = jedna
                                  cecha. Chip dodaje szablon „Etykieta: ".
                                </p>
                                <p className="mt-2 text-[12px] text-gray-300/90">
                                  <strong className="font-medium text-gray-200">Ton sprzedaży i obietnice</strong> — w
                                  polu „Kąt sprzedaży" niżej, nie tutaj.
                                </p>
                                <p className="mt-2 text-[11px] font-medium text-gray-400">Przykład:</p>
                                <p className="mt-1 whitespace-pre-line font-mono text-[11px] leading-relaxed text-gray-300/85">
                                  {FEATURES_EXAMPLE_LINES}
                                </p>
                              </TooltipContent>
                            </Tooltip>`;

const new2 = `                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className={HUB_INFO_TRIGGER} aria-label="Pomoc: fakty o produkcie">
                              <Info className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            sideOffset={8}
                            arrowClassName={HUB_TOOLTIP_ARROW}
                            className={cn(HUB_TOOLTIP_CLASS, "max-w-[min(90vw,320px)]")}
                          >
                            <p>
                              Materiał, wymiary, stan, zestaw, EAN — to, co możesz potwierdzić. Jedna linia = jedna
                              cecha. Chip dodaje szablon „Etykieta: ".
                            </p>
                            <p className="mt-2 text-[12px] text-gray-300/90">
                              <strong className="font-medium text-gray-200">Ton sprzedaży i obietnice</strong> — w
                              polu „Kąt sprzedaży" niżej, nie tutaj.
                            </p>
                            <p className="mt-2 text-[11px] font-medium text-gray-400">Przykład:</p>
                            <p className="mt-1 whitespace-pre-line font-mono text-[11px] leading-relaxed text-gray-300/85">
                              {FEATURES_EXAMPLE_LINES}
                            </p>
                          </TooltipContent>
                        </Tooltip>`;

let changed = false;

if (c.includes(old2)) {
  c = c.replace(old2, new2);
  changed = true;
  console.log('Applied fix 2 (tooltip indentation)');
} else {
  console.log('old2 NOT FOUND - skipping');
}

if (c.includes(old1)) {
  c = c.replace(old1, new1);
  changed = true;
  console.log('Applied fix 1 (remove stale wrappers)');
} else {
  console.log('old1 NOT FOUND - skipping');
}

if (changed) {
  writeFileSync(p, c, 'utf8');
  console.log('File saved.');
} else {
  console.log('Nothing changed.');
}
