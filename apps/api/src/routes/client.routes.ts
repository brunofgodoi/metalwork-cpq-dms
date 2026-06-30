import { Router } from 'express';
import { ClientController } from '../controllers/ClientController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { z } from 'zod';

const createClientSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'O nome do cliente deve ter pelo menos 2 caracteres.'),
    document: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    contacts: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string().min(2, 'O nome do contato deve ter pelo menos 2 caracteres.'),
          phone: z.string().optional().nullable(),
          email: z.string().email('Email inválido.').or(z.literal('')).optional().nullable(),
          isActive: z.boolean().optional(),
        }),
      )
      .optional(),
  }),
});

const createContactSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'O nome do contato deve ter pelo menos 2 caracteres.'),
    phone: z.string().optional().nullable(),
    email: z.string().email('Email inválido.').or(z.literal('')).optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});

const updateClientSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'O nome do cliente deve ter pelo menos 2 caracteres.').optional(),
    document: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    contacts: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string().min(2, 'O nome do contato deve ter pelo menos 2 caracteres.').optional(),
          phone: z.string().optional().nullable(),
          email: z.string().email('Email inválido.').or(z.literal('')).optional().nullable(),
          isActive: z.boolean().optional(),
        }),
      )
      .optional(),
  }),
});

const updateContactSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'O nome do contato deve ter pelo menos 2 caracteres.').optional(),
    phone: z.string().optional().nullable(),
    email: z.string().email('Email inválido.').or(z.literal('')).optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});

export const clientRoutes: Router = Router();
const controller = new ClientController();

clientRoutes.use(authMiddleware);

// Client CRUD
clientRoutes.post('/', validateRequest(createClientSchema), controller.create);
clientRoutes.get('/', controller.list);
clientRoutes.get('/:id', controller.getById);
clientRoutes.put('/:id', validateRequest(updateClientSchema), controller.update);
clientRoutes.patch('/:id/restore', controller.restore);
clientRoutes.delete('/:id', controller.delete);

// Client Contacts
clientRoutes.post('/:id/contacts', validateRequest(createContactSchema), controller.addContact);
clientRoutes.put(
  '/contacts/:contactId',
  validateRequest(updateContactSchema),
  controller.updateContact,
);
clientRoutes.delete('/contacts/:contactId', controller.removeContact);
clientRoutes.patch('/contacts/:contactId/restore', controller.restoreContact);
