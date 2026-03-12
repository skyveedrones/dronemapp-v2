# Project Templates Feature - Example

**Feature Overview:** Project templates allow you to save common project configurations and reuse them when creating new projects. Instead of manually entering the same information for similar jobs, you can start from a template that pre-fills standard fields, saving time and ensuring consistency.

---

## How Project Templates Work

### Creating a Template

When you complete a project that represents a common job type (like water line mapping or road construction documentation), you can save it as a template. The template captures the project structure, default fields, and standard settings—but not the actual media files or specific location data.

### Using a Template

When creating a new project, you select a template from your saved templates. The system pre-fills all the standard information, and you only need to update the project-specific details like location, client name, and flight date.

---

## Example Template: Water Line Mapping

This template would be used for municipal water infrastructure GIS mapping projects, which are common in your work with the City of Forney.

### Template Configuration

**Template Name:** Water Line Mapping  
**Category:** Municipal Infrastructure  
**Description:** Standard template for water line installation and loop GIS mapping projects

### Pre-filled Fields

**Project Information:**
- **Project Type:** Water Infrastructure
- **Service Type:** GIS Mapping & Documentation
- **Status:** Active (default)
- **Priority:** Normal

**Standard Description Template:**
```
[Size]" water line [installation type] at [location] 
[Additional details about the project scope]
```

**Client Settings:**
- **Default Client:** City of Forney (can be changed)
- **Client Type:** Municipal Government
- **Billing Rate:** Standard Municipal Rate

**Media Settings:**
- **Required Media Types:** Aerial photos, GPS-tagged images
- **Watermark:** Apply company logo watermark by default
- **GPS Requirement:** GPS data required for all media
- **Naming Convention:** `[ClientName]-[ProjectType]-[Date]-[Sequence]`

**Export Settings:**
- **Default Export Formats:** KML, GeoJSON (for GIS software)
- **Map Style:** Satellite view with markers
- **Include Flight Path:** Yes

**Report Settings:**
- **Include Project Logo:** Yes
- **Include Client Logo:** Yes
- **Report Sections:** 
  - Project overview
  - GPS location map
  - Media gallery
  - Flight path visualization
  - Metadata summary

**Reminder Settings:**
- **Set Warranty Tracking:** Yes
- **Default Warranty Period:** 12 months from completion
- **Reminder Schedule:** 9 months, 6 months, 3 months before warranty end

---

## Example: Creating a New Project from Template

### Step 1: Select Template
When clicking "Create New Project" on the dashboard, you see:

```
┌─────────────────────────────────────────┐
│  Create New Project                     │
├─────────────────────────────────────────┤
│                                         │
│  ○ Start from scratch                   │
│  ● Use a template                       │
│                                         │
│  Select Template:                       │
│  ┌─────────────────────────────────┐   │
│  │ 🚰 Water Line Mapping           │   │
│  │ 🛣️  Road Construction Docs      │   │
│  │ 🏗️  Site Survey & Monitoring    │   │
│  │ ⚡ Utility Infrastructure        │   │
│  └─────────────────────────────────┘   │
│                                         │
│         [Cancel]  [Continue]            │
└─────────────────────────────────────────┘
```

### Step 2: Customize Pre-filled Information
After selecting "Water Line Mapping" template, the form is pre-populated:

```
┌──────────────────────────────────────────────────────┐
│  New Project from Template: Water Line Mapping       │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Project Name: *                                     │
│  ┌────────────────────────────────────────────────┐ │
│  │ [User enters: CIP223 24" Water Line Loop]     │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Description: *                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ 24" water line loop at [User enters location] │ │
│  │ [User adds specific details]                  │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Location: *                                         │
│  ┌────────────────────────────────────────────────┐ │
│  │ [User enters: Forney, TX]                     │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Client: *                                           │
│  ┌────────────────────────────────────────────────┐ │
│  │ City of Forney                    [✓ Pre-fill] │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Flight Date: *                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ [User selects date]                           │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Project Type: Water Infrastructure  [✓ Pre-fill]   │
│  Status: Active                      [✓ Pre-fill]   │
│  Priority: Normal                    [✓ Pre-fill]   │
│                                                      │
│  ✓ Apply company watermark to all media             │
│  ✓ Require GPS data for all uploads                 │
│  ✓ Set up warranty tracking (12 months)             │
│                                                      │
│         [Cancel]  [Create Project]                   │
└──────────────────────────────────────────────────────┘
```

### Step 3: Project Created with All Settings
The new project is created with:
- ✅ All standard fields pre-filled
- ✅ Media upload settings configured
- ✅ Export formats pre-selected
- ✅ Watermark settings enabled
- ✅ Warranty tracking set up
- ✅ Report template ready

**Time Saved:** Instead of 5-10 minutes setting up each project, you only need 1-2 minutes to customize the template.

---

## Additional Template Examples

### Template 2: Road Construction Documentation

**Use Case:** Visual documentation of road degradation, construction progress, and site conditions

