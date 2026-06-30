CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE INDEX IF NOT EXISTS idx_clients_name_trgm ON "clients" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_document_trgm ON "clients" USING gin ("document" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_address_trgm ON "clients" USING gin ("address" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_client_contacts_name_trgm ON "client_contacts" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_client_contacts_phone_trgm ON "client_contacts" USING gin ("phone" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_client_contacts_email_trgm ON "client_contacts" USING gin ("email" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_quotes_descriptive_text_trgm ON "quotes" USING gin ("descriptiveText" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_quotes_network_file_path_trgm ON "quotes" USING gin ("networkFilePath" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_quote_items_project_trgm ON "quote_items" USING gin ("project" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_quote_items_description_trgm ON "quote_items" USING gin ("description" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_standard_drawings_code_trgm ON "standard_drawings" USING gin ("code" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_standard_drawings_name_trgm ON "standard_drawings" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_standard_drawings_description_trgm ON "standard_drawings" USING gin ("description" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_categories_name_trgm ON "categories" USING gin ("name" gin_trgm_ops);
