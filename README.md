# DroneSynth8k

8-Kanal-Tracker für 4k/8k-Intros auf Basis der Windows-`gm.dls`, mit nachgeschaltetem **Stereo-Paulstretch** und **bitgenauem C++-Export**.
Das Projekt ist reines HTML/JS ohne Framework und ohne Build-Schritt.

> **Windows only:** Das Tool braucht die Windows-Datei `C:\Windows\System32\drivers\gm.dls`. Die Datei wird nur lokal im Browser gelesen und nirgends hochgeladen. Auch der C++-Export lädt sie zur Laufzeit von dort.

## Start

1. `index.html` im Browser öffnen. Doppelklick genügt, `file://` funktioniert.
2. **GM.DLS** klicken und `C:\Windows\System32\drivers\gm.dls` auswählen, oder die Datei ins Fenster ziehen.
   - Der Browser darf Systemdateien nicht selbst lesen. Die Datei wird danach in IndexedDB gemerkt.
3. Noten eingeben, **PLAY** drücken (oder Space).
   - **PAULSTRETCH** abwählen für trockenes Vorhören beim Tracken.
4. **EXPORT C++** lädt `dronesynth.h` herunter.

## Bedienung

| Bereich | |
|---|---|
| Kopfzeile | Play/Stop, Paulstretch an/aus, BPM, LPB (Zeilen pro Beat), ROWS (Pattern-Länge 1–256), OCT, STEP (Edit-Step), CLEAR (alle Noten löschen, Instrumente auf Piano/Standardwerte; Tempo, Länge und Paulstretch bleiben), DEMO, SAVE/LOAD (Song als JSON), WAV (Float-WAV des aktuellen Renders), EXPORT C++ |
| Tracker | 8 Kanäle, Kanal *n* spielt immer Instrument *n*. `===` = Note-Off. Klick auf einen Spaltenkopf wählt das Instrument. |
| Scope | Oszilloskop (L grün, R amber) und Lissajous (X = L, Y = R), sample-synchron zum laufenden Play/Preview |
| Instrument | Sound aus der gruppierten Liste: 128 GM-Sounds (16 Kategorien), **9 Drum Kits** (Standard, Room, Power, Electronic, TR-808, Jazz, Brush, Orchestra, SFX) und **98 GS-Variationen**. Dazu Attack/Release in ms (linear), Volume, Pan, Preview. Der Haken **ATTACK / RELEASE / VOLUME / NOTE-OFF** gilt für den ganzen Song. |
| Paulstretch | Window-Size (2^10–2^18), Stretch-Faktor (1.0–100.0), Gain (0–200 %), Diffusion (0–10: Bereich der Zufallsphasen; 10 = voll diffus, kleiner = pulsierender/metallischer; kostet im Export 0 Byte), Stereo (0–10: Stereobreite; 10 = L/R mit unabhängigen Zufallsphasen, maximal breit; 0 = L und R mit gleichen Phasen; bei 10 kostet es 0 Byte, darunter ca. 6 Byte), Smooth (0/1: gegen Lautstärke-Pulsieren, siehe unten; 0 = klassisches Paulstretch, kostet dann 0 Byte). |

Lautstärke-Wabern: Paulstretch würfelt die Phasen jedes Frequenzbands in jedem Fenster neu. Bänder, die zum selben Ton gehören, überlagern sich dadurch mal verstärkend, mal auslöschend. Das ist im Original-Paulstretch genauso. Gemessen über 50-ms-Blöcke:

| Material | Stereo gehört | Mono (L+R) |
|---|---|---|
| einzelner gehaltener Ton | ~6–8 dB | ~8–12 dB |
| Akkord (6 Töne) | ~3,5 dB | ~5,5 dB |
| Rauschen | ~1 dB | ~1,5 dB |

Jeder einzelne Kanal wabert so stark wie die Mono-Summe. In Stereo klingt es nur ruhiger, weil L und R unabhängig wabern und sich beim Hören ausgleichen. Der STEREO-Regler ändert daran nichts, er regelt nur die Breite.

