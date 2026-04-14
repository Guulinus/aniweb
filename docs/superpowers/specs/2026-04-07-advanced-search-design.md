# Advanced Search & Calendar Features Design

## Feature 1: Advanced Search Filters

### Location
Integrated into existing Browse page (`/browse`)

### New Filters to Add
| Filter | UI Component | API Param |
|--------|-------------|-----------|
| Format | Dropdown (TV, Movie, OVA, ONA, Special, Music) | `format` |
| Year Range | Two inputs (from year - to year) | `year`, `yearEnd` |
| Episode Count | Two inputs (min - max) | `episodes_greater`, `episodes_lesser` |
| Minimum Score | Dropdown (Any, 6+, 7+, 8+, 9+) | `averageScore_greater` |

### UI Layout
```
┌────────────────────────────────────────────────────────────────┐
│ Suchen │                                                      │
├────────────────────────────────────────────────────────────────┤
│ Genre-Filter          │ Format ▼ │ Jahr      │ Score ▼ │ ✕    │
├────────────────────────────────────────────────────────────────┤
│ [Action✓][Adventure✓][...] │ Movie │ 2020-2025 │ ≥ 6   │
└────────────────────────────────────────────────────────────────┘
```

### Translations (German/English)
- Format: "Format" / "Format"
- Year: "Jahr" / "Year"
- Episodes: "Episoden" / "Episodes"  
- Score: "Bewertung" / "Score"
- Any: "Alle" / "Any"

---

## Feature 2: Airing Calendar

### Location
New page `/calendar` with nav link

### Display
- Weekly calendar view (Sun-Sat or Mon-Sun)
- Shows currently airing anime grouped by air date
- Each card: thumbnail, title, episode number, JST time

### UI Layout
```
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│  Montag  │  Dienst  │ Mittwoch │ Donnerstag│  Freitag │ Samstag  │  Sonntag │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ [thumb]  │ [thumb] │ [thumb]  │ [thumb]  │ [thumb]  │ [thumb]  │ [thumb]  │
│ Ep.5     │ Ep.3     │ Ep.12    │ Ep.8     │ Ep.1     │          │          │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

### Nav Addition
- Navbar: Add "Calendar" link between "Browse" and "Watchlist"