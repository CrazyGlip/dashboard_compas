-- ==============================================================================
-- План настройки Многоролевой Модели (RBAC) и RLS "Карьерный Компас"
-- Выполните этот скрипт в SQL Editor панели Supabase.
-- ==============================================================================

-- 1. Таблица для хранения ролей пользователей
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin', 'news_editor', 'content_editor'])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT unq_user_role UNIQUE(user_id)
);

-- 2. Функции проверки ролей
-- Проверяет, является ли пользователь супер-админом
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Проверяет, является ли пользователь редактором новостей
CREATE OR REPLACE FUNCTION public.is_news_editor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'news_editor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Проверяет, является ли пользователь контент-менеджером
CREATE OR REPLACE FUNCTION public.is_content_editor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'content_editor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Включаем RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.top_professions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;


-- 4. Политики (Policies)

-- USER_ROLES (Читать могут все админы, управлять только Super Admin)
CREATE POLICY "Admins can view roles" ON public.user_roles FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.is_admin());

-- COLLEGES, SPECIALTIES, PROFESSION, TAGS, QUIZZES (Content Editor + Admin)
CREATE POLICY "Public read colleges" ON public.colleges FOR SELECT USING (true);
CREATE POLICY "Editors manage colleges" ON public.colleges FOR ALL USING (public.is_content_editor());

CREATE POLICY "Public read specialties" ON public.specialties FOR SELECT USING (true);
CREATE POLICY "Editors manage specialties" ON public.specialties FOR ALL USING (public.is_content_editor());

CREATE POLICY "Public read top_professions" ON public.top_professions FOR SELECT USING (true);
CREATE POLICY "Editors manage top_professions" ON public.top_professions FOR ALL USING (public.is_content_editor());

CREATE POLICY "Public read tags" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Editors manage tags" ON public.tags FOR ALL USING (public.is_content_editor());

CREATE POLICY "Public read quizzes" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Editors manage quizzes" ON public.quizzes FOR ALL USING (public.is_content_editor());

CREATE POLICY "Public read q_questions" ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "Editors manage q_questions" ON public.quiz_questions FOR ALL USING (public.is_content_editor());

CREATE POLICY "Public read q_answers" ON public.quiz_answers FOR SELECT USING (true);
CREATE POLICY "Editors manage q_answers" ON public.quiz_answers FOR ALL USING (public.is_content_editor());

-- EVENTS & SHORTS (Content Editor + Admin) -> Дни открытых дверей и видео
CREATE POLICY "Public read events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Editors manage events" ON public.events FOR ALL USING (public.is_content_editor());

CREATE POLICY "Public read shorts" ON public.shorts FOR SELECT USING (true);
CREATE POLICY "Editors manage shorts" ON public.shorts FOR ALL USING (public.is_content_editor());


-- NEWS (News Editor + Admin)
CREATE POLICY "Public read news" ON public.news FOR SELECT USING (true);
CREATE POLICY "News editors manage news" ON public.news FOR ALL USING (public.is_news_editor());


-- 5. Политики для Storage (Бакет career-compass-media. Должен быть создан в Supabase Storage + Public)
CREATE POLICY "Public Access Storage"
ON storage.objects FOR SELECT
USING ( bucket_id = 'career-compass-media' );

CREATE POLICY "Upload Auth Access"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'career-compass-media' AND auth.uid() IS NOT NULL );

CREATE POLICY "Update Auth Access"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'career-compass-media' AND auth.uid() IS NOT NULL );

CREATE POLICY "Delete Auth Access"
ON storage.objects FOR DELETE
USING ( bucket_id = 'career-compass-media' AND auth.uid() IS NOT NULL );

-- Примечание по Storage: 
-- Более секьюрный вариант - разрешать загрузку только тем, 
-- кто есть в таблице user_roles, но для простоты мы оставили 'auth.uid() IS NOT NULL'.
