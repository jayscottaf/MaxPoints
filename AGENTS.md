# MaxPoints - Credit Card Perks Tracker

## Project Overview

**Purpose**: Track credit card perks, send expiration/availability notifications, and automate deal scanning via OpenClaw integration.

**Tech Stack**:
- Frontend: Next.js 16.2.2, React 19, TypeScript, Tailwind CSS 4
- Backend: Next.js API routes
- Database: PostgreSQL (Neon serverless) with Prisma ORM 6.19.3
- Deployment: Vercel
- Automation: OpenClaw autonomous agent

**URLs**:
- Production: https://mxpoints.vercel.app
- Repository: https://github.com/jayscottaf/MaxPoints.git
- OpenClaw Instance: http://187.77.18.160:61493

---

## Current Status & Critical Issues

### 🚨 IMMEDIATE ACTION NEEDED

**Database tables are NOT created in production yet!**

**Steps to initialize database**:
1. Visit: `https://mxpoints.vercel.app/api/create-tables` (creates all database tables)
2. Then visit: `https://mxpoints.vercel.app/api/setup` (seeds with cards and perks data)
3. Then access: `https://mxpoints.vercel.app` (main dashboard)

### Recent Issues Fixed
- ✅ Prisma 7 incompatibility → Downgraded to Prisma 6.19.3
- ✅ Syntax errors in setup route → Fixed missing catch blocks
- ⏳ Database table creation → Created `/api/create-tables` endpoint with pgcrypto extension

---

## Database Schema

**Location**: `prisma/schema.prisma`

### Models:
1. **User** - User accounts with notification preferences
2. **Card** - Credit card definitions (Amex Platinum, Hilton Aspire, Chase Reserve)
3. **UserCard** - Junction table linking users to their cards with renewal dates
4. **Perk** - Individual card benefits/perks with values and periods
5. **Usage** - Track when users use perks
6. **Deal** - Automated deal discoveries from OpenClaw
7. **Notification** - System notifications for expiring/available perks

### Key Relationships:
- User → UserCard → Card → Perks
- User → Usage → Perk
- User → Notifications

---

## Credit Card Data

### Amex Platinum ($895/year - 19 perks worth $3,334+)
**Quarterly Perks**:
- Resy Dining Credit: $100/quarter × 4 = $400
- Lululemon Credit: $75/quarter × 4 = $300

**Semi-Annual Perks**:
- Saks Fifth Avenue: $50/half × 2 = $100

**Annual Perks**:
- Hotel Credit (FHR/THC): $600
- Digital Entertainment: $300
- Uber Cash: $200
- Uber One Membership: $120
- CLEAR Plus: $209
- Walmart+ Membership: $155
- Airline Incidentals: $200
- Equinox Credit: $300
- Oura Ring Credit: $200

**One-Time**:
- Global Entry/TSA PreCheck: $120

### Amex Hilton Aspire ($550/year - 11 perks worth $1,239+)
**Semi-Annual Perks**:
- Hilton Resort Credit: $200/half × 2 = $400

**Quarterly Perks**:
- Flight Credit: $50/quarter × 4 = $200

**Annual Perks**:
- Hilton Dining Credit: $250
- Waldorf/Conrad Credit: $100
- CLEAR Plus: $189
- Free Night Award: Variable value
- Cell Phone Protection: $800 max

### Chase Sapphire Reserve ($795/year - 12 perks worth $2,347+)
**Semi-Annual Perks**:
- Dining Credit: $150/half × 2 = $300
- Entertainment Credit: $150/half × 2 = $300

**Annual Perks**:
- Annual Travel Credit: $300
- The Edit Hotel Credit: $500
- 2026 One-Time Hotel Credit: $250
- DoorDash DashPass: $120
- DoorDash Credits: $300
- Apple TV+ & Music: $288
- Priority Pass Select: $469

**One-Time**:
- Global Entry/TSA PreCheck: $120

---

## OpenClaw Integration

**User's Instance**: http://187.77.18.160:61493

### Custom Skills (in `/openclaw-skills/`)

1. **deal-scanner** (`deal-scanner/skill.js`)
   - Scrapes Doctor of Credit, The Points Guy, Reddit r/churning
   - Runs daily at 9 AM
   - Saves relevant deals to database via `/api/deals` endpoint

2. **perk-monitor** (`perk-monitor/skill.js`)
   - Monitors Amex, Chase, Citi websites for benefit changes
   - Runs weekly on Mondays
   - Posts updates to `/api/perks/updates` endpoint

3. **usage-logger** (`usage-logger/skill.js`)
   - Natural language interface for logging perk usage
   - Example: "I used my $50 Saks credit today"
   - Posts to `/api/usage` endpoint

---

## API Endpoints

### Database Initialization
- `GET /api/create-tables` - Creates all database tables (uses pgcrypto extension)
- `GET /api/setup` - Seeds database with default user and all card/perk data
- `GET /api/migrate` - Alternative migration endpoint
- `GET /api/init-db` - Another migration approach

