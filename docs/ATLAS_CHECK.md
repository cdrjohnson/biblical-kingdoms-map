# Atlas check of the kingdom outlines

Date of check: 30 October 2026. This note records what each redrawn outline was checked against, how far it moved, and what is still approximate. The same information appears in the app: each changed keyframe's panel lists a **"Map … checked"** or **"Natural Earth"** source under "For this extent", and the References section has a group called **Reference maps and data checked**.

## Method

1. **Reference data**
   - **Natural Earth 10 m land and countries** (public domain): coasts and modern borders.
   - **Pleiades** gazetteer (CC BY 3.0) and **Wikipedia** coordinates: city positions.
   - **Wikimedia Commons maps with a stated open licence** (listed below): historical extents.
2. **Redrawn, not traced.** Each outline was drawn again by hand as a simplified polygon. No reference geometry was auto-vectorised or copied. The reference map fills were used only (a) as a visual overlay and (b) to measure the overlap (IoU, 1.0 = identical) of my own polygon with the map's coloured area.
3. **Georeferencing.** A reference map was placed by fitting its sea/land mask to Natural Earth. The fits had sea-mask IoU of about 0.77 to 0.85 (Crusader 1135 map, 830 BC map, Assyria map). Some maps could not be fitted (see "Approximate"), and those were compared by eye only.
4. **Coast clipping.** Hand-drawn polygons were clipped to Natural Earth land (buffered 0.2°) so they do not sit in the sea. Eight Mediterranean-coast vertices in the sea overlay that were more than 12 km from the modern coast were moved onto it.
5. Modern states (Israel 1949 lines, West Bank, Gaza, Golan, Lebanon, Syria, Jordan, Iraq, Saudi Arabia, Iran, Turkey, Egypt) were rebuilt from Natural Earth and simplified.

IoU values are a rough guide only: the reference maps are themselves schematic, and two maps of the same state can differ more than this.

## References used (licences as shown on Commons)

| Subject | Reference | Licence |
|---|---|---|
| Crusader states 1135 | Map Crusader states 1135-en.svg (MapMaster) | CC BY-SA 3.0 |
| Crusader states 1190 | Map Crusader states 1190-en.svg (MapMaster) | CC BY-SA 4.0 |
| Seljuks 1092 | Map of the Seljuk Empire (1092).png (Ktrinko, MapMaster) | CC BY-SA 4.0 |
| Rashidun 632-661 | Rashidun expansion 632-661.png (Geworg D. Baboomian) | CC0 |
| Caliphate 750 | Caliphate 750.jpg (Shepherd) | Public domain |
| Abbasids 850 | Abbasid Caliphate 850AD.png (Cattette) | CC BY 4.0 |
| Byzantines 565 | Byzantime Empire around 565 AD.svg | Public domain |
| Byzantines 717 | 717 byzantium (no asia minor).PNG (Gabr-el) | Public domain |
| Byzantines 1025 | Map Byzantine Empire 1025-pl.svg (Nécropotame, Cplakidas) | CC BY 3.0 |
| Byzantines 1076 | Map Byzantine Empire 1076-fr.svg (Odejea) | CC BY-SA 3.0 |
| Byzantines 1265 | Byzantine Empire 1265 AD.png (Ichthyovenator) | CC BY-SA 4.0 |
| Byzantines 1355 | Byzantine empire 1355.jpg (Shepherd) | Public domain |
| Levant 830 BC | Kingdoms around Israel 830 map.svg | CC BY-SA 3.0 |
| Assyria 824-671 BC | Neo-Assyrian map 824-671 BC.png (Nigyou) | CC BY-SA 3.0 |
| Babylon under Nabonidus | Neo-Babylonian Empire under Nabonidus map.png (Ichthyovenator, Sémhur) | CC BY-SA 4.0 |
| Achaemenid Persia | Achaemenid Empire En.svg (Anton Gutsunaev, Uirauna) | CC BY-SA 3.0 |
| Safavid Iran | Safavid Empire 1501 1722 AD.png | Public domain |
| Zand Iran | Map of the Zand dynasty.png | Public domain |
| Afsharid Iran | Afsharid dynasty (greatest extent).svg (Ali Zifan) | CC BY-SA 4.0 |
| Rome | Extent of the Roman Republic and the Roman Empire between 218 BC and 117 AD.png (Varana) | CC BY-SA 3.0 |
| Fatimids | Fatimid Caliphate.PNG (Omar-toons); Fatimid Islamic Caliphate.png (Yenemus) | CC BY-SA 4.0; public domain |
| Ayyubids 1193 and 1188 | Ayyubid Sultanate 1193 AD.jpg (Ro4444); Ayyubid Greatest Extent 1188.png (Arab League, altered) | CC BY-SA 4.0; public domain |
| Mamluks 1317 | Mamluk Sultanate of Cairo 1317 AD.jpg (Ro4444) | CC BY-SA 4.0 |
| Coasts, modern borders | Natural Earth 10 m land and countries | Public domain |
| City coordinates | Pleiades; Wikipedia | CC BY 3.0; CC BY-SA |

