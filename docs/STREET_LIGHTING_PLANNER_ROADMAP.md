# MAPIT Street Lighting Planner — Product Roadmap

**Document Version:** 1.0  
**Date:** March 2026  
**Status:** Research & Planning Phase  
**Author:** SkyVee Drones / MAPIT Product Team

---

## Executive Summary

This document outlines the research, strategy, and phased development roadmap for a **Street Lighting Planner** module within MAPIT. The feature would allow city engineers and municipal planners to use drone-captured orthomosaic imagery and GPS data as the foundation for standards-compliant road lighting design — a workflow that does not currently exist in any single platform.

The opportunity is significant: street lighting represents 19% of global electricity consumption, and municipalities spend billions annually on new installations and retrofits. City engineers currently rely on disconnected desktop tools that have no access to real-world field data. MAPIT's drone-data layer bridges that gap.

---

## Problem Statement

City engineers designing street lighting systems today face a fragmented, time-consuming workflow:

1. A drone pilot or survey crew captures road geometry data in the field.
2. The engineer manually re-enters road widths, lengths, and geometry into a desktop lighting design application.
3. The desktop application (typically DIALux or AGi32) performs photometric calculations.
4. The engineer exports a PDF report and submits it for approval.

Each handoff between steps introduces measurement errors, delays, and data loss. There is no tool that connects the drone data layer directly to the photometric design layer. MAPIT is uniquely positioned to own that connection.

---

## Market Research: Street Lighting Software Landscape

### Photometric Design Tools

The following table summarizes the major street lighting design platforms evaluated for integration potential.

| Platform | API Available | Integration Type | Standard Support | Notes |
|---|---|---|---|---|
| **DIALux evo** (DIAL GmbH) | **No** | Desktop only | EN 13201, IESNA | Officially "Not Planned" per product owner |
| **Relux StreetCalc** (Relux AG) | **Yes** | Embeddable web widget + REST | EN 13201, CIE | Purpose-built for third-party embedding; white-label licensing available |
| **Photometrics AI** | **Yes (beta)** | REST API | ANSI/IES RP-8, CIE 115, AS/NZS 1158 | AI-powered, GIS-native; currently in beta; open to partnerships |
| **AGi32 / Visual** (Lighting Analysts) | **No** | Desktop only | IESNA RP-8 | No API, no web version |
| **Calculux** (Philips legacy) | Partial | SketchUp/AutoCAD plugin only | EN 13201 | Legacy product, limited future development |
| **ReluxAnalyse** (Relux AG) | **Yes** | Web API + Command Line | EN 13201 | Batch photometric analysis; oriented toward manufacturers |

### Smart City Management Platforms (Post-Installation)

These platforms manage existing installed streetlights and are complementary to design tools, not replacements.

| Platform | API Available | Primary Function | Relevance to MAPIT |
|---|---|---|---|
| **StreetLight InSight** (StreetLight Data) | **Yes** (REST) | Traffic and pedestrian flow analytics | Provides traffic volume data to determine required lighting class |
| **Tvilight** | **Yes** (Open REST) | Smart streetlight monitoring and control | Post-installation management |
| **Signify Interact City** (Philips) | **Yes** (REST) | Connected luminaire monitoring and control | Post-installation management |
| **DITRA Solutions** | **Yes** (REST/JSON) | Streetlight scheduling and diagnostics | Post-installation management |
| **ArcGIS Streetlight Management** (ESRI) | **Yes** (ESRI REST) | Asset inventory and maintenance tracking | Useful for asset mapping integration |

### Key Finding

**DIALux has no API and has officially marked it "Not Planned."** The DIALux Product Owner confirmed this in the community forum in 2024. DIALux evo is a closed Windows desktop application and cannot be embedded in a web platform.

**Relux StreetCalc is the strongest integration candidate.** It is the only photometric design tool purpose-built for third-party embedding, with white-label licensing available. Contact has been identified: Fabio Tamborrini, Chief Sales Officer (f.tamborrini@relux.com, +41 78 711 42 47).

---

## Proposed MAPIT Street Lighting Planner

### Vision

A city engineer opens a MAPIT project containing drone orthomosaic imagery of a road corridor. Without leaving MAPIT, they measure the road geometry, select a lighting class based on traffic data, place poles on the map, run a photometric calculation, and export a standards-compliant PDF report — all in one workflow.

### The Three-Layer Architecture

The proposed feature combines three data layers that currently exist in separate, disconnected tools:

**Layer 1 — MAPIT Drone Data**  
The drone orthomosaic provides the physical reality of the road: accurate measurements of width, length, curvature, intersections, and surrounding land use. The MAPIT measurement tool (already built) provides the road geometry inputs that photometric software requires.

**Layer 2 — Traffic Intelligence (StreetLight InSight API)**  
Road lighting standards (EN 13201, ANSI/IES RP-8) require engineers to classify a road by its traffic volume before selecting a lighting class. The StreetLight InSight API provides pedestrian and vehicle counts for any road segment in North America, allowing MAPIT to automatically recommend the appropriate lighting class (M1–M6 for roads, P1–P6 for pedestrian areas).

**Layer 3 — Photometric Calculation (Relux StreetCalc)**  
Once road geometry and lighting class are established, the Relux StreetCalc embedded widget performs the full photometric calculation: pole spacing, mounting height, luminaire selection, glare verification, and EN 13201 compliance check. Output is a professional PDF report.

---

## Phased Development Roadmap

### Phase 1 — Native Road Geometry Tools (Months 1–2)

This phase builds the foundation using MAPIT's existing map infrastructure. No third-party API is required.

The deliverables for this phase are a road centerline drawing tool on the drone orthomosaic map, automatic road width measurement using the existing measurement tool, a road profile configuration panel (number of lanes, sidewalk presence, median, bike path), and a pole placement tool that lets engineers click to position streetlight poles on the map with configurable mounting height and arm length.

A basic spacing calculator will be included that recommends pole intervals based on road width and mounting height using simplified EN 13201 geometry — not a full photometric simulation, but sufficient for preliminary layout planning.

**Estimated effort:** 3–4 weeks development

---

### Phase 2 — Relux StreetCalc Integration (Months 2–4)

This phase replaces the simplified spacing calculator with a full photometric engine via the Relux StreetCalc white-label licensing agreement.

The Relux StreetCalc widget accepts road profile parameters (width, lanes, surface type), luminaire selection from the Relux database (2.5M+ luminaires from 450+ manufacturers), pole arrangement type (single-sided, double-sided opposite, double-sided staggered, center strip), and mounting height and overhang. It returns full EN 13201 calculation results including average luminance, uniformity ratios, glare rating (TI), and a professional PDF documentation package.

MAPIT will pre-populate all road geometry inputs from the drone measurement data, so the engineer only needs to select the luminaire and confirm the arrangement. The PDF report will be saved to the project's document library.

**Dependencies:** Relux white-label licensing agreement  
**Estimated effort:** 2–3 weeks development after licensing is confirmed

---

### Phase 3 — Traffic-Informed Lighting Class (Months 3–5)

This phase integrates the StreetLight InSight API to automatically recommend the correct lighting class for a road segment based on measured traffic volume.

When an engineer draws a road centerline in MAPIT, the system queries StreetLight InSight for average daily traffic (ADT) and pedestrian counts for that segment. MAPIT maps the traffic volume to the appropriate EN 13201 lighting class using the standard's classification table (M1 for highest-traffic roads down to M6 for low-volume residential streets). The recommended class is displayed to the engineer with an explanation, and they can override it if needed.

This eliminates one of the most error-prone manual steps in the current workflow: looking up traffic counts from a separate system and manually selecting a lighting class.

**Dependencies:** StreetLight InSight API subscription  
**Estimated effort:** 1–2 weeks development

---

### Phase 4 — Municipal Solutions Integration (Months 5–8)

This phase connects the Street Lighting Planner to the broader MAPIT Municipal Solutions offering, creating a complete city infrastructure planning workflow.

Deliverables include a dedicated Street Lighting project type in MAPIT, a project dashboard showing all road segments with their lighting design status, a comparison view for evaluating multiple luminaire options side-by-side, an energy cost calculator that estimates annual operating cost based on wattage and local utility rates, a bill of materials export listing poles, luminaires, and hardware quantities, and ArcGIS / GIS export of pole locations as a shapefile or GeoJSON for integration with city asset management systems.

**Estimated effort:** 6–8 weeks development

---

### Phase 5 — Photometrics AI Integration (Months 8–12)

This phase adds AI-powered per-luminaire optimization for cities that have already installed smart streetlights and want to optimize their dimming schedules.

Photometrics AI analyzes the unique context of every installed light — its height, optic type, road geometry, nearby land use, and overlapping beam spreads — and calculates the precise dimming level that delivers the right amount of light at the right time. The company reports 25–50% energy savings while maintaining or improving lighting quality.

MAPIT's drone data layer provides the GIS geometry that Photometrics AI requires as input, making the integration technically straightforward. This phase would require a partnership agreement with Photometrics AI (currently in beta).