### Data Endpoints
- `GET /api/cards` - Fetch all credit cards with their perks
- `GET /api/perks` - Fetch all perks (filterable by card)
- `GET /api/usage` - Fetch usage history
- `POST /api/usage` - Log perk usage
- `GET /api/deals` - Fetch active deals
- `POST /api/deals` - Create new deal (OpenClaw)
- `POST /api/perks/updates` - Update perk info (OpenClaw)
- `GET /api/notifications` - Get user notifications

---

## Environment Variables

**Required in Vercel**:
```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://..."

# OpenClaw Integration
OPENCLAW_API_URL="http://187.77.18.160:61493"
OPENCLAW_API_KEY="[to be configured]"

# Web Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY="[generate with: npx web-push generate-vapid-keys]"
VAPID_PRIVATE_KEY="[generate with: npx web-push generate-vapid-keys]"
VAPID_EMAIL="mailto:user@example.com"

# App URL
NEXT_PUBLIC_APP_URL="https://mxpoints.vercel.app"
```

---

## Project Structure

```
maxpoints-app/
├── app/
│   ├── page.tsx                 # Main dashboard
│   ├── layout.tsx               # Root layout
│   └── api/
│       ├── create-tables/       # 🔥 Database initialization
│       ├── setup/               # 🔥 Data seeding
│       ├── cards/               # Card endpoints
│       ├── perks/               # Perk endpoints
│       ├── usage/               # Usage tracking
│       └── deals/               # Deal endpoints
├── components/
│   ├── card-summary.tsx         # Card display component
│   ├── perk-item.tsx            # Individual perk display
│   └── usage-chart.tsx          # ROI visualization
├── lib/
│   ├── prisma.ts                # Prisma client singleton
│   └── utils.ts                 # Utility functions
├── openclaw-skills/
│   ├── deal-scanner/
│   ├── perk-monitor/
│   └── usage-logger/
├── prisma/
│   └── schema.prisma            # Database schema
└── public/                      # Static assets
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Generate Prisma client
npm run prisma:generate

# Run database migrations (local only)
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio

# Build for production
npm run build

# Start production server
npm start
```

---

## Deployment Workflow

### Local Development
1. Set up `.env.local` with local PostgreSQL or Neon connection
2. Run `npm run dev`
3. Access at `http://localhost:3000`

### Production (Vercel)
1. Push to GitHub: `git push origin main`
2. Vercel auto-deploys from main branch
3. Run database initialization endpoints (see "Current Status" section)

---

## Next Steps / TODO

1. **Database Initialization** (CRITICAL)
   - [ ] Visit `/api/create-tables` endpoint in production
   - [ ] Verify tables created successfully
   - [ ] Visit `/api/setup` endpoint to seed data
   - [ ] Confirm dashboard loads with card data

2. **OpenClaw Configuration**
   - [ ] Deploy skills to OpenClaw instance
   - [ ] Configure API credentials
   - [ ] Test deal-scanner skill
   - [ ] Test perk-monitor skill
   - [ ] Test usage-logger skill

3. **Feature Development**
   - [ ] Add Excel import functionality
   - [ ] Implement push notifications
   - [ ] Create usage tracking UI
   - [ ] Build notification preferences page
   - [ ] Add ROI calculator
   - [ ] Create mobile-responsive design

4. **Future Enhancements**
   - [ ] iOS app (React Native or Swift)
   - [ ] Multi-user support
   - [ ] Points redemption strategy recommendations
   - [ ] Travel booking integration
   - [ ] Statement analysis via OCR

---

## Important Notes

### User Preferences (from conversation)
- ✅ Neon database chosen over Supabase/Vercel Postgres
- ✅ Manual location input preferred over automatic tracking
- ✅ Both availability AND expiration notifications wanted
- ✅ "Take your time and get this fixed the right way" approach

### Technical Decisions
- Downgraded from Prisma 7 to 6.19.3 for Vercel compatibility
- Using pgcrypto extension for UUID generation (compatible with Neon)
- Next.js 16 with Turbopack for faster builds
- Tailwind CSS 4 for styling
- Server components for better performance

### Data Sources
- Original data from user's Excel spreadsheet: `F:\Downloads\Credit Card Perks.xlsx`
- Verified perks against official sources (found $2000+ in missing perks)
- All perks current as of 2026

---

## Troubleshooting

### "Table does not exist" error
- Run `/api/create-tables` endpoint first
- Check Vercel logs for SQL errors
- Verify DATABASE_URL is set in Vercel environment variables

### Prisma errors
- Ensure Prisma version is 6.19.3 (not 7.x)
- Run `npm run prisma:generate` after schema changes
- Check that DATABASE_URL is accessible from Vercel

### OpenClaw connection issues
- Verify instance is running at http://187.77.18.160:61493
- Check firewall/network settings
- Confirm API key is correct

---

## Contact & Support

- GitHub Issues: https://github.com/jayscottaf/MaxPoints/issues
- Original Excel: `F:\Downloads\Credit Card Perks.xlsx`

---

**Last Updated**: 2026-04-01
**Status**: Database initialization pending, app deployed to Vercel