Was hilft:
- **SMOOTH 1**: Statt Zufallsphasen laufen die Phasen von Fenster zu Fenster weiter (Phase Vocoder mit Phase Locking). Jedes Frequenzband dreht seine Phase um so viel weiter, wie sich die Eingabe über H Samples dreht. Dazu kommt eine zweite FFT des Eingangs H Samples später. Bänder, die zur selben Spitze im Spektrum gehören, drehen gemeinsam und behalten die Phasenlage aus dem Eingang. Dadurch bleibt ein gehaltener Ton ein durchgehender Ton und überlagert sich nicht mehr mit sich selbst.
  - Gemessen an 12 gehaltenen GM-Tönen (Stereo-Pegel in Blöcken von H/8, Fenster 2^14): Die zufällige Schwankung sinkt von 1,17 auf 0,24 dB Standardabweichung. Die regelmäßige Welligkeit im Fenstertakt liegt bei 0–0,2 dB (Klavier, Flöte, Orgel, Bass), bei Ensemble-Klängen (Chor, Synth-Strings, Pads) bei 1,2–2,3 dB, weil dort viele leicht verstimmte Stimmen im selben Band liegen.
  - Im Demo-Song (Kanäle einzeln, Spanne p95–p5 über 50-ms-Blöcke, langsame Verläufe herausgerechnet): Pad 2 11,7 → 2,0 dB, Strings 8,3 → 2,4 dB, Fretless 6,0 → 1,6 dB, Chor 7,0 → 5,5 dB. Das Drum Kit wird unruhiger (3,3 → 5,1 dB).
  - Klang: klarer und weniger verwaschen als Paulstretch, eher wie ein eingefrorener Ton. DIFFUSION, STEREO und der Zufall wirken dann nicht; das Stereobild kommt aus dem Eingang.
  - Kosten: etwa 1,6-fache Renderzeit, rund 2,5 dB mehr Pegel (GAIN anpassen) und im Export ca. 150 Byte (ASM) bzw. 265 Byte (C++).
  - Die erste Fassung von SMOOTH (Stufen 1–4, Phasen aus dem bisherigen Ausgang angeglichen, RTISI) erzeugte ein regelmäßiges Pumpen von 2–3 dB im Fenstertakt und ist ersetzt. Ältere Songs mit SMOOTH 2–4 laden als SMOOTH 1.
- Größere Fenster machen das Pulsieren nur langsamer (2^14: ~3,5 Hz, 2^17: ~1,9 Hz), nicht flacher.
- dichteres Material: Akkorde, mehrere Stimmen, Rauschanteile
- DIFFUSION 8: Bei Einzeltönen geht Mono-Wabern von ~12 auf ~8 dB zurück, der Klang wird aber etwas pulsierender

Die Tasten folgen dem FT2-Layout auf Basis der physischen Tasten, funktionieren also auch mit QWERTZ:

| Tasten | Funktion |
|---|---|
| `Z S X D C V G B H N J M` | eine Oktave |
| `Q 2 W 3 E R 5 T 6 Y 7 U` | eine Oktave höher |
| `1` / `^` | Note-Off |
| Entf / Backspace | löschen |
| Pfeiltasten, Tab, PgUp/PgDn, Home/End | Cursor bewegen |
| Num+ / Num− | Oktave wechseln |

Drum Kits nutzen die GM-Drum-Map, jede Taste ist ein eigenes Sample:

| Taste | Sound |
|---|---|
| C-2 | Kick |
| D-2 | Snare |
| F#2 | HiHat zu |
| A#2 | HiHat offen |
| C#3 | Crash |
| D#3 | Ride |

Tasten ohne Sample bleiben stumm.

Mixer-Verhalten:
- Eine neue Note schneidet die alte im selben Kanal ab.
- Note-Off startet das Release.
- Am Pattern-Ende bekommen alle Kanäle ein Note-Off, danach folgt der Release-Nachlauf.

