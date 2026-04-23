import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Seed script to populate the database with initial test users.
 * This script hashes passwords and uses upsert to be idempotent.
 * It creates 4 users to facilitate 2v2 game testing.
 */
async function main() {
  const password = await bcrypt.hash('password123', 10);

  const users = [
    {
      username: 'player_white_1',
      email: 'white1@example.com',
      password,
      elo: 1200,
    },
    {
      username: 'player_white_2',
      email: 'white2@example.com',
      password,
      elo: 1200,
    },
    {
      username: 'player_black_1',
      email: 'black1@example.com',
      password,
      elo: 1200,
    },
    {
      username: 'player_black_2',
      email: 'black2@example.com',
      password,
      elo: 1200,
    },
  ];

  console.log('Seed started...');

  for (const user of users) {
    const createdUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        username: user.username,
        email: user.email,
        password: user.password,
        elo: user.elo,
      },
    });
    console.log(`Upserted user: ${createdUser.username}`);
  }

  console.log('Seed finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
