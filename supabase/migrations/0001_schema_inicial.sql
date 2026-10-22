-- Simula Alcides: esquema inicial (Etapa 1)
--
-- Decisões que guiam este arquivo (ver docs/planejamento.md):
-- * Toda prova aponta para uma VERSÃO congelada da questão. Corrigir um
--   gabarito cria uma versão nova e nunca altera resultados antigos.
-- * O gabarito nunca chega ao navegador durante a prova: estudantes leem as
--   questões por `questoes_da_tentativa` e entregam por `entregar_tentativa`.
-- * Coordenador de polo só enxerga o próprio polo (Row Level Security).
-- * Dados de demonstração ficam marcados com `is_demo`.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type vinculo_tipo as enum ('rede', 'outro_cursinho', 'independente');
create type papel_tipo as enum ('estudante', 'professor', 'coord_polo', 'admin');
create type origem_questao as enum ('enem_oficial', 'autoral', 'autorizada', 'ia');
create type status_questao as enum ('rascunho', 'em_revisao', 'publicada', 'arquivada');
create type modalidade_simulado as enum (
  'completo_dia1', 'completo_dia2', 'rapido', 'area', 'recuperacao', 'redacao'
);
create type tipo_simulado as enum ('oficial', 'livre');
create type liberacao_resultado as enum ('imediata', 'apos_fechamento', 'manual');
create type status_tentativa as enum ('em_andamento', 'entregue', 'expirada');
create type alternativa as enum ('A', 'B', 'C', 'D', 'E');

-- ---------------------------------------------------------------------------
-- Pessoas
-- ---------------------------------------------------------------------------

create table polos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  bairro text not null,
  ativo boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create table perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  data_nascimento date,
  vinculo vinculo_tipo not null default 'independente',
  polo_id uuid references polos (id),
  cursinho_externo text,
  papel papel_tipo not null default 'estudante',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint rede_tem_polo check (vinculo <> 'rede' or polo_id is not null),
  constraint externo_tem_cursinho check (
    vinculo <> 'outro_cursinho' or nullif(trim(cursinho_externo), '') is not null
  ),
  constraint coordenador_tem_polo check (papel <> 'coord_polo' or polo_id is not null)
);

create index perfis_polo_idx on perfis (polo_id);

-- ---------------------------------------------------------------------------
-- Conteúdo
-- ---------------------------------------------------------------------------

create table areas (
  codigo text primary key check (codigo in ('LC', 'CH', 'CN', 'MT')),
  nome text not null
);

create table disciplinas (
  id serial primary key,
  area text not null references areas (codigo),
  nome text not null,
  unique (area, nome)
);

create table temas (
  id serial primary key,
  disciplina_id int not null references disciplinas (id),
  nome text not null,
  unique (disciplina_id, nome)
);

create table habilidades (
  codigo text primary key, -- ex.: MT-H25
  area text not null references areas (codigo),
  descricao text not null
);

create table questoes (
  id uuid primary key default gen_random_uuid(),
  area text not null references areas (codigo),
  disciplina_id int references disciplinas (id),
  tema_id int references temas (id),
  habilidade_codigo text references habilidades (codigo),
  dificuldade smallint check (dificuldade between 1 and 5),
  ano smallint,
  origem origem_questao not null,
  fonte text, -- ex.: "ENEM 2023, caderno azul, questão 137"
  status status_questao not null default 'rascunho',
  criado_por uuid references perfis (id),
  aprovado_por uuid references perfis (id),
  created_at timestamptz not null default now(),
  -- Questões geradas por IA só são publicadas com aprovação de um professor.
  constraint ia_precisa_aprovacao check (
    origem <> 'ia' or status <> 'publicada' or aprovado_por is not null
  )
);

