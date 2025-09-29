-- Добавляем дополнительные колонки в таблицу tender_version_mappings для хранения данных позиций

-- Добавляем колонки для старой позиции
ALTER TABLE tender_version_mappings
ADD COLUMN IF NOT EXISTS old_volume NUMERIC,
ADD COLUMN IF NOT EXISTS old_unit TEXT,
ADD COLUMN IF NOT EXISTS old_client_note TEXT,
ADD COLUMN IF NOT EXISTS old_item_no TEXT;

-- Добавляем колонки для новой позиции
ALTER TABLE tender_version_mappings
ADD COLUMN IF NOT EXISTS new_volume NUMERIC,
ADD COLUMN IF NOT EXISTS new_unit TEXT,
ADD COLUMN IF NOT EXISTS new_client_note TEXT,
ADD COLUMN IF NOT EXISTS new_item_no TEXT;

-- Комментарии к новым колонкам
COMMENT ON COLUMN tender_version_mappings.old_volume IS 'Объем работ в старой версии';
COMMENT ON COLUMN tender_version_mappings.old_unit IS 'Единица измерения в старой версии';
COMMENT ON COLUMN tender_version_mappings.old_client_note IS 'Примечание заказчика в старой версии';
COMMENT ON COLUMN tender_version_mappings.old_item_no IS 'Номер позиции в старой версии';

COMMENT ON COLUMN tender_version_mappings.new_volume IS 'Объем работ в новой версии';
COMMENT ON COLUMN tender_version_mappings.new_unit IS 'Единица измерения в новой версии';
COMMENT ON COLUMN tender_version_mappings.new_client_note IS 'Примечание заказчика в новой версии';
COMMENT ON COLUMN tender_version_mappings.new_item_no IS 'Номер позиции в новой версии';