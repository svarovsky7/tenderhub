-- Добавление полей для хранения валютной информации в таблицу boq_items
-- Позволяет сохранять исходную валюту и цену, а также курс конвертации

-- Добавляем поле типа валюты (по умолчанию RUB)
ALTER TABLE boq_items 
ADD COLUMN IF NOT EXISTS currency_type VARCHAR(3) DEFAULT 'RUB' 
CHECK (currency_type IN ('RUB', 'USD', 'EUR', 'CNY'));

-- Добавляем поле для хранения исходной цены в валюте
-- NULL для рублевых позиций
ALTER TABLE boq_items 
ADD COLUMN IF NOT EXISTS currency_price NUMERIC DEFAULT NULL;

-- Добавляем поле для хранения курса валюты на момент создания/изменения
-- NULL для рублевых позиций
ALTER TABLE boq_items 
ADD COLUMN IF NOT EXISTS currency_rate NUMERIC DEFAULT NULL;

-- Добавляем комментарии к полям для документации
COMMENT ON COLUMN boq_items.currency_type IS 'Тип валюты: RUB (рубль), USD (доллар), EUR (евро), CNY (юань)';
COMMENT ON COLUMN boq_items.currency_price IS 'Исходная цена в указанной валюте (NULL для рублей)';
COMMENT ON COLUMN boq_items.currency_rate IS 'Курс валюты к рублю на момент создания/изменения (NULL для рублей)';

-- Индекс для быстрой фильтрации по типу валюты
CREATE INDEX IF NOT EXISTS idx_boq_items_currency_type ON boq_items(currency_type);