create table questao_versoes (
  id uuid primary key default gen_random_uuid(),
  questao_id uuid not null references questoes (id) on delete restrict,
  numero int not null,
  enunciado text not null,
  imagem_path text, -- caminho no Supabase Storage
  alternativas jsonb not null, -- {"A": "...", "B": "...", "C": "...", "D": "...", "E": "..."}
  gabarito alternativa not null,
  resolucao text,
  created_at timestamptz not null default now(),
  unique (questao_id, numero),
  constraint cinco_alternativas check (alternativas ?& array['A', 'B', 'C', 'D', 'E'])
);

-- Versões são imutáveis: para corrigir, crie uma versão nova.
create function bloquear_alteracao() returns trigger
language plpgsql as $$
begin
  raise exception 'Versões de questão são imutáveis; crie uma nova versão.';
end;
$$;

create trigger questao_versoes_imutaveis
  before update on questao_versoes
  for each row execute function bloquear_alteracao();

-- ---------------------------------------------------------------------------
-- Provas
-- ---------------------------------------------------------------------------

create table simulados (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  instrucoes text,
  modalidade modalidade_simulado not null,
  tipo tipo_simulado not null default 'livre',
  duracao_min int not null check (duracao_min > 0),
  abre_em timestamptz,
  fecha_em timestamptz,
  liberacao liberacao_resultado not null default 'imediata',
  resultado_liberado boolean not null default false,
  publicado boolean not null default false,
  is_demo boolean not null default false,
  criado_por uuid references perfis (id),
  created_at timestamptz not null default now(),
  constraint janela_valida check (fecha_em is null or abre_em is null or fecha_em > abre_em),
  constraint oficial_tem_janela check (tipo <> 'oficial' or (abre_em is not null and fecha_em is not null))
);

create table simulado_questoes (
  simulado_id uuid not null references simulados (id) on delete cascade,
  ordem int not null,
  questao_versao_id uuid not null references questao_versoes (id),
  primary key (simulado_id, ordem),
  unique (simulado_id, questao_versao_id)
);

-- Polos convidados para um simulado oficial. Sem linhas = aberto a todos.
create table simulado_polos (
  simulado_id uuid not null references simulados (id) on delete cascade,
  polo_id uuid not null references polos (id),
  primary key (simulado_id, polo_id)
);

create table tentativas (
  id uuid primary key default gen_random_uuid(),
  simulado_id uuid not null references simulados (id),
  estudante_id uuid not null references perfis (id) on delete cascade,
  iniciada_em timestamptz not null default now(),
  prazo_em timestamptz not null,
  entregue_em timestamptz,
  status status_tentativa not null default 'em_andamento',
  total int,
  acertos int,
  erros int,
  em_branco int,
  percentual numeric(5, 1), -- percentual de acertos; não é nota TRI
  is_demo boolean not null default false
);

create index tentativas_estudante_idx on tentativas (estudante_id);
create index tentativas_simulado_idx on tentativas (simulado_id);
-- No máximo uma tentativa em andamento por estudante e simulado (retomada).
create unique index tentativa_aberta_unica on tentativas (simulado_id, estudante_id)
  where status = 'em_andamento';

create table respostas (
  tentativa_id uuid not null references tentativas (id) on delete cascade,
  questao_versao_id uuid not null references questao_versoes (id),
  alternativa alternativa, -- null = em branco
  marcada_revisao boolean not null default false,
  tempo_ms int not null default 0,
  atualizada_em timestamptz not null default now(),
  primary key (tentativa_id, questao_versao_id)
);

-- ---------------------------------------------------------------------------
-- Redação (Etapa 2; tabelas criadas desde já para estabilizar o esquema)
-- ---------------------------------------------------------------------------

create table propostas_redacao (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  textos_motivadores text,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

create table redacoes (
  id uuid primary key default gen_random_uuid(),
  estudante_id uuid not null references perfis (id) on delete cascade,
  proposta_id uuid not null references propostas_redacao (id),
  tentativa_id uuid references tentativas (id),
  texto text not null default '',
  palavras int not null default 0,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'enviada', 'corrigida', 'em_revisao')),
  enviada_em timestamptz,
  created_at timestamptz not null default now()
);

