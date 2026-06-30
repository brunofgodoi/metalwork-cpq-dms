import { prisma } from '../lib/prisma';
import { calculateFuzzyMatchScore as calculateDiceFuzzyMatchScore } from './similarity/dice';
import { calculateJaccardFuzzyMatchScore } from './similarity/jaccard';
import { processText } from './similarity/sanitizer';
import { ConfigService } from './ConfigService';

export interface SearchResultItem {
  id: string;
  type: 'CLIENT' | 'CONTACT' | 'QUOTE' | 'DRAWING';
  score: number;
  title: string;
  subtitle: string;
  description?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
}

export class SearchService {
  async search(
    query: string,
    type: 'ALL' | 'CLIENT' | 'CONTACT' | 'QUOTE' | 'DRAWING' = 'ALL',
  ): Promise<SearchResultItem[]> {
    const tokens = processText(query);
    if (tokens.length === 0) {
      return [];
    }

    const configService = new ConfigService();
    let algorithm = 'DICE';
    let systemThreshold = 0.05;

    try {
      const config = await configService.getByKey('search_settings');
      const settings = config.value as { algorithm?: string; threshold?: number };
      algorithm = settings.algorithm || 'DICE';
      systemThreshold = settings.threshold !== undefined ? settings.threshold : 0.05;
    } catch {
      // Fallback in case configuration fails
    }

    const calculateScore = (queryStr: string, targetStr: string): number => {
      if (algorithm === 'JACCARD') {
        return calculateJaccardFuzzyMatchScore(queryStr, targetStr);
      }
      return calculateDiceFuzzyMatchScore(queryStr, targetStr);
    };

    const results: SearchResultItem[] = [];

    // 1. Search Clients
    if (type === 'ALL' || type === 'CLIENT') {
      const rawQuery = query.toLowerCase().trim();
      const clientRows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT * FROM "clients" WHERE "isActive" = true AND (
          unaccent("name") ILIKE unaccent($1) OR
          unaccent(COALESCE("document", '')) ILIKE unaccent($1) OR
          unaccent(COALESCE("address", '')) ILIKE unaccent($1)
        )`,
        `%${rawQuery}%`,
      );

      for (const row of clientRows) {
        const client = row as {
          id: string;
          name: string;
          document: string | null;
          address: string | null;
        };
        const matchString = `${client.name} ${client.document || ''} ${client.address || ''}`;
        const score = calculateScore(query, matchString);
        if (score >= systemThreshold) {
          results.push({
            id: client.id,
            type: 'CLIENT',
            score,
            title: client.name,
            subtitle: client.document ? `CNPJ/CPF: ${client.document}` : 'Sem documento cadastrado',
            description: client.address || 'Sem endereço cadastrado',
            payload: client,
          });
        }
      }
    }

    // 2. Search Contacts
    if (type === 'ALL' || type === 'CONTACT') {
      const rawQuery = query.toLowerCase().trim();
      const contactRows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT cc.*, c."name" as client_name
         FROM "client_contacts" cc
         JOIN "clients" c ON c.id = cc."clientId"
         WHERE cc."isActive" = true AND (
           unaccent(cc."name") ILIKE unaccent($1) OR
           unaccent(COALESCE(cc."phone", '')) ILIKE unaccent($1) OR
           unaccent(COALESCE(cc."email", '')) ILIKE unaccent($1) OR
           unaccent(c."name") ILIKE unaccent($1)
         )`,
        `%${rawQuery}%`,
      );

      for (const row of contactRows) {
        const contact = row as {
          id: string;
          name: string;
          phone: string | null;
          email: string | null;
          client_name: string;
        };
        const matchString = `${contact.name} ${contact.email || ''} ${contact.phone || ''} da ${contact.client_name}`;
        const score = calculateScore(query, matchString);
        if (score >= systemThreshold) {
          results.push({
            id: contact.id,
            type: 'CONTACT',
            score,
            title: contact.name,
            subtitle: `Empresa: ${contact.client_name}`,
            description: `Tel: ${contact.phone || 'N/A'} | E-mail: ${contact.email || 'N/A'}`,
            payload: contact,
          });
        }
      }
    }

