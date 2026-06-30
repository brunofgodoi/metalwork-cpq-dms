import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

export class LgpdService {
  async anonymizeClient(clientId: string) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new AppError('Client not found', 404);

    // Use transaction to ensure client and contacts are anonymized together
    await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id: clientId },
        data: {
          name: 'Anonimizado LGPD',
          document: null,
          address: null,
          isActive: false,
        },
      });

      await tx.clientContact.updateMany({
        where: { clientId },
        data: {
          name: 'Contato Anonimizado',
          phone: null,
          email: null,
          isActive: false,
        },
      });
    });
  }

  async anonymizeUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: 'Usuário Anonimizado',
        email: `anon_${user.id.split('-')[0]}@deleted.cpq`,
        password: 'lgpd_deleted_hash',
        isActive: false,
      },
    });
  }

  async anonymizeContact(contactId: string) {
    const contact = await prisma.clientContact.findUnique({ where: { id: contactId } });
    if (!contact) throw new AppError('Contact not found', 404);

    await prisma.clientContact.update({
      where: { id: contactId },
      data: {
        name: 'Contato Anonimizado',
        phone: null,
        email: null,
        isActive: false,
      },
    });
  }
}
