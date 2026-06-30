import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { QuoteStatus } from '@prisma/client';
import { ConfigService } from './ConfigService';
import { QuoteAuditService } from './QuoteAuditService';

export class QuoteService {
  async create(data: {
    clientId: string;
    contactId?: string;
    categoryId: string;
    createdById: string;
    descriptiveText: string;
    networkFilePath?: string | null;
    estimatedPrice?: number;
    price?: number;
    estimatedHours?: number;
    deliveryDate?: string;
    validUntil?: string;
  }) {
    // Find the latest quoteNumber to increment it
    const lastQuote = await prisma.quote.findFirst({
      orderBy: { quoteNumber: 'desc' },
      select: { quoteNumber: true },
    });
    const quoteNumber = lastQuote ? lastQuote.quoteNumber + 1 : 1000;

    const auditService = new QuoteAuditService();

    const quote = await prisma.$transaction(async (tx) => {
      const categoryId = data.categoryId && data.categoryId.trim() !== '' ? data.categoryId : null;
      const contactId = data.contactId && data.contactId.trim() !== '' ? data.contactId : null;

      const q = await tx.quote.create({
        data: {
          ...data,
          categoryId,
          contactId,
          quoteNumber,
          revision: 'A',
          isLatest: true,
          status: 'DRAFT',
        },
      });

      await auditService.log(tx, {
        quoteId: q.id,
        changedById: data.createdById,
        action: 'CREATE',
        newValue: {
          status: q.status,
          estimatedPrice: q.estimatedPrice ? Number(q.estimatedPrice) : null,
          price: q.price ? Number(q.price) : null,
          descriptiveText: q.descriptiveText,
        },
      });

      return q;
    });

    return quote;
  }

