const { sequelize, User, Group, GroupMember, ExchangeRate } = require('./models');

const seedDatabase = async () => {
  try {
    console.log('Connecting to database for seeding...');
    await sequelize.authenticate();
    console.log('Database connected.');

    // Sync database (recreate tables)
    console.log('Synchronizing database schema (forcing drop to refresh seed)...');
    await sequelize.sync({ force: true });
    console.log('Tables recreated.');

    // 1. Create Users
    console.log('Seeding Users...');
    const aliceUser = await User.create({
      name: 'Alice Smith',
      email: 'alice@gmail.com',
      password: 'password123' // Will be hashed by hook
    });

    const bobUser = await User.create({
      name: 'Bob Johnson',
      email: 'bob@gmail.com',
      password: 'password123'
    });

    const charlieUser = await User.create({
      name: 'Charlie Brown',
      email: 'charlie@gmail.com',
      password: 'password123'
    });

    console.log('Users seeded successfully.');

    // 2. Create Group
    console.log('Seeding Groups...');
    const group = await Group.create({
      name: 'Cozy Corner Flat',
      description: 'Shared household bills and groceries for Flat 4B.'
    });

    console.log('Groups seeded successfully.');

    // 3. Create GroupMembers
    console.log('Seeding Group Members (with historical dates)...');
    
    // Alice joined June 1st and is active
    await GroupMember.create({
      groupId: group.id,
      userId: aliceUser.id,
      name: 'Alice',
      joinDate: '2026-06-01',
      leaveDate: null,
      isGuest: false
    });

    // Bob joined June 1st and is active
    await GroupMember.create({
      groupId: group.id,
      userId: bobUser.id,
      name: 'Bob',
      joinDate: '2026-06-01',
      leaveDate: null,
      isGuest: false
    });

    // Charlie joined June 1st and left on June 12th
    await GroupMember.create({
      groupId: group.id,
      userId: charlieUser.id,
      name: 'Charlie',
      joinDate: '2026-06-01',
      leaveDate: '2026-06-12',
      isGuest: false
    });

    console.log('Group Members seeded.');

    // 4. Seed Exchange Rate
    console.log('Seeding Exchange Rates...');
    await ExchangeRate.create({
      fromCurrency: 'USD',
      toCurrency: 'INR',
      rate: 83.0,
      date: '2026-06-13'
    });

    console.log('========================================================================');
    console.log('SUCCESS: Database seeded successfully!');
    console.log('Test Accounts:');
    console.log('- Email: alice@gmail.com  | Password: password123');
    console.log('- Email: bob@gmail.com    | Password: password123');
    console.log('- Email: charlie@gmail.com| Password: password123');
    console.log('========================================================================');

    process.exit(0);
  } catch (error) {
    console.error('CRITICAL: Seeding failed!', error);
    process.exit(1);
  }
};

seedDatabase();
