# Plantrix – Smart Plant Care Web App

Plantrix is a smart plant-care companion that connects sensor data, weather and air-quality information, and an AI assistant to help users keep their plants healthy.

## Features

- **Real-time plant monitoring**  
  Visual dashboard for key environmental parameters such as soil moisture, temperature, humidity, and light intensity.

- **AI plant-care assistant**  
  Chat-style assistant (Blossom AI) that uses live context from sensors, plant type, AQI, and weather-based watering advice to provide actionable care recommendations.

- **Plant management**  
  Store and manage plants in a Supabase-backed `plants` table, including metadata such as species, device IDs, and notes.

- **Weather-aware watering advice**  
  Integrates with Tomorrow.io to combine soil moisture with local rain forecast and suggest when to water or skip watering.

- **Air quality context**  
  Uses the World Air Quality Index (WAQI) API to fetch AQI near the user and explain how it may impact plant health.

- **External plant knowledge**  
  Integrates with the Perenual plant API to enrich plants with traits like light tolerance, toxicity, fragrance, and air-purifying properties.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript / React
- **Styling:** Tailwind CSS + custom UI components
- **Auth & Database:** Supabase
- **AI:** Google Gemini (`@google/generative-ai`)
- **APIs:**
  - Tomorrow.io – weather forecast for watering advice
  - WAQI – air quality data
  - Perenual – plant species information

## Project Structure (high level)

- `app/`
  - `page.tsx` – landing/home page
  - `dashboard/` – main sensor and AQI dashboard
  - `ai-assistant/` – Blossom AI chat interface
- `lib/`
  - `supabase/` – Supabase client setup
  - `services/`
    - `sensorService.ts` – latest sensor readings & plant type helpers
    - `plantService.ts` – CRUD helpers for plants
    - `plantInfoService.ts` – Perenual API integration
    - `weatherService.ts` – Tomorrow.io forecast & watering advice
    - `aqiService.ts` – AQI mapping utilities

## Prerequisites

- Node.js (LTS recommended)
- pnpm / npm / yarn installed locally
- A Supabase project with the expected tables (e.g. `plants`, `sensor_readings`, `chat_messages`)
- API keys for external services (see below)

## Environment Variables

Create a `.env.local` file in the project root and configure the following variables (names based on the current codebase):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

# Air Quality (WAQI)
NEXT_PUBLIC_AQI_TOKEN=your_waqi_token

# Tomorrow.io – weather forecast
NEXT_PUBLIC_TOMORROW_API_KEY=your_tomorrow_api_key

# Perenual – plant info
NEXT_PUBLIC_PERENUAL_API_KEY=your_perenual_api_key
```

> **Note:** Never commit real API keys to Git. Keep them only in `.env.local` or your deployment secrets.

## Installation & Setup

1. **Install dependencies**

   Using pnpm (recommended):

   ```bash
   pnpm install
   ```

   Or with npm:

   ```bash
   npm install
   ```

2. **Configure environment**

   Create `.env.local` with the environment variables listed above.

3. **Run the development server**

   ```bash
   pnpm dev
   ```

   or

   ```bash
   npm run dev
   ```

   Then open `http://localhost:3000` in your browser.

## Supabase Schema (overview)

The project expects at least the following tables (simplified view):

- **`plants`**
  - `id` (uuid)
  - `user_id` (uuid)
  - `name` (text)
  - `species` (text, nullable)
  - `image_url` (text, nullable)
  - `device_id` (text, nullable)
  - `device_name` (text, nullable)
  - `notes` (text, nullable)
  - timestamp fields such as `created_at`, `updated_at`, `added_date`

- **`sensor_readings`**
  - `id` (uuid)
  - `user_id` (uuid)
  - `plant_id` (uuid)
  - `temperature` (numeric, nullable)
  - `humidity` (numeric, nullable)
  - `soil_moisture` (numeric, nullable)
  - `light` (numeric, nullable)
  - `timestamp` (timestamp)

- **`chat_messages`**
  - `id` (uuid)
  - `user_id` (uuid)
  - `role` (e.g. `user` / `ai`)
  - `content` (text)
  - `image` (text / url, nullable)
  - `created_at` (timestamp)

Adjust field names and types to match your actual Supabase schema if they differ.

## Scripts

Common package scripts (exact names may vary depending on your `package.json`):

- `dev` – start the Next.js development server
- `build` – create a production build
- `start` – run the production server
- `lint` – run linting (if configured)

Check `package.json` for the full list of available scripts.

## Development Notes

- **Client vs server code:**  
  External APIs and Supabase client calls in this project are currently made from client components; if you move them into server actions or API routes, be careful not to expose any secret keys directly to the browser.

- **Extensibility:**  
  New features should preferably go through the service layer in `lib/services` so that UI components do not need to know implementation details of Supabase or external APIs.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

## License

This project is currently proprietary. All rights reserved. If you intend to open source it later, you can update this section and add a LICENSE file.
