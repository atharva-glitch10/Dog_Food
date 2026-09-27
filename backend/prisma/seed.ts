import 'dotenv/config';
import {
  PrismaClient,
  Role,
  EventStatus,
  ProjectStatus,
  TeamRole,
  VotingEligibility,
  CertificateType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { normalizationService } from '../src/modules/normalization/normalization.service.js';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function main() {
  console.log('🌱 Seeding DOGFOOD 2026 Database with comprehensive end-to-end fixture data...');

  const passwordHash = await hashPassword('Dogfood2026!');

  // 1. Create Core Users Across All Distinct Roles
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@dogfood.local' },
    update: { passwordHash },
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
    update: { passwordHash },
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
    update: { passwordHash },
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
    update: { passwordHash },
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
    update: { passwordHash },
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
    update: { passwordHash },
    create: {
      email: 'judge.specialist@dogfood.local',
      name: 'Sam Specialist (Judge & Team Member)',
      passwordHash,
      role: Role.JUDGE,
      bio: 'Domain Specialist in AI Architecture; also member of Synthetix Audio.',
    },
  });

  // Participants
  const alice = await prisma.user.upsert({
    where: { email: 'alice@dogfood.local' },
    update: { passwordHash },
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
    update: { passwordHash },
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
    update: { passwordHash },
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
    update: { passwordHash },
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
    update: { passwordHash },
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
    update: { passwordHash },
    create: {
      email: 'frank@dogfood.local',
      name: 'Frank Martinez',
      passwordHash,
      role: Role.PARTICIPANT,
      bio: 'IoT & CleanTech Hacker',
    },
  });

  const grace = await prisma.user.upsert({
    where: { email: 'grace@dogfood.local' },
    update: { passwordHash },
    create: {
      email: 'grace@dogfood.local',
      name: 'Grace Hopper',
      passwordHash,
      role: Role.PARTICIPANT,
      bio: 'Biomedical & Telehealth Software Engineer',
    },
  });

  const liam = await prisma.user.upsert({
    where: { email: 'liam@dogfood.local' },
    update: { passwordHash },
    create: {
      email: 'liam@dogfood.local',
      name: 'Liam Vance',
      passwordHash,
      role: Role.PARTICIPANT,
      bio: 'Audio DSP & Generative AI Researcher',
    },
  });

  const zack = await prisma.user.upsert({
    where: { email: 'zack@dogfood.local' },
    update: { passwordHash },
    create: {
      email: 'zack@dogfood.local',
      name: 'Zack Taylor',
      passwordHash,
      role: Role.PARTICIPANT,
      bio: 'Cybersecurity Analyst (Working on draft)',
    },
  });

  console.log('✅ Core users created.');

  // 2. Create Flagship Event in JUDGING_ACTIVE state
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
      status: EventStatus.JUDGING_ACTIVE,
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
          hideResultsUntilPublished: false,
          randomizeGallery: true,
          assignmentsPerProject: 3,
        },
      },
    },
  });

  console.log(`✅ Event created: ${event.name} (Status: ${event.status})`);

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

  // 5. Create Judging Rubric
  const rubric = await prisma.rubric.create({
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

  console.log('✅ Tracks, Prizes, and Rubrics created.');

  // 6. Enlist Judges
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

  // Team 5: PulseWave Health (Grace Hopper) - HAS UNSCORED ASSIGNMENT for testing
  const team5 = await prisma.team.create({
    data: {
      eventId: event.id,
      name: 'PulseWave Health',
      description: 'Decentralized biomedical sensor meshes',
      inviteCode: 'PULSE5',
      members: {
        create: [{ userId: grace.id, role: TeamRole.LEADER }],
      },
    },
  });

  const proj5 = await prisma.project.create({
    data: {
      eventId: event.id,
      teamId: team5.id,
      trackId: trackImpact.id,
      title: 'PulseMesh: Decentralized Vital Signs Triage',
      tagline: 'Offline-first peer-to-peer vital telemetry for disaster response zones.',
      problemStatement: 'Mass casualty and disaster triage centers lack reliable cellular uplink to central hospitals, causing fatal treatment delays.',
      solutionDescription: 'PulseMesh deploys Bluetooth LE triage bracelets transmitting patient triage status over an offline local mesh network to field medics without internet.',
      technologies: ['Flutter', 'Rust', 'BLE Mesh', 'SQLite', 'WebRTC'],
      repoUrl: 'https://github.com/dogfood-demo/pulsemesh',
      demoUrl: 'https://pulsemesh.demo.local',
      status: ProjectStatus.SUBMITTED,
      submittedAt: new Date(now.getTime() - 0.3 * 24 * 60 * 60 * 1000),
    },
  });

  // Team 6: Synthetix Audio (Judge Specialist + Liam) - CONFLICT OF INTEREST DEMO
  const team6 = await prisma.team.create({
    data: {
      eventId: event.id,
      name: 'Synthetix Audio',
      description: 'Generative AI speech forensics and watermarking',
      inviteCode: 'SYNTH6',
      members: {
        create: [
          { userId: judgeSpecialist.id, role: TeamRole.MEMBER }, // Judge is on this team!
          { userId: liam.id, role: TeamRole.LEADER },
        ],
      },
    },
  });

  const proj6 = await prisma.project.create({
    data: {
      eventId: event.id,
      teamId: team6.id,
      trackId: trackAI.id,
      title: 'SonicForge: Real-Time Neural Speech Watermarking',
      tagline: 'Cryptographic imperceptible audio steganography preventing deepfake disinformation.',
      problemStatement: 'Audio deepfakes are weaponized in real-time phone fraud and election manipulation without verifiable provenance.',
      solutionDescription: 'SonicForge injects provably imperceptible high-entropy phase signatures directly into live PCM audio streams, verifiable on-device in under 5ms.',
      technologies: ['Python', 'PyTorch', 'ONNX', 'WebAudio', 'C++'],
      repoUrl: 'https://github.com/dogfood-demo/sonicforge',
      demoUrl: 'https://sonicforge.demo.local',
      status: ProjectStatus.SUBMITTED,
      submittedAt: new Date(now.getTime() - 0.2 * 24 * 60 * 60 * 1000),
    },
  });

  // Team 7: StealthSec (Zack Taylor) - DRAFT PRIVACY DEMO
  const team7 = await prisma.team.create({
    data: {
      eventId: event.id,
      name: 'StealthSec',
      description: 'Side-channel vulnerability research',
      inviteCode: 'STLTH7',
      members: {
        create: [{ userId: zack.id, role: TeamRole.LEADER }],
      },
    },
  });

  const projDraft = await prisma.project.create({
    data: {
      eventId: event.id,
      teamId: team7.id,
      trackId: trackDevTools.id,
      title: 'GhostProtocol: Covert Timing-Channel Defense (UNSUBMITTED DRAFT)',
      tagline: 'Defending microarchitectural side-channels in multi-tenant cloud enclaves.',
      problemStatement: 'Unmitigated Spectre-v2 cache timing channels allow hostile neighbors in Kubernetes to exfiltrate cryptographic keys.',
      solutionDescription: 'GhostProtocol dynamically injects constant-time micro-jitter into speculative memory execution paths.',
      technologies: ['C', 'Assembly', 'Linux Kernel', 'QEMU'],
      repoUrl: 'https://github.com/dogfood-demo/ghostprotocol-private',
      demoUrl: 'https://ghostprotocol.private.local',
      status: ProjectStatus.DRAFT, // MUST BE INVISIBLE TO OTHER TEAMS AND PUBLIC
    },
  });

  console.log('✅ Teams and Submissions seeded (including UNSCORED, COI, and DRAFT projects).');

  // 8. Create Judge Assignments
  // Proj 1: Harsh, Lenient, Balanced (All Completed)
  // Proj 2: Harsh, Lenient, Specialist (All Completed)
  // Proj 3: Balanced, Specialist, Lenient (All Completed)
  // Proj 4: Harsh, Balanced, Specialist (All Completed)
  // Proj 5: Harsh (PENDING/UNSCORED for manual testing!), Balanced (Completed), Lenient (Completed)
  // Proj 6: Harsh (Completed), Lenient (Completed) [Notice: Specialist is PROHIBITED due to COI]
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

      // Project 5: ASSIGNED TO HARSH BUT UNSCORED!
      { eventId: event.id, judgeId: jHarsh.id, projectId: proj5.id, isCompleted: false },
      { eventId: event.id, judgeId: jBalanced.id, projectId: proj5.id, isCompleted: true },
      { eventId: event.id, judgeId: jLenient.id, projectId: proj5.id, isCompleted: true },

      // Project 6: Evaluated by Harsh and Lenient. Specialist is on team so no assignment!
      { eventId: event.id, judgeId: jHarsh.id, projectId: proj6.id, isCompleted: true },
      { eventId: event.id, judgeId: jLenient.id, projectId: proj6.id, isCompleted: true },
    ],
  });

  const c0 = rubric.criteria[0].id; // Tech 30%
  const c1 = rubric.criteria[1].id; // Innov 30%
  const c2 = rubric.criteria[2].id; // Impact 20%
  const c3 = rubric.criteria[3].id; // UX 20%

  // Project 1 Evaluations
  await prisma.evaluation.create({
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

  await prisma.evaluation.create({
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

  await prisma.evaluation.create({
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
      feedback: 'Circuits are complex, though developer ergonomics need work.',
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
      feedback: 'Remarkable ZK cryptography. Huge leap for user privacy.',
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
      feedback: 'Mathematically rigorous proof circuits and clean interface.',
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

  // Project 3 Evaluations
  await prisma.evaluation.create({
    data: {
      eventId: event.id,
      judgeId: jBalanced.id,
      projectId: proj3.id,
      isDraft: false,
      weightedTotal: 80.0,
      feedback: 'Great developer tool with high practical utility.',
      scores: {
        create: [
          { criterionId: c0, score: 8 },
          { criterionId: c1, score: 8 },
          { criterionId: c2, score: 9 },
          { criterionId: c3, score: 7 },
        ],
      },
    },
  });

  await prisma.evaluation.create({
    data: {
      eventId: event.id,
      judgeId: jSpecialist.id,
      projectId: proj3.id,
      isDraft: false,
      weightedTotal: 83.0,
      feedback: 'Very thoughtful design and resilient query layer.',
      scores: {
        create: [
          { criterionId: c0, score: 9 },
          { criterionId: c1, score: 8 },
          { criterionId: c2, score: 8 },
          { criterionId: c3, score: 8 },
        ],
      },
    },
  });

  await prisma.evaluation.create({
    data: {
      eventId: event.id,
      judgeId: jLenient.id,
      projectId: proj3.id,
      isDraft: false,
      weightedTotal: 92.0,
      feedback: 'Love this devtool, huge speedup for workflows!',
      scores: {
        create: [
          { criterionId: c0, score: 9 },
          { criterionId: c1, score: 9 },
          { criterionId: c2, score: 10 },
          { criterionId: c3, score: 9 },
        ],
      },
    },
  });

  // Project 4 Evaluations
  await prisma.evaluation.create({
    data: {
      eventId: event.id,
      judgeId: jHarsh.id,
      projectId: proj4.id,
      isDraft: false,
      weightedTotal: 65.0,
      feedback: 'Hardware prototype is interesting, but deployment at scale is challenging.',
      scores: {
        create: [
          { criterionId: c0, score: 6 },
          { criterionId: c1, score: 7 },
          { criterionId: c2, score: 7 },
          { criterionId: c3, score: 6 },
        ],
      },
    },
  });

  await prisma.evaluation.create({
    data: {
      eventId: event.id,
      judgeId: jBalanced.id,
      projectId: proj4.id,
      isDraft: false,
      weightedTotal: 75.0,
      feedback: 'Strong environmental impact potential and well-scoped sensor architecture.',
      scores: {
        create: [
          { criterionId: c0, score: 8 },
          { criterionId: c1, score: 7 },
          { criterionId: c2, score: 8 },
          { criterionId: c3, score: 7 },
        ],
      },
    },
  });

  await prisma.evaluation.create({
    data: {
      eventId: event.id,
      judgeId: jSpecialist.id,
      projectId: proj4.id,
      isDraft: false,
      weightedTotal: 76.0,
      feedback: 'Solid IoT protocols and reliable data relay logic.',
      scores: {
        create: [
          { criterionId: c0, score: 8 },
          { criterionId: c1, score: 8 },
          { criterionId: c2, score: 7 },
          { criterionId: c3, score: 7 },
        ],
      },
    },
  });

  // Project 5 Evaluations (Completed by Balanced & Lenient; UNSCORED for Harsh)
  await prisma.evaluation.create({
    data: {
      eventId: event.id,
      judgeId: jBalanced.id,
      projectId: proj5.id,
      isDraft: false,
      weightedTotal: 78.0,
      feedback: 'Impressive peer-to-peer vital signs relay with zero cellular dependency.',
      scores: {
        create: [
          { criterionId: c0, score: 8 },
          { criterionId: c1, score: 8 },
          { criterionId: c2, score: 8 },
          { criterionId: c3, score: 7 },
        ],
      },
    },
  });

  await prisma.evaluation.create({
    data: {
      eventId: event.id,
      judgeId: jLenient.id,
      projectId: proj5.id,
      isDraft: false,
      weightedTotal: 88.0,
      feedback: 'Lifesaving telehealth tech! Super slick UI and quick setup.',
      scores: {
        create: [
          { criterionId: c0, score: 9 },
          { criterionId: c1, score: 9 },
          { criterionId: c2, score: 9 },
          { criterionId: c3, score: 8 },
        ],
      },
    },
  });

  // Project 6 Evaluations (Completed by Harsh & Lenient)
  await prisma.evaluation.create({
    data: {
      eventId: event.id,
      judgeId: jHarsh.id,
      projectId: proj6.id,
      isDraft: false,
      weightedTotal: 72.0,
      feedback: 'Audio steganography is computationally heavy, but mathematical model is sound.',
      scores: {
        create: [
          { criterionId: c0, score: 8 },
          { criterionId: c1, score: 7 },
          { criterionId: c2, score: 7 },
          { criterionId: c3, score: 6 },
        ],
      },
    },
  });

  await prisma.evaluation.create({
    data: {
      eventId: event.id,
      judgeId: jLenient.id,
      projectId: proj6.id,
      isDraft: false,
      weightedTotal: 91.0,
      feedback: 'Essential technology to defeat voice clones and social engineering.',
      scores: {
        create: [
          { criterionId: c0, score: 9 },
          { criterionId: c1, score: 10 },
          { criterionId: c2, score: 9 },
          { criterionId: c3, score: 8 },
        ],
      },
    },
  });

  // 9. Create Sample Community Votes
  await prisma.vote.createMany({
    skipDuplicates: true,
    data: [
      { eventId: event.id, projectId: proj1.id, userId: frank.id, ipAddress: '192.168.1.101' },
      { eventId: event.id, projectId: proj1.id, userId: eve.id, ipAddress: '192.168.1.102' },
      { eventId: event.id, projectId: proj2.id, userId: alice.id, ipAddress: '192.168.1.103' },
      { eventId: event.id, projectId: proj3.id, userId: bob.id, ipAddress: '192.168.1.104' },
      { eventId: event.id, projectId: proj5.id, userId: carol.id, ipAddress: '192.168.1.105' },
    ],
  });

  // 10. Pre-populate Immutable Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        eventId: event.id,
        userId: organizerUser.id,
        action: 'EVENT_STATUS_UPDATED',
        entityType: 'Event',
        entityId: event.id,
        payload: { previousStatus: 'SUBMISSION_OPEN', newStatus: 'JUDGING_ACTIVE' },
      },
      {
        eventId: event.id,
        userId: organizerUser.id,
        action: 'JUDGES_ASSIGNED_AUTO',
        entityType: 'JudgeAssignment',
        entityId: event.id,
        payload: { algorithm: 'Mulberry32-RoundRobin', seed: 42, assignmentsCreated: 15 },
      },
      {
        eventId: event.id,
        userId: judgeHarsh.id,
        action: 'EVALUATION_SUBMITTED',
        entityType: 'Evaluation',
        entityId: proj1.id,
        payload: { projectTitle: 'Aegis AI: Autonomous Incident Defense', weightedTotal: 66.0 },
      },
      {
        eventId: event.id,
        userId: judgeLenient.id,
        action: 'EVALUATION_SUBMITTED',
        entityType: 'Evaluation',
        entityId: proj1.id,
        payload: { projectTitle: 'Aegis AI: Autonomous Incident Defense', weightedTotal: 93.0 },
      },
      {
        eventId: event.id,
        userId: judgeBalanced.id,
        action: 'EVALUATION_SUBMITTED',
        entityType: 'Evaluation',
        entityId: proj1.id,
        payload: { projectTitle: 'Aegis AI: Autonomous Incident Defense', weightedTotal: 83.0 },
      },
      {
        eventId: event.id,
        userId: judgeBalanced.id,
        action: 'EVALUATION_SUBMITTED',
        entityType: 'Evaluation',
        entityId: proj5.id,
        payload: { projectTitle: 'PulseMesh: Decentralized Vital Signs Triage', weightedTotal: 78.0 },
      },
      {
        eventId: event.id,
        userId: judgeLenient.id,
        action: 'EVALUATION_SUBMITTED',
        entityType: 'Evaluation',
        entityId: proj5.id,
        payload: { projectTitle: 'PulseMesh: Decentralized Vital Signs Triage', weightedTotal: 88.0 },
      },
    ],
  });

  console.log('✅ Audit logs recorded.');

  // 11. Run Normalization Engine Calculation
  const normResults = await normalizationService.normalizeScores(event.id);
  console.log(`✅ Normalization engine executed: ${normResults.rankings.length} projects calibrated.`);

  console.log('🌟 SEEDING COMPLETE! Platform is primed for full end-to-end evaluation.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