create table correcoes_redacao (
  id uuid primary key default gen_random_uuid(),
  redacao_id uuid not null references redacoes (id) on delete cascade,
  tipo text not null check (tipo in ('ia', 'humana')),
  modelo text, -- modelo de IA usado, quando tipo = 'ia'
  versao_rubrica text not null,
  -- {"C1": {"nota": 160, "justificativa": "...", "trechos": [...], "orientacoes": "..."}, ...}
  competencias jsonb not null,
  nota_total int check (nota_total between 0 and 1000), -- estimativa pedagógica
  plano_melhoria text,
  tokens_entrada int,
  tokens_saida int,
  custo_usd numeric(10, 4),
  revisor_id uuid references perfis (id),
  created_at timestamptz not null default now(),
  constraint ia_tem_modelo check (tipo <> 'ia' or modelo is not null)
);

-- ---------------------------------------------------------------------------
-- Gestão
-- ---------------------------------------------------------------------------

create table auditoria (
  id bigserial primary key,
  ator_id uuid references perfis (id),
  acao text not null,
  alvo_tipo text not null,
  alvo_id text,
  created_at timestamptz not null default now()
);

create table configuracoes (
  chave text primary key,
  valor jsonb not null
);

-- ---------------------------------------------------------------------------
-- Funções auxiliares de permissão
-- ---------------------------------------------------------------------------

create function meu_papel() returns papel_tipo
language sql stable security definer set search_path = public as $$
  select papel from perfis where id = auth.uid()
$$;

create function meu_polo() returns uuid
language sql stable security definer set search_path = public as $$
  select polo_id from perfis where id = auth.uid()
$$;

create function sou_equipe() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(meu_papel() in ('professor', 'coord_polo', 'admin'), false)
$$;

-- Pode ver os dados individuais deste estudante?
create function posso_ver_estudante(p_estudante uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_estudante = auth.uid()
      or meu_papel() = 'admin'
      or (meu_papel() = 'coord_polo'
          and exists (select 1 from perfis where id = p_estudante and polo_id = meu_polo()))
$$;

-- ---------------------------------------------------------------------------
-- Funções da prova (único caminho de escrita em tentativas)
-- ---------------------------------------------------------------------------

-- Inicia ou retoma a tentativa do estudante logado.
create function iniciar_tentativa(p_simulado uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s simulados;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Faça login para iniciar o simulado.';
  end if;

  select * into s from simulados where id = p_simulado and publicado;
  if not found then
    raise exception 'Simulado não encontrado.';
  end if;
  if s.abre_em is not null and now() < s.abre_em then
    raise exception 'Este simulado ainda não abriu.';
  end if;
  if s.fecha_em is not null and now() > s.fecha_em then
    raise exception 'Este simulado já foi encerrado.';
  end if;
  if exists (select 1 from simulado_polos where simulado_id = p_simulado)
     and not exists (select 1 from simulado_polos where simulado_id = p_simulado and polo_id = meu_polo()) then
    raise exception 'Este simulado é exclusivo de outros polos.';
  end if;

  select id into v_id from tentativas
   where simulado_id = p_simulado and estudante_id = auth.uid() and status = 'em_andamento';
  if v_id is not null then
    return v_id; -- retomada após queda de conexão ou troca de aparelho
  end if;

  insert into tentativas (simulado_id, estudante_id, prazo_em, is_demo)
  values (
    p_simulado,
    auth.uid(),
    least(now() + make_interval(mins => s.duracao_min), coalesce(s.fecha_em, 'infinity')),
    s.is_demo
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Questões da tentativa, sem gabarito nem resolução.
create function questoes_da_tentativa(p_tentativa uuid)
returns table (ordem int, questao_versao_id uuid, area text, enunciado text, imagem_path text, alternativas jsonb)
language sql stable security definer set search_path = public as $$
  select sq.ordem, v.id, q.area, v.enunciado, v.imagem_path, v.alternativas
    from tentativas t
    join simulado_questoes sq on sq.simulado_id = t.simulado_id
    join questao_versoes v on v.id = sq.questao_versao_id
    join questoes q on q.id = v.questao_id
   where t.id = p_tentativa and t.estudante_id = auth.uid()
   order by sq.ordem
$$;

-- Entrega, corrige e trava a tentativa. Em branco é contado à parte de erro.
create function entregar_tentativa(p_tentativa uuid) returns tentativas
language plpgsql security definer set search_path = public as $$
declare
  t tentativas;
begin
  select * into t from tentativas
   where id = p_tentativa and estudante_id = auth.uid()
   for update;
  if not found then
    raise exception 'Tentativa não encontrada.';
  end if;
  if t.status <> 'em_andamento' then
    return t; -- entrega repetida (ex.: clique duplo) não altera nada
  end if;

  with placar as (
    select count(*) as total,
           count(*) filter (where r.alternativa = v.gabarito) as acertos,
           count(*) filter (where r.alternativa is not null and r.alternativa <> v.gabarito) as erros,
           count(*) filter (where r.alternativa is null) as em_branco
      from simulado_questoes sq
      join questao_versoes v on v.id = sq.questao_versao_id
      left join respostas r on r.tentativa_id = t.id and r.questao_versao_id = v.id
     where sq.simulado_id = t.simulado_id
  )
  update tentativas set
    status = 'entregue',
    entregue_em = now(),
    total = placar.total,
    acertos = placar.acertos,
    erros = placar.erros,
    em_branco = placar.em_branco,
    percentual = case when placar.total = 0 then 0
                      else round(placar.acertos * 100.0 / placar.total, 1) end
  from placar
  where tentativas.id = t.id
  returning tentativas.* into t;

  return t;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table polos enable row level security;
alter table perfis enable row level security;
alter table areas enable row level security;
alter table disciplinas enable row level security;
alter table temas enable row level security;
alter table habilidades enable row level security;
alter table questoes enable row level security;
alter table questao_versoes enable row level security;
alter table simulados enable row level security;
alter table simulado_questoes enable row level security;
alter table simulado_polos enable row level security;
alter table tentativas enable row level security;
alter table respostas enable row level security;
alter table propostas_redacao enable row level security;
alter table redacoes enable row level security;
alter table correcoes_redacao enable row level security;
alter table auditoria enable row level security;
alter table configuracoes enable row level security;

-- Polos e configurações aparecem no cadastro e na página inicial.
create policy polos_leitura on polos for select using (true);
create policy polos_admin on polos for all using (meu_papel() = 'admin') with check (meu_papel() = 'admin');
create policy config_leitura on configuracoes for select using (true);
create policy config_admin on configuracoes for all using (meu_papel() = 'admin') with check (meu_papel() = 'admin');

-- Perfis: o próprio estudante, o admin e o coordenador do polo.
create policy perfis_leitura on perfis for select using (posso_ver_estudante(id));
create policy perfis_cadastro on perfis for insert
  with check (id = auth.uid() and papel = 'estudante');
create policy perfis_edicao on perfis for update
  using (id = auth.uid())
  with check (id = auth.uid() and papel = meu_papel());
create policy perfis_admin on perfis for all using (meu_papel() = 'admin') with check (meu_papel() = 'admin');

-- Taxonomia: leitura para usuários logados, escrita pela equipe.
create policy areas_leitura on areas for select using (auth.uid() is not null);
create policy disciplinas_leitura on disciplinas for select using (auth.uid() is not null);
create policy temas_leitura on temas for select using (auth.uid() is not null);
create policy habilidades_leitura on habilidades for select using (auth.uid() is not null);
create policy disciplinas_equipe on disciplinas for all using (sou_equipe()) with check (sou_equipe());
create policy temas_equipe on temas for all using (sou_equipe()) with check (sou_equipe());
create policy habilidades_equipe on habilidades for all using (sou_equipe()) with check (sou_equipe());

-- Banco de questões: só a equipe lê diretamente (tem gabarito).
create policy questoes_equipe on questoes for all
  using (sou_equipe()) with check (meu_papel() in ('professor', 'admin'));
create policy versoes_equipe_leitura on questao_versoes for select using (sou_equipe());
create policy versoes_equipe_criacao on questao_versoes for insert
  with check (meu_papel() in ('professor', 'admin'));

-- Simulados publicados são visíveis a todos os logados; montagem pela equipe.
create policy simulados_leitura on simulados for select
  using (auth.uid() is not null and (publicado or sou_equipe()));
create policy simulados_equipe on simulados for all
  using (meu_papel() in ('professor', 'admin')) with check (meu_papel() in ('professor', 'admin'));
create policy sq_equipe on simulado_questoes for all
  using (sou_equipe()) with check (meu_papel() in ('professor', 'admin'));
create policy sp_leitura on simulado_polos for select using (auth.uid() is not null);
create policy sp_admin on simulado_polos for all using (meu_papel() = 'admin') with check (meu_papel() = 'admin');

-- Tentativas: leitura conforme o estudante; escrita só pelas funções acima.
create policy tentativas_leitura on tentativas for select using (posso_ver_estudante(estudante_id));

-- Respostas: o estudante grava enquanto a tentativa está aberta e no prazo
-- (com 2 minutos de tolerância para a sincronização do celular).
create policy respostas_leitura on respostas for select using (
  exists (select 1 from tentativas t where t.id = tentativa_id and posso_ver_estudante(t.estudante_id))
);
create policy respostas_gravacao on respostas for insert with check (
  exists (select 1 from tentativas t
           where t.id = tentativa_id and t.estudante_id = auth.uid()
             and t.status = 'em_andamento' and now() <= t.prazo_em + interval '2 minutes')
);
create policy respostas_atualizacao on respostas for update using (
  exists (select 1 from tentativas t
           where t.id = tentativa_id and t.estudante_id = auth.uid()
             and t.status = 'em_andamento' and now() <= t.prazo_em + interval '2 minutes')
);

-- Redação.
create policy propostas_leitura on propostas_redacao for select using (auth.uid() is not null);
create policy propostas_equipe on propostas_redacao for all
  using (meu_papel() in ('professor', 'admin')) with check (meu_papel() in ('professor', 'admin'));
create policy redacoes_leitura on redacoes for select
  using (posso_ver_estudante(estudante_id) or meu_papel() = 'professor');
create policy redacoes_escrita on redacoes for insert with check (estudante_id = auth.uid());
create policy redacoes_rascunho on redacoes for update
  using (estudante_id = auth.uid() and status = 'rascunho')
  with check (estudante_id = auth.uid());
create policy correcoes_leitura on correcoes_redacao for select using (
  exists (select 1 from redacoes r where r.id = redacao_id
           and (posso_ver_estudante(r.estudante_id) or meu_papel() = 'professor'))
);
create policy correcoes_professor on correcoes_redacao for insert
  with check (tipo = 'humana' and revisor_id = auth.uid() and meu_papel() in ('professor', 'admin'));

-- Auditoria: só o admin consulta; o servidor grava com a chave de serviço.
create policy auditoria_admin on auditoria for select using (meu_papel() = 'admin');

-- As funções de prova são as únicas portas de escrita em tentativas.
revoke all on function iniciar_tentativa(uuid) from public;
revoke all on function entregar_tentativa(uuid) from public;
revoke all on function questoes_da_tentativa(uuid) from public;
grant execute on function iniciar_tentativa(uuid) to authenticated;
grant execute on function entregar_tentativa(uuid) to authenticated;
grant execute on function questoes_da_tentativa(uuid) to authenticated;
