import 'dotenv/config';
import { PrismaClient, Role, EventStatus, ProjectStatus, TeamRole, VotingEligibility, CertificateType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function main() {
  console.log('🌱 Seeding DOGFOOD 2026 Database with fixture data...');

  const passwordHash = await hashPassword('Dogfood2026!');

  // 1. Create Core Users
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@dogfood.local' },
    update: {},
    create: {
      email: 'admin@dogfood.local',
      name: 'System Admin',
      passwordHash,
      role: Role.ADMIN,
      bio: 'Dogfood Platform System Administrator',
    },
  });

  const organizerUser = await prisma.user.upsert({
    where: { email: 'organizer@dogfood.local' },
    update: {},
    create: {
      email: 'organizer@dogfood.local',
      name: 'Olivia Organizer',
      passwordHash,
      role: Role.ORGANIZER,
      bio: 'Lead Hackathon Director for Dogfood 2026',
    },
  });

  // Judges
  const judgeHarsh = await prisma.user.upsert({
    where: { email: 'judge.harsh@dogfood.local' },
    update: {},
    create: {
      email: 'judge.harsh@dogfood.local',
      name: 'Dr. Strict Scaler (Harsh Grader)',
      passwordHash,
      role: Role.JUDGE,
      bio: 'Distinguished Fellow; grades critically with lower mean scores.',
    },
  });

  const judgeLenient = await prisma.user.upsert({
    where: { email: 'judge.lenient@dogfood.local' },
    update: {},
    create: {
      email: 'judge.lenient@dogfood.local',
      name: 'Dr. Larry Lenient (Generous Grader)',
      passwordHash,
      role: Role.JUDGE,
      bio: 'Angel Investor; grades enthusiastically with higher mean scores.',
    },
  });

  const judgeBalanced = await prisma.user.upsert({
    where: { email: 'judge.balanced@dogfood.local' },
    update: {},
    create: {
      email: 'judge.balanced@dogfood.local',
      name: 'Barbara Balanced (Median Grader)',
      passwordHash,
      role: Role.JUDGE,
      bio: 'Staff Engineer; consistent standard grading distribution.',
    },
  });

  const judgeSpecialist = await prisma.user.upsert({
    where: { email: 'judge.specialist@dogfood.local' },
    update: {},
    create: {
      email: 'judge.specialist@dogfood.local',
      name: 'Sam Specialist',
      passwordHash,
      role: Role.JUDGE,
      bio: 'Domain Specialist in AI Architecture.',
    },
  });

  // Participants
  const alice = await prisma.user.upsert({
    where: { email: 'alice@dogfood.local' },
    update: {},
    create: {
      email: 'alice@dogfood.local',
      name: 'Alice Chen',
      passwordHash,
      role: Role.PARTICIPANT,
      bio: 'AI Researcher & Full-Stack Engineer',
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@dogfood.local' },
    update: {},
    create: {
      email: 'bob@dogfood.local',
      name: 'Bob Miller',
      passwordHash,
      role: Role.PARTICIPANT,
      bio: 'Systems Programmer & Distributed Architect',
    },
  });

  const carol = await prisma.user.upsert({
    where: { email: 'carol@dogfood.local' },
    update: {},
    create: {
      email: 'carol@dogfood.local',
      name: 'Carol Davis',
      passwordHash,
      role: Role.PARTICIPANT,
      bio: 'Cryptography & Protocol Designer',
    },
  });

  const dave = await prisma.user.upsert({
    where: { email: 'dave@dogfood.local' },
    update: {},
    create: {
      email: 'dave@dogfood.local',
      name: 'Dave Wilson',
      passwordHash,
      role: Role.PARTICIPANT,
      bio: 'Zero-Knowledge Engineer',
    },
  });

  const eve = await prisma.user.upsert({
    where: { email: 'eve@dogfood.local' },
    update: {},
    create: {
      email: 'eve@dogfood.local',
      name: 'Eve Johnson',
      passwordHash,
      role: Role.PARTICIPANT,
      bio: 'DevOps & Kubernetes Enthusiast',
    },
  });

  const frank = await prisma.user.upsert({
    where: { email: 'frank@dogfood.local' },
    update: {},
    create: {
      email: 'frank@dogfood.local',
      name: 'Frank Martinez',
      passwordHash,
      role: Role.PARTICIPANT,
      bio: 'IoT & CleanTech Hacker',
    },
  });

  console.log('✅ Core users created.');

  // 2. Create Flagship Event (Clean up previous seed event if present)
  await prisma.event.deleteMany({
    where: { slug: 'dogfood-2026' },
  });

  const now = new Date();
  const regStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const regEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const subStart = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const subDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const judgeStart = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const judgeDeadline = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  const event = await prisma.event.create({
    data: {
      slug: 'dogfood-2026',
      name: 'Dogfood 2026: 72-Hour Open Source Hackathon',
      tagline: 'Build, evaluate, and self-host the future of developer tooling & decentralized systems.',
      description: `Welcome to **Dogfood 2026**, the premier offline-capable, self-hostable hackathon.

Participants collaborate in teams of 1-4 to build cutting-edge solutions across AI, Web3, DevTools, and Social Impact. 

All projects undergo rigorous, cross-judge score normalization and Bradley-Terry pairwise evaluation to guarantee total fairness.`,
      status: EventStatus.SUBMISSION_OPEN,
      registrationStartDate: regStart,
      registrationEndDate: regEnd,
      submissionStartDate: subStart,
      submissionDeadline: subDeadline,
      judgingStartDate: judgeStart,
      judgingDeadline: judgeDeadline,
      settings: {
        create: {
          minTeamSize: 1,
          maxTeamSize: 4,
          allowCommunityVoting: true,
          votingEligibility: VotingEligibility.VERIFIED_USERS,
          votesPerUser: 3,
          hideResultsUntilPublished: true,
          randomizeGallery: true,
          assignmentsPerProject: 3,
        },
      },
    },
  });

  console.log(`✅ Event created: ${event.name}`);

  // 3. Create Tracks
  const trackAI = await prisma.track.create({
    data: {
      eventId: event.id,
      name: 'AI & Autonomous Systems',
      description: 'Agents, local LLM orchestration, multimodal pipelines, and intelligent automation.',
      colorHex: '#8b5cf6',
    },
  });

  const trackWeb3 = await prisma.track.create({
    data: {
      eventId: event.id,
      name: 'Decentralized Protocols & ZK',
      description: 'Zero-knowledge proofs, decentralized storage, smart contracts, and peer-to-peer infra.',
      colorHex: '#3b82f6',
    },
  });

  const trackDevTools = await prisma.track.create({
    data: {
      eventId: event.id,
      name: 'Developer Tooling & Infrastructure',
      description: 'Compilers, CLI utilities, debugging environments, and cloud-native systems.',
      colorHex: '#10b981',
    },
  });

  const trackImpact = await prisma.track.create({
    data: {
      eventId: event.id,
      name: 'Social Impact & CleanTech',
      description: 'Climate analytics, open science, accessibility, and public goods.',
      colorHex: '#f59e0b',
    },
  });

  // 4. Create Prizes
  await prisma.prize.createMany({
    data: [
      {
        eventId: event.id,
        name: '1st Place Grand Champion',
        description: 'Awarded to the highest scoring project across all tracks.',
        amount: '$15,000 USD',
        rank: 1,
      },
      {
        eventId: event.id,
        name: '2nd Place Runner-Up',
        description: 'Second highest overall score across the entire event.',
        amount: '$10,000 USD',
        rank: 2,
      },
      {
        eventId: event.id,
        trackId: trackAI.id,
        name: 'Best AI Innovation Bounty',
        description: 'Top ranked project in the AI & Autonomous Systems track.',
        amount: '$5,000 USD',
        rank: 3,
      },
      {
        eventId: event.id,
        trackId: trackDevTools.id,
        name: 'Best Developer Experience Prize',
        description: 'Top ranked project in Developer Tooling & Infrastructure.',
        amount: '$5,000 USD',
        rank: 4,
      },
    ],
  });

  // 5. Create Judging Rubric (upsert so repeated seeding doesn't crash)
  let rubric = await prisma.rubric.findUnique({ where: { eventId: event.id }, include: { criteria: true } });
  if (!rubric) {
    rubric = await prisma.rubric.create({
      data: {
        eventId: event.id,
        name: 'Dogfood Official Evaluation Rubric 2026',
        description: 'Standard 4-tier rubric with weighted criteria summing to 100%.',
        criteria: {
          create: [
            {
              title: 'Technical Depth & Architecture',
              description: 'Code quality, system design, defensibility, and algorithmic complexity.',
              weight: 0.30,
              maxScore: 10,
              orderIndex: 0,
            },
            {
              title: 'Innovation & Originality',
              description: 'Novelty of the concept, breakthrough approach, and creative problem solving.',
              weight: 0.30,
              maxScore: 10,
              orderIndex: 1,
            },
            {
              title: 'Impact & Practical Utility',
              description: 'Real-world applicability, problem significance, and adoption potential.',
              weight: 0.20,
              maxScore: 10,
              orderIndex: 2,
            },
            {
              title: 'Design & User Experience',
              description: 'Intuitive interface, aesthetic polish, and seamless onboarding flow.',
              weight: 0.20,
              maxScore: 10,
              orderIndex: 3,
            },
          ],
        },
      },
      include: { criteria: true },
    });
  }

  console.log('✅ Tracks, Prizes, and Rubrics created.');

  // 6. Enlist Judges (upsert so repeated seeding doesn't crash)
  const upsertJudge = (userId: string) =>
    prisma.judge.upsert({
      where: { eventId_userId: { eventId: event.id, userId } },
      update: {},
      create: { eventId: event.id, userId, capacity: 10 },
    });
  const jHarsh = await upsertJudge(judgeHarsh.id);
  const jLenient = await upsertJudge(judgeLenient.id);
  const jBalanced = await upsertJudge(judgeBalanced.id);
  const jSpecialist = await upsertJudge(judgeSpecialist.id);

  // 7. Create Teams & Projects
  // Team 1: Neural Nexus (Alice + Bob)
  const team1 = await prisma.team.create({
    data: {
      eventId: event.id,
      name: 'Neural Nexus',
      description: 'Autonomous multi-agent system developers',
      inviteCode: 'NEXUS1',
      members: {
        create: [
          { userId: alice.id, role: TeamRole.LEADER },
          { userId: bob.id, role: TeamRole.MEMBER },
        ],
      },
    },
  });

  const proj1 = await prisma.project.create({
    data: {
      eventId: event.id,
      teamId: team1.id,
      trackId: trackAI.id,
      title: 'Aegis AI: Autonomous Incident Defense',
      tagline: 'Self-healing infrastructure powered by local streaming reasoning models.',
      problemStatement: 'Cloud infrastructure outages cost enterprises billions, with MTTR averaging over 45 minutes due to manual log inspection.',
      solutionDescription: 'Aegis AI deploys lightweight local eBPF telemetry agents coupled with an autonomous reasoning graph that synthesizes root-cause hypotheses and executes safe remediation rollbacks in under 8 seconds.',
      technologies: ['TypeScript', 'Rust', 'eBPF', 'Ollama', 'React', 'Docker'],
      repoUrl: 'https://github.com/dogfood-demo/aegis-ai',
      demoUrl: 'https://aegis-ai.demo.local',
      status: ProjectStatus.SUBMITTED,
      submittedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  // Team 2: Quantum Leap (Carol + Dave)
  const team2 = await prisma.team.create({
    data: {
      eventId: event.id,
      name: 'Quantum Leap',
      description: 'Zero-knowledge database systems',
      inviteCode: 'QLEAP2',
      members: {
        create: [
          { userId: carol.id, role: TeamRole.LEADER },
          { userId: dave.id, role: TeamRole.MEMBER },
        ],
      },
    },
  });

  const proj2 = await prisma.project.create({
    data: {
      eventId: event.id,
      teamId: team2.id,
      trackId: trackWeb3.id,
      title: 'HyperGraph: Zero-Knowledge Graph Database',
      tagline: 'Query private social and financial graphs with mathematically verifiable privacy.',
      problemStatement: 'Traditional graph databases require exposing all node edges and properties to query operators, violating user privacy.',
      solutionDescription: 'HyperGraph compiles GraphQL queries into arithmetic circuits verified via Groth16 SNARKs, enabling subgraph matching proofs without revealing confidential graph topology.',
      technologies: ['Rust', 'Circom', 'SnarkJS', 'GraphQL', 'WebAssembly'],
      repoUrl: 'https://github.com/dogfood-demo/hypergraph',
      demoUrl: 'https://hypergraph.demo.local',
      status: ProjectStatus.SUBMITTED,
      submittedAt: new Date(now.getTime() - 1.5 * 24 * 60 * 60 * 1000),
    },
  });

  // Team 3: DevCraft (Eve)
  const team3 = await prisma.team.create({
    data: {
      eventId: event.id,
      name: 'DevCraft',
      description: 'Developer productivity tools',
      inviteCode: 'DEVCR3',
      members: {
        create: [{ userId: eve.id, role: TeamRole.LEADER }],
      },
    },
  });

  const proj3 = await prisma.project.create({
    data: {
      eventId: event.id,
      teamId: team3.id,
      trackId: trackDevTools.id,
      title: 'KubeFlow CLI: Instant Multi-Cluster Orchestration',
      tagline: 'Declarative edge-to-cloud mesh deployment in one concise CLI command.',
      problemStatement: 'Managing hybrid deployments across bare metal, Docker Compose, and Kubernetes requires fragmented scripts and error-prone manifests.',
      solutionDescription: 'KubeFlow CLI unifies container orchestration specs into a single zero-dependency binary with built-in mTLS wireguard mesh tunneling.',
      technologies: ['Go', 'Kubernetes', 'WireGuard', 'Cobra', 'SQLite'],
      repoUrl: 'https://github.com/dogfood-demo/kubeflow-cli',
      demoUrl: 'https://kubeflow.demo.local',
      status: ProjectStatus.SUBMITTED,
      submittedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  // Team 4: TerraGuardians (Frank)
  const team4 = await prisma.team.create({
    data: {
      eventId: event.id,
      name: 'TerraGuardians',
      description: 'Climate & IoT sensor analytics',
      inviteCode: 'TERRA4',
      members: {
        create: [{ userId: frank.id, role: TeamRole.LEADER }],
      },
    },
  });

  const proj4 = await prisma.project.create({
    data: {
      eventId: event.id,
      teamId: team4.id,
      trackId: trackImpact.id,
      title: 'VerdantSense: IoT Satellite Micro-Climate Monitor',
      tagline: 'Solar-powered edge IoT meshes detecting wildfire precursors in real time.',
      problemStatement: 'Wildfires cause catastrophic destruction before conventional satellite imagery detects thermal spikes.',
      solutionDescription: 'VerdantSense utilizes solar LoRaWAN sensors with localized VOC gas sensors that broadcast alerts 3 hours before flame ignition.',
      technologies: ['C++', 'Embedded Rust', 'LoRaWAN', 'FastAPI', 'Mapbox'],
      repoUrl: 'https://github.com/dogfood-demo/verdantsense',
      demoUrl: 'https://verdantsense.demo.local',
      status: ProjectStatus.SUBMITTED,
      submittedAt: new Date(now.getTime() - 0.5 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('✅ Teams and Submissions seeded.');

  // 8. Create Judge Assignments & Evaluations
  // Project 1 (Aegis AI) evaluated by Judge Harsh, Judge Lenient, Judge Balanced
  await prisma.judgeAssignment.createMany({
    skipDuplicates: true,
    data: [
      { eventId: event.id, judgeId: jHarsh.id, projectId: proj1.id, isCompleted: true },
      { eventId: event.id, judgeId: jLenient.id, projectId: proj1.id, isCompleted: true },
      { eventId: event.id, judgeId: jBalanced.id, projectId: proj1.id, isCompleted: true },

      { eventId: event.id, judgeId: jHarsh.id, projectId: proj2.id, isCompleted: true },
      { eventId: event.id, judgeId: jLenient.id, projectId: proj2.id, isCompleted: true },
      { eventId: event.id, judgeId: jSpecialist.id, projectId: proj2.id, isCompleted: true },

      { eventId: event.id, judgeId: jBalanced.id, projectId: proj3.id, isCompleted: true },
      { eventId: event.id, judgeId: jSpecialist.id, projectId: proj3.id, isCompleted: true },
      { eventId: event.id, judgeId: jLenient.id, projectId: proj3.id, isCompleted: true },

      { eventId: event.id, judgeId: jHarsh.id, projectId: proj4.id, isCompleted: true },
      { eventId: event.id, judgeId: jBalanced.id, projectId: proj4.id, isCompleted: true },
      { eventId: event.id, judgeId: jSpecialist.id, projectId: proj4.id, isCompleted: true },
    ],
  });

  // Seed Evaluations demonstrating Harsh vs Lenient vs Balanced Graders:
  const c0 = rubric.criteria[0].id; // Tech 30%
  const c1 = rubric.criteria[1].id; // Innov 30%
  const c2 = rubric.criteria[2].id; // Impact 20%
  const c3 = rubric.criteria[3].id; // UX 20%

  // Project 1 Evaluations
  // Harsh Judge gives 7, 7, 6, 6 -> Raw = 66.0
  const eval1_H = await prisma.evaluation.create({
    data: {
      eventId: event.id,
      judgeId: jHarsh.id,
      projectId: proj1.id,
      isDraft: false,
      weightedTotal: 66.0,
      feedback: 'Solid technical implementation, but needs more documentation.',
      scores: {
        create: [
          { criterionId: c0, score: 7 },
          { criterionId: c1, score: 7 },
          { criterionId: c2, score: 6 },
          { criterionId: c3, score: 6 },
        ],
      },
    },
  });

  // Lenient Judge gives 9, 10, 9, 9 -> Raw = 93.0
  const eval1_L = await prisma.evaluation.create({
    data: {
      eventId: event.id,
      judgeId: jLenient.id,
      projectId: proj1.id,
      isDraft: false,
      weightedTotal: 93.0,
      feedback: 'Incredible innovation! Ready for enterprise production.',
      scores: {
        create: [
          { criterionId: c0, score: 9 },
          { criterionId: c1, score: 10 },
          { criterionId: c2, score: 9 },
          { criterionId: c3, score: 9 },
        ],
      },
    },
  });

  // Balanced Judge gives 8, 9, 8, 8 -> Raw = 83.0
  const eval1_B = await prisma.evaluation.create({
    data: {
      eventId: event.id,
      judgeId: jBalanced.id,
      projectId: proj1.id,
      isDraft: false,
      weightedTotal: 83.0,
      feedback: 'Well engineered architecture with clear practical value.',
      scores: {
        create: [
          { criterionId: c0, score: 8 },
          { criterionId: c1, score: 9 },
          { criterionId: c2, score: 8 },
          { criterionId: c3, score: 8 },
        ],
      },
    },
  });

  // Project 2 Evaluations
  await prisma.evaluation.create({
    data: {
      eventId: event.id,
      judgeId: jHarsh.id,
      projectId: proj2.id,
      isDraft: false,
      weightedTotal: 62.0,
      scores: {
        create: [
          { criterionId: c0, score: 8 },
          { criterionId: c1, score: 6 },
          { criterionId: c2, score: 5 },
          { criterionId: c3, score: 5 },
        ],
      },
    },
  });

  await prisma.evaluation.create({
    data: {
      eventId: event.id,
      judgeId: jLenient.id,
      projectId: proj2.id,
      isDraft: false,
      weightedTotal: 89.0,
      scores: {
        create: [
          { criterionId: c0, score: 10 },
          { criterionId: c1, score: 9 },
          { criterionId: c2, score: 8 },
          { criterionId: c3, score: 8 },
        ],
      },
    },
  });

  await prisma.evaluation.create({
    data: {
      eventId: event.id,
      judgeId: jSpecialist.id,
      projectId: proj2.id,
      isDraft: false,
      weightedTotal: 86.0,
      scores: {
        create: [
          { criterionId: c0, score: 9 },
          { criterionId: c1, score: 9 },
          { criterionId: c2, score: 8 },
          { criterionId: c3, score: 8 },
        ],
      },
    },
  });

  // Sample Community Votes
  await prisma.vote.createMany({
    skipDuplicates: true,
    data: [
      { eventId: event.id, projectId: proj1.id, userId: frank.id, ipAddress: '192.168.1.101' },
      { eventId: event.id, projectId: proj1.id, userId: eve.id, ipAddress: '192.168.1.102' },
      { eventId: event.id, projectId: proj2.id, userId: alice.id, ipAddress: '192.168.1.103' },
      { eventId: event.id, projectId: proj3.id, userId: bob.id, ipAddress: '192.168.1.104' },
    ],
  });

  console.log('✅ Seed evaluations and community votes recorded.');
  console.log('🌟 SEEDING COMPLETE! You can now log in with demo accounts.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
