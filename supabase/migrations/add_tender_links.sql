-- Add new link fields to tenders table
-- Date: 2025-09-26

-- Add upload folder field
ALTER TABLE public.tenders
ADD COLUMN IF NOT EXISTS upload_folder text;

-- Add BSM link field
ALTER TABLE public.tenders
ADD COLUMN IF NOT EXISTS bsm_link text;

-- Add TZ clarification link field
ALTER TABLE public.tenders
ADD COLUMN IF NOT EXISTS tz_clarification_link text;

-- Add QA form link field
ALTER TABLE public.tenders
ADD COLUMN IF NOT EXISTS qa_form_link text;

-- Add comments for new fields
COMMENT ON COLUMN public.tenders.upload_folder IS 'Папка для загрузки КП';
COMMENT ON COLUMN public.tenders.bsm_link IS 'Ссылка на БСМ';
COMMENT ON COLUMN public.tenders.tz_clarification_link IS 'Ссылка на уточнение по ТЗ';
COMMENT ON COLUMN public.tenders.qa_form_link IS 'Ссылка на форму вопрос-ответ';