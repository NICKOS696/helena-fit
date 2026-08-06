-- Абсолютные ссылки на картинки -> относительные /uploads/...
-- (домен helena-fit.ru умер, относительные работают с любого домена)
BEGIN;

UPDATE recipe_collections SET "coverImage" = replace("coverImage", 'https://helena-fit.ru/uploads/', '/uploads/') WHERE "coverImage" LIKE '%helena-fit.ru/uploads/%';
UPDATE workout_collections SET "coverImage" = replace("coverImage", 'https://helena-fit.ru/uploads/', '/uploads/') WHERE "coverImage" LIKE '%helena-fit.ru/uploads/%';
UPDATE recipes SET "coverImage" = replace("coverImage", 'https://helena-fit.ru/uploads/', '/uploads/') WHERE "coverImage" LIKE '%helena-fit.ru/uploads/%';
UPDATE workouts SET "coverImage" = replace("coverImage", 'https://helena-fit.ru/uploads/', '/uploads/') WHERE "coverImage" LIKE '%helena-fit.ru/uploads/%';
UPDATE workout_section_items SET "coverImage" = replace("coverImage", 'https://helena-fit.ru/uploads/', '/uploads/') WHERE "coverImage" LIKE '%helena-fit.ru/uploads/%';
-- Rich-text: картинки внутри HTML-контента
UPDATE workout_section_items SET content = replace(content, 'https://helena-fit.ru/uploads/', '/uploads/') WHERE content LIKE '%helena-fit.ru/uploads/%';
UPDATE news SET "bannerImage" = replace("bannerImage", 'https://helena-fit.ru/uploads/', '/uploads/') WHERE "bannerImage" LIKE '%helena-fit.ru/uploads/%';
UPDATE news SET content = replace(content, 'https://helena-fit.ru/uploads/', '/uploads/') WHERE content LIKE '%helena-fit.ru/uploads/%';
UPDATE broadcasts SET "imageUrl" = replace("imageUrl", 'https://helena-fit.ru/uploads/', '/uploads/') WHERE "imageUrl" LIKE '%helena-fit.ru/uploads/%';

COMMIT;

-- Контроль: что осталось со старым доменом в путях загрузок
SELECT 'recipe_collections' t, count(*) FROM recipe_collections WHERE "coverImage" LIKE '%helena-fit.ru/uploads/%'
UNION ALL SELECT 'workout_collections', count(*) FROM workout_collections WHERE "coverImage" LIKE '%helena-fit.ru/uploads/%'
UNION ALL SELECT 'recipes', count(*) FROM recipes WHERE "coverImage" LIKE '%helena-fit.ru/uploads/%'
UNION ALL SELECT 'workouts', count(*) FROM workouts WHERE "coverImage" LIKE '%helena-fit.ru/uploads/%'
UNION ALL SELECT 'section_items_cover', count(*) FROM workout_section_items WHERE "coverImage" LIKE '%helena-fit.ru/uploads/%'
UNION ALL SELECT 'section_items_content', count(*) FROM workout_section_items WHERE content LIKE '%helena-fit.ru/uploads/%'
UNION ALL SELECT 'news_banner', count(*) FROM news WHERE "bannerImage" LIKE '%helena-fit.ru/uploads/%'
UNION ALL SELECT 'news_content', count(*) FROM news WHERE content LIKE '%helena-fit.ru/uploads/%';
