-- Добавление полей для ссылки на КП и примечания в таблицу boq_items
-- Позволяет сохранять ссылки на коммерческие предложения и примечания к элементам BOQ

-- Добавляем поле для ссылки на коммерческое предложение
ALTER TABLE boq_items 
ADD COLUMN IF NOT EXISTS quote_link TEXT DEFAULT NULL;

-- Добавляем поле для примечания
ALTER TABLE boq_items 
ADD COLUMN IF NOT EXISTS note TEXT DEFAULT NULL;

-- Добавляем комментарии к полям для документации
COMMENT ON COLUMN boq_items.quote_link IS 'Ссылка на коммерческое предложение (URL или текст)';
COMMENT ON COLUMN boq_items.note IS 'Примечание к элементу BOQ';

-- Индексы для поиска по полям (опционально)
CREATE INDEX IF NOT EXISTS idx_boq_items_quote_link ON boq_items(quote_link) WHERE quote_link IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_boq_items_note ON boq_items USING gin(to_tsvector('russian', note)) WHERE note IS NOT NULL;