Haken **ATTACK / RELEASE / VOLUME / NOTE-OFF** abgewählt:
- Noten setzen sofort mit voller Lautstärke ein, Volume ist immer 100 %. Pan bleibt.
- Eine Note klingt, bis die nächste Note im Kanal kommt, das Sample endet oder das Pattern zu Ende ist.
- Vorhandene Note-Offs bleiben im Pattern, werden aber ignoriert und durchgestrichen angezeigt. Neue lassen sich nicht eingeben.
- Die eingestellten Werte bleiben im Song gespeichert und gelten wieder, sobald der Haken gesetzt ist.
- Die Exporte enthalten den Code dafür dann gar nicht. Mit gesetztem Haken bleibt der Export unverändert.
- Samples pro Zeile = `floor(2646000 / (BPM*LPB))`.

## Demo-Song

Beim ersten Öffnen des Tools, solange noch kein Song im Browser gespeichert ist, wird `demos/demosong.ds8k.json` geladen. Eingebunden ist er über `demo-song.js`. Hat der Browser schon einen Song gespeichert, bleibt dieser erhalten; der Button **DEMO** lädt den Demo-Song jederzeit nach Rückfrage.

## Online stellen (Cloudflare Pages)

Die Seite ist rein statisch, ein Build ist nicht nötig.

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Repo `dronesynth8k` wählen.
3. Einstellungen:
   - Framework preset: **None**
   - Build command: *leer*
   - Build output directory: `/`
4. **Save and Deploy**.

Danach wird jeder Push auf `main` automatisch veröffentlicht. `_headers` setzt kurze Cache-Zeiten für JS/CSS, damit Updates sofort ankommen.

## Export (`dronesynth.h`)

```cpp
#include "dronesynth.h"   // linkt winmm.lib per #pragma
ds_render();              // Pass 1: gm.dls -> Buffer, Pass 2: Paulstretch -> ds_out
ds_play();                // waveOut, float32 stereo 44100 Hz; ds_pos() = aktuelle Frame-Position
```

Optionen:

| Define | Wirkung |
|---|---|
| `DS_NO_PLAYER` | Kein waveOut-Code. `ds_out` (DS_OUT_LEN Stereo-Frames, interleaved float) selbst abspielen. |
| `DS_GMDLS "pfad"` | Anderer Pfad zur gm.dls |
| `DS_LOAD` | `static void ds_load()` selbst definieren, die `ds_dls` füllt (statt CreateFile/ReadFile) |
| `DS_VERIFY` | `ds_hash()` liefert den FNV-1a-Hash von `ds_out`. Er muss dem Hash im Export-Header und in der Statuszeile des Tools entsprechen. |

Weitere Eigenschaften:
- Der Export braucht keine CRT. Alle Buffer sind statisch und liegen in .bss.
- `ds_render()` nur einmal aufrufen, weil `ds_out` aufaddiert wird.
- Die Sample-Daten werden über **feste Datei-Offsets** gelesen. Deshalb muss die `gm.dls` auf dem Zielrechner dieselbe Datei sein wie beim Export. Die Größe steht im Header-Kommentar, die Windows-Datei ist seit vielen Versionen unverändert.

### Compiler-Einstellungen (wichtig für Bitgenauigkeit)

- **MSVC:** x64, oder x86 mit `/arch:SSE2`, jeweils `/fp:precise`.
  - **Nicht** verwenden: `/fp:fast`, `/fp:contract`, `/arch:IA32` (x87), und kein `/arch:AVX2` mit älteren MSVC-Versionen, weil das FMA-Kontraktion erlaubt.
- **gcc/clang:** `-ffp-contract=off -msse2 -mfpmath=sse`

Der C++-Export rechnet auch unter MSVC x86 nur mit SSE2. Die x87-FPU lädt höchstens den Rückgabewert von `ds_sqrt`, und das hängt nicht von ihrer Präzision ab. Deshalb bleibt der Export bitgenau, wenn ein Intro vorher die FPU-Präzision ändert, zum Beispiel Direct3D 9 ohne `D3DCREATE_FPU_PRESERVE`. Ältere Exporte lieferten in diesem Fall einen anderen Hash. Der ASM-Export setzt die Präzision ohnehin selbst.

FMA verändert das Ergebnis tatsächlich. Der Test unten liefert mit `-ffp-contract=fast -march=haswell` einen anderen Hash.

## Export ASM (`dronesynth.asm`)

