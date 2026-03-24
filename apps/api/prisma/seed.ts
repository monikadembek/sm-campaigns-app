import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from 'prisma/config';

const adapter = new PrismaPg({
  connectionString: env('DATABASE_URL'),
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const goals = [
    {
      slug: 'build_brand_awareness',
      label: 'Build Brand Awareness',
      sortOrder: 1,
    },
    { slug: 'drive_sales', label: 'Drive Sales', sortOrder: 2 },
    { slug: 'lead_generation', label: 'Lead Generation', sortOrder: 3 },
    {
      slug: 'announce_new_product',
      label: 'Announce New Product',
      sortOrder: 4,
    },
    { slug: 'increase_engagement', label: 'Increase Engagement', sortOrder: 5 },
    { slug: 'increase_traffic', label: 'Increase Traffic', sortOrder: 6 },
    { slug: 'conversions', label: 'Conversions', sortOrder: 7 },
    { slug: 'promote_event', label: 'Promote An Event', sortOrder: 8 },
  ];

  for (const goal of goals) {
    await prisma.campaignGoal.upsert({
      where: { slug: goal.slug },
      update: { label: goal.label, sortOrder: goal.sortOrder },
      create: goal,
    });
  }

  console.log('Seeded campaign goals');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