**Dependencies:** Photometrics AI partnership agreement  
**Estimated effort:** 3–4 weeks development after partnership is confirmed

---

## Competitive Differentiation

No existing platform combines all three layers — drone field data, traffic intelligence, and photometric calculation — in a single workflow. The table below illustrates the gap MAPIT fills.

| Capability | DIALux | Relux | AGi32 | StreetLight | MAPIT (Proposed) |
|---|---|---|---|---|---|
| Drone orthomosaic base map | No | No | No | No | **Yes** |
| Road geometry from drone measurement | No | No | No | No | **Yes** |
| Traffic-informed lighting class | No | No | No | Yes | **Yes** |
| Full photometric calculation | Yes | Yes | Yes | No | **Yes (via Relux)** |
| EN 13201 compliance report | Yes | Yes | Yes | No | **Yes** |
| Web-based (no desktop install) | No | Yes | No | Yes | **Yes** |
| Pole placement on real map | No | No | No | No | **Yes** |
| Integrated with project photos/media | No | No | No | No | **Yes** |

---

## Partnership & Licensing Actions Required

### Immediate (This Quarter)

**Relux AG — StreetCalc White-Label License**  
Contact: Fabio Tamborrini, Chief Sales Officer  
Email: f.tamborrini@relux.com  
Phone: +41 78 711 42 47  
Action: Request a product demonstration and white-label licensing terms for embedding ReluxStreetCalc within the MAPIT platform. Key questions to raise: per-calculation pricing vs. flat annual license, branding requirements, API vs. iframe embed model, and support for North American lighting standards (ANSI/IES RP-8) in addition to EN 13201.

**Photometrics AI — Partnership Discussion**  
Contact: ari@photometrics.ai  
Action: Introduce MAPIT as a drone data platform and explore a partnership where MAPIT provides the GIS geometry layer and Photometrics AI provides the optimization engine. This is a beta product and may be open to a co-development arrangement.

### Near-Term (Next Quarter)

**StreetLight Data — InSight API Access**  
Action: Request API credentials and pricing for the StreetLight InSight Planning API. Evaluate whether the traffic data coverage is sufficient for the target municipal markets (US and Canada initially).

---

## Revenue Model Considerations

The Street Lighting Planner creates a natural upsell path within the MAPIT Municipal Solutions tier. Potential pricing structures include a per-project fee for each street lighting calculation report generated, a municipal subscription add-on that bundles unlimited calculations with the existing project management subscription, and a professional services model where SkyVee Drones pilots complete the drone capture and delivers a finished lighting design report as a turnkey deliverable.

The turnkey deliverable model is particularly compelling because it positions SkyVee Drones pilots as the end-to-end solution provider — capturing the drone data, processing it in MAPIT, running the photometric calculation, and delivering a permit-ready report — rather than just a data capture service.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Relux licensing cost is prohibitive | Medium | High | Build native simplified calculator as Phase 1 fallback; negotiate usage-based pricing |
| StreetLight InSight coverage gaps in rural areas | Medium | Medium | Allow manual lighting class selection as override |
| City engineers resist web-based tools vs. desktop | Medium | Medium | Emphasize the drone data integration as unique value; provide PDF export that matches desktop tool output |
| Photometrics AI remains in beta | High | Low | Phase 5 is optional enhancement; core value is in Phases 1–3 |
| EN 13201 vs. ANSI/IES RP-8 standard differences | Low | Medium | Confirm Relux supports both standards; build standard selector into UI |

---

## References

[1] DIALux Street Lighting Feature Page — https://www.dialux.com/en-GB/street-lighting  
[2] DIALux API Feature Request (Status: Not Planned) — https://community.dialux.com/feature-upvote/post/dialux-api-Ck3BUUCSoLizEtu  
[3] Relux StreetCalc OEM Product Page — https://relux.com/manufacturers/oem/street-calc  
[4] Photometrics AI — How It Works — https://photometrics.ai/how-it-works/  
[5] StreetLight InSight API Documentation — https://developer.streetlightdata.com/docs/welcome-to-the-streetlight-developer-documentation  
[6] Tvilight Open API Smart Street Lighting — https://tvilight.com/open-api-based-smart-street-lighting/  
[7] ArcGIS Streetlight Management Solution — https://www.arcgis.com/apps/solutions/streetlight-management  
[8] EN 13201 Road Lighting Standards Overview — https://www.zgsm-china.com/blog/something-about-en-13201-road-lighting-design-standards.html