**EXPORT ASM** erzeugt dieselbe Musik als NASM-Quelltext für 32-Bit-x86 (x87-FPU), bitgenau zum Tool und zum C++-Export. Gemessen am Demo-Song, ohne Loader und Player, Code + Daten. Die Kompression ist mit zpaq gemessen, einem Context-Model-Kompressor wie Crinkler; die echten Crinkler-Zahlen weichen ab:

| Variante | roh | komprimiert |
|---|---|---|
| C++ (gcc -Os, x86) | ~2,7 KB | ~1,55 KB |
| ASM | ~2,3 KB | ~1,32 KB |

Hinweis zur Größe: Für Crinkler zählt die komprimierte Größe. Gleichartiger, wiederholter Code kostet dort fast nichts. Code „zusammenzufalten“ (Unterprogramme, Register-Tricks) macht ihn roh kleiner, komprimiert aber oft größer.

Gemessen am Demo-Song als fertige Exe mit Crinkler 3.0b (`/COMPMODE:SLOW`), mit Loader, Player und Startcode:

| Variante | Standard | Haken **ATTACK / RELEASE / VOLUME / NOTE-OFF** abgewählt | SMOOTH 1 |
|---|---|---|---|
| ASM | 1751 B | 1608 B | 1899 B |
| C++ (MSVC `/O1`, x86) | 2080 B | 1959 B | 2345 B |

Mit der Crinkler-Option `/TINYIMPORT` werden es jeweils rund 66 Byte weniger, die Hashes stimmen dabei. `/TINYHEADER` ist für 1k-Intros gedacht und lieferte hier Exes, die Windows nicht startet. Bei MSVC war `/O1` kleiner als `/O2` und `/Os`.

```
nasm -f win32 dronesynth.asm -o dronesynth.obj     ; mit Crinkler linken: kernel32.lib user32.lib winmm.lib
```
```cpp
extern "C" void ds_render();   // Pass 1 + Pass 2 -> ds_out
extern "C" void ds_play();     // waveOut, float32 stereo 44100 Hz
extern "C" int  ds_pos();      // aktuelle Frame-Position
extern "C" float ds_out[];
```

Optionen per `nasm -D…` oder `%define`:

| Define | Wirkung |
|---|---|
| `DS_NO_PLAYER` | Kein waveOut-Code |
| `DS_NOLOAD` | `ds_dls` selbst füllen |
| `DS_GMDLS "pfad"` | Anderer Pfad zur gm.dls |
| `DS_VERIFY` | `ds_hash()` liefert den FNV-1a-Hash von `ds_out`. Er muss dem Hash im Dateikopf entsprechen. |

Bitgenauigkeit mit x87:
- `ds_render` setzt die FPU auf **53-Bit-Präzision** (`fldcw 0x027F`). Damit runden `fadd`/`fsub`/`fmul`/`fdiv`/`fsqrt` exakt wie IEEE-double.
- Alle Konstanten stehen als exakte Bitmuster in der Datei.
- `(int)` wird mit `fisttp` abgeschnitten. Das braucht **SSE3**, das hat jede CPU, auf der Windows 10/11 läuft.
- Den FPU-Control-Word nicht verändern, während `ds_render` läuft.

## Wie die Bitgenauigkeit erreicht wird

`engine.js` (Tool) und der generierte C++- bzw. ASM-Code sind Zeile für Zeile gleich aufgebaut:

