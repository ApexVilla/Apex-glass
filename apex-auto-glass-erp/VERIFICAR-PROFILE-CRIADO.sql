-- 🔍 VERIFICAR SE O PROFILE FOI CRIADO
-- Execute este SQL para verificar se o profile do usuário existe

-- Substitua o email pelo email que você usou no cadastro
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.company_id,
  p.role,
  c.name as company_name
FROM public.profiles p
LEFT JOIN public.companies c ON c.id = p.company_id
WHERE p.email = 'villarroelsamir85@gmail.com';

-- Se não retornar nada, o profile não foi criado!
-- Nesse caso, você precisa criar manualmente ou recadastrar a empresa.

