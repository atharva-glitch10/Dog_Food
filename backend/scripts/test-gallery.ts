import 'dotenv/config';
import { prisma } from '../src/utils/prisma.js';

async function test() {
  const event = await prisma.event.findUnique({
    where: { slug: 'dogfood-2026' },
  });
  console.log('Event found:', event?.id, event?.slug);

  const projects = await prisma.project.findMany({
    where: { eventId: event?.id },
  });
  console.log('Projects count for event id:', projects.length);
  projects.forEach(p => console.log('  -', p.id, p.title, p.status));
}

test().finally(() => process.exit(0));