## Outlines that changed

"Area" is in square degrees (about 10,000 km² per square degree near 30°N, so compare shapes, not km²). "IoU old/new" is the overlap between the old and new polygon, so a low value means a large move.

### Priority (a): medieval and modern

| Kingdom (years) | Checked against | Result |
|---|---|---|
| Crusader states, 9 keyframes 1099-1291 | Crusader 1135 and 1190 maps; Natural Earth coast | All nine outlines are new, one per phase (Jerusalem, Antioch, Tripoli, Edessa). Overlap with the 1135 map: **0.20 → 0.65** in total (Jerusalem 0.30 → 0.55, Antioch and Tripoli 0.18 → 0.53, Edessa 0.00 → 0.73). The 1244-1291 phases are visual only (no map used). |
| Seljuks, 4 keyframes 1040-1157 | Seljuk 1092 map; Natural Earth | New outlines. Visual comparison only; the 1092 extent is partly guided by modern country polygons. |
| Caliphates (Rashidun, Umayyad, Abbasid, later Abbasid core) | Rashidun 632-661, Caliphate 750, Abbasid 850 maps | Larger and shifted: IoU old/new 0.76, 0.77, 0.78. The 868-1258 core shrank from 53.6 to 34.8 (IoU 0.56). |
| Byzantines, 13 phases 395-1453 | 565, 717, 1025, 1076, 1265 and 1355 maps | Phases 395-568, 636-1071 and 1204-1453 are new. The 614-629 phase grew from 130 to 199 (IoU 0.43) and 629-636 changed from 324 to 337 (IoU 0.50). 1071-1204 changed slightly (IoU 0.61). |
| Gaza, West Bank, Golan, Israel inside the 1949 lines | Natural Earth, with the same status wording as before | Israel 1949 area 3.2 → 1.9 (IoU old/new 0.53; the old shape was too large). New outline overlaps Natural Earth Israel at 0.91, up from 0.52. West Bank IoU old/new 0.75, Gaza 0.35, Golan 0.61. |
| Lebanon, Syria, Jordan, Iraq, Saudi Arabia, Iran, Turkey, Egypt | Natural Earth country polygons | Overlap with Natural Earth, old → new: Lebanon 0.43 → 0.97, Jordan 0.78 → 0.99, Turkey 0.82 → 0.98, Iran 0.88 → 0.99, Syria 0.90 → 0.99, Iraq 0.90 → 0.99, Saudi Arabia 0.92 → 0.99, Egypt 0.92 → 0.99. Mandate Palestine (1918-1948) shrank from 4.1 to 2.5 (IoU 0.60). |

### Priority (b): Iron Age

Overlap with the 830 BC map, old → new:

| Kingdom | Old → new |
|---|---|
| Israel | 0.50 → 0.79 |
| Judah | 0.53 → 0.85 |
| Philistia | 0.35 → 0.62 (the new outline is widened slightly inland so that Gath and Ekron are inside, at a small cost in overlap) |
| Moab | 0.59 → 0.75 |
| Edom | 0.33 → 0.93 |
| Ammon | 0.38 → 0.84 |
| Aram | 0.31 → 0.76 |
| Phoenicia | 0.21 → 0.41 (area 1.4 → 0.2; the old shape was far too big) |

Other keyframes of these kingdoms were redrawn from the same shapes, so Judah, Israel, Moab, Edom, Ammon, Aram, Philistia and Phoenicia now agree with each other at their borders. Judah's 609-586 BC outline follows the Lachish letters (Azekah and Lachish still holding).

Assyria, against the 824-671 BC map: **824 BC 0.36 → 0.54; 671 BC 0.48 → 0.71**. The Assyria keyframes grew by about 50% in area (27 → 41 at 883-745 BC; 75 → 116 at 745-671 and 655-612 BC; 89 → 130 at 671-655 BC).

Babylon, 605-539 BC: now follows the Nabonidus map (area 75 → 92, IoU old/new 0.59). It could not be georeferenced numerically (hand-placed, about 0.5° accuracy).

### Priority (c): empires

| Kingdom | Result |
|---|---|
| Persia (Achaemenid) | -525 to -404 split at -479, adding Thrace and Macedonia before the Persian Wars and Cyrenaica from Cambyses. Later Persia keyframes also gain Cyrenaica (area +3%, IoU 0.97). Checked against the Achaemenid map by eye. |
| Rome | Compared against the Varana map and judged consistent. **Not changed.** |

### Gaps filled

