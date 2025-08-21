-- Добавление поля manual_note в таблицу client_positions
-- Поле для хранения примечания генподрядчика

ALTER TABLE public.client_positions 
ADD COLUMN IF NOT EXISTS manual_note TEXT;

-- Добавляем комментарий к новому полю
COMMENT ON COLUMN public.client_positions.manual_note IS 'Примечание генподрядчика (заполняется вручную)';