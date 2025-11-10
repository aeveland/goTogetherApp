const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function seedDemoData() {
    const client = await pool.connect();
    
    try {
        console.log('🌱 Starting demo data seeding...');
        
        // Find Demo123 user
        const userResult = await client.query(
            'SELECT id FROM users WHERE email = $1',
            ['demo123@email.com']
        );
        
        if (userResult.rows.length === 0) {
            console.log('❌ Demo123 user not found. Please create the user first.');
            return;
        }
        
        const demoUserId = userResult.rows[0].id;
        console.log(`✅ Found Demo123 user with ID: ${demoUserId}`);
        
        // Clear existing demo data
        console.log('🧹 Clearing existing demo data...');
        await client.query('DELETE FROM trip_tasks WHERE trip_id IN (SELECT id FROM camping_trips WHERE organizer_id = $1)', [demoUserId]);
        await client.query('DELETE FROM trip_participants WHERE trip_id IN (SELECT id FROM camping_trips WHERE organizer_id = $1)', [demoUserId]);
        await client.query('DELETE FROM shopping_items WHERE list_id IN (SELECT id FROM shopping_lists WHERE trip_id IN (SELECT id FROM camping_trips WHERE organizer_id = $1))', [demoUserId]);
        await client.query('DELETE FROM shopping_lists WHERE trip_id IN (SELECT id FROM camping_trips WHERE organizer_id = $1)', [demoUserId]);
        await client.query('DELETE FROM camping_trips WHERE organizer_id = $1', [demoUserId]);
        
        // Sample trips data
        const trips = [
            {
                title: 'Yosemite Valley Adventure',
                location: 'Yosemite National Park, CA',
                start_date: '2025-12-15',
                end_date: '2025-12-18',
                description: 'Epic 3-day camping trip with hiking, photography, and stargazing. Perfect for experiencing the majesty of Yosemite Valley.',
                camping_type: 'tent',
                difficulty_level: 'moderate',
                is_public: true
            },
            {
                title: 'Big Sur Coastal Camping',
                location: 'Big Sur, CA',
                start_date: '2025-11-20',
                end_date: '2025-11-22',
                description: 'Scenic coastal camping with breathtaking ocean views, hiking trails, and peaceful beach access.',
                camping_type: 'tent',
                difficulty_level: 'easy',
                is_public: true
            },
            {
                title: 'Joshua Tree Desert Experience',
                location: 'Joshua Tree National Park, CA',
                start_date: '2025-10-05',
                end_date: '2025-10-07',
                description: 'Desert camping adventure with rock climbing, stargazing, and unique desert landscapes.',
                camping_type: 'tent',
                difficulty_level: 'moderate',
                is_public: false
            },
            {
                title: 'Lake Tahoe Winter Retreat',
                location: 'Lake Tahoe, CA',
                start_date: '2026-01-10',
                end_date: '2026-01-13',
                description: 'Winter camping experience with snow activities, cozy campfires, and stunning lake views.',
                camping_type: 'cabin',
                difficulty_level: 'easy',
                is_public: true
            },
            {
                title: 'Redwood Forest Retreat',
                location: 'Redwood National Park, CA',
                start_date: '2025-09-15',
                end_date: '2025-09-17',
                description: 'Peaceful camping among ancient redwood trees with hiking and nature photography.',
                camping_type: 'tent',
                difficulty_level: 'easy',
                is_public: false
            }
        ];
        
        console.log('🏕️ Creating sample trips...');
        const tripIds = [];
        
        for (const trip of trips) {
            const tripResult = await client.query(
                `INSERT INTO camping_trips (title, location, start_date, end_date, description, camping_type, difficulty_level, is_public, organizer_id, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                 RETURNING id`,
                [trip.title, trip.location, trip.start_date, trip.end_date, trip.description, trip.camping_type, trip.difficulty_level, trip.is_public, demoUserId]
            );
            tripIds.push(tripResult.rows[0].id);
            console.log(`   ✅ Created trip: ${trip.title}`);
        }
        
        // Add demo user as participant to all trips
        console.log('👥 Adding trip participants...');
        for (const tripId of tripIds) {
            await client.query(
                'INSERT INTO trip_participants (trip_id, user_id, joined_at) VALUES ($1, $2, NOW())',
                [tripId, demoUserId]
            );
        }
        
        // Sample tasks for trips
        const tasks = [
            // Yosemite trip tasks
            { trip_index: 0, title: 'Research hiking trails', description: 'Look up best trails for our skill level', assigned_to: 'Everyone', due_date: '2025-12-10', completed: true },
            { trip_index: 0, title: 'Check weather forecast', description: 'Monitor weather conditions for trip dates', assigned_to: 'Andy', due_date: '2025-12-12', completed: false },
            { trip_index: 0, title: 'Pack camera equipment', description: 'Bring DSLR, extra batteries, and memory cards', assigned_to: 'Andy', due_date: '2025-12-14', completed: false },
            
            // Big Sur trip tasks
            { trip_index: 1, title: 'Reserve camping spots', description: 'Book campsites with ocean views', assigned_to: 'Andy', due_date: '2025-11-15', completed: true },
            { trip_index: 1, title: 'Plan coastal hikes', description: 'Research McWay Falls and other scenic spots', assigned_to: 'Everyone', due_date: '2025-11-18', completed: false },
            
            // Joshua Tree tasks
            { trip_index: 2, title: 'Bring climbing gear', description: 'Pack ropes, harnesses, and climbing shoes', assigned_to: 'Andy', due_date: '2025-10-01', completed: true },
            { trip_index: 2, title: 'Download star maps', description: 'Get astronomy apps for stargazing', assigned_to: 'Everyone', due_date: '2025-10-03', completed: true },
            
            // Lake Tahoe tasks
            { trip_index: 3, title: 'Check cabin amenities', description: 'Confirm heating, kitchen, and bedding availability', assigned_to: 'Andy', due_date: '2026-01-05', completed: false },
            { trip_index: 3, title: 'Pack winter gear', description: 'Bring warm clothes, boots, and snow equipment', assigned_to: 'Everyone', due_date: '2026-01-08', completed: false },
            
            // Redwood tasks
            { trip_index: 4, title: 'Research photography spots', description: 'Find best locations for redwood photos', assigned_to: 'Andy', due_date: '2025-09-10', completed: true },
        ];
        
        console.log('✅ Creating sample tasks...');
        for (const task of tasks) {
            const tripId = tripIds[task.trip_index];
            await client.query(
                `INSERT INTO trip_tasks (trip_id, title, description, assigned_to, due_date, completed, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                [tripId, task.title, task.description, task.assigned_to, task.due_date, task.completed]
            );
            console.log(`   ✅ Created task: ${task.title}`);
        }
        
        // Sample shopping lists
        const shoppingLists = [
            { trip_index: 0, name: 'Food & Snacks', category: 'food' },
            { trip_index: 0, name: 'Camping Gear', category: 'gear' },
            { trip_index: 1, name: 'Beach Essentials', category: 'personal' },
            { trip_index: 3, name: 'Winter Supplies', category: 'gear' }
        ];
        
        console.log('🛒 Creating shopping lists...');
        const listIds = [];
        
        for (const list of shoppingLists) {
            const tripId = tripIds[list.trip_index];
            const listResult = await client.query(
                'INSERT INTO shopping_lists (trip_id, name, category, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
                [tripId, list.name, list.category]
            );
            listIds.push(listResult.rows[0].id);
            console.log(`   ✅ Created shopping list: ${list.name}`);
        }
        
        // Sample shopping items
        const shoppingItems = [
            // Food & Snacks
            { list_index: 0, name: 'Trail Mix', quantity: 4, unit: 'bags', completed: true },
            { list_index: 0, name: 'Energy Bars', quantity: 12, unit: 'bars', completed: true },
            { list_index: 0, name: 'Instant Coffee', quantity: 1, unit: 'container', completed: false },
            { list_index: 0, name: 'Dried Fruit', quantity: 2, unit: 'bags', completed: false },
            
            // Camping Gear
            { list_index: 1, name: 'Headlamps', quantity: 2, unit: 'pieces', completed: true },
            { list_index: 1, name: 'Extra Batteries', quantity: 8, unit: 'AA', completed: false },
            { list_index: 1, name: 'Rope', quantity: 50, unit: 'feet', completed: false },
            { list_index: 1, name: 'First Aid Kit', quantity: 1, unit: 'kit', completed: true },
            
            // Beach Essentials
            { list_index: 2, name: 'Sunscreen SPF 50', quantity: 2, unit: 'bottles', completed: false },
            { list_index: 2, name: 'Beach Towels', quantity: 4, unit: 'towels', completed: true },
            { list_index: 2, name: 'Flip Flops', quantity: 2, unit: 'pairs', completed: false },
            
            // Winter Supplies
            { list_index: 3, name: 'Hand Warmers', quantity: 10, unit: 'packs', completed: false },
            { list_index: 3, name: 'Thermal Socks', quantity: 4, unit: 'pairs', completed: false },
            { list_index: 3, name: 'Hot Chocolate Mix', quantity: 1, unit: 'box', completed: false }
        ];
        
        console.log('📦 Creating shopping items...');
        for (const item of shoppingItems) {
            const listId = listIds[item.list_index];
            await client.query(
                'INSERT INTO shopping_items (list_id, name, quantity, unit, completed, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
                [listId, item.name, item.quantity, item.unit, item.completed]
            );
            console.log(`   ✅ Created item: ${item.name}`);
        }
        
        console.log('\n🎉 Demo data seeding completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`   • ${trips.length} camping trips`);
        console.log(`   • ${tasks.length} tasks`);
        console.log(`   • ${shoppingLists.length} shopping lists`);
        console.log(`   • ${shoppingItems.length} shopping items`);
        console.log('\n🚀 Demo123 user now has realistic demo content!');
        
    } catch (error) {
        console.error('❌ Error seeding demo data:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the seeding
seedDemoData();
