import { prisma } from '../../utils/prisma.js';
import { generateRandomToken, generateHmacSignature } from '../../utils/crypto.js';
import { config } from '../../config/index.js';
import { AppError } from '../../utils/response.js';
import { CertificateType } from '@prisma/client';

export class CertService {
  async generateCertificates(eventId: string, type: CertificateType) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');

    let userIds: string[] = [];

    if (type === CertificateType.PARTICIPANT) {
      const members = await prisma.teamMember.findMany({
        where: { team: { eventId } },
        select: { userId: true },
      });
      userIds = Array.from(new Set(members.map((m) => m.userId)));
    } else if (type === CertificateType.JUDGE) {
      const judges = await prisma.judge.findMany({
        where: { eventId, isActive: true },
        select: { userId: true },
      });
      userIds = judges.map((j) => j.userId);
    } else if (type === CertificateType.WINNER) {
      const topProjects = await prisma.project.findMany({
        where: { eventId, finalRank: { in: [1, 2, 3] } },
        include: { team: { include: { members: true } } },
      });
      userIds = topProjects.flatMap((p) => p.team.members.map((m) => m.userId));
    }

    const createdCerts = [];
    for (const userId of userIds) {
      const existing = await prisma.certificate.findFirst({
        where: { eventId, userId, type },
      });

      if (!existing) {
        const verificationCode = `CERT-${generateRandomToken(4).toUpperCase()}-${generateRandomToken(4).toUpperCase()}`;
        const signaturePayload = `${eventId}:${userId}:${type}:${verificationCode}`;
        const signature = generateHmacSignature(signaturePayload, config.jwtSecret);

        const cert = await prisma.certificate.create({
          data: {
            eventId,
            userId,
            type,
            title: `Certificate of ${type.charAt(0) + type.slice(1).toLowerCase()} - ${event.name}`,
            verificationCode,
            signature,
          },
        });
        createdCerts.push(cert);
      }
    }

    return {
      message: `Generated ${createdCerts.length} certificates.`,
      certificates: createdCerts,
    };
  }

  async verifyCertificate(code: string) {
    const cert = await prisma.certificate.findUnique({
      where: { verificationCode: code },
      include: {
        event: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, name: true } },
      },
    });

    if (!cert) {
      throw new AppError('Certificate verification failed. Code is invalid or does not exist.', 404, 'CERT_NOT_FOUND');
    }

    // Verify HMAC signature
    const expectedPayload = `${cert.eventId}:${cert.userId}:${cert.type}:${cert.verificationCode}`;
    const expectedSignature = generateHmacSignature(expectedPayload, config.jwtSecret);

    const isTamperEvident = cert.signature === expectedSignature;

    return {
      isValid: isTamperEvident,
      certificate: cert,
      verifiedAt: new Date().toISOString(),
    };
  }

  async getMyCertificates(userId: string) {
    return prisma.certificate.findMany({
      where: { userId },
      include: {
        event: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }
}

export const certService = new CertService();
