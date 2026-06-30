import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

export class ClientService {
  async create(data: { name: string; document?: string; address?: string; contacts?: any[] }) {
    if (data.name === 'Anonimizado LGPD') {
      throw new AppError('Nome de cliente inválido.', 400);
    }
    // Check name uniqueness
    const nameExists = await prisma.client.findFirst({
      where: { name: { equals: data.name, mode: 'insensitive' } },
    });

    if (nameExists) {
      if (nameExists.isActive) {
        throw new AppError('Uma empresa com este nome já está cadastrada no sistema.', 400);
      }
      throw new AppError(
        'Uma empresa com este nome já está cadastrada no sistema, porém está desativada. Para reativá-la ou excluí-la permanentemente, utilize o filtro "Mostrar clientes desativados" na listagem.',
        400,
      );
    }

    // Check document uniqueness
    if (data.document) {
      const docExists = await prisma.client.findUnique({ where: { document: data.document } });
      if (docExists) {
        if (docExists.isActive) {
          throw new AppError('Este CNPJ/CPF já está cadastrado no sistema.', 400);
        }
        throw new AppError(
          'Este CNPJ/CPF já está cadastrado no sistema para outra empresa que está desativada. Para reativá-la ou excluí-la permanentemente, utilize o filtro "Mostrar clientes desativados" na listagem.',
          400,
        );
      }
    }

    // Create the client and nested contacts in a single Prisma transaction
    return prisma.client.create({
      data: {
        name: data.name,
        document: data.document,
        address: data.address,
        contacts: {
          create: data.contacts || [],
        },
      },
      include: { contacts: true },
    });
  }

