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
| Medes | Median Empire-en.svg (Szajci, WillemBK); Median Empire.svg (Crates), listed only as the disagreeing map | CC BY-SA 3.0; CC BY-SA 4.0 |
| Lydia | Lydian kingdom-pt.svg (Szajci) | CC BY 3.0 |
| Parthia | Map of the Parthian Empire under Mithridates II.svg (Ro4444, edited); Map Parthian Empire-fr.png (Fabienkhan) | CC BY-SA 4.0; CC BY-SA 2.5 |
| Urartu | Urartu 743-en.svg (Sémhur) | CC BY-SA 4.0 |
| Alexander's empire | Alexander-Empire 323bc.jpg (Thomas Lessman) | CC BY-SA 3.0 |
| Elam | Elam Map-en.svg (Sémhur, Wkotwica, Morningstar1814) | CC BY-SA 3.0 |
| Roman Judea AD 6-41 | Judaea Roman Province.svg (DEGA MD) | CC BY-SA 4.0 |
| Islands | Natural Earth 10 m land | Public domain |
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

### Batch 2a: Israelite tribes, Saul, David, Solomon, Israel, Philistia, Moab, Aram, Edom

Reference maps: Biblica Open Bible Maps 05, 06 and 07 (Biblica, Inc. and Biblica Open Study Bible Resources, CC BY-SA 4.0), each fitted to the coast and cities by control points (residual under 0.05 deg), and the Philistie Fer II site map (CC BY-SA 4.0, on Eric Gaba's relief base) for the Philistine sites. Outlines were redrawn by hand; the maps' fills were used only to measure overlap.

| Kingdom (years) | Checked against | Result |
|---|---|---|
| Israelite tribes, c. 1200-1050 BC | Biblica Map 05 (tribal allotments) | Redrawn to the allotments of Joshua 13 to 19 as drawn there. Overlap **0.52 → 0.96**. The panel says this is the biblical ideal, not a settlement survey. |
| Saul, 1050-1010 BC | Biblica Map 06 (Saul fill) | Central hills, Gilead and the Jezreel edge, drawn as one outline. Overlap **0.37 → 0.89**. |
| David, 1010-970 BC | Biblica Map 06 (David fill, which includes Saul's land) | Overlap **0.49 → 0.93**. |
| Solomon's sphere (dashed), 970-931 BC | Biblica Map 06 (green zone) | Overlap **0.21 → 0.90**. Still marked contested. |
| Israel (north), 931-841 and 753-732 BC | Biblica Map 07 | Overlap **0.48 → 0.89**. The map's fill south of Medeba is drawn dashed and only from Omri (Mesha Stele). |
| Philistia, c. 1175-1000 BC | Philistie Fer II site map; Natural Earth coast | No open area map exists for this period, so the outline is a hull of the 17 mapped sites (Tel Qasile to Tell el-Farah south, Lachish) plus a 0.13 deg margin, clipped to land. The five cities lie inside. Not an overlap measurement. |
| Moab before Mesha, c. 1300-850 BC | 830 BC map (Moab fill) | Cut from that fill at the Arnon (31.47 N). Derived, no early map exists. |
| Aram before and after Hazael | 830 BC map (Aram fill) | The part north of the Yarmuk (32.7 N). Derived, approximate. |
| Edom | 830 BC map, Wikipedia (Ezion-Geber) | Overlap with the 830 BC fill 0.33 → 0.93. The 830 BC map stops at 30.1 N, so the outline is extended by hand along the Arabah to the head of the Gulf of Aqaba: **Ezion-geber now lies inside Edom**, supported by 1 Kings 9:26 and Wikipedia only (no map reaches it; the site is debated). |

Disputed or debated notes were added to the Israel and Aram panels: 2 Kings 10:32 to 33 says Hazael took all of Gilead, while the 830 BC map leaves Israel a strip east of the Jordan. The outlines follow the map and the panels say the question is open.

### Batch 2b: Hasmonean Judea, Nabataea, Herodian Kingdom

Reference maps: Map Hasmonean Kingdom-es.svg (Redtony, CC BY-SA 3.0; seven shaded phases from Judas Maccabeus to Alexander Jannaeus), Hyrcanus II Map.png and Herodian Kingdom.png (Rh0809, CC BY-SA 4.0; both simplified illustrations, fitted by their city icons to about 0.1 degrees), and Nabatean Kingdom map.jpg (F. Villeneuve and L. Nehmé, IFPO, CC BY-SA 4.0). Outlines were redrawn by hand from interval scans of the maps; the fills were used only to measure overlap.

| Kingdom (years) | Checked against | Result |
|---|---|---|
| Hasmonean, Judas Maccabeus, 167-145 BC | Hasmonean map, first fill | Overlap **0.37 → 0.91**. |
| Hasmonean, Jonathan and Simon, 145-134 BC | first two fills | Overlap **0.34 → 0.85**. Simon's small additions are merged. |
| Hasmonean, John Hyrcanus I, 134-104 BC | first four fills | Overlap **0.63 → 0.89**. The map's "possible annexations" of Hyrcanus (lower Galilee) are dashed. |
| Hasmonean, Aristobulus I, 104-103 BC | first five fills | Overlap **0.54 → 0.89**. |
| Hasmonean, Alexander Jannaeus, 103-63 BC | all seven fills | Overlap **0.63 → 0.87**. The map stops at about 36.1 E, so the Transjordan edge is approximate. |
| Judea after Pompey, 63-37 BC | Hyrcanus II map | Judea with Idumea, Galilee and Perea, without Samaria and the coast. Overlap **0.44 → 0.83**. |
| Herod's kingdom, 37-4 BC and AD 41-44 | Herodian Kingdom map | Now includes the Gaza coast, the Golan and the Hauran edge as that map draws them. Overlap **0.68 → 0.92**. |
| Syria Palaestina, AD 135-395 | none | This phase used Herod's old outline; the old outline is kept as its own shape and marked "not re-checked". |
| Nabataea at its maximal extent, 87-72 BC (new phase) | Nabatean Kingdom map (limit line only) | Drawn from the map's limit line: Damascus and the Hauran, the Negev, Sinai to the Gulf of Suez, the Hejaz to Hegra. The map has no fill, so the old outlines are compared by area: NAB1 and NAB2 lay wholly inside it, covering **14% and 32%**. The map ends near 39.6 E, so the east edge is a straight closing line. |
| Nabataea 168-87 and 72-63 BC; 63 BC-AD 106 | none | Old outlines kept, marked approximate. No open map shows these phases. |

### Batch 3a: Hittites, Mitanni, Egypt in the New Kingdom, the Ptolemies

Reference maps: Map Hittite rule en.svg (Sémhur base map, Ikonact, CC BY-SA 3.0), Carte du Mitanni.png (Sémhur base map, Zunkir, CC BY-SA 3.0), Hitt Egypt 1450 bc.svg (ArdadN, public domain) and Ptolemaic Kingdom III-II century BC (Kaidor, CC BY-SA 3.0). The maps were fitted to longitude and latitude with city control points (residuals mostly under 0.15 degrees); the outlines were redrawn by hand and clipped to Natural Earth land, and the fills were used only to measure overlap.

| Kingdom (years) | Checked against | Result |
|---|---|---|
| Hittites, c. 1350-1300 BC | green line on the Hittite rule map | Overlap **0.64 → 0.97**. |
| Hittites, maximum area of rule, 1300-1180 BC | light green on the same map | Overlap **0.74 → 0.89**. The edges of vassal lands are approximate. Cyprus is added for the last decades because the map shades it. |
| Hittite Old Kingdom, 1650-1350 BC | none | Old outline kept and marked "not re-checked"; it overlaps the 1350 BC outline only 0.58. |
| Mitanni, new kingdom entry, c. 1500-1260 BC | Carte du Mitanni | Maximal extension (overlap **0.96**) and heartland (**0.95**). The map gives one time slice, so the dating of the phases is approximate. |
| Egypt, c. 1479-1425 BC (Thutmose III) | Hitt Egypt 1450 bc map | Overlap **0.19 → 0.96**: Nubia, the Red Sea coast, Canaan and Syria to the Euphrates. |
| Egypt, other New Kingdom phases | none | Old outline kept, marked "not re-checked". |
| Ptolemaic Egypt and Cyrenaica, 305-30 BC | Kaidor map | Overlap **0.31 → 0.92**. Desert borders are nominal. |
| Ptolemaic Coele-Syria, 305-200 BC | Kaidor map (green) | Overlap **0.67 → 0.77**. |

### Batch 3b: Egypt, Middle Kingdom to the Late Period

Reference maps: Ancient Egypt old and middle kingdom-en.svg (RedTony, CC BY-SA 4.0), Third Intermediate Period map.svg (Jeff Dahl, CC BY-SA 4.0) and Egypt kush.svg (Lommes, CC BY-SA 4.0). None of them has usable city control points, so each was fitted to longitude and latitude by matching its coastline to Natural Earth land (agreement 0.95, 0.99 and 0.93 of sampled pixels), with the city icons as a check (about 0.3 degrees off at worst). The Old Kingdom is before the map's 2000 BC start, so it is not drawn.

| Kingdom (years) | Checked against | Result |
|---|---|---|
| Egypt, Middle Kingdom, 2000-1650 BC | Old and Middle Kingdoms map (Old Kingdom area, Nile, annexed Lower Nubia) | Overlap **0.17 → 0.95**. The outline is now the map's whole Egypt (delta, Sinai, desert borders) with Lower Nubia to the Second Cataract; the old outline hugged the valley. The desert borders are nominal. |
| Egypt, Second Intermediate Period, 1650-1550 BC | same map, Old Kingdom area | Overlap **0.17 → 0.96**. The map shows the Hyksos only as arrows, so the division is not drawn. |
| Egypt, Third Intermediate Period, 1150-744 BC | Third Intermediate Period map | The map's coloured Delta and Valley zones lie **82%** inside the first new outline and **99.9%** inside the final one (the delta edge was extended). The local rulers are not drawn separately. |
| Egypt and Kush, 25th Dynasty, 744-656 BC | Egypt kush map | The map is a blurred schematic. Overlap of the Nubian part **0.28 → 0.93**. The south edge is cut at 16 N, near Meroe, the map's southernmost city; the real limit is poorly known. |
| Egypt, 656-525 BC and 404-343 BC | same outlines | Uses the new Egypt outline, since no open map shows these phases separately. |
| Necho II in Syria, 609-605 BC | none | Egypt part redrawn; the Syrian part is kept and marked "not re-checked". |
| New Kingdom outside the Thutmose III years | none | The Egypt part now uses the new outline; the Syrian part is unchanged and marked "not re-checked". |

Egypt also appears in the Neo-Assyrian, Achaemenid and Alexander outlines; those now use the same new Egypt outline. The old Sinai patch was dropped because the new outline includes Sinai.

### Batch 3c: Seleucid Empire

Reference map: Seleucid Empire 200-64 BC - ru.svg (Kaidor, CC BY-SA 3.0). It shows four nested extents: the state c. 200 BC after Antiochus III's eastern campaign, the state after Apamea (188 BC), the state at the end of the 2nd century BC, and the territory before the Roman province of 64 BC. The map was fitted to longitude and latitude with 29 city control points and a degree-2 fit (residuals mostly under 0.15 degrees, at worst 0.27); the coast agreed with Natural Earth for 97% of sampled pixels in the Levant and Mesopotamia and less well in the Aegean. Each extent was taken from its fill colours and redrawn; the fills were used for overlap. East of 62 E the outline is not clipped to Natural Earth land.

| Phase (years) | Result |
|---|---|
| c. 200 to 190 BC | Overlap **0.41 → 0.96** (old outline for 301 to 200 BC against the same map). The map's yellow "dependent territories" are not included. |
| After Apamea, 190 to 141 BC | Overlap **0.46 → 0.98**. |
| 129 to 69 BC | Overlap **0.54 → 0.96**. The Armenian occupation (83 to 69 BC) is not drawn. |
| 69 to 64 BC | Overlap **0.22 → 0.92**. |
| 312 to 200 BC and 141 to 129 BC | Old outlines kept and marked "not re-checked"; the map shows no stage in these years. |

### Batch 4a: Medes and Lydia (new)

Reference maps: Median Empire-en.svg (Szajci and WillemBK, CC BY-SA 3.0) and Lydian kingdom-pt.svg (Szajci, CC BY 3.0). Both were placed on Natural Earth with a polynomial fit to the coast and the maps' own coordinates.

| Kingdom (years) | Checked against | Result |
|---|---|---|
| Medes, 585 to 550 BC | Median Empire-en map | New outline (overlap **0.41 → 0.95**). The map's extent reaches the Halys in Cappadocia, takes in northern Mesopotamia and runs down to the Gulf coast of Iran. The eastern edge (about 64 E) is approximate. |
| Medes, 612 to 585 BC | none | Old outline kept and marked "not re-checked". |
| Lydia (new kingdom), 585 to 546 BC | Lydian kingdom map | New kingdom entry (overlap **0.98**). Before 585 BC Lydia was smaller and no open map shows it, so it is not drawn. |

**Disputed or debated.** A second open map, Median Empire.svg (Crates, CC BY-SA 4.0), draws the Medes smaller in the west (no Cappadocia, no Jazira). It could not be fitted reliably (best coast agreement about 0.82), so it is listed as checked but not measured. The app draws the first map and says in the Medes panel that the two disagree; the size and even the unity of the Median state are debated and Herodotus is the main source.

### Batch 4b: Parthia

Reference maps: Map of the Parthian Empire under Mithridates II.svg (Ro4444 and a Commons editor, CC BY-SA 4.0), the empire in 94 BC; and Map Parthian Empire-fr.png (Fabienkhan, CC BY-SA 2.5), an undated extent with no title or legend on the image. The first was placed on Natural Earth with a linear fit to the coast and cities; the second with a quadratic fit to city control points (errors up to about 1 degree).

| Phase (years) | Checked against | Result |
|---|---|---|
| 124 to 91 BC | 94 BC map | New outline including the vassals as the map shades them (Armenia, Commagene, Characene, Persis and the eastern provinces). Overlap with the map **0.99**; the old outline overlaps the new one 0.51. |
| 91 BC to AD 224 | French map | New outline (overlap with the map **0.91**; the old outline overlaps the new one 0.69). Using an undated map for these centuries is an interpretation. |
| 247 to 124 BC | none | Old outlines kept, marked "not re-checked" (the early outline overlaps the 94 BC map only 0.11). |

**Disputed or debated.** The two maps disagree about Parthia's reach (the outlines overlap 0.64): the 94 BC map runs from Armenia to Arachosia and the Paradan coast; the French map stops near Herat and the Hilmand and leaves Armenia out. The Parthia panel says so and does not pick a side.

### Batch 4c: Urartu (new)

Reference map: Urartu 743-en.svg (Sémhur, CC BY-SA 4.0), "Urartu at its greatest extent during king Sarduri II, in -743". It was placed with a linear fit to 11 city control points (residuals mostly under 0.4 degree, the largest 0.5 degree).

| Kingdom (years) | Checked against | Result |
|---|---|---|
| Urartu (new kingdom), 764 to 735 BC | Urartu 743 map ("Urartu and its vassals") | New kingdom entry from the map's fill; overlap with the filled map **0.97**. It includes the small north Syrian lands (Samal, Arpad) that the map shades in the same yellow. |
| Urartu, c. 860 to 764 and 735 to 590 BC | none | Not drawn. A second map, Urartu 738-668.png (public domain, Laszlovszky András), shows overlapping hand-drawn outline strokes that could not be separated reliably, so no earlier or later phase was redrawn. |

**Disputed or debated.** The Urartu panel notes that Ararat in 2 Kings 19:37 and Jeremiah 51:27 is generally identified with Urartu, while the mountain of Genesis 8:4 is a separate question that the map does not address.

### Batch 4d: the islands list

The six hand-drawn island holes in the Mediterranean (Sicily, Crete, Cyprus, Sardinia, Corsica, Rhodes) are replaced by 26 islands taken from the Natural Earth 10 m land layer (public domain), simplified to 1.5 km and cut to the app's sea outline. Added: Malta, Samos, Chios, Cos, Lemnos, Corfu, Kefalonia, Zakynthos, Naxos, Djerba and other islands of 0.02 square degrees or more. Overlap of each old island with its Natural Earth outline: Sicily 0.79, Sardinia 0.83, Corsica 0.81, Cyprus 0.75, Crete 0.62, Rhodes 0.52. Overlap of the app's sea with Natural Earth sea rose in Italy from 0.88 to 0.90, in the Aegean and Greece from 0.88 to 0.89 and on the Levant coast from 0.92 to 0.93. An end-to-end test checks that the sea outline carries at least 20 island holes.

### Batch 4e: Macedon (Alexander)

Reference map: Alexander-Empire 323bc.jpg (Thomas Lessman, WorldHistoryMaps.info, CC BY-SA 3.0), the empire at Alexander's death. It is a small-scale world map; it was placed by fitting its sea mask to the Natural Earth coast (the head of the Gulf of Suez and of the Persian Gulf and Crete line up to within about 0.5 degree).

| Phase (years) | Checked against | Result |
|---|---|---|
| 330 to 323 BC | Lessman map | New outline from Macedonia and the Aegean coast to the Indus and Kashmir, including Egypt (overlap with the map **0.97**; the old Greece, Persia and Egypt shapes overlapped the new one 0.52). Only the mainland is shaded on the map, so Cyprus, Crete and the Aegean islands are not included. |
| 334 to 330 BC | none | Old outlines kept and marked "not re-checked": the map shows only 323 BC. |

### Batch 4f: Elam and the Roman province of Judea

Reference maps: Elam Map-en.svg (Sémhur base map, Wkotwica and Morningstar1814, CC BY-SA 3.0), placed on 12 Mesopotamian cities (errors under 0.4 degree); and Judaea Roman Province.svg (DEGA MD, CC BY-SA 4.0), an equirectangular WGS84 map placed on 14 cities (errors under 0.05 degree).

| Kingdom (years) | Checked against | Result |
|---|---|---|
| Elam, 2000 to 647 BC | Elam map | New outline of the core zone from Susa and Awan to Anshan (overlap with the map's orange zone **0.97**; the old outline overlapped the new one 0.55, area 11.0 → 15.4). The map shades a soft, undated zone, so it is used for the whole span; this is stated in the panel with a disputed note. |
| Judea (Roman province), AD 6 to 41 | Judaea Roman Province map | New outline: Judea, Samaria and Idumea with the coast from Jamnia to Caesarea (overlap with the map **0.98**; the old outline overlapped the new one 0.62, area 1.24 → 0.98). The map leaves the Ascalon and Gaza area out of the province. |
| Judea, AD 44 to 135 | none | Old outline kept, marked "not re-checked". |

Not changed: Archelaus's ethnarchy (4 BC to AD 6) still uses the old Judea outline, and the tetrarchies of Antipas and Philip (AD 6 to 41) were not compared with the orange areas of the Judaea map, whose legend does not say what they stand for.

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
- **Still not re-checked after the second pass**: Rome (judged consistent earlier), Canaan (no open map of the city-states could be fetched), Archelaus's ethnarchy and the tetrarchies of Antipas and Philip, Sasanian Iran, the early Medes (612-585 BC), early Parthia (247-124 BC), the early phases of Alexander's conquest (334-330 BC), Judea after AD 44, Urartu outside 764-735 BC (not drawn), and the Old Kingdom of the Hittites and the New Kingdom phases outside Thutmose III (marked "not re-checked" in their panels).
- **Maps that disagree or are undated** (panels carry a "Disputed or debated" note): the Medes (two maps), Parthia (94 BC map against an undated French map), Elam (soft, undated zone), the 830 BC map against 2 Kings 10:32-33, and Mitanni and Urartu (one time slice each).
- **Georeferencing quality**: Judaea 6-41 AD (under 0.05 deg), Urartu and Elam (up to 0.5 deg), the Parthian French map (up to about 1 deg), the Alexander map (small-scale world map, about 0.5 deg).
- The islands list was replaced in Batch 4d; Cyprus is now also drawn for the Crusader-era kingdom (Batch 1).
- Ancient kingdoms rarely had fixed borders. Every outline is a simplified guess at a zone of control, and scholars disagree on many.
