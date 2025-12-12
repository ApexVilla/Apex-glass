-- 🔍 QUERY SIMPLES PARA VERIFICAR PROFILE
-- Execute este SQL sem JOIN primeiro

-- Ver todos os profiles (sem JOIN)
SELECT * 
FROM public.profiles 
WHERE email = 'villarroelsamir85@gmail.com';

-- Se funcionar, verifique quais colunas existem:
SELECT 
  id,
  email,
  full_name,
  role
FROM public.profiles 
WHERE email = 'villarroelsamir85@gmail.com';

