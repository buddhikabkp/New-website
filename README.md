# Ceylon Journey - Local Tourist Day-Visit Planner & Information System

**A specialized web application for Kandy tourism discovery and single-day itinerary planning within a 25 km radius of Haloluwa, Sri Lanka.**

Developed for **BIT Semester Project (ITE2953)** adhering strictly to the **IEEE Std 830-1998 Software Requirements Specification**.

---

## 🌟 Key Pages

1. **Landing Page (`index.html`)**:
   - **Hero Section**: Elegant warm brown-to-pine green gradient background, title, tagline, "Plan My Day Trip →" and "Browse Attractions" CTA buttons, and verified statistics counters (12+ Verified Sites, 25km Coverage Radius, Free Day Planner).
   - **Attraction Directory & Filters**: Live search input, category filter pills (`🔥 Religious`, `🏛️ Heritage`, `🌿 Nature`, `🎭 Cultural`, `🔭 Sightseeing`), interactive distance slider (`≤ 25km`), and sorting dropdown (`Nearest first`, `Highest rating`, `Alphabetical`).
   - **Attractions Grid**: Responsive 3-column card grid displaying category badges, user rating badges (`★ 4.5`), distances from Haloluwa, descriptive snippets, and quick "+ Add to Plan" action.
   - **Multi-Tab Site Details Modal**: 4 comprehensive tabs covering Overview & Ticket Prices, Accessibility & Facilities (wheelchair, parking, restrooms), Cultural Tips & Etiquette (dress code, photography), and Leaflet Map Location.

2. **Day Trip Planner Page (`planner.html`)**:
   - **Left Column ("Your Itinerary")**:
     - Empty state with dashed border and map icon `🗺️`.
     - Live metrics banner: Total travel distance (km), estimated time (hours/mins), total ticket cost (LKR).
     - Action buttons:
       - **⚡ Optimize Route**: Nearest-neighbor TSP algorithm rearranging stops from Haloluwa to minimize back-and-forth travel.
       - **🖨️ Print / Export Itinerary**: Clean, formatted print layout for tourists.
       - **🗑️ Clear All**: Resets the current itinerary.
     - Sequential stop cards with sequence badges (1, 2, 3...), duration, ticket prices, up/down reorder buttons, and delete controls.
     - **Interactive Leaflet Route Map**: Shows Haloluwa starting origin (0.00 km green pin), numbered attraction pins, and connected polyline route!
   - **Right Column ("Add Attractions")**:
     - Real-time search bar.
     - Scrollable list of attraction cards with thumbnail, distance, rating, price, and circular `+` button to add immediately to itinerary.

3. **Admin Portal (`admin.html`)**:
   - **4 KPI Metric Cards**:
     - `12` Total Attractions
     - `4` Nature & Outdoor
     - `3` Heritage Sites
     - `3` Free Admission
   - **Control Bar**: Search box, category dropdown filter, and `+ Add Attraction` primary button.
   - **Tabular Management**: Table showing `#`, `Name`, `Category`, `Distance`, `Ticket`, `Rating`, and `Actions` (`Edit`, `Delete`).
   - **Modal Dialogs**:
     - Administrator Login modal (Default: `admin` / `Admin@Ceylon2026`).
     - Add / Edit modal with comprehensive field validation (enforcing the 25 km Haloluwa boundary business rule).
     - Permanent Delete confirmation modal.

---

## 🔐 Admin Credentials

- **Username**: `admin`
- **Password**: `Admin@Ceylon2026`