- Gerechnet wird nur in `double`, und zwar nur mit `+ - * /` und `sqrt`. Diese Operationen sind nach IEEE-754 korrekt gerundet, in V8 genauso wie in SSE2.
- Statt `pow`/`exp` gibt es eine eigene Polynom-Version (`mexp2`) mit fester Termanzahl.
- Die Sinustabelle entsteht per Drehungs-Rekursion aus zwei exakten Konstanten sin(π/N) und cos(π/N). Das Tool berechnet sie mit seinem eigenen Polynom-Sinus (`msin`), die Exporte bekommen sie als Bitmuster. So braucht der exportierte Code gar keine Sinusfunktion.
- Alle Parameter sind Integer. Abgeleitete Werte (Envelope-Schritte, Pan, Rate) entstehen in beiden Sprachen mit derselben Formel in derselben Reihenfolge.
- Pass 1 ist ein Sample-Player mit linearer Interpolation, DLS-Loops, Fine-Tune, Attenuation und 44100 Hz.
- Pass 2 ist Paulstretch mit radix-2-FFT und Sinus-Fenster bei Hop N/2. Eine einzige komplexe FFT verarbeitet beide Kanäle zugleich (L im Real-, R im Imaginärteil). Die Spektren werden getrennt, und **jeder Kanal bekommt eigene Zufallsphasen**. Daraus entsteht die Stereo-Breite.
- Der Zufall kommt aus einem 32-Bit-LCG mit Seed (intern fest auf 1; jeder Seed klingt statistisch gleich). Die Phasen sind Indizes in die Sinustabelle.
- SMOOTH 1: Pro Band wird die Drehung Q = U · X1 · conj(X)² über `a / sqrt(a*a + b*b)` normiert (U = letztes Ausgangsspektrum, X = dieses Fenster, X1 = Fenster H später). Jedes Band sucht per Bergsteigen über |X|² seine Spitze und übernimmt deren Q. Das kommt ohne Winkelfunktionen aus, nur mit Grundrechenarten und Vergleichen. Bänder ohne bisherige Phase bekommen Q = 1, also die Phase des Eingangs.
- Die Ausgabe wird als float32 overlap-add direkt in den Ausgabepuffer geschrieben (`Float32Array` bzw. `float[]`, beide mit Round-to-nearest-even).

## Tests

### Windows

```sh
node test/run-windows.js
```

Das Skript braucht Node, Visual Studio mit den C++-Tools und NASM (`winget install --id NASM.NASM -e`). Beide Compiler findet es selbst, eine Developer-Konsole ist nicht nötig.

1. **Synthetische DLS:** Die Test-Songs aus `verify.js` werden mit MSVC gebaut (x64 `/O2` und `/Od`, x86 `/O2` und `/O1`) und als ASM mit NASM. Die Hashes müssen zum JS-Render passen.
2. **Echte gm.dls:** `verify-demos.js` rendert alle Songs aus `demos/`. Die Exporte laufen dabei über ihren eigenen Loader, und der waveOut-Code wird mitgelinkt, aber nicht abgespielt. Das Skript schlägt auch fehl, wenn `demo-song.js` nicht mehr zu `demos/demosong.ds8k.json` passt oder ein in `demos/` eingecheckter Export nicht mehr zum aktuellen Stand passt.

Fehlt die gm.dls, wird Teil 2 übersprungen. Der Exit-Code ist 0, wenn alles passt.

### Linux

```sh
sh test/run.sh
```

Das Skript prüft die Bitgenauigkeit ohne Windows:
1. `make-test-dls.js` erzeugt eine synthetische DLS-Datei mit demselben RIFF-Aufbau wie gm.dls.
2. `verify.js` rendert mehrere Test-Songs in Node und exportiert sie als C++ und ASM.
3. Jeder C++-Export wird mit g++ in mehreren Optimierungsstufen kompiliert. Jeder ASM-Export wird mit nasm als 32-Bit-Linux-Programm gebaut (`test/asm_test.asm`, ohne libc) und ausgeführt.
4. Die FNV-1a-Hashes von JS, C++ und ASM müssen übereinstimmen.

### Nicht automatisch geprüft

Hörtest und Crinkler-Build bleiben Handarbeit. `ds_hash()` (`DS_VERIFY`) zeigt auch dort, ob der Build noch bitgenau ist.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html`, `style.css`, `ui.js` | Oberfläche |
| `_headers` | Cloudflare-Pages-Header |
| `engine.js` | deterministische DSP: Mixer, FFT, Paulstretch, Hash, WAV |
| `dls.js` | DLS-Parser |
| `gm.js` | GM-Namen und Kategorien |
| `export.js` | C++- und ASM-Generator (Spiegel von `engine.js`) |
| `test/` | Bitgenauigkeits-Tests (`run-windows.js`, `run.sh`) |

**Wichtig:** Wer `engine.js` ändert, muss beide Generatoren in `export.js` (C++ und ASM) identisch mitändern und anschließend die Tests ausführen (`node test/run-windows.js` unter Windows, `sh test/run.sh` unter Linux).