**Pre-filled Settings:**
- Project Type: Road Infrastructure
- Required Media: Aerial video, intersection photos, road surface close-ups
- GPS Requirement: Required
- Export Formats: PDF report with embedded map, KML for GIS
- Report Sections: Before/after comparison, degradation assessment, traffic impact
- Watermark: Company logo + "Construction Documentation" text overlay

**Typical Projects:**
- Trinity Rd degradation monitoring
- Bois D'Arc construction impact assessment
- New road extension progress tracking

---

### Template 3: Utility Infrastructure Inspection

**Use Case:** Power lines, substations, utility easements, and electrical infrastructure

**Pre-filled Settings:**
- Project Type: Utility Infrastructure
- Client Type: Utility Company
- Required Media: Aerial overview, close-up detail shots, thermal imaging (if available)
- Safety Notes: "Maintain safe distance from power lines"
- Export Formats: PDF report, GeoJSON for utility GIS systems
- Report Sections: Infrastructure overview, condition assessment, access route map
- Warranty Tracking: Not applicable (inspection only)

**Typical Projects:**
- Oncor substation documentation
- Power line corridor surveys
- Utility easement verification

---

### Template 4: Site Survey & Monitoring

**Use Case:** General site surveys, land development, environmental monitoring

**Pre-filled Settings:**
- Project Type: Site Survey
- Required Media: Aerial orthomosaic, elevation data, boundary markers
- GPS Requirement: Required with high accuracy
- Export Formats: KML, GeoJSON, CSV (coordinates), PDF report
- Map Style: Hybrid (satellite + labels)
- Report Sections: Site overview, topography, access points, boundary verification
- Monitoring Schedule: Set up recurring flights (optional)

**Typical Projects:**
- Land development site surveys
- Construction site progress monitoring
- Environmental impact assessments

---

## Benefits of Project Templates

### Time Savings
Creating a new project from a template takes **1-2 minutes** instead of 5-10 minutes of manual data entry. For users creating multiple similar projects per week, this saves hours per month.

### Consistency
Templates ensure that all projects of the same type follow the same structure, naming conventions, and documentation standards. This makes it easier to find information later and ensures professional consistency across client deliverables.

### Reduced Errors
Pre-filled fields reduce the chance of forgetting important settings like watermarks, GPS requirements, or warranty tracking. Critical configurations are baked into the template.

### Onboarding
New team members can use templates to create projects correctly without extensive training. The template guides them through the standard process.

### Client-Specific Templates
You can create templates for specific clients (like "City of Forney - Standard Project") that include their logo, preferred report format, and billing information.

---

## Template Management

### Creating Templates
1. **From Existing Project:** Click "Save as Template" on any completed project
2. **From Scratch:** Create a new template in Settings → Templates
3. **Import/Export:** Share templates with team members or backup to file

### Editing Templates
Templates can be updated at any time. Changes apply to new projects created from the template but don't affect existing projects.

### Template Library
Templates are organized by category:
- Municipal Infrastructure
- Road & Transportation
- Utility Services
- Site Surveys
- Custom/Other

### Sharing Templates
Templates can be shared with team members or exported as files for backup or transfer to other MapIt accounts.

---

## Implementation in MapIt

### User Interface Changes

**Dashboard:**
- "Create New Project" button shows template selection dialog
- Quick-create buttons for most-used templates (e.g., "New Water Line Project")

**Settings Page:**
- New "Templates" section to manage saved templates
- Create, edit, delete, and organize templates
- Set default template for quick access

**Project Creation Flow:**
- Step 1: Choose template or start from scratch
- Step 2: Customize pre-filled fields
- Step 3: Review and create project

### Database Schema
Templates store:
- Template name and description
- Category/type
- All default field values
- Media settings and requirements
- Export preferences
- Report configuration
- Reminder schedules

---

## Example Workflow: Your Typical Week

**Monday:** City of Forney calls about a new 18" water line project at Innovation Blvd
- Click "Create Project" → Select "Water Line Mapping" template
- Enter: "CIP224 18" Water Line - Innovation Blvd"
- Update location and flight date
- **Done in 90 seconds**

**Tuesday:** Oncor requests documentation of a new substation site
- Click "Create Project" → Select "Utility Infrastructure Inspection" template
- Enter project name and location
- Client auto-fills to "Oncor"
- **Done in 60 seconds**

**Wednesday:** City of Forney needs road degradation documentation for Trinity Rd
- Click "Create Project" → Select "Road Construction Documentation" template
- Enter project details
- Watermark and export settings already configured
- **Done in 90 seconds**

**Time Saved This Week:** ~15 minutes compared to manual entry  
**Time Saved Per Month:** ~60 minutes  
**Time Saved Per Year:** ~12 hours

---

## Conclusion

Project templates transform repetitive project creation into a streamlined process. By capturing your standard workflows and configurations, templates ensure consistency, reduce errors, and save significant time—especially for businesses like yours that handle multiple similar projects regularly.

The feature pays for itself after just a few uses and becomes increasingly valuable as your project volume grows.

---

**Ready to implement?** Let me know if you'd like me to build this feature into MapIt!