  async list(page: number = 1, limit: number = 10, filters?: any) {
    const skip = (page - 1) * limit;
    const allowedSortFields = ['quoteNumber', 'createdAt', 'updatedAt', 'status', 'estimatedPrice'];
    const sortBy = allowedSortFields.includes(filters?.sortBy) ? filters.sortBy : 'quoteNumber';
    const sortOrder = filters?.sortOrder === 'asc' ? 'asc' : 'desc';

    const whereClause: any = { isActive: true, isLatest: true };
    if (filters?.clientId) whereClause.clientId = filters.clientId;
    if (filters?.categoryId) whereClause.categoryId = filters.categoryId;
    if (filters?.status) whereClause.status = filters.status;

    const now = new Date();
    if (filters?.overdue === 'true') {
      whereClause.status = 'SENT';
      whereClause.OR = [
        { deliveryDate: { not: null, lt: now } },
        { validUntil: { not: null, lt: now } },
      ];
    }

    const overdueWhere: any = {
      isActive: true,
      isLatest: true,
      status: 'SENT',
      OR: [{ deliveryDate: { not: null, lt: now } }, { validUntil: { not: null, lt: now } }],
    };

    const [data, total, overdueCount] = await Promise.all([
      prisma.quote.findMany({
        where: whereClause,
        include: {
          client: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          contact: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.quote.count({ where: whereClause }),
      prisma.quote.count({ where: overdueWhere }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        overdueCount,
      },
    };
  }

  async getById(id: string) {
    const quote = await prisma.quote.findFirst({
      where: { id, isActive: true },
      include: {
        client: true,
        category: true,
        contact: true,
        createdBy: { select: { name: true, email: true } },
        approvalRequests: {
          orderBy: { createdAt: 'desc' },
          include: {
            requestedBy: { select: { name: true, email: true } },
          },
        },
        items: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!quote) throw new AppError('Quote not found', 404);
    return quote;
  }

  async createRevision(id: string, userId: string) {
    const existingQuote = await prisma.quote.findUnique({
      where: { id },
      include: { items: { where: { isActive: true } } },
    });
    if (!existingQuote) throw new AppError('Orçamento original não encontrado.', 404);
    if (!existingQuote.isLatest) {
      throw new AppError('Apenas a versão mais recente do orçamento pode ser revisada.', 400);
    }
    const allowedStatuses = ['DRAFT', 'SENT', 'PENDING_APPROVAL'];
    if (!allowedStatuses.includes(existingQuote.status)) {
      throw new AppError('Orçamento não pode ser revisado no status atual.', 400);
    }

    // Determine the next revision code
    const nextRevision = this.getNextRevisionCode(existingQuote.revision);

    // Save snapshot of current state before creating revision
    const snapshot = {
      price: existingQuote.price ? Number(existingQuote.price) : null,
      estimatedPrice: existingQuote.estimatedPrice ? Number(existingQuote.estimatedPrice) : null,
      contractedPrice: existingQuote.contractedPrice ? Number(existingQuote.contractedPrice) : null,
      discountPercent: existingQuote.discountPercent ? Number(existingQuote.discountPercent) : null,
      discountFixed: existingQuote.discountFixed ? Number(existingQuote.discountFixed) : null,
      deliveryDate: existingQuote.deliveryDate,
      validUntil: existingQuote.validUntil,
      totalCost: existingQuote.totalCost ? Number(existingQuote.totalCost) : null,
      items: existingQuote.items.map((i) => ({
        unitPrice: Number(i.unitPrice),
        unitCost: Number(i.unitCost),
        discountPercent: Number(i.discountPercent),
        quantity: i.quantity,
      })),
    };

    // Use a transaction to update the old version to not latest, and create the new revision
    const newQuote = await prisma.$transaction(async (tx) => {
      // Get all active items of existingQuote to copy them
      const items = await tx.quoteItem.findMany({
        where: { quoteId: existingQuote.id, isActive: true },
      });

      // Inactivate the current one as the latest and save snapshot
      await tx.quote.update({
        where: { id: existingQuote.id },
        data: { isLatest: false, snapshot },
      });

      // Create the new duplicate with updated revision and its items
      const createdQuote = await tx.quote.create({
        data: {
          quoteNumber: existingQuote.quoteNumber,
          revision: nextRevision,
          isLatest: true,
          clientId: existingQuote.clientId,
          contactId: existingQuote.contactId,
          categoryId: existingQuote.categoryId,
          createdById: existingQuote.createdById,
          descriptiveText: existingQuote.descriptiveText,
          networkFilePath: existingQuote.networkFilePath,
          cadFilePath: existingQuote.cadFilePath,
          thumbnailUrl: existingQuote.thumbnailUrl,
          estimatedPrice: existingQuote.estimatedPrice,
          price: null,
          contractedPrice: null,
          estimatedHours: existingQuote.estimatedHours,
          deliveryDate: existingQuote.deliveryDate,
          validUntil: existingQuote.validUntil,
          status: 'DRAFT',
          items: {
            create: items.map((item) => ({
              project: item.project,
              description: item.description,
              quantity: item.quantity,
              unitCost: item.unitCost,
              unitPrice: item.unitPrice,
              discountPercent: item.discountPercent,
              process: item.process,
              material: item.material,
              estimatedHours: item.estimatedHours,
              drawingId: item.drawingId,
              drawingVersion: item.drawingVersion,
              drawingRef: item.drawingRef,
              thumbnailUrl: item.thumbnailUrl,
              details: item.details,
              notes: item.notes,
              sortOrder: item.sortOrder,
              isActive: true,
            })),
          },
        },
      });

      const auditService = new QuoteAuditService();
      await auditService.log(tx, {
        quoteId: createdQuote.id,
        changedById: userId,
        action: 'REVISION',
        oldValue: {
          parentQuoteId: existingQuote.id,
          revision: existingQuote.revision,
        },
        newValue: {
          revision: createdQuote.revision,
          status: createdQuote.status,
        },
      });

      return createdQuote;
    });

    return this.getById(newQuote.id);
  }

  async copy(id: string, userId: string) {
    const existing = await prisma.quote.findFirst({
      where: { id, isActive: true },
      include: { items: { where: { isActive: true } } },
    });
    if (!existing) throw new AppError('Orçamento não encontrado.', 404);

    const lastQuote = await prisma.quote.findFirst({
      orderBy: { quoteNumber: 'desc' },
      select: { quoteNumber: true },
    });
    const quoteNumber = lastQuote ? lastQuote.quoteNumber + 1 : 1000;

    return prisma.$transaction(async (tx) => {
      const created = await tx.quote.create({
        data: {
          quoteNumber,
          revision: 'A',
          isLatest: true,
          status: 'DRAFT',
          clientId: existing.clientId,
          contactId: existing.contactId,
          categoryId: existing.categoryId,
          createdById: userId,
          descriptiveText: existing.descriptiveText,
          networkFilePath: existing.networkFilePath,
          estimatedPrice: existing.estimatedPrice,
          price: null,
          discountPercent: existing.discountPercent,
          discountFixed: existing.discountFixed,
          totalCost: existing.totalCost,
          estimatedHours: existing.estimatedHours,
          deliveryDate: existing.deliveryDate,
          validUntil: existing.validUntil,
          items: {
            create: existing.items.map((item) => ({
              project: item.project,
              description: item.description,
              quantity: item.quantity,
              unitCost: item.unitCost,
              unitPrice: item.unitPrice,
              discountPercent: item.discountPercent,
              process: item.process,
              material: item.material,
              estimatedHours: item.estimatedHours,
              drawingId: item.drawingId,
              drawingVersion: item.drawingVersion,
              drawingRef: item.drawingRef,
              thumbnailUrl: item.thumbnailUrl,
              details: item.details,
              notes: item.notes,
              sortOrder: item.sortOrder,
              isActive: true,
            })),
          },
        },
      });

      const auditService = new QuoteAuditService();
      await auditService.log(tx, {
        quoteId: created.id,
        changedById: userId,
        action: 'CREATE',
        newValue: {
          status: created.status,
          estimatedPrice: created.estimatedPrice ? Number(created.estimatedPrice) : null,
          descriptiveText: created.descriptiveText,
        },
        metadata: { copiedFrom: id },
      });

      return created;
    });
  }

  async deleteRevision(id: string, userId: string) {
    const revision = await prisma.quote.findUnique({ where: { id } });
    if (!revision) throw new AppError('Revisão não encontrada.', 404);
    if (!revision.isActive) throw new AppError('Revisão já foi removida.', 400);
    if (revision.status !== 'DRAFT') {
      throw new AppError('Apenas revisões em rascunho podem ser excluídas.', 400);
    }
    if (revision.isLatest) {
      throw new AppError('Não é possível excluir a revisão ativa atual.', 400);
    }

    return prisma.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id },
        data: { isActive: false },
      });

      const auditService = new QuoteAuditService();
      await auditService.log(tx, {
        quoteId: id,
        changedById: userId,
        action: 'REVISION_DELETE',
        oldValue: {
          revision: revision.revision,
          quoteNumber: revision.quoteNumber,
          status: revision.status,
        },
      });
    });
  }

  async restoreRevision(revisionId: string, userId: string) {
    const targetRevision = await prisma.quote.findUnique({
      where: { id: revisionId },
    });
    if (!targetRevision) throw new AppError('Revisão não encontrada.', 404);
    if (!targetRevision.isActive) throw new AppError('Revisão foi removida.', 400);
    if (targetRevision.isLatest) {
      throw new AppError('Revisão atual não pode ser restaurada.', 400);
    }

    const currentLatest = await prisma.quote.findFirst({
      where: {
        quoteNumber: targetRevision.quoteNumber,
        isLatest: true,
        isActive: true,
      },
    });

    return prisma.$transaction(async (tx) => {
      if (currentLatest) {
        await tx.quote.update({
          where: { id: currentLatest.id },
          data: { isLatest: false, status: 'SUPERSEDED' },
        });
        await this.recalculateQuotePrices(currentLatest.id, tx);
      }

      await tx.quote.update({
        where: { id: revisionId },
        data: { isLatest: true, status: 'SENT' },
      });
      await this.recalculateQuotePrices(revisionId, tx);

      const auditService = new QuoteAuditService();
      await auditService.log(tx, {
        quoteId: revisionId,
        changedById: userId,
        action: 'REVISION_RESTORE',
        oldValue: {
          previousLatestId: currentLatest?.id,
          previousLatestRevision: currentLatest?.revision,
        },
        newValue: {
          restoredRevision: targetRevision.revision,
          status: 'SENT',
        },
      });

      return tx.quote.findUnique({ where: { id: revisionId } });
    });
  }

  async getRevisionHistory(quoteNumber: number) {
    return prisma.quote.findMany({
      where: {
        quoteNumber,
        isActive: true,
      },
      orderBy: { revision: 'asc' },
      include: {
        client: true,
        category: true,
        contact: true,
        createdBy: { select: { name: true, email: true } },
      },
    });
  }

  async getRevisionDiff(revId1: string, revId2: string) {
    const [rev1, rev2] = await Promise.all([
      prisma.quote.findUnique({
        where: { id: revId1 },
        select: { snapshot: true, revision: true },
      }),
      prisma.quote.findUnique({
        where: { id: revId2 },
        select: { snapshot: true, revision: true },
      }),
    ]);
    if (!rev1?.snapshot || !rev2?.snapshot) {
      throw new AppError('Snapshot não disponível para comparação.', 404);
    }

    const snap1 = rev1.snapshot as Record<string, any>;
    const snap2 = rev2.snapshot as Record<string, any>;
    const changes: { field: string; from: any; to: any }[] = [];

    const allKeys = [...new Set([...Object.keys(snap1), ...Object.keys(snap2)])];
    for (const key of allKeys) {
      const val1 = snap1[key] ?? null;
      const val2 = snap2[key] ?? null;
      const v1 = JSON.stringify(val1);
      const v2 = JSON.stringify(val2);
      if (v1 !== v2) {
        changes.push({ field: key, from: val1, to: val2 });
      }
    }

    return { revisionFrom: rev1.revision, revisionTo: rev2.revision, changes };
  }

  private getNextRevisionCode(current: string): string {
    if (!current) return 'A';
    const lastChar = current.charAt(current.length - 1);
    if (lastChar === 'Z') {
      return current + 'A';
    }
    return (
      current.substring(0, current.length - 1) + String.fromCharCode(lastChar.charCodeAt(0) + 1)
    );
  }

  async updateStatus(
    id: string,
    status: QuoteStatus,
    userId: string,
    userRole: string,
    rejectionReason?: string,
    price?: number,
    deliveryDate?: string,
    contractedPrice?: number,
    wasProduced?: boolean,
    justification?: string,
  ) {
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new AppError('Orçamento não encontrado.', 404);

    if (status === 'REJECTED' && !rejectionReason) {
      throw new AppError('Motivo da rejeição é obrigatório.', 400);
    }

    let targetStatus = status;

    if (targetStatus === 'SENT') {
      let finalPrice: number;
      let totalCost: number;

      if (price !== undefined && price !== null) {
        finalPrice = Number(price);
        const breakdown = await this.getQuotePriceBreakdown(id);
        totalCost = breakdown.totalCost;
      } else {
        const breakdown = await this.getQuotePriceBreakdown(id);
        finalPrice = breakdown.finalPrice;
        totalCost = breakdown.totalCost;
      }

      const margin = totalCost > 0 ? ((finalPrice - totalCost) / finalPrice) * 100 : 0;

      const configService = new ConfigService();
      const minMarginConfig = await configService.getByKey('minimum_margin');
      const minMarginValue = Number(minMarginConfig.value);

      if (margin < minMarginValue && userRole !== 'ADMIN') {
        if (!justification || justification.trim() === '') {
          throw new AppError(
            'Justificativa é obrigatória para margens abaixo do limite mínimo.',
            400,
          );
        }
        targetStatus = 'PENDING_APPROVAL';
      }
    }

    return prisma.$transaction(async (tx) => {
      const auditService = new QuoteAuditService();

      // Log status change
      if (quote.status !== targetStatus) {
        let action = 'STATUS_CHANGE';
        if (
          quote.status === 'PENDING_APPROVAL' &&
          (targetStatus === 'SENT' || targetStatus === 'REJECTED')
        ) {
          action = 'APPROVAL_DECISION';
        }

        await auditService.log(tx, {
          quoteId: id,
          changedById: userId,
          action,
          oldValue: { status: quote.status },
          newValue: {
            status: targetStatus,
            ...(targetStatus === 'PENDING_APPROVAL' && { justification }),
            ...(targetStatus === 'REJECTED' && { rejectionReason }),
            ...(targetStatus === 'CANCELED' && { wasProduced }),
            ...(action === 'APPROVAL_DECISION' &&
              targetStatus === 'SENT' &&
              justification && { comments: justification }),
          },
        });
      }

      // Log price change
      if (price !== undefined && Number(price) !== Number(quote.price || 0)) {
        await auditService.log(tx, {
          quoteId: id,
          changedById: userId,
          action: 'PRICE_CHANGE',
          oldValue: { price: quote.price ? Number(quote.price) : null },
          newValue: { price: Number(price) },
        });
      }

      // Log contractedPrice change
      if (
        contractedPrice !== undefined &&
        Number(contractedPrice) !== Number(quote.contractedPrice || 0)
      ) {
        await auditService.log(tx, {
          quoteId: id,
          changedById: userId,
          action: 'CONTRACTED_PRICE_CHANGE',
          oldValue: {
            contractedPrice: quote.contractedPrice ? Number(quote.contractedPrice) : null,
          },
          newValue: { contractedPrice: Number(contractedPrice) },
        });
      }

      // Log deliveryDate change
      if (deliveryDate !== undefined) {
        const newTime = new Date(deliveryDate).getTime();
        const oldTime = quote.deliveryDate ? new Date(quote.deliveryDate).getTime() : null;
        if (newTime !== oldTime) {
          await auditService.log(tx, {
            quoteId: id,
            changedById: userId,
            action: 'DELIVERY_DATE_CHANGE',
            oldValue: { deliveryDate: quote.deliveryDate },
            newValue: { deliveryDate: new Date(deliveryDate) },
          });
        }
      }

      if (targetStatus === 'PENDING_APPROVAL') {
        const finalPrice =
          price !== undefined && price !== null ? Number(price) : Number(quote.price || 0);
        const finalEstPrice = Number(quote.estimatedPrice || 0);
        const margin = finalPrice > 0 ? ((finalPrice - finalEstPrice) / finalPrice) * 100 : 0;

        const configService = new ConfigService();
        const minMarginConfig = await configService.getByKey('minimum_margin');
        const minMarginValue = Number(minMarginConfig.value);

        await tx.approvalRequest.create({
          data: {
            quoteId: id,
            requestedById: userId,
            status: 'PENDING',
            justification: justification || '',
            marginProposed: margin,
            marginMin: minMarginValue,
          },
        });
      }

      if (targetStatus === 'APPROVED') {
        const approvedContractedPrice =
          contractedPrice !== undefined && contractedPrice !== null
            ? contractedPrice
            : quote.price || quote.estimatedPrice;

        // Mark all other revisions of the same quoteNumber as isLatest: false
        await tx.quote.updateMany({
          where: {
            quoteNumber: quote.quoteNumber,
            id: { not: id },
          },
          data: {
            isLatest: false,
          },
        });

        // Mark other draft or sent versions as superseded
        await tx.quote.updateMany({
          where: {
            quoteNumber: quote.quoteNumber,
            id: { not: id },
            status: { in: ['DRAFT', 'SENT', 'PENDING_APPROVAL'] },
          },
          data: {
            status: 'SUPERSEDED',
          },
        });

        // Update this version to APPROVED and ensure it is marked as isLatest: true
        await tx.quote.update({
          where: { id },
          data: {
            status: targetStatus,
            isLatest: true,
            rejectionReason: null,
            wasProduced: null,
            ...(price !== undefined && { price }),
            ...(deliveryDate !== undefined && { deliveryDate: new Date(deliveryDate) }),
            contractedPrice: approvedContractedPrice,
          },
        });
      } else {
        // If not APPROVED, perform standard status update
        await tx.quote.update({
          where: { id },
          data: {
            status: targetStatus,
            rejectionReason: targetStatus === 'REJECTED' ? rejectionReason : null,
            wasProduced: targetStatus === 'CANCELED' ? wasProduced : null,
            ...(price !== undefined && { price }),
            ...(deliveryDate !== undefined && { deliveryDate: new Date(deliveryDate) }),
            ...(contractedPrice !== undefined && { contractedPrice }),
          },
        });
      }

      // Recalculate prices to align with the new status (e.g. populating price/contractedPrice)
      await this.recalculateQuotePrices(id, tx);

      // Fetch the updated quote with its relations
      const finalUpdated = await tx.quote.findUnique({
        where: { id },
        include: {
          client: true,
          contact: true,
          category: true,
          createdBy: { select: { name: true, email: true } },
        },
      });
      if (!finalUpdated) throw new AppError('Orçamento não encontrado.', 404);
      return finalUpdated;
    });
  }

  async update(id: string, data: any, userId: string) {
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new AppError('Quote not found', 404);

    const changes: any = {};
    const oldValues: any = {};
    const newValues: any = {};

    const fieldsToTrack = [
      'descriptiveText',
      'networkFilePath',
      'estimatedPrice',
      'deliveryDate',
      'validUntil',
    ];
    for (const field of fieldsToTrack) {
      if (data[field] !== undefined) {
        let isDifferent = false;
        if (field === 'deliveryDate' || field === 'validUntil') {
          const oldTime = quote[field] ? new Date(quote[field] as Date).getTime() : null;
          const newTime = data[field] ? new Date(data[field]).getTime() : null;
          isDifferent = oldTime !== newTime;
        } else if (field === 'estimatedPrice') {
          isDifferent = Number(quote.estimatedPrice || 0) !== Number(data.estimatedPrice || 0);
        } else {
          isDifferent = quote[field as keyof typeof quote] !== data[field];
        }

        if (isDifferent) {
          oldValues[field] = quote[field as keyof typeof quote];
          newValues[field] = data[field];
        }
      }
    }

    return prisma.$transaction(async (tx) => {
      const sanitizedData = { ...data };
      if (sanitizedData.categoryId === '') sanitizedData.categoryId = null;
      if (sanitizedData.contactId === '') sanitizedData.contactId = null;

      await tx.quote.update({
        where: { id },
        data: sanitizedData,
      });

      await this.recalculateQuotePrices(id, tx);

      const updated = await tx.quote.findUnique({
        where: { id },
      });

      if (!updated) throw new AppError('Quote not found', 404);

      if (Object.keys(newValues).length > 0) {
        const auditService = new QuoteAuditService();
        await auditService.log(tx, {
          quoteId: id,
          changedById: userId,
          action: 'UPDATE',
          oldValue: oldValues,
          newValue: newValues,
        });
      }

      return updated;
    });
  }

  async updateFiles(
    id: string,
    files: {
      cadFilePath?: string;
      thumbnailUrl?: string;
    },
    userId: string,
  ) {
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new AppError('Orçamento não encontrado.', 404);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.quote.update({
        where: { id },
        data: files,
      });

      const auditService = new QuoteAuditService();
      await auditService.log(tx, {
        quoteId: id,
        changedById: userId,
        action: 'DRAWING_UPLOAD',
        oldValue: {
          cadFilePath: quote.cadFilePath,
          thumbnailUrl: quote.thumbnailUrl,
        },
        newValue: {
          cadFilePath: files.cadFilePath ?? quote.cadFilePath,
          thumbnailUrl: files.thumbnailUrl ?? quote.thumbnailUrl,
        },
      });

      return updated;
    });
  }

  async delete(id: string, userId: string) {
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new AppError('Quote not found', 404);

    await prisma.$transaction(async (tx) => {
      await tx.quote.update({ where: { id }, data: { isActive: false } });

      const auditService = new QuoteAuditService();
      await auditService.log(tx, {
        quoteId: id,
        changedById: userId,
        action: 'DELETE',
        oldValue: { isActive: true },
        newValue: { isActive: false },
      });
    });
  }

  async getQuotePriceBreakdown(quoteId: string, tx?: any) {
    const prismaClient = tx || prisma;

    const activeItems = await prismaClient.quoteItem.findMany({
      where: { quoteId, isActive: true },
    });

    const quote = await prismaClient.quote.findUnique({ where: { id: quoteId } });
    if (!quote) throw new AppError('Orçamento não encontrado.', 404);

    const subtotal = activeItems.reduce((sum, item) => {
      const effectivePrice = Number(item.unitPrice) * (1 - Number(item.discountPercent) / 100);
      return sum + effectivePrice * Number(item.quantity);
    }, 0);

    const totalCost = activeItems.reduce((sum, item) => {
      return sum + Number(item.unitCost) * Number(item.quantity);
    }, 0);

    const globalDiscount = quote.discountPercent
      ? subtotal * (Number(quote.discountPercent) / 100)
      : Number(quote.discountFixed || 0);

    const finalPrice = subtotal - globalDiscount;
    const totalMargin = finalPrice > 0 ? ((finalPrice - totalCost) / finalPrice) * 100 : 0;

    return { subtotal, totalCost, globalDiscount, finalPrice, totalMargin, activeItems };
  }

  async validateDiscounts(quoteId: string, tx?: any) {
    const configService = new ConfigService();
    const minTotalMarginPct = (await configService.getByKey('min_total_margin_pct'))
      .value as number;
    const maxItemDiscountPct = (await configService.getByKey('max_item_discount_pct'))
      .value as number;

    const { totalMargin, activeItems } = await this.getQuotePriceBreakdown(quoteId, tx);

    if (totalMargin >= minTotalMarginPct) {
      return { valid: true, warnings: [] };
    }

    const warnings: string[] = [];
    for (const item of activeItems) {
      if (Number(item.discountPercent) > maxItemDiscountPct) {
        warnings.push(
          `Item "${item.project || item.description}" tem ${item.discountPercent}% de desconto, ` +
            `acima do teto de ${maxItemDiscountPct}%. Margem total (${totalMargin.toFixed(1)}%) ` +
            `está abaixo do mínimo (${minTotalMarginPct}%).`,
        );
      }
    }

    return { valid: warnings.length === 0, warnings };
  }

  async recalculateQuotePrices(quoteId: string, tx?: any) {
    const prismaClient = tx || prisma;

    const breakdown = await this.getQuotePriceBreakdown(quoteId, tx);

    const totalItemHours = breakdown.activeItems.reduce((sum, item) => {
      return sum + Number(item.estimatedHours || 0);
    }, 0);

    const quote = await prismaClient.quote.findUnique({ where: { id: quoteId } });
    if (!quote) throw new AppError('Orçamento não encontrado.', 404);

    const isDraft = quote.status === 'DRAFT';
    const isApproved = quote.status === 'APPROVED';

    // estimatedPrice: set to subtotal on creation, preserve if already populated
    const estimatedPrice =
      quote.estimatedPrice && Number(quote.estimatedPrice) > 0
        ? quote.estimatedPrice
        : breakdown.subtotal;

    // price: formal sent price, null if DRAFT
    const price = isDraft ? null : breakdown.finalPrice;

    // contractedPrice: final negotiated price, set only on APPROVED
    const contractedPrice = isApproved ? quote.contractedPrice || price : null;

    await prismaClient.quote.update({
      where: { id: quoteId },
      data: {
        estimatedPrice,
        totalCost: breakdown.totalCost,
        price,
        contractedPrice,
        estimatedHours: totalItemHours,
      },
    });
  }

  async listItems(quoteId: string) {
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, isActive: true },
    });
    if (!quote) throw new AppError('Orçamento não encontrado.', 404);

    return prisma.quoteItem.findMany({
      where: { quoteId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createItem(
    quoteId: string,
    data: {
      project: string;
      description: string;
      quantity: number;
      unitCost?: number;
      unitPrice: number;
      discountPercent?: number;
      process?: string | null;
      material?: string | null;
      estimatedHours?: number | null;
      drawingId?: string | null;
      drawingVersion?: number | null;
      drawingRef?: string | null;
      thumbnailUrl?: string | null;
      details?: any;
      notes?: string | null;
      sortOrder?: number;
    },
    userId: string,
  ) {
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, isActive: true },
    });
    if (!quote) throw new AppError('Orçamento não encontrado.', 404);

    return prisma.$transaction(async (tx) => {
      const createdItem = await tx.quoteItem.create({
        data: {
          ...data,
          project: data.project || data.description,
          unitCost: data.unitCost ?? 0,
          discountPercent: data.discountPercent ?? 0,
          sortOrder: data.sortOrder ?? 0,
          quoteId,
          isActive: true,
        },
      });
      await this.recalculateQuotePrices(quoteId, tx);

      const auditService = new QuoteAuditService();
      await auditService.log(tx, {
        quoteId,
        changedById: userId,
        action: 'ITEM_ADD',
        newValue: {
          itemId: createdItem.id,
          project: createdItem.project,
          description: createdItem.description,
          quantity: createdItem.quantity,
          unitPrice: Number(createdItem.unitPrice),
          unitCost: createdItem.unitCost ? Number(createdItem.unitCost) : undefined,
          discountPercent: createdItem.discountPercent
            ? Number(createdItem.discountPercent)
            : undefined,
        },
      });

      return createdItem;
    });
  }

  async updateItem(
    quoteId: string,
    itemId: string,
    data: {
      project?: string;
      description?: string;
      quantity?: number;
      unitCost?: number;
      unitPrice?: number;
      discountPercent?: number;
      process?: string | null;
      material?: string | null;
      estimatedHours?: number | null;
      drawingId?: string | null;
      drawingVersion?: number | null;
      drawingRef?: string | null;
      thumbnailUrl?: string | null;
      details?: any;
      notes?: string | null;
      sortOrder?: number;
    },
    userId: string,
  ) {
    const item = await prisma.quoteItem.findFirst({
      where: { id: itemId, quoteId, isActive: true },
    });
    if (!item) throw new AppError('Item não encontrado.', 404);

    return prisma.$transaction(async (tx) => {
      const updatedItem = await tx.quoteItem.update({
        where: { id: itemId },
        data,
      });
      await this.recalculateQuotePrices(quoteId, tx);

      const auditService = new QuoteAuditService();
      await auditService.log(tx, {
        quoteId,
        changedById: userId,
        action: 'ITEM_UPDATE',
        oldValue: {
          description: item.description,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          unitCost: item.unitCost ? Number(item.unitCost) : undefined,
          discountPercent: item.discountPercent ? Number(item.discountPercent) : undefined,
        },
        newValue: {
          description: updatedItem.description,
          quantity: updatedItem.quantity,
          unitPrice: Number(updatedItem.unitPrice),
          unitCost: updatedItem.unitCost ? Number(updatedItem.unitCost) : undefined,
          discountPercent: updatedItem.discountPercent
            ? Number(updatedItem.discountPercent)
            : undefined,
        },
        metadata: {
          itemId,
          description: updatedItem.description,
        },
      });

      return updatedItem;
    });
  }

  async deleteItem(quoteId: string, itemId: string, userId: string) {
    const item = await prisma.quoteItem.findFirst({
      where: { id: itemId, quoteId, isActive: true },
    });
    if (!item) throw new AppError('Item não encontrado.', 404);

    await prisma.$transaction(async (tx) => {
      await tx.quoteItem.update({
        where: { id: itemId },
        data: { isActive: false },
      });
      await this.recalculateQuotePrices(quoteId, tx);

      const auditService = new QuoteAuditService();
      await auditService.log(tx, {
        quoteId,
        changedById: userId,
        action: 'ITEM_REMOVE',
        oldValue: {
          itemId: item.id,
          project: item.project,
          description: item.description,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          unitCost: item.unitCost ? Number(item.unitCost) : undefined,
          discountPercent: item.discountPercent ? Number(item.discountPercent) : undefined,
        },
      });
    });
  }

  async exportToCsv(filters: { clientId?: string; status?: string }) {
    const quotes = await prisma.quote.findMany({
      where: { isActive: true, ...filters },
      include: {
        client: { select: { name: true } },
        contact: { select: { name: true } },
        category: { select: { name: true } },
        items: { where: { isActive: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Nº Orçamento',
      'Revisão',
      'Cliente',
      'Contato',
      'Categoria',
      'Descrição',
      'Status',
      'Data Criação',
      'Data Entrega',
      'Validade',
      'Custo Total',
      'Valor Total',
      'Desconto %',
      'Valor Final',
      'Itens',
    ];

    const rows = quotes.map((q) => [
      q.quoteNumber,
      q.revision,
      q.client.name,
      q.contact?.name || '',
      q.category?.name || '',
      `"${(q.descriptiveText || '').replace(/"/g, '""')}"`,
      q.status,
      q.createdAt.toISOString().split('T')[0],
      q.deliveryDate ? new Date(q.deliveryDate).toISOString().split('T')[0] : '',
      q.validUntil ? new Date(q.validUntil).toISOString().split('T')[0] : '',
      q.totalCost || 0,
      q.price || 0,
      q.discountPercent || 0,
      q.contractedPrice || q.price || 0,
      q.items.length,
    ]);

    return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  }

  async exportItemsToCsv(quoteId: string) {
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, isActive: true },
      include: {
        client: { select: { name: true } },
        items: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!quote) throw new AppError('Orçamento não encontrado.', 404);

    const headers = [
      'Orçamento',
      'Item',
      'Peça/Projeto',
      'Descrição',
      'Processo',
      'Material',
      'Quantidade',
      'Preço Unitário (R$)',
      'Desconto (%)',
      'Preço Total (R$)',
      'Custo Unitário (R$)',
      'Horas Estimadas',
      'Observações',
    ];

    const rows = quote.items.map((item, idx) => {
      const finalUnitPrice = Number(item.unitPrice) * (1 - Number(item.discountPercent || 0) / 100);
      const totalItemPrice = finalUnitPrice * item.quantity;
      return [
        `${quote.quoteNumber}-${quote.revision}`,
        idx + 1,
        `"${(item.project || '').replace(/"/g, '""')}"`,
        `"${(item.description || '').replace(/"/g, '""')}"`,
        item.process || '',
        item.material || '',
        item.quantity,
        Number(item.unitPrice).toFixed(2),
        Number(item.discountPercent || 0).toFixed(2),
        totalItemPrice.toFixed(2),
        item.unitCost ? Number(item.unitCost).toFixed(2) : '0.00',
        item.estimatedHours ? Number(item.estimatedHours).toFixed(2) : '0.00',
        `"${(item.notes || '').replace(/"/g, '""')}"`,
      ];
    });

    return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  }

  async updateItemFiles(
    quoteId: string,
    itemId: string,
    files: {
      drawingRef?: string;
      thumbnailUrl?: string;
    },
    userId: string,
  ) {
    const item = await prisma.quoteItem.findFirst({
      where: { id: itemId, quoteId, isActive: true },
    });
    if (!item) throw new AppError('Item não encontrado.', 404);

    return prisma.$transaction(async (tx) => {
      const updatedItem = await tx.quoteItem.update({
        where: { id: itemId },
        data: files,
      });

      const auditService = new QuoteAuditService();
      await auditService.log(tx, {
        quoteId,
        changedById: userId,
        action: 'ITEM_DRAWING_UPLOAD',
        oldValue: {
          drawingRef: item.drawingRef,
          thumbnailUrl: item.thumbnailUrl,
        },
        newValue: {
          drawingRef: files.drawingRef ?? item.drawingRef,
          thumbnailUrl: files.thumbnailUrl ?? item.thumbnailUrl,
        },
        metadata: {
          itemId,
          description: item.description,
        },
      });

      return updatedItem;
    });
  }
}
