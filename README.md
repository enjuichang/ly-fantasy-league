# Fantasy Legislative Yuan

A fantasy sports-style web application for tracking Taiwan Legislative Yuan legislators' activities and performance.

## 🎯 Overview

Fantasy Legislative Yuan allows users to create leagues, draft legislators, and compete based on real legislative activities including:
- Bill proposals and co-sponsorships
- Floor speeches and written interpellations
- Roll call votes and maverick voting patterns

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ (or 21.6.2+)
- npm 10+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ly-fantasy-league

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Initialize database
npx prisma generate
npx prisma db push

# Seed database with legislators
npx prisma db seed

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 📁 Project Structure

```
ly-fantasy-league/
├── prisma/
│   ├── schema.prisma              # Database schema
│   ├── migrations/                # Auto-generated migrations
│   ├── scripts/                   # Utility scripts
│   │   ├── fetch/                 # Data fetching scripts
│   │   ├── seed/                  # Database seeding
│   │   ├── utils/                 # Utility scripts
│   │   └── test-apis/             # API test scripts
│   ├── migrations-manual/         # One-off migration scripts
│   └── docs/                      # Prisma documentation
├── src/
│   ├── app/                       # Next.js app directory
│   ├── components/                # React components
│   ├── lib/                       # Utility functions
│   └── auth.ts                    # Authentication config
├── tests/                         # Test files
│   ├── unit/                      # Unit tests
│   └── integration/               # Integration tests
└── public/                        # Static assets
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

**Note**: Vitest configuration currently has an ESM compatibility issue with Node 21.6.2. This will be resolved in a future update. Tests are written and ready to run once the config issue is fixed.

## 📊 Data Fetching

Fetch legislative data from Taiwan Legislative Yuan APIs:

```bash
# Fetch all data types
npm run fetch:cosign          # Co-signed bills
npm run fetch:propose          # Proposed bills
npm run fetch:interpellation   # Written interpellations
npm run fetch:rollcall         # Roll call votes
npm run fetch:floor-speech     # Floor speeches

# Seed historical data
npm run seed:history
```

### Script Guidelines

All data fetching scripts follow best practices:
- **Incremental updates**: Only fetch new data since last run
- **Deduplication**: Check for existing scores before creating new ones
- **Batch processing**: Process legislators in parallel for efficiency
- **API testing**: Test scripts available in `prisma/scripts/test-apis/`

See `prisma/docs/API_SCRIPT_GUIDELINES.md` for detailed documentation.

## 🎮 Features

### League Management
- Create and join leagues
- Invite friends via email
- Commissioner controls

### Draft System
- Snake draft algorithm
- Drag-and-drop preference queue
- Animated draft results
- Automatic fallback for empty queues

### Scoring Categories
- **PROPOSE_BILL**: 1 point per bill proposed (max 5/week)
- **COSIGN_BILL**: 3 points per passed bill co-signed
- **FLOOR_SPEECH**: 1 point per oral floor speech (max 5/week)
- **WRITTEN_SPEECH**: 1 point per written interpellation (max 5/week)
- **ROLLCALL_VOTE**: 1 point per roll call vote participation
- **MAVERICK_BONUS**: 2 points for voting against party line

### Team Management
- Active roster and bench
- Weekly matchups
- Player history and statistics
- Add/drop players

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm test             # Run tests
```

### Database Management

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes
npx prisma db push

# Open Prisma Studio
npx prisma studio

# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed
```

### Utility Scripts

```bash
# Clean mock data
npm run clean:mock

# Clear bill scores
npm run clean:bills
```

## 📝 Scoring System

Scores are calculated weekly (Monday-Sunday) with the following rules:

1. **Weekly Caps**: Some categories have max 5 points per week
2. **Date-based**: Scores assigned to week based on activity date
3. **Deduplication**: Same activity won't be counted twice
4. **Bench Players**: Don't contribute to team scores

## 🔐 Authentication

Uses NextAuth.js with Google OAuth provider. Configure in `.env.local`:

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
```

## 📚 Documentation

- **API Scripts**: `prisma/docs/API_SCRIPT_GUIDELINES.md`
- **Manual Migrations**: `prisma/migrations-manual/README.md`
- **Script Status**: `prisma/docs/API_SCRIPTS_STATUS.md`

## 🤝 Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting PR

## 📄 License

[Add your license here]

## 🙏 Acknowledgments

- Taiwan Legislative Yuan for providing open APIs
- Next.js team for the amazing framework
- Prisma for the excellent ORM