    // 3. Search Quotes (with item-level scoring)
    if (type === 'ALL' || type === 'QUOTE') {
      const rawQuery = query.toLowerCase().trim();
      const quoteIdRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT q."id" FROM "quotes" q
         JOIN "clients" c ON c.id = q."clientId"
         LEFT JOIN "client_contacts" ct ON ct.id = q."contactId"
         LEFT JOIN "categories" cat ON cat.id = q."categoryId"
         WHERE q."isActive" = true AND (
           unaccent(q."descriptiveText") ILIKE unaccent($1) OR
           unaccent(COALESCE(q."networkFilePath", '')) ILIKE unaccent($1) OR
           unaccent(c."name") ILIKE unaccent($1) OR
           unaccent(COALESCE(ct."name", '')) ILIKE unaccent($1) OR
           unaccent(cat."name") ILIKE unaccent($1) OR
           EXISTS (
             SELECT 1 FROM "quote_items" qi
             WHERE qi."quote_id" = q."id"
             AND qi."isActive" = true
             AND (unaccent(qi."project") ILIKE unaccent($1) OR unaccent(qi."description") ILIKE unaccent($1))
           )
         )`,
        `%${rawQuery}%`,
      );

      const matchingQuoteIds = quoteIdRows.map((r) => r.id);

      if (matchingQuoteIds.length > 0) {
        const quotes = await prisma.quote.findMany({
          where: { id: { in: matchingQuoteIds }, isActive: true },
          include: {
            client: true,
            contact: true,
            category: true,
            createdBy: true,
            items: {
              where: { isActive: true },
              select: {
                id: true,
                project: true,
                description: true,
              },
            },
          },
        });

        for (const quote of quotes) {
          const headerString = `${quote.descriptiveText} ${quote.networkFilePath} de ${quote.client.name} com ${quote.contact?.name || ''} em ${quote.category.name}`;
          const headerScore = calculateScore(query, headerString);

          let maxItemScore = 0;
          let itemScoreSum = 0;
          const matchingItems: Array<{
            id: string;
            project: string;
            description: string;
            score: number;
          }> = [];

          for (const item of quote.items) {
            const itemText = `${item.project} ${item.description}`;
            const itemScore = calculateScore(query, itemText);
            if (itemScore > 0) {
              itemScoreSum += itemScore;
              if (itemScore > maxItemScore) maxItemScore = itemScore;
              if (itemScore >= systemThreshold) {
                matchingItems.push({
                  id: item.id,
                  project: item.project,
                  description: item.description,
                  similarityScore: itemScore,
                });
              }
            }
          }

          const avgItemScore = quote.items.length > 0 ? itemScoreSum / quote.items.length : 0;
          const itemAggregate =
            quote.items.length > 0 ? maxItemScore * 0.6 + avgItemScore * 0.4 : 0;

          const score = headerScore > itemAggregate ? headerScore : itemAggregate;

          if (score >= systemThreshold) {
            const matchHighlights = matchingItems
              .sort((a, b) => b.score - a.score)
              .slice(0, 3)
              .map((m) => m.project || m.description);

            results.push({
              id: quote.id,
              type: 'QUOTE',
              score,
              title: `#${quote.quoteNumber} - ${quote.client.name}`,
              subtitle: `Categoria: ${quote.category.name} | ${matchingItems.length} item(ns) com correspondência`,
              description:
                matchHighlights.length > 0
                  ? `Itens: ${matchHighlights.join(' | ')}`
                  : quote.descriptiveText,
              payload: { ...quote, matchingItems },
            });
          }
        }
      }
    }

    // 4. Search Standard Drawings
    if (type === 'ALL' || type === 'DRAWING') {
      const rawQuery = query.toLowerCase().trim();
      const drawingRows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT sd.*, cat."name" as category_name
         FROM "standard_drawings" sd
         LEFT JOIN "categories" cat ON cat.id = sd."categoryId"
         WHERE sd."isActive" = true AND (
           unaccent(sd."code") ILIKE unaccent($1) OR
           unaccent(sd."name") ILIKE unaccent($1) OR
           unaccent(COALESCE(sd."description", '')) ILIKE unaccent($1) OR
           unaccent(cat."name") ILIKE unaccent($1)
         )`,
        `%${rawQuery}%`,
      );

      for (const row of drawingRows) {
        const drawing = row as {
          id: string;
          code: string;
          name: string;
          description: string | null;
          type: string;
          category_name: string | null;
        };
        const matchString = `${drawing.code} ${drawing.name} ${drawing.description || ''} ${drawing.category_name || ''}`;
        const score = calculateScore(query, matchString);
        if (score >= systemThreshold) {
          results.push({
            id: drawing.id,
            type: 'DRAWING',
            score,
            title: `${drawing.code} — ${drawing.name}`,
            subtitle: `Categoria: ${drawing.category_name || 'N/A'} | Tipo: ${drawing.type === 'PRODUCT' ? 'Produto' : 'Auxiliar'}`,
            description: drawing.description || '',
            payload: drawing,
          });
        }
      }
    }

    // Primary sort: Score (descending)
    // Secondary sort: Type priority (CLIENT > CONTACT > DRAWING > QUOTE)
    const typePriority: Record<string, number> = {
      CLIENT: 4,
      CONTACT: 3,
      DRAWING: 2,
      QUOTE: 1,
    };

    results.sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.03) {
        return b.score - a.score;
      }
      const priorityA = typePriority[a.type] || 0;
      const priorityB = typePriority[b.type] || 0;
      return priorityB - priorityA;
    });

    return results;
  }
}
