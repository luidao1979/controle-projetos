-- Opcional: projetos iniciais. Troque o e-mail pelo do seu usuário criado no Auth.
with u as (select id from auth.users where email = 'SEU-EMAIL@gmail.com')
insert into public.projetos (owner_id, nome, cliente, conta, tipo, margem, links)
select u.id, x.nome, x.cliente, 'Pessoal', x.tipo, x.margem, x.links::jsonb from u, (values
  ('Laola','Igor','Sistema',30,'[]'),
  ('Vitrine B2B/B2C','Ricardo','Sistema',30,'[]'),
  ('Raquetes Mormaii','Mormaii','Arte gráfica',30,'[]'),
  ('PlayTerapya','Próprio','Sistema',0,'[{"label":"Site","url":"https://playterapya.com.br"},{"label":"Supabase","url":"https://axlfxqwcebtrglitegrt.supabase.co"}]'),
  ('Boteco da Geh','','Sistema',30,'[]')
) as x(nome, cliente, tipo, margem, links);