| Gap | What was added |
|---|---|
| Ottomans before 1517 | Four new keyframes: 1299-1354, 1354-1402, 1402-1453, 1453-1517, drawn from the Wikipedia articles on the rise of the Ottomans and the Interregnum, and the Natural Earth coast. No open per-phase map was found, so these are the least checked of the new outlines. |
| Iran 1501-2027 | Eight keyframes (Safavid 1501-1534, 1534-1590, 1590-1722; Hotak/Afsharid 1722-1736 and 1736-1747; Zand 1747-1794; Qajar 1794-1828 and 1828-2027, the last on the Natural Earth border). Checked by eye against the Safavid, Zand and Afsharid maps and Natural Earth. |

## Second pass (batches)

The kingdoms the first pass left alone were checked in batches, each built, tested and deployed before the next.

### Batch 1: Fatimid, Ayyubid, Mamluk, Cyprus

| Kingdom (years) | Checked against | Result |
|---|---|---|
| Fatimids, 3 phases 969-1171 | Ayyubid 1193 and Mamluk 1317 maps for the Egypt, Cyrenaica and Hejaz shapes; the two Fatimid maps on Commons by eye; Natural Earth coast | The old single block is replaced by 969-1048 (with Ifriqiya until the Zirid break), 1048-1099 and 1099-1171 (Egypt and Ascalon). **No overlap was measured**: the Fatimid maps are schematic and could not be georeferenced (best fit IoU 0.42), so the Maghreb and Levant edges are approximate. |
| Ayyubids, 4 phases 1171-1250 | Ayyubid 1193 map (measured), Ayyubid 1188 map (by eye) | Egypt, Cyrenaica, the Hejaz, Yemen, Syria and the Jazira are now separate shapes along their real coasts. Overlap with the 1193 map: **0.40 → 0.76**. A Tripolitanian strip (1171-1188) follows the 1188 map, which could not be overlaid exactly. |
| Mamluks, 4 phases 1250-1517 | Mamluk 1317 map (measured) | 1250-1260 Egypt and the Hejaz; 1260-1291 with Syria; 1291-1400 with Cyrenaica and Nubia (the 1317 extent); 1400-1517 with Cilicia. Overlap with the 1317 map: **0.37 → 0.72**. The Nubian edge is approximate. |
| Kingdom of Cyprus (new), 1192-1489 and 1489-1571 | Natural Earth island outline; Wikipedia | New kingdom; its extent is the island. No open map of the kingdom was found. The same real outline now replaces the rectangle used for Cyprus under Rome and the Ptolemies. The Crusader panel no longer says Cyprus is not drawn. |

## City coordinates fixed

About 100 cities were compared with Pleiades, and every city with a Wikipedia coordinate was compared with that. Most agreed within 2 km. These were moved:

| City | Old (lon, lat) | New | Move |
|---|---|---|---|
| Mari | 40.90, 34.45 | 40.89, 34.55 | about 11 km |
| Kadesh-barnea (city and the Exodus stop) | 34.42, 30.69 | 34.41, 30.64 | about 6 km |
| Beersheba | 34.79, 31.25 | 34.84, 31.25 | about 5 km |
| Ashdod | 34.65, 31.80 | 34.66, 31.76 | about 5 km |
| Thebes | 32.64, 25.70 | 32.66, 25.72 | about 3 km |
| Ashkelon | 34.57, 31.67 | 34.55, 31.67 | about 2 km |

The Beersheba and Joppa edges of the David, Judah and Hasmonean outlines were nudged to match.

## Bug found along the way

Modern Israel and ancient Israel shared one id (`israel`), so the modern outline's panel could open the wrong kingdom. The modern one is now `israel49`, and an end-to-end test checks it.

## Still approximate

- **Ottomans before 1517**: written from article text and coasts only.
- **Iran**: the Safavid map could not be georeferenced (IoU 0.31, because the map leaves Arabia white), so Iran's phases were checked by eye. Persian lands east of 58°E are outside the map frame and approximate.
- **Seljuk, caliph and Iran outlines** use modern country polygons as a rough guide in places.
- **Byzantine phases** other than 1025, 1076 and 1265 are hand-drawn blocks checked visually, not by overlap.
- **Babylon**: hand-placed on its map, about 0.5° accuracy.
- **Iron Age Transjordan under Israel** follows the 830 BC map, although 2 Kings 10:32-33 says Hazael took Gilead.
- **Moab** early (-1300 to -850), and the older Israel, Philistia and Aram shapes, were not redrawn. Medeba and Heshbon lie outside Moab at -850 to -580 because the 830 BC map shows them north of Moab. Ezion-geber lies just outside the new Edom shape.
- **Not re-checked in this pass**: Fatimid, Ayyubid, Mamluk, Rome, Medes, Parthia, Hittites, Egypt's ancient outlines and the smaller kingdoms. The islands list was not replaced and Cyprus is not drawn for the Crusader kingdom.
- Ancient kingdoms rarely had fixed borders. Every outline is a simplified guess at a zone of control, and scholars disagree on many.
