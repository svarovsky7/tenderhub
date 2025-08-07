-- Добавляет поле manual_volume для ручного ввода объема работ
ALTER TABLE public.client_positions
  ADD COLUMN IF NOT EXISTS manual_volume numeric(12,4);

COMMENT ON COLUMN public.client_positions.manual_volume IS 'Объем работ, заданный вручную';
