import { Role, QuoteStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

const MS_PER_DAY = 86_400_000;
const daysAgo = (days: number) => new Date(Date.now() - days * MS_PER_DAY);

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateMonthsAgo(months: number): Date {
  const baseDays = Math.round(months * 30.44);
  const jitter = randomInt(-10, 10);
  return daysAgo(Math.max(1, baseDays + jitter));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const REJECTION_REASONS = [
  'Preço muito alto em comparação com concorrentes regionais.',
  'Prazo de entrega inviabiliza o cronograma da obra do cliente.',
  'Divergência de especificações técnicas na usinagem das peças.',
  'Cliente cancelou o projeto interno devido a corte de verbas.',
  'Fornecedor local ofereceu frete gratuito e menor prazo.',
  'Especificações técnicas não atendem aos requisitos do cliente.',
  'Orçamento excede o limite aprovado pelo setor financeiro do cliente.',
];

const DESCRIPTIVE_TEXTS = [
  'Usinagem de precisão conforme desenho técnico do cliente.',
  'Fabricação de estrutura metálica para ampliação de galpão industrial.',
  'Caldeiraria pesada para tanque de armazenamento sob pressão.',
  'Serralheria artesanal para gradil decorativo residencial.',
  'Corte e dobra de chapas para painéis elétricos.',
  'Montagem de estrutura de alumínio para fachada comercial.',
  'Fabricação de escada marinheiro para acesso de tanques industriais.',
  'Reforma de portão de correr automático para condomínio residencial.',
  'Soldagem de estruturas de aço carbono para mezanino.',
  'Usinagem de eixos e buchas para manutenção industrial.',
];

async function cleanDatabase() {
  await prisma.quoteAuditLog.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.quoteItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.standardDrawingVersion.deleteMany();
  await prisma.standardDrawing.deleteMany();
  await prisma.clientContact.deleteMany();
  await prisma.client.deleteMany();
  await prisma.category.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.companyConfig.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log('🌱 Seeding demo data...');

  await cleanDatabase();
  console.log('✅ Database cleaned.');

  // ─── Users ───────────────────────────────────────────────────
  const password = await bcrypt.hash('123456', 10);

  const ana = await prisma.user.create({
    data: {
      name: 'Ana Oliveira',
      email: 'ana@metalurgica.com',
      role: Role.ADMIN,
      password,
      changePasswordNextLogin: false,
    },
  });
  const carlos = await prisma.user.create({
    data: {
      name: 'Carlos Souza',
      email: 'carlos@metalurgica.com',
      role: Role.ESTIMATOR,
      password,
      changePasswordNextLogin: false,
    },
  });
  const juliana = await prisma.user.create({
    data: {
      name: 'Juliana Costa',
      email: 'juliana@metalurgica.com',
      role: Role.ESTIMATOR,
      password,
      changePasswordNextLogin: false,
    },
  });
  await prisma.user.create({
    data: {
      name: 'Admin CPQ',
      email: 'admin@cpq.com',
      role: Role.ADMIN,
      password: await bcrypt.hash('admin123', 10),
      changePasswordNextLogin: false,
    },
  });
  const users = [ana, carlos, juliana];
  console.log('✅ Users created.');

  // ─── Categories ──────────────────────────────────────────────
  const categoryNames = ['Estruturas Metálicas', 'Usinagem', 'Caldeiraria', 'Serralheria'];
  const cats: Record<string, string> = {};
  for (const name of categoryNames) {
    const cat = await prisma.category.create({ data: { name } });
    cats[name] = cat.id;
  }
  console.log('✅ Categories created.');

  // ─── Catalog Items (StandardDrawings) ────────────────────────
  const catalogData = [
    {
      name: 'Viga H Perfil 200',
      cat: 'Estruturas Metálicas',
      process: 'Corte',
      material: 'Aço Carbono',
      price: 350.0,
    },
    {
      name: 'Coluna Metálica Reforçada',
      cat: 'Estruturas Metálicas',
      process: 'Solda',
      material: 'Aço Carbono',
      price: 890.0,
    },
    {
      name: 'Parafuso de Rosca M16',
      cat: 'Usinagem',
      process: 'Torno',
      material: 'Aço Inox',
      price: 8.9,
    },
    {
      name: 'Bucha de Bronze 50mm',
      cat: 'Usinagem',
      process: 'Fresa',
      material: 'Bronze',
      price: 65.0,
    },
    {
      name: 'Eixo Usinado D=80mm',
      cat: 'Usinagem',
      process: 'Torno',
      material: 'Aço Liga',
      price: 310.0,
    },
    {
      name: 'Tanque de Pressão 500L',
      cat: 'Caldeiraria',
      process: 'Solda',
      material: 'Aço Carbono',
      price: 6500.0,
    },
    {
      name: 'Chapa Dobrada 3mm',
      cat: 'Caldeiraria',
      process: 'Dobra',
      material: 'Aço Carbono',
      price: 110.0,
    },
    {
      name: 'Tubo Sch40 6"',
      cat: 'Caldeiraria',
      process: 'Corte',
      material: 'Aço Carbono',
      price: 195.0,
    },
    {
      name: 'Portão de Correr 4m',
      cat: 'Serralheria',
      process: 'Montagem',
      material: 'Alumínio',
      price: 3200.0,
    },
    {
      name: 'Gradil Decorativo',
      cat: 'Serralheria',
      process: 'Solda',
      material: 'Ferro Forjado',
      price: 580.0,
    },
    {
      name: 'Guarda-Corpo Reto 1m',
      cat: 'Serralheria',
      process: 'Montagem',
      material: 'Aço Inox',
      price: 850.0,
    },
    {
      name: 'Escada Marinheiro 6m',
      cat: 'Serralheria',
      process: 'Montagem',
      material: 'Aço Carbono',
      price: 1350.0,
    },
  ];

  interface CatalogItem {
    id: string;
    name: string;
    process: string;
    material: string;
    price: number;
    catId: string;
  }

  const catalogItems: CatalogItem[] = [];
  for (let i = 0; i < catalogData.length; i++) {
    const item = catalogData[i];
    const code = `CAT-${String(i + 1).padStart(3, '0')}`;
    const drawing = await prisma.standardDrawing.create({
      data: {
        code,
        name: item.name,
        type: 'PRODUCT',
        categoryId: cats[item.cat],
        basePrice: item.price,
        specs: { process: item.process, material: item.material },
      },
    });
    await prisma.standardDrawingVersion.create({
      data: {
        drawingId: drawing.id,
        version: 1,
        filePath: `uploads/standard-drawings/${code.toLowerCase()}-v1.dwg`,
        changelog: 'Versão inicial',
        createdBy: ana.id,
      },
    });
    catalogItems.push({
      id: drawing.id,
      name: item.name,
      process: item.process,
      material: item.material,
      price: item.price,
      catId: cats[item.cat],
    });
  }

  const auxItems = [
    {
      code: 'CAD-BASE-001',
      name: 'Base para Máquina CNC',
      category: 'Usinagem',
      process: 'Corte',
      material: 'Aço Carbono',
    },
    {
      code: 'CAD-ESTRUT-002',
      name: 'Suporte Estrutural Tipo L',
      category: 'Estruturas Metálicas',
      process: 'Dobra',
      material: 'Aço Galvanizado',
    },
    {
      code: 'CAD-TANQUE-003',
      name: 'Reforço para Tampa de Tanque',
      category: 'Caldeiraria',
      process: 'Solda',
      material: 'Inox 304',
    },
  ];
  for (const aux of auxItems) {
    await prisma.standardDrawing.create({
      data: {
        code: aux.code,
        name: aux.name,
        type: 'HELPER',
        categoryId: cats[aux.category],
        basePrice: 0,
        specs: { process: aux.process, material: aux.material },
      },
    });
  }

  console.log('✅ Catalog items created.');

  // ─── Clients with Contacts ────────────────────────────────────
  const clientData = [
    {
      name: 'MetalFort Indústria',
      document: '11.111.111/0001-11',
      address: 'Av. Industrial, 1000, São Paulo - SP',
      contacts: [
        { name: 'Roberto Almeida', phone: '(11) 98888-0001', email: 'roberto@metalfort.com.br' },
        { name: 'Fernanda Lima', phone: null, email: 'fernanda@metalfort.com.br' },
      ],
    },
    {
      name: 'Construtora Nova Era',
      document: '22.222.222/0001-22',
      address: 'Rua das Palmeiras, 500, Campinas - SP',
      contacts: [
        { name: 'Marcos Ribeiro', phone: '(19) 97777-0001', email: 'marcos@novaera.com.br' },
      ],
    },
    {
      name: 'Usina Santa Cruz',
      document: '33.333.333/0001-33',
      address: 'Av. das Nações, 2000, Sorocaba - SP',
      contacts: [
        { name: 'Paulo Nogueira', phone: '(15) 96666-0001', email: 'paulo@santacruz.com.br' },
        { name: 'Luciana Mendes', phone: '(15) 96666-0002', email: 'luciana@santacruz.com.br' },
      ],
    },
    {
      name: 'AutoPeças RB',
      document: '44.444.444/0001-44',
      address: 'Rua do Automóvel, 300, São Bernardo - SP',
      contacts: [{ name: 'Celso Rocha', phone: '(11) 95555-0001', email: 'celso@rbpecas.com.br' }],
    },
    {
      name: 'Transportadora Veloz',
      document: '55.555.555/0001-55',
      address: 'Av. dos Bandeirantes, 800, Guarulhos - SP',
      contacts: [
        { name: 'Sandra Torres', phone: '(11) 94444-0001', email: 'sandra@veloz.com.br' },
        { name: 'Jorge Campos', phone: null, email: 'jorge@veloz.com.br' },
      ],
    },
    {
      name: 'Hospital São Lucas',
      document: '66.666.666/0001-66',
      address: 'Rua da Saúde, 400, São Paulo - SP',
      contacts: [
        { name: 'Dr. Ricardo Alves', phone: '(11) 93333-0001', email: 'ricardo@hsl.com.br' },
      ],
    },
    {
      name: 'Refrigeração Polar',
      document: '77.777.777/0001-77',
      address: 'Av. Frigorífica, 150, Jundiaí - SP',
      contacts: [{ name: 'Eduardo Frio', phone: '(11) 92222-0001', email: 'eduardo@polar.com.br' }],
    },
    {
      name: 'Escola Recriar',
      document: '88.888.888/0001-88',
      address: 'Rua do Ensino, 600, Campinas - SP',
      contacts: [
        { name: 'Prof. Ana Marta', phone: '(19) 91111-0001', email: 'anamarta@recriar.com.br' },
        { name: 'Tiago Silva', phone: '(19) 91111-0002', email: 'tiago@recriar.com.br' },
      ],
    },
    {
      name: 'Restaurante Sabor & Cia',
      document: '99.999.999/0001-99',
      address: 'Av. Gastronômica, 200, Osasco - SP',
      contacts: [{ name: 'Chef Carla', phone: '(11) 90000-0001', email: 'carla@saborcia.com.br' }],
    },
    {
      name: 'Condomínio Parque Verde',
      document: '11.111.111/0002-11',
      address: 'Rua das Árvores, 1000, São Paulo - SP',
      contacts: [
        { name: 'Síndico Antônio', phone: '(11) 98888-0002', email: 'antonio@parqueverde.com.br' },
        { name: 'Zelador José', phone: null, email: 'jose@parqueverde.com.br' },
      ],
    },
    {
      name: 'AgroPecuária Boi Gordo',
      document: '22.222.222/0002-22',
      address: 'Estrada do Gado, KM 50, Ribeirão Preto - SP',
      contacts: [
        { name: 'Fazendeiro João', phone: '(16) 97777-0002', email: 'joao@boigordo.com.br' },
      ],
    },
    {
      name: 'Indústria Química Atlas',
      document: '33.333.333/0002-33',
      address: 'Av. dos Químicos, 700, Cubatão - SP',
      contacts: [{ name: 'Eng. Mário Santos', phone: null, email: 'mario@atlasquimica.com.br' }],
    },
  ];

  interface ClientInfo {
    id: string;
    contactIds: string[];
  }

  const clients: ClientInfo[] = [];
  for (const cd of clientData) {
    const client = await prisma.client.create({
      data: { name: cd.name, document: cd.document, address: cd.address },
    });
    const contactIds: string[] = [];
    for (const cont of cd.contacts) {
      const contact = await prisma.clientContact.create({
        data: { clientId: client.id, name: cont.name, phone: cont.phone, email: cont.email },
      });
      contactIds.push(contact.id);
    }
    clients.push({ id: client.id, contactIds });
  }
  console.log('✅ Clients created.');

  // ─── Quote Items helper ──────────────────────────────────────
  function generateItemData(catItems: CatalogItem[], count: number, priceMultiplier: number) {
    const shuffled = [...catItems].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));
    return selected.map((item, idx) => {
      const isExpensive = item.price > 1000;
      const isCheap = item.price < 50;
      const quantity = isExpensive
        ? randomInt(1, 5)
        : isCheap
          ? randomInt(10, 100)
          : randomInt(2, 20);
      const unitCost = Math.round(item.price * 0.55 * priceMultiplier * 100) / 100;
      const unitPrice = Math.round(item.price * priceMultiplier * 100) / 100;
      return {
        project: item.name,
        description: `Fabricação de ${item.name.toLowerCase()} conforme especificações do cliente.`,
        quantity,
        unitCost,
        unitPrice,
        process: item.process,
        material: item.material,
        drawingId: item.id,
        sortOrder: idx,
      };
    });
  }

  function computeTotal(items: { unitPrice: number; quantity: number }[]): number {
    return Math.round(items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0) * 100) / 100;
  }

  function computeTotalCost(items: { unitCost: number; quantity: number }[]): number {
    return Math.round(items.reduce((sum, it) => sum + it.unitCost * it.quantity, 0) * 100) / 100;
  }

  // ─── Quotes ───────────────────────────────────────────────────
  let nextQuoteNumber = 1000;
  let quoteCount = 0;
  const categoryIds = Object.values(cats);

  const userQuoteCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
  const MIN_QUOTES: [number, number][] = [
    [0, 3], // Ana: 3
    [1, 8], // Carlos: 8
    [2, 7], // Juliana: 7
  ];

  function pickUserForQuote(): number {
    for (const [userIdx, min] of MIN_QUOTES) {
      if (userQuoteCounts[userIdx] < min) {
        userQuoteCounts[userIdx]++;
        return userIdx;
      }
    }
    const idx = randomInt(0, 2);
    userQuoteCounts[idx]++;
    return idx;
  }

  async function createAuditLogs(
    quoteId: string,
    status: QuoteStatus,
    createdAt: Date,
    rejectionReason?: string | null,
    wasProduced?: boolean | null,
  ) {
    await prisma.quoteAuditLog.create({
      data: {
        quoteId,
        changedById: pick(users).id,
        action: 'STATUS_CHANGE',
        oldValue: null,
        newValue: { status: 'DRAFT' },
        createdAt: new Date(createdAt.getTime()),
      },
    });

    if (status === QuoteStatus.DRAFT) return;

    const sentAt = new Date(createdAt.getTime() + randomInt(1, 3) * MS_PER_DAY);
    await prisma.quoteAuditLog.create({
      data: {
        quoteId,
        changedById: pick(users).id,
        action: 'STATUS_CHANGE',
        oldValue: { status: 'DRAFT' },
        newValue: { status: 'SENT' },
        createdAt: sentAt,
      },
    });

    if (status === QuoteStatus.SENT) return;

    const finalAt = new Date(sentAt.getTime() + randomInt(1, 5) * MS_PER_DAY);
    let action = 'STATUS_CHANGE';
    let newValue: any = { status };
    if (status === QuoteStatus.APPROVED) {
      action = 'APPROVAL_DECISION';
      newValue = { status: 'APPROVED' };
    } else if (status === QuoteStatus.REJECTED) {
      newValue = {
        status: 'REJECTED',
        rejectionReason: rejectionReason || 'Preço fora do orçamento',
      };
    } else if (status === QuoteStatus.CANCELED) {
      newValue = { status: 'CANCELED', wasProduced: wasProduced ?? false };
    } else if (status === QuoteStatus.PENDING_APPROVAL) {
      newValue = { status: 'PENDING_APPROVAL' };
    } else if (status === QuoteStatus.SUPERSEDED) {
      newValue = { status: 'SUPERSEDED' };
    }

    await prisma.quoteAuditLog.create({
      data: {
        quoteId,
        changedById: pick(users).id,
        action,
        oldValue: { status: 'SENT' },
        newValue,
        createdAt: finalAt,
      },
    });
  }

  for (let months = 16; months >= 0; months--) {
    const quotesThisMonth = randomInt(8, 12);
    for (let q = 0; q < quotesThisMonth; q++) {
      const clientIdx = randomInt(0, clients.length - 1);
      const client = clients[clientIdx];
      const userIdx = pickUserForQuote();
      const user = users[userIdx];
      const contactId = client.contactIds[0] ?? null;
      const catId = pick(categoryIds);
      const itemCount = randomInt(1, 4);
      const descriptiveText = pick(DESCRIPTIVE_TEXTS);

      let status: QuoteStatus;
      if (months === 0) {
        status = pick([
          QuoteStatus.DRAFT,
          QuoteStatus.PENDING_APPROVAL,
          QuoteStatus.SENT,
          QuoteStatus.APPROVED,
        ]);
      } else {
        status = pick([QuoteStatus.APPROVED, QuoteStatus.REJECTED, QuoteStatus.CANCELED]);
      }

      const hasRevision = Math.random() < 0.15;
      const createdAt = randomDateMonthsAgo(months);

      if (hasRevision) {
        const createdAtB = randomDateMonthsAgo(months);
        const createdAtA = new Date(createdAtB.getTime() - randomInt(1, 3) * MS_PER_DAY);

        const itemsB = generateItemData(catalogItems, itemCount, 1.0);
        const itemsA = generateItemData(catalogItems, itemCount, 0.9);
        const totalB = computeTotal(itemsB);
        const totalA = computeTotal(itemsA);
        const totalCostB = computeTotalCost(itemsB);
        const totalCostA = computeTotalCost(itemsA);
        const estimatedB = Math.round(totalB * 0.85 * 100) / 100;
        const estimatedA = Math.round(totalA * 0.85 * 100) / 100;
        const contractedPrice =
          status === QuoteStatus.APPROVED
            ? Math.round(totalB * (0.92 + Math.random() * 0.06) * 100) / 100
            : null;

        const deliveryDateB = daysAgo(Math.round(months * 30.44) - randomInt(10, 30));
        const deliveryDateA = daysAgo(Math.round(months * 30.44) - randomInt(10, 30));

        const quoteB = await prisma.quote.create({
          data: {
            quoteNumber: nextQuoteNumber++,
            clientId: client.id,
            contactId,
            categoryId: catId,
            createdById: user.id,
            descriptiveText,
            estimatedPrice: estimatedB,
            price: totalB,
            totalCost: totalCostB,
            contractedPrice,
            status: QuoteStatus.APPROVED,
            createdAt: createdAtB,
            updatedAt: createdAtB,
            deliveryDate: deliveryDateB,
            revision: 'B',
            isLatest: true,
          },
        });
        quoteCount++;

        for (const item of itemsB) {
          await prisma.quoteItem.create({
            data: { quoteId: quoteB.id, ...item },
          });
        }

        await createAuditLogs(quoteB.id, QuoteStatus.APPROVED, createdAtB);

        const quoteA = await prisma.quote.create({
          data: {
            quoteNumber: quoteB.quoteNumber,
            clientId: client.id,
            contactId,
            categoryId: catId,
            createdById: user.id,
            descriptiveText,
            estimatedPrice: estimatedA,
            price: totalA,
            totalCost: totalCostA,
            contractedPrice: null,
            status: QuoteStatus.SUPERSEDED,
            rejectionReason: null,
            createdAt: createdAtA,
            updatedAt: createdAtA,
            deliveryDate: deliveryDateA,
            revision: 'A',
            isLatest: false,
          },
        });

        for (const item of itemsA) {
          await prisma.quoteItem.create({
            data: { quoteId: quoteA.id, ...item },
          });
        }

        await createAuditLogs(quoteA.id, QuoteStatus.SUPERSEDED, createdAtA);
      } else {
        const items = generateItemData(catalogItems, itemCount, 1.0);
        const total = computeTotal(items);
        const totalCost = computeTotalCost(items);
        const estimated = Math.round(total * 0.85 * 100) / 100;

        let rejectionReason: string | null = null;
        if (status === QuoteStatus.REJECTED || status === QuoteStatus.CANCELED) {
          rejectionReason = pick(REJECTION_REASONS);
        }

        let wasProduced: boolean | null = null;
        if (status === QuoteStatus.CANCELED) {
          wasProduced = Math.random() < 0.4; // 40% de chance de ter perdas materiais
        }

        const contractedPrice =
          status === QuoteStatus.APPROVED
            ? Math.round(total * (0.92 + Math.random() * 0.06) * 100) / 100
            : null;

        const deliveryDate = daysAgo(Math.round(months * 30.44) - randomInt(10, 30));

        const quote = await prisma.quote.create({
          data: {
            quoteNumber: nextQuoteNumber++,
            clientId: client.id,
            contactId,
            categoryId: catId,
            createdById: user.id,
            descriptiveText,
            estimatedPrice: estimated,
            price: status === QuoteStatus.DRAFT ? null : total,
            totalCost,
            contractedPrice,
            status,
            rejectionReason,
            wasProduced,
            createdAt,
            updatedAt: createdAt,
            deliveryDate,
            revision: 'A',
            isLatest: true,
          },
        });
        quoteCount++;

        for (const item of items) {
          await prisma.quoteItem.create({
            data: { quoteId: quote.id, ...item },
          });
        }

        await createAuditLogs(quote.id, status, createdAt, rejectionReason, wasProduced);
      }
    }
  }

  // ─── Additional scenarios spanning recent months ──────────────────────
  let extraDay = 0;

  // ─── 1. Quotes with global discounts (discountPercent / discountFixed) ────
  for (let i = 0; i < 10; i++) {
    const clientIdx = randomInt(0, clients.length - 1);
    const client = clients[clientIdx];
    const userIdx = pickUserForQuote();
    const user = users[userIdx];
    const contactId = client.contactIds[0] ?? null;
    const catId = pick(categoryIds);
    const itemCount = randomInt(1, 4);
    const descriptiveText = pick(DESCRIPTIVE_TEXTS);
    extraDay += 2;
    const createdAt = daysAgo(extraDay);
    const items = generateItemData(catalogItems, itemCount, 1.0);
    const total = computeTotal(items);
    const totalCost = computeTotalCost(items);
    const estimated = Math.round(total * 0.85 * 100) / 100;
    const usePercent = Math.random() < 0.6;
    const discountPercent = usePercent ? randomInt(5, 20) : null;
    const discountFixed = !usePercent
      ? Math.round(((total * randomInt(5, 15)) / 100) * 100) / 100
      : null;
    const deliveryDate = daysAgo(extraDay - 3);
    const status = pick([
      QuoteStatus.SENT,
      QuoteStatus.APPROVED,
      QuoteStatus.DRAFT,
      QuoteStatus.PENDING_APPROVAL,
    ]);
    const contractedPrice =
      status === QuoteStatus.APPROVED
        ? Math.round(total * (0.92 + Math.random() * 0.06) * 100) / 100
        : null;

    const quote = await prisma.quote.create({
      data: {
        quoteNumber: nextQuoteNumber++,
        clientId: client.id,
        contactId,
        categoryId: catId,
        createdById: user.id,
        descriptiveText,
        estimatedPrice: estimated,
        price: total,
        totalCost,
        contractedPrice,
        status,
        createdAt,
        updatedAt: createdAt,
        deliveryDate,
        discountPercent,
        discountFixed,
        revision: 'A',
        isLatest: true,
      },
    });
    quoteCount++;

    for (const item of items) {
      await prisma.quoteItem.create({
        data: { quoteId: quote.id, ...item },
      });
    }

    await createAuditLogs(quote.id, quote.status, createdAt);
  }

  // ─── 2. Expired quotes (validUntil in the past) ──────────────────────────
  for (let i = 0; i < 5; i++) {
    const clientIdx = randomInt(0, clients.length - 1);
    const client = clients[clientIdx];
    const userIdx = pickUserForQuote();
    const user = users[userIdx];
    const contactId = client.contactIds[0] ?? null;
    const catId = pick(categoryIds);
    const itemCount = randomInt(1, 4);
    const descriptiveText = pick(DESCRIPTIVE_TEXTS);
    extraDay += 3;
    const createdAt = daysAgo(extraDay + 10);
    const items = generateItemData(catalogItems, itemCount, 1.0);
    const total = computeTotal(items);
    const totalCost = computeTotalCost(items);
    const estimated = Math.round(total * 0.85 * 100) / 100;
    const deliveryDate = daysAgo(extraDay + 5);
    const validUntil = daysAgo(extraDay);
    const status = pick([QuoteStatus.DRAFT, QuoteStatus.SENT]);

    const quote = await prisma.quote.create({
      data: {
        quoteNumber: nextQuoteNumber++,
        clientId: client.id,
        contactId,
        categoryId: catId,
        createdById: user.id,
        descriptiveText,
        estimatedPrice: estimated,
        price: status === QuoteStatus.DRAFT ? null : total,
        totalCost,
        status,
        createdAt,
        updatedAt: createdAt,
        deliveryDate,
        validUntil,
        revision: 'A',
        isLatest: true,
      },
    });
    quoteCount++;

    for (const item of items) {
      await prisma.quoteItem.create({
        data: { quoteId: quote.id, ...item },
      });
    }

    await createAuditLogs(quote.id, status, createdAt);
  }

  // ─── 3. PENDING_APPROVAL quotes (price below min margin) ─────────────────
  const marginMin = 25;
  for (let i = 0; i < 5; i++) {
    const clientIdx = randomInt(0, clients.length - 1);
    const client = clients[clientIdx];
    const userIdx = pickUserForQuote();
    const user = users[userIdx];
    const contactId = client.contactIds[0] ?? null;
    const catId = pick(categoryIds);
    const itemCount = randomInt(1, 4);
    const descriptiveText = pick(DESCRIPTIVE_TEXTS);
    extraDay += 2;
    const createdAt = daysAgo(extraDay);
    const items = generateItemData(catalogItems, itemCount, 1.0);
    const totalCost = computeTotalCost(items);
    const marginProposed = randomInt(3, 12);
    const price = Math.round((totalCost / (1 - marginProposed / 100)) * 100) / 100;
    const estimated = Math.round(price * 0.95 * 100) / 100;
    const deliveryDate = daysAgo(extraDay - 5);

    const quote = await prisma.quote.create({
      data: {
        quoteNumber: nextQuoteNumber++,
        clientId: client.id,
        contactId,
        categoryId: catId,
        createdById: user.id,
        descriptiveText,
        estimatedPrice: estimated,
        price,
        totalCost,
        status: QuoteStatus.PENDING_APPROVAL,
        createdAt,
        updatedAt: createdAt,
        deliveryDate,
        revision: 'A',
        isLatest: true,
      },
    });
    quoteCount++;

    for (const item of items) {
      await prisma.quoteItem.create({
        data: { quoteId: quote.id, ...item },
      });
    }

    await createAuditLogs(quote.id, QuoteStatus.PENDING_APPROVAL, createdAt);

    await prisma.approvalRequest.create({
      data: {
        quoteId: quote.id,
        requestedById: user.id,
        status: 'PENDING',
        justification: pick(REJECTION_REASONS),
        marginProposed,
        marginMin,
      },
    });
  }

  // ─── 4. CANCELED with wasProduced ────────────────────────────────────────
  for (let i = 0; i < 3; i++) {
    const clientIdx = randomInt(0, clients.length - 1);
    const client = clients[clientIdx];
    const userIdx = pickUserForQuote();
    const user = users[userIdx];
    const contactId = client.contactIds[0] ?? null;
    const catId = pick(categoryIds);
    const itemCount = randomInt(1, 4);
    const descriptiveText = pick(DESCRIPTIVE_TEXTS);
    extraDay += 2;
    const createdAt = daysAgo(extraDay);
    const items = generateItemData(catalogItems, itemCount, 1.0);
    const total = computeTotal(items);
    const totalCost = computeTotalCost(items);
    const estimated = Math.round(total * 0.85 * 100) / 100;
    const deliveryDate = daysAgo(extraDay - 5);

    const quote = await prisma.quote.create({
      data: {
        quoteNumber: nextQuoteNumber++,
        clientId: client.id,
        contactId,
        categoryId: catId,
        createdById: user.id,
        descriptiveText,
        estimatedPrice: estimated,
        price: total,
        totalCost,
        status: QuoteStatus.CANCELED,
        rejectionReason: pick(REJECTION_REASONS),
        wasProduced: true,
        createdAt,
        updatedAt: createdAt,
        deliveryDate,
        revision: 'A',
        isLatest: true,
      },
    });
    quoteCount++;

    for (const item of items) {
      await prisma.quoteItem.create({
        data: { quoteId: quote.id, ...item },
      });
    }

    await createAuditLogs(quote.id, QuoteStatus.CANCELED, createdAt, quote.rejectionReason, true);
  }

  for (let i = 0; i < 2; i++) {
    const clientIdx = randomInt(0, clients.length - 1);
    const client = clients[clientIdx];
    const userIdx = pickUserForQuote();
    const user = users[userIdx];
    const contactId = client.contactIds[0] ?? null;
    const catId = pick(categoryIds);
    const itemCount = randomInt(1, 4);
    const descriptiveText = pick(DESCRIPTIVE_TEXTS);
    extraDay += 2;
    const createdAt = daysAgo(extraDay);
    const items = generateItemData(catalogItems, itemCount, 1.0);
    const total = computeTotal(items);
    const totalCost = computeTotalCost(items);
    const estimated = Math.round(total * 0.85 * 100) / 100;
    const deliveryDate = daysAgo(extraDay - 5);

    const quote = await prisma.quote.create({
      data: {
        quoteNumber: nextQuoteNumber++,
        clientId: client.id,
        contactId,
        categoryId: catId,
        createdById: user.id,
        descriptiveText,
        estimatedPrice: estimated,
        price: total,
        totalCost,
        status: QuoteStatus.CANCELED,
        rejectionReason: pick(REJECTION_REASONS),
        wasProduced: false,
        createdAt,
        updatedAt: createdAt,
        deliveryDate,
        revision: 'A',
        isLatest: true,
      },
    });
    quoteCount++;

    for (const item of items) {
      await prisma.quoteItem.create({
        data: { quoteId: quote.id, ...item },
      });
    }

    await createAuditLogs(quote.id, QuoteStatus.CANCELED, createdAt, quote.rejectionReason, false);
  }

  // ─── 5. Multi-revision quotes (A→B→C) with snapshots ─────────────────────
  for (let revSet = 0; revSet < 2; revSet++) {
    const clientIdx = randomInt(0, clients.length - 1);
    const client = clients[clientIdx];
    const userIdx = pickUserForQuote();
    const user = users[userIdx];
    const contactId = client.contactIds[0] ?? null;
    const catId = pick(categoryIds);
    const itemCount = randomInt(2, 4);
    const descriptiveText = pick(DESCRIPTIVE_TEXTS);
    const months = randomInt(3, 8);

    const createdAtC = randomDateMonthsAgo(months);
    const itemsC = generateItemData(catalogItems, itemCount, 1.0);
    const totalC = computeTotal(itemsC);
    const totalCostC = computeTotalCost(itemsC);
    const estimatedC = Math.round(totalC * 0.85 * 100) / 100;
    const contractedC = Math.round(totalC * (0.92 + Math.random() * 0.06) * 100) / 100;
    const deliveryDateC = daysAgo(Math.round(months * 30.44) - randomInt(10, 30));

    const quoteC = await prisma.quote.create({
      data: {
        quoteNumber: nextQuoteNumber++,
        clientId: client.id,
        contactId,
        categoryId: catId,
        createdById: user.id,
        descriptiveText,
        estimatedPrice: estimatedC,
        price: totalC,
        totalCost: totalCostC,
        contractedPrice: contractedC,
        status: QuoteStatus.APPROVED,
        createdAt: createdAtC,
        updatedAt: createdAtC,
        deliveryDate: deliveryDateC,
        snapshot: {
          price: Number(totalC),
          estimatedPrice: Number(estimatedC),
          discountPercent: null,
          discountFixed: null,
          deliveryDate: deliveryDateC.toISOString(),
          validUntil: null,
          totalCost: Number(totalCostC),
          items: itemsC.map((i) => ({
            unitPrice: i.unitPrice,
            unitCost: i.unitCost,
            discountPercent: 0,
            quantity: i.quantity,
          })),
        },
        revision: 'C',
        isLatest: true,
      },
    });
    quoteCount++;

    for (const item of itemsC) {
      await prisma.quoteItem.create({
        data: { quoteId: quoteC.id, ...item },
      });
    }

    await createAuditLogs(quoteC.id, QuoteStatus.APPROVED, createdAtC);

    const createdAtB = new Date(createdAtC.getTime() - randomInt(3, 7) * MS_PER_DAY);
    const itemsB = generateItemData(catalogItems, itemCount, 0.95);
    const totalB = computeTotal(itemsB);
    const totalCostB = computeTotalCost(itemsB);
    const estimatedB = Math.round(totalB * 0.85 * 100) / 100;
    const deliveryDateB = daysAgo(Math.round(months * 30.44) - randomInt(10, 30));

    const quoteB = await prisma.quote.create({
      data: {
        quoteNumber: quoteC.quoteNumber,
        clientId: client.id,
        contactId,
        categoryId: catId,
        createdById: user.id,
        descriptiveText,
        estimatedPrice: estimatedB,
        price: totalB,
        totalCost: totalCostB,
        status: QuoteStatus.SUPERSEDED,
        createdAt: createdAtB,
        updatedAt: createdAtB,
        deliveryDate: deliveryDateB,
        snapshot: {
          price: Number(totalB),
          estimatedPrice: Number(estimatedB),
          discountPercent: null,
          discountFixed: null,
          deliveryDate: deliveryDateB.toISOString(),
          validUntil: null,
          totalCost: Number(totalCostB),
          items: itemsB.map((i) => ({
            unitPrice: i.unitPrice,
            unitCost: i.unitCost,
            discountPercent: 0,
            quantity: i.quantity,
          })),
        },
        revision: 'B',
        isLatest: false,
      },
    });
    quoteCount++;

    for (const item of itemsB) {
      await prisma.quoteItem.create({
        data: { quoteId: quoteB.id, ...item },
      });
    }

    await createAuditLogs(quoteB.id, QuoteStatus.SUPERSEDED, createdAtB);

    const createdAtA = new Date(createdAtB.getTime() - randomInt(2, 4) * MS_PER_DAY);
    const itemsA = generateItemData(catalogItems, itemCount, 0.9);
    const totalA = computeTotal(itemsA);
    const totalCostA = computeTotalCost(itemsA);
    const estimatedA = Math.round(totalA * 0.85 * 100) / 100;
    const deliveryDateA = daysAgo(Math.round(months * 30.44) - randomInt(10, 30));

    const quoteA = await prisma.quote.create({
      data: {
        quoteNumber: quoteC.quoteNumber,
        clientId: client.id,
        contactId,
        categoryId: catId,
        createdById: user.id,
        descriptiveText,
        estimatedPrice: estimatedA,
        price: totalA,
        totalCost: totalCostA,
        status: QuoteStatus.SUPERSEDED,
        createdAt: createdAtA,
        updatedAt: createdAtA,
        deliveryDate: deliveryDateA,
        snapshot: {
          price: Number(totalA),
          estimatedPrice: Number(estimatedA),
          discountPercent: null,
          discountFixed: null,
          deliveryDate: deliveryDateA.toISOString(),
          validUntil: null,
          totalCost: Number(totalCostA),
          items: itemsA.map((i) => ({
            unitPrice: i.unitPrice,
            unitCost: i.unitCost,
            discountPercent: 0,
            quantity: i.quantity,
          })),
        },
        revision: 'A',
        isLatest: false,
      },
    });
    quoteCount++;

    for (const item of itemsA) {
      await prisma.quoteItem.create({
        data: { quoteId: quoteA.id, ...item },
      });
    }

    await createAuditLogs(quoteA.id, QuoteStatus.SUPERSEDED, createdAtA);
  }

  // ─── 6. Quotes with future delivery dates ─────────────────────────────────
  for (let i = 0; i < 3; i++) {
    const clientIdx = randomInt(0, clients.length - 1);
    const client = clients[clientIdx];
    const userIdx = pickUserForQuote();
    const user = users[userIdx];
    const contactId = client.contactIds[0] ?? null;
    const catId = pick(categoryIds);
    const itemCount = randomInt(1, 4);
    const descriptiveText = pick(DESCRIPTIVE_TEXTS);
    extraDay += 2;
    const createdAt = daysAgo(extraDay);
    const items = generateItemData(catalogItems, itemCount, 1.0);
    const total = computeTotal(items);
    const totalCost = computeTotalCost(items);
    const estimated = Math.round(total * 0.85 * 100) / 100;
    const deliveryDate = new Date(Date.now() + randomInt(15, 60) * MS_PER_DAY);
    const status = pick([QuoteStatus.DRAFT, QuoteStatus.PENDING_APPROVAL, QuoteStatus.SENT]);

    const quote = await prisma.quote.create({
      data: {
        quoteNumber: nextQuoteNumber++,
        clientId: client.id,
        contactId,
        categoryId: catId,
        createdById: user.id,
        descriptiveText,
        estimatedPrice: estimated,
        price: status === QuoteStatus.DRAFT ? null : total,
        totalCost,
        status,
        createdAt,
        updatedAt: createdAt,
        deliveryDate,
        revision: 'A',
        isLatest: true,
      },
    });
    quoteCount++;

    for (const item of items) {
      await prisma.quoteItem.create({
        data: { quoteId: quote.id, ...item },
      });
    }

    await createAuditLogs(quote.id, status, createdAt);
  }

  // ─── 7. Quotes with validUntil dates ──────────────────────────────────────
  for (let i = 0; i < 5; i++) {
    const clientIdx = randomInt(0, clients.length - 1);
    const client = clients[clientIdx];
    const userIdx = pickUserForQuote();
    const user = users[userIdx];
    const contactId = client.contactIds[0] ?? null;
    const catId = pick(categoryIds);
    const itemCount = randomInt(1, 4);
    const descriptiveText = pick(DESCRIPTIVE_TEXTS);
    extraDay += 2;
    const createdAt = daysAgo(extraDay);
    const items = generateItemData(catalogItems, itemCount, 1.0);
    const total = computeTotal(items);
    const totalCost = computeTotalCost(items);
    const estimated = Math.round(total * 0.85 * 100) / 100;
    const deliveryDate = daysAgo(extraDay - 5);
    const validUntil = new Date(deliveryDate.getTime() + randomInt(15, 45) * MS_PER_DAY);
    const status = pick([QuoteStatus.SENT, QuoteStatus.APPROVED, QuoteStatus.DRAFT]);
    const contractedPrice =
      status === QuoteStatus.APPROVED
        ? Math.round(total * (0.92 + Math.random() * 0.06) * 100) / 100
        : null;

    const quote = await prisma.quote.create({
      data: {
        quoteNumber: nextQuoteNumber++,
        clientId: client.id,
        contactId,
        categoryId: catId,
        createdById: user.id,
        descriptiveText,
        estimatedPrice: estimated,
        price: total,
        totalCost,
        contractedPrice,
        status,
        createdAt,
        updatedAt: createdAt,
        deliveryDate,
        validUntil,
        revision: 'A',
        isLatest: true,
      },
    });
    quoteCount++;

    for (const item of items) {
      await prisma.quoteItem.create({
        data: { quoteId: quote.id, ...item },
      });
    }

    await createAuditLogs(quote.id, quote.status, createdAt);
  }

  console.log(`✅ ${quoteCount} quotes created.`);

  // ─── System Configs ───────────────────────────────────────────
  const systemConfigs = [
    { key: 'DEFAULT_MARKUP_MARGIN', value: { value: 25 } },
    { key: 'JACCARD_THRESHOLD', value: { threshold: 0.75 } },
    { key: 'SEARCH_WEIGHTS', value: { descriptiveText: 1.0, clientName: 0.5 } },
    { key: 'EMPRESA_NOME', value: 'Metalúrgica Modelo Ltda' },
    { key: 'EMPRESA_CNPJ', value: '11.222.333/0001-44' },
    { key: 'EMPRESA_TELEFONE', value: '(11) 3333-4444' },
    { key: 'EMPRESA_EMAIL', value: 'contato@metalurgicamodelo.com.br' },
    { key: 'EMPRESA_ENDERECO', value: 'Rua da Indústria, 500 - São Paulo - SP' },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.create({
      data: { key: config.key, value: config.value as any },
    });
  }

  await prisma.companyConfig.create({
    data: {
      companyName: 'Metalúrgica Modelo Ltda',
      document: '11.222.333/0001-44',
      phone: '(11) 3333-4444',
      email: 'contato@metalurgicamodelo.com.br',
      address: 'Rua da Indústria, 500 - São Paulo - SP',
    },
  });

  console.log('✅ Configs created.');
  console.log('🌱 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
