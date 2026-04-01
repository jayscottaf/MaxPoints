# MaxPoints - Credit Card Perks & Points Tracker

Track and maximize your credit card perks, benefits, and rewards with automated monitoring and intelligent notifications.

## Features

- **Comprehensive Perk Tracking**: Track all credits, perks, and benefits across multiple premium credit cards
- **Smart Notifications**: Get alerts when perks are available or expiring soon
- **ROI Dashboard**: Visualize how much value you're extracting from annual fees
- **Usage Logging**: Track perk usage in real-time to avoid missing benefits
- **OpenClaw Integration**: Automated deal scanning and perk monitoring
- **Excel Import**: Import existing tracking spreadsheets seamlessly

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenClaw instance (optional, for automation)

### Installation

1. **Clone and install dependencies**:
```bash
cd maxpoints-app
npm install
```

2. **Set up environment variables**:
```bash
cp .env.local .env.local.backup
```

Edit `.env.local`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/maxpoints"
OPENCLAW_API_URL="http://187.77.18.160:61493"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

3. **Set up database**:
```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

4. **Run the application**:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Import Your Excel Data

1. Click "Settings" in the app
2. Select "Import Excel"
3. Upload your "Credit Card Perks.xlsx" file
4. Your existing usage data will be imported automatically

## OpenClaw Integration

### Install Skills on Your OpenClaw Instance

1. **Copy skills to OpenClaw**:
```bash
cp -r openclaw-skills/* /path/to/openclaw/skills/
```

2. **Configure environment**:
Add to your OpenClaw config:
```env
MAXPOINTS_API_URL=http://your-maxpoints-url/api
MAXPOINTS_USER_ID=user-default
```

3. **Enable skills**:
- `maxpoints-deal-scanner`: Runs daily at 6am
- `maxpoints-perk-monitor`: Runs weekly on Sundays
- `maxpoints-usage-logger`: Responds to chat commands

### Usage Commands via OpenClaw Chat

- "Used $75 lululemon" - Log usage
- "Spent $100 on resy q3" - Log quarterly credit
- "Log $50 for saks" - Alternative format

## Card & Perk Coverage

### Supported Cards

**Amex Platinum ($895/year)**
- Resy Dining Credits ($400/year)
- Lululemon Credits ($300/year)
- Hotel Credits ($600/year)
- Digital Entertainment ($300/year)
- Uber Benefits ($320/year)
- And 10+ more perks

**Amex Hilton Aspire ($550/year)**
- Hilton Resort Credits ($400/year)
- Flight Credits ($200/year)
- Hilton Dining ($250/year)
- Free Night Certificate
- And more

**Chase Sapphire Reserve ($795/year)**
- Travel Credit ($300/year)
- Hotel Credits ($750 in 2026)
- Dining Credits ($300/year)
- Entertainment Credits ($300/year)
- DoorDash benefits ($420/year)
- And more

## Architecture

```
Frontend (Next.js PWA)
    ↕
Backend API (Next.js API Routes)
    ↕
PostgreSQL Database
    ↕
OpenClaw Agent (Optional)
    ├── Deal Scanner
    ├── Perk Monitor
    └── Usage Logger
```

## Development

### Add New Card

1. Add to `prisma/seed.ts`
2. Run `npx prisma db seed`

### Add New Perk Type

1. Update `lib/utils.ts` for period calculations
2. Add to seed data
3. Update UI components if needed

### Testing

```bash
npm test
npm run lint
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repo to Vercel
3. Set environment variables
4. Deploy

### Docker

```bash
docker build -t maxpoints .
docker run -p 3000:3000 maxpoints
```

## Contributing

Pull requests welcome! Please follow existing code style.

## License

MIT

## Support

For issues or questions, open a GitHub issue or contact support.

---

Built to maximize credit card value and never miss a perk again!