  async list(
    page: number = 1,
    limit: number = 10,
    search?: string,
    showInactive?: boolean,
    sortBy?: string,
    sortOrder?: string,
    lastPurchaseMin?: number,
    lastPurchaseMax?: number,
    lastPurchaseNull?: boolean,
  ) {
    const allowedSortFields = ['name', 'createdAt', 'updatedAt'];
    const sortField = allowedSortFields.includes(sortBy ?? '') ? sortBy! : 'name';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    const whereClause: any = {};

    if (!showInactive) {
      whereClause.isActive = true;
    }

    if (search) {
      const sanitized = search.replace(/\D/g, '');
      const searchConditions: any[] = [{ name: { contains: search, mode: 'insensitive' } }];

      if (sanitized) {
        searchConditions.push({ document: { contains: sanitized } });
      }

      searchConditions.push({ document: { contains: search, mode: 'insensitive' } });

      whereClause.OR = searchConditions;
    }

    const [rawData] = await Promise.all([
      prisma.client.findMany({
        where: whereClause,
        include: {
          contacts: { where: { isActive: true } },
          quotes: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true, status: true },
          },
        },
        orderBy: { [sortField]: order },
      }),
      prisma.client.count({ where: whereClause }),
    ]);

    const now = new Date();
    let data = rawData.map((client) => {
      const lastQuote = client.quotes?.[0];
      let daysSinceLastQuote: number | null = null;
      if (lastQuote) {
        daysSinceLastQuote = Math.floor(
          (now.getTime() - new Date(lastQuote.createdAt).getTime()) / (1000 * 60 * 60 * 24),
        );
      }
      return { ...client, daysSinceLastQuote };
    });

    if (lastPurchaseNull) {
      data = data.filter((c) => c.daysSinceLastQuote === null);
    } else {
      if (lastPurchaseMin != null)
        data = data.filter(
          (c) => c.daysSinceLastQuote != null && c.daysSinceLastQuote >= lastPurchaseMin,
        );
      if (lastPurchaseMax != null)
        data = data.filter(
          (c) => c.daysSinceLastQuote != null && c.daysSinceLastQuote <= lastPurchaseMax,
        );
    }

    const total = data.length;
    const paginated = data.slice((page - 1) * limit, page * limit);

    return {
      data: paginated,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(
    id: string,
    data: {
      name?: string;
      document?: string | null;
      address?: string | null;
      contacts?: Array<{
        id?: string;
        name: string;
        phone?: string;
        email?: string;
        isActive?: boolean;
      }>;
    },
  ) {
    const client = await prisma.client.findFirst({ where: { id, isActive: true } });
    if (!client) throw new AppError('Cliente não encontrado.', 404);

    if (data.name === 'Anonimizado LGPD') {
      throw new AppError('Nome de cliente inválido.', 400);
    }

    // Check name uniqueness (excluding current client)
    if (data.name && data.name !== client.name) {
      const nameExists = await prisma.client.findFirst({
        where: { name: { equals: data.name, mode: 'insensitive' }, id: { not: id } },
      });
      if (nameExists)
        throw new AppError('Uma empresa com este nome já está cadastrada no sistema.', 400);
    }

    // Check document uniqueness (excluding current client)
    if (data.document) {
      const docExists = await prisma.client.findFirst({
        where: { document: data.document, id: { not: id } },
      });
      if (docExists) throw new AppError('Este CNPJ/CPF já está cadastrado no sistema.', 400);
    }

    return prisma.$transaction(async (tx) => {
      // Sync contacts if provided
      if (data.contacts) {
        const inputContacts = data.contacts;
        const existingContacts = await tx.clientContact.findMany({
          where: { clientId: id },
        });

        const existingIds = existingContacts.map((c) => c.id);
        const inputIds = inputContacts.filter((c) => c.id).map((c) => c.id!);

        // Delete removed contacts
        const idsToDelete = existingIds.filter((eid) => !inputIds.includes(eid));
        if (idsToDelete.length > 0) {
          await tx.clientContact.updateMany({
            where: { id: { in: idsToDelete } },
            data: { isActive: false },
          });
        }

        // Upsert contacts
        for (const inputContact of inputContacts) {
          if (inputContact.id) {
            await tx.clientContact.update({
              where: { id: inputContact.id },
              data: {
                name: inputContact.name,
                phone: inputContact.phone || null,
                email: inputContact.email || null,
                isActive: inputContact.isActive !== undefined ? inputContact.isActive : undefined,
              },
            });
          } else {
            await tx.clientContact.create({
              data: {
                clientId: id,
                name: inputContact.name,
                phone: inputContact.phone || null,
                email: inputContact.email || null,
                isActive: inputContact.isActive !== undefined ? inputContact.isActive : undefined,
              },
            });
          }
        }
      }

      return tx.client.update({
        where: { id },
        data: {
          name: data.name,
          document: data.document || null,
          address: data.address || null,
        },
        include: { contacts: { where: { isActive: true } } },
      });
    });
  }

  async getById(id: string, showInactiveContacts?: boolean) {
    const client = await prisma.client.findFirst({
      where: { id, isActive: true },
      include: {
        contacts: showInactiveContacts ? true : { where: { isActive: true } },
      },
    });
    if (!client) throw new AppError('Cliente não encontrado.', 404);
    return client;
  }

  async addContact(clientId: string, data: { name: string; phone?: string; email?: string }) {
    if (data.name === 'Contato Anonimizado') {
      throw new AppError('Nome de contato inválido.', 400);
    }
    return prisma.clientContact.create({
      data: { ...data, clientId },
    });
  }

  async updateContact(
    contactId: string,
    data: { name?: string; phone?: string | null; email?: string | null },
  ) {
    const contact = await prisma.clientContact.findUnique({ where: { id: contactId } });
    if (!contact) throw new AppError('Contato não encontrado.', 404);

    if (contact.name === 'Contato Anonimizado') {
      throw new AppError('Não é possível editar um contato anonimizado.', 400);
    }

    if (data.name === 'Contato Anonimizado') {
      throw new AppError('Nome de contato inválido.', 400);
    }

    return prisma.clientContact.update({
      where: { id: contactId },
      data: {
        ...data,
        phone: data.phone || null,
        email: data.email || null,
      },
    });
  }

  async removeContact(contactId: string, force?: boolean) {
    const contact = await prisma.clientContact.findUnique({ where: { id: contactId } });
    if (!contact) throw new AppError('Contato não encontrado.', 404);

    if (force) {
      const relatedQuotes = await prisma.quote.count({ where: { contactId } });
      if (relatedQuotes > 0) {
        throw new AppError(
          `Não é possível excluir permanentemente este contato. Ele possui ${relatedQuotes} orçamento(s) vinculado(s) para fins de histórico.`,
          400,
        );
      }
      await prisma.clientContact.delete({ where: { id: contactId } });
      return;
    }

    await prisma.clientContact.update({
      where: { id: contactId },
      data: { isActive: false },
    });
  }

  async restoreContact(contactId: string) {
    const contact = await prisma.clientContact.findUnique({ where: { id: contactId } });
    if (!contact) throw new AppError('Contato não encontrado.', 404);
    if (contact.name === 'Contato Anonimizado') {
      throw new AppError('Não é possível reativar um contato anonimizado.', 400);
    }
    return prisma.clientContact.update({
      where: { id: contactId },
      data: { isActive: true },
    });
  }

  async restore(id: string) {
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) throw new AppError('Cliente não encontrado.', 404);
    if (client.name === 'Anonimizado LGPD') {
      throw new AppError('Não é possível reativar um cliente anonimizado.', 400);
    }
    return prisma.client.update({ where: { id }, data: { isActive: true } });
  }

  async delete(id: string, force?: boolean) {
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) throw new AppError('Cliente não encontrado.', 404);

    if (force) {
      const relatedQuotes = await prisma.quote.count({ where: { clientId: id } });
      if (relatedQuotes > 0) {
        throw new AppError(
          `Não é possível excluir permanentemente este cliente. Ele possui ${relatedQuotes} orçamento(s) vinculado(s) para fins de histórico e auditoria.`,
          400,
        );
      }
      await prisma.$transaction([
        prisma.clientContact.deleteMany({ where: { clientId: id } }),
        prisma.client.delete({ where: { id } }),
      ]);
      return;
    }

    await prisma.client.update({ where: { id }, data: { isActive: false } });
  }
}
