-- Создание таблицы для шаблонов работ и материалов
CREATE TABLE IF NOT EXISTS public.work_material_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(255) NOT NULL,
  template_description TEXT,

  -- Работа (одна из двух)
  work_library_id UUID REFERENCES public.works_library(id) ON DELETE CASCADE,
  sub_work_library_id UUID REFERENCES public.works_library(id) ON DELETE CASCADE,

  -- Материал (один из двух)
  material_library_id UUID REFERENCES public.materials_library(id) ON DELETE CASCADE,
  sub_material_library_id UUID REFERENCES public.materials_library(id) ON DELETE CASCADE,

  -- Коэффициенты и настройки
  conversion_coefficient DECIMAL(10,4) DEFAULT 1.0 NOT NULL,
  is_linked_to_work BOOLEAN DEFAULT true NOT NULL,
  notes TEXT,

  -- Метки времени
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Ограничения
  CONSTRAINT work_material_templates_work_check
    CHECK ((work_library_id IS NOT NULL AND sub_work_library_id IS NULL) OR
           (work_library_id IS NULL AND sub_work_library_id IS NOT NULL)),

  CONSTRAINT work_material_templates_material_check
    CHECK ((material_library_id IS NOT NULL AND sub_material_library_id IS NULL) OR
           (material_library_id IS NULL AND sub_material_library_id IS NOT NULL))
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_work_material_templates_template_name
  ON public.work_material_templates(template_name);

CREATE INDEX IF NOT EXISTS idx_work_material_templates_work_library_id
  ON public.work_material_templates(work_library_id);

CREATE INDEX IF NOT EXISTS idx_work_material_templates_sub_work_library_id
  ON public.work_material_templates(sub_work_library_id);

CREATE INDEX IF NOT EXISTS idx_work_material_templates_material_library_id
  ON public.work_material_templates(material_library_id);

CREATE INDEX IF NOT EXISTS idx_work_material_templates_sub_material_library_id
  ON public.work_material_templates(sub_material_library_id);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_work_material_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_material_templates_updated_at_trigger
  BEFORE UPDATE ON public.work_material_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_work_material_templates_updated_at();

-- Комментарии к таблице и полям
COMMENT ON TABLE public.work_material_templates IS 'Шаблоны работ с привязанными материалами для быстрого добавления в BOQ';
COMMENT ON COLUMN public.work_material_templates.template_name IS 'Название шаблона (группирующее поле)';
COMMENT ON COLUMN public.work_material_templates.template_description IS 'Описание шаблона';
COMMENT ON COLUMN public.work_material_templates.work_library_id IS 'Ссылка на работу из библиотеки';
COMMENT ON COLUMN public.work_material_templates.sub_work_library_id IS 'Ссылка на суб-работу из библиотеки';
COMMENT ON COLUMN public.work_material_templates.material_library_id IS 'Ссылка на материал из библиотеки';
COMMENT ON COLUMN public.work_material_templates.sub_material_library_id IS 'Ссылка на суб-материал из библиотеки';
COMMENT ON COLUMN public.work_material_templates.conversion_coefficient IS 'Коэффициент перевода материала';
COMMENT ON COLUMN public.work_material_templates.is_linked_to_work IS 'Привязан ли материал к работе (создавать ли work_material_links при вставке)';
COMMENT ON COLUMN public.work_material_templates.notes IS 'Примечания к элементу шаблона';