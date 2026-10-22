-- Testes das regras de negócio do banco. Rodar depois da migração, do
-- seed.sql e do seed_demo.sql (o script `npm run test:db` faz tudo).
-- Cada bloco levanta uma exceção se a regra for violada.

\set ON_ERROR_STOP on

grant usage on schema public to authenticated;
grant select, insert, update on all tables in schema public to authenticated;

-- Pessoas de teste: dois estudantes de polos diferentes e um coordenador.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c'),
  ('00000000-0000-0000-0000-0000000000fe'),
  ('00000000-0000-0000-0000-0000000000ff');

insert into perfis (id, nome, vinculo, polo_id, papel, is_demo)
select '00000000-0000-0000-0000-00000000000a', 'Estudante Ibura', 'rede', id, 'estudante', true
  from polos where bairro = 'Ibura';
insert into perfis (id, nome, vinculo, polo_id, papel, is_demo)
select '00000000-0000-0000-0000-00000000000b', 'Estudante Pina', 'rede', id, 'estudante', true
  from polos where bairro = 'Pina';
insert into perfis (id, nome, vinculo, polo_id, papel, is_demo)
select '00000000-0000-0000-0000-00000000000c', 'Coordenação Ibura', 'rede', id, 'coord_polo', true
  from polos where bairro = 'Ibura';

-- 1. Estudante da Rede precisa de polo; de outro cursinho precisa do nome.
do $$
begin
  begin
    insert into perfis (id, nome, vinculo) values ('00000000-0000-0000-0000-0000000000fe', 'Sem polo', 'rede');
    raise exception 'FALHOU: aceitou estudante da Rede sem polo';
  exception when check_violation then null;
  end;
end $$;

-- 2. Fluxo do estudante A: inicia, responde, entrega.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);

-- psql não substitui variáveis dentro de blocos DO, então o id vai numa configuração da sessão.
select set_config('teste.tentativa', iniciar_tentativa(id)::text, false) from simulados where is_demo;

do $$
begin
  if (select count(*) from questoes_da_tentativa(current_setting('teste.tentativa')::uuid)) <> 5 then
    raise exception 'FALHOU: a tentativa deveria ter 5 questões';
  end if;
end $$;

-- O estudante não lê o banco de questões (onde está o gabarito).
do $$
begin
  if exists (select 1 from questao_versoes) then
    raise exception 'FALHOU: estudante conseguiu ler questao_versoes (gabarito)';
  end if;
end $$;

-- Retomada: iniciar de novo devolve a mesma tentativa.
do $$
begin
  if iniciar_tentativa((select id from simulados where is_demo)) <> current_setting('teste.tentativa')::uuid then
    raise exception 'FALHOU: iniciar de novo criou outra tentativa';
  end if;
end $$;

-- Responde: questão 1 certa (B), questão 2 errada (A), questão 3 marcada e
-- depois apagada (em branco), questões 4 e 5 sem resposta.
insert into respostas (tentativa_id, questao_versao_id, alternativa)
select current_setting('teste.tentativa')::uuid, questao_versao_id,
       case ordem when 1 then 'B'::alternativa when 2 then 'A' when 3 then 'C' end
  from questoes_da_tentativa(current_setting('teste.tentativa')::uuid) where ordem <= 3;
update respostas set alternativa = null
 where tentativa_id = current_setting('teste.tentativa')::uuid
   and questao_versao_id = (select questao_versao_id from questoes_da_tentativa(current_setting('teste.tentativa')::uuid) where ordem = 3);

do $$
declare
  t tentativas := entregar_tentativa(current_setting('teste.tentativa')::uuid);
begin
  if (t.acertos, t.erros, t.em_branco, t.total) <> (1, 1, 3, 5) then
    raise exception 'FALHOU: placar % acertos, % erros, % em branco, % total',
      t.acertos, t.erros, t.em_branco, t.total;
  end if;
  if t.percentual <> 20.0 or t.status <> 'entregue' then
    raise exception 'FALHOU: percentual % / status %', t.percentual, t.status;
  end if;
end $$;

-- 3. Depois da entrega, as respostas ficam travadas.
update respostas set alternativa = 'B' where tentativa_id = current_setting('teste.tentativa')::uuid;
do $$
begin
  if exists (select 1 from respostas where tentativa_id = current_setting('teste.tentativa')::uuid and alternativa = 'A') is not true then
    raise exception 'FALHOU: resposta alterada depois da entrega';
  end if;
end $$;

-- Entregar de novo não muda nada.
do $$
begin
  if (entregar_tentativa(current_setting('teste.tentativa')::uuid)).acertos <> 1 then
    raise exception 'FALHOU: segunda entrega alterou o placar';
  end if;
end $$;

-- 4. O estudante B não vê a tentativa do estudante A.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$
begin
  if exists (select 1 from tentativas) then
    raise exception 'FALHOU: estudante viu tentativa de outra pessoa';
  end if;
  if exists (select 1 from questoes_da_tentativa(current_setting('teste.tentativa')::uuid)) then
    raise exception 'FALHOU: estudante leu questões da tentativa de outra pessoa';
  end if;
end $$;

-- 5. A coordenação do Ibura vê o estudante do Ibura e não vê o do Pina.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
do $$
begin
  if not exists (select 1 from tentativas where id = current_setting('teste.tentativa')::uuid) then
    raise exception 'FALHOU: coordenação não viu tentativa do próprio polo';
  end if;
  if exists (select 1 from perfis where nome = 'Estudante Pina') then
    raise exception 'FALHOU: coordenação viu estudante de outro polo';
  end if;
end $$;

-- 6. Ninguém se cadastra como admin.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ff', false);
do $$
begin
  begin
    insert into perfis (id, nome, vinculo, papel) values
      ('00000000-0000-0000-0000-0000000000ff', 'Espertinho', 'independente', 'admin');
    raise exception 'FALHOU: cadastro como admin foi aceito';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
\echo 'Todos os testes do banco passaram.'
