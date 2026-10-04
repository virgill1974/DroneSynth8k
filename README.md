# DroneSynth8k

8-Kanal-Tracker für 4k/8k-Intros auf Basis der Windows-`gm.dls`, mit nachgeschaltetem **Stereo-Paulstretch** und **bitgenauem C++-Export**.
Das Projekt ist reines HTML/JS ohne Framework und ohne Build-Schritt.

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
| Kopfzeile | Play/Stop, Paulstretch an/aus, BPM, LPB (Zeilen pro Beat), ROWS (Pattern-Länge 1–256), OCT, STEP (Edit-Step), SAVE/LOAD (Song als JSON), WAV (Float-WAV des aktuellen Renders), EXPORT C++ |
| Tracker | 8 Kanäle, Kanal *n* spielt immer Instrument *n*. `===` = Note-Off. Klick auf einen Spaltenkopf wählt das Instrument. |
| Instrument | GM-Sound aus der nach GM-Kategorien gruppierten Liste, Attack/Release in ms (linear), Volume, Pan, Preview |
| Paulstretch | Window-Size (2^10–2^18), Stretch-Faktor (1.0–100.0), Seed, Gain |

Die Tasten folgen dem FT2-Layout auf Basis der physischen Tasten, funktionieren also auch mit QWERTZ:

| Tasten | Funktion |
|---|---|
| `Z S X D C V G B H N J M` | eine Oktave |
| `Q 2 W 3 E R 5 T 6 Y 7 U` | eine Oktave höher |
| `1` / `^` | Note-Off |
| Entf / Backspace | löschen |
| Pfeiltasten, Tab, PgUp/PgDn, Home/End | Cursor bewegen |
| Num+ / Num− | Oktave wechseln |

Mixer-Verhalten:
- Eine neue Note schneidet die alte im selben Kanal ab.
- Note-Off startet das Release.
- Am Pattern-Ende bekommen alle Kanäle ein Note-Off, danach folgt der Release-Nachlauf.
- Samples pro Zeile = `floor(2646000 / (BPM*LPB))`.

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

FMA verändert das Ergebnis tatsächlich. Der Test unten liefert mit `-ffp-contract=fast -march=haswell` einen anderen Hash.

## Wie die Bitgenauigkeit erreicht wird

`engine.js` (Tool) und der generierte C++-Code sind Zeile für Zeile gleich aufgebaut:

- Gerechnet wird nur in `double`, und zwar nur mit `+ - * /` und `sqrt`. Diese Operationen sind nach IEEE-754 korrekt gerundet, in V8 genauso wie in SSE2.
- Statt `sin`/`pow`/`exp` gibt es eigene Polynom-Versionen (`msin`, `mexp2`) mit fester Termanzahl. Die Abweichung liegt unter 5e-14.
- Alle Parameter sind Integer. Abgeleitete Werte (Envelope-Schritte, Pan, Rate) entstehen in beiden Sprachen mit derselben Formel in derselben Reihenfolge.
- Pass 1 ist ein Sample-Player mit linearer Interpolation, DLS-Loops, Fine-Tune, Attenuation und 44100 Hz.
- Pass 2 ist Paulstretch mit radix-2-FFT und Sinus-Fenster bei Hop N/2. Eine einzige komplexe FFT verarbeitet beide Kanäle zugleich (L im Real-, R im Imaginärteil). Die Spektren werden getrennt, und **jeder Kanal bekommt eigene Zufallsphasen**. Daraus entsteht die Stereo-Breite.
- Der Zufall kommt aus einem 32-Bit-LCG mit Seed. Die Phasen sind Indizes in die Sinustabelle.
- Die Ausgabe wird als float32 overlap-add direkt in den Ausgabepuffer geschrieben (`Float32Array` bzw. `float[]`, beide mit Round-to-nearest-even).

## Tests

```sh
sh test/run.sh
```

Das Skript prüft die Bitgenauigkeit ohne Windows:
1. `make-test-dls.js` erzeugt eine synthetische DLS-Datei mit demselben RIFF-Aufbau wie gm.dls.
2. `verify.js` rendert mehrere Test-Songs in Node und exportiert sie als C++.
3. Jeder Export wird mit g++ in mehreren Optimierungsstufen kompiliert. Die FNV-1a-Hashes von JS und C++ müssen übereinstimmen.

Den echten Hörtest mit der originalen gm.dls und Crinkler macht man unter Windows:
- Export mit `#define DS_VERIFY` bauen.
- `ds_hash()` mit dem Hash im Header vergleichen.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html`, `style.css`, `ui.js` | Oberfläche |
| `engine.js` | deterministische DSP: Mixer, FFT, Paulstretch, Hash, WAV |
| `dls.js` | DLS-Parser |
| `gm.js` | GM-Namen und Kategorien |
| `export.js` | C++-Generator (Spiegel von `engine.js`) |
| `test/` | Bitgenauigkeits-Tests |

**Wichtig:** Wer `engine.js` ändert, muss `export.js` identisch mitändern und anschließend `test/run.sh` ausführen.
