# Demo Data Seeding

## Quick Start

To populate demo content for the Demo123 user:

```bash
node scripts/seed-demo.js
```

## What it creates:

- **5 camping trips** (mix of past, current, and upcoming)
- **10 tasks** across different trips (some completed, some pending)
- **4 shopping lists** with various categories
- **15 shopping items** with realistic quantities and completion status

## Demo Content:

### Trips:
1. **Yosemite Valley Adventure** (upcoming) - Tent camping, moderate difficulty
2. **Big Sur Coastal Camping** (recent) - Tent camping, easy difficulty  
3. **Joshua Tree Desert Experience** (past) - Tent camping, moderate difficulty
4. **Lake Tahoe Winter Retreat** (future) - Cabin camping, easy difficulty
5. **Redwood Forest Retreat** (past) - Tent camping, easy difficulty

### Features Demonstrated:
- Different camping types (tent, cabin)
- Various difficulty levels
- Mix of public/private trips
- Realistic task management
- Shopping list organization
- Completed vs pending items

## Safety:
- Only affects Demo123 user data
- Clears existing demo data before seeding
- No changes to app code
- Can be run multiple times safely

## Requirements:
- Demo123 user must exist in database
- Database connection configured in .env
