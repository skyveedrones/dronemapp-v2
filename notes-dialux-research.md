# DIALux Research Findings

## What DIALux Is
- World's leading lighting design software (750,000 users, 27 languages)
- Desktop application (Windows), free base version + paid DIALux Pro subscription
- Covers indoor, outdoor, street/road, and emergency lighting
- Street lighting uses EN 13201:2015 standard (European road lighting standard)

## Street Lighting Features in DIALux evo
- Define road profile: lanes, sidewalks, bike paths, parking strips, medians
- Choose lighting class (safety, energy efficiency, environmental compatibility)
- Select from 2.5M+ luminaires from 450+ manufacturers
- 5 luminaire arrangement types (single-sided, double-sided opposite/staggered, center strip)
- Auto-optimization: pole distances, mounting heights, tilt angles, glare/uniformity
- Outputs: isolux lines, value charts, result tables with photometric data
- Export: IFC (BIM), Microsoft Office (Pro), documentation PDFs

## API Status: NOT PLANNED
- DIALux has NO public API (confirmed by DIALux Product Owner in community forum, 2024)
- Status marked "Not Planned" on their feature request board
- No REST API, no CLI, no plugin SDK currently available
- Relux (competitor) has an experimental paid street lighting API

## Integration Options That DO Exist
- IFC file import/export (BIM standard) - works with Revit, Vectorworks, DDScad
- LDT/IES photometric data files (luminaire data format)
- STF format for data exchange
- PDF documentation export

## What This Means for MAPIT Integration
- Cannot directly call DIALux from MAPIT (no API)
- Cannot embed DIALux in a web app
- DIALux is a Windows desktop app only

## Alternative Approaches for MAPIT
1. **MAPIT as a data prep tool for DIALux**: Export road geometry, GPS coordinates, and measurements from MAPIT drone footage in a format DIALux can import (IFC, DXF, or structured data)
2. **Build native street lighting planning in MAPIT**: Use the drone orthomosaic + GPS data to build a simplified road lighting calculator directly in MAPIT using EN 13201 calculations (open standard)
3. **Relux API integration**: Relux has an experimental paid API for street lighting calculations - could be integrated
4. **Export workflow**: MAPIT generates a structured report (road width, length, coordinates) that engineers can import into DIALux manually

## Recommended Approach
Build a "Street Lighting Planner" module natively in MAPIT that:
- Uses drone orthomosaic to measure road width, length, and geometry
- Lets engineers place streetlight poles on the map
- Calculates spacing, mounting height recommendations based on road class
- Exports a report/data package that can be imported into DIALux as a starting point
- This is MORE valuable than DIALux integration because it adds the drone data layer
