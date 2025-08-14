-- Добавление каскадного удаления для связей работ и материалов
-- Когда материал удаляется, все связи с ним также должны быть удалены

-- Сначала удаляем существующий constraint
ALTER TABLE public.work_material_links 
DROP CONSTRAINT IF EXISTS fk_work_material_links_material;

-- Добавляем constraint с каскадным удалением
ALTER TABLE public.work_material_links 
ADD CONSTRAINT fk_work_material_links_material 
FOREIGN KEY (material_boq_item_id) 
REFERENCES public.boq_items(id) 
ON DELETE CASCADE;

-- Также обновляем constraint для работ (на всякий случай)
ALTER TABLE public.work_material_links 
DROP CONSTRAINT IF EXISTS fk_work_material_links_work;

ALTER TABLE public.work_material_links 
ADD CONSTRAINT fk_work_material_links_work 
FOREIGN KEY (work_boq_item_id) 
REFERENCES public.boq_items(id) 
ON DELETE CASCADE;

-- Добавляем комментарий
COMMENT ON CONSTRAINT fk_work_material_links_material ON public.work_material_links 
IS 'Каскадное удаление связей при удалении материала';

COMMENT ON CONSTRAINT fk_work_material_links_work ON public.work_material_links 
IS 'Каскадное удаление связей при удалении работы';