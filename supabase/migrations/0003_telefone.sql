-- WhatsApp do estudante (para avisos da Rede). O login continua por e-mail ou Google.
alter table perfis add column telefone text
  check (telefone is null or telefone ~ '^[0-9]{10,13}$');

create or replace function criar_perfil_do_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_vinculo vinculo_tipo := 'independente';
  v_polo uuid;
  v_externo text := nullif(trim(m ->> 'cursinho_externo'), '');
  v_nasc date;
  v_tel text := nullif(regexp_replace(coalesce(m ->> 'telefone', ''), '\D', '', 'g'), '');
begin
  begin
    v_vinculo := coalesce(nullif(m ->> 'vinculo', '')::vinculo_tipo, 'independente');
  exception when others then
    v_vinculo := 'independente';
  end;
  select id into v_polo from polos where id::text = m ->> 'polo_id';
  begin
    v_nasc := nullif(m ->> 'data_nascimento', '')::date;
  exception when others then
    v_nasc := null;
  end;
  if v_vinculo = 'rede' and v_polo is null then v_vinculo := 'independente'; end if;
  if v_vinculo = 'outro_cursinho' and v_externo is null then v_vinculo := 'independente'; end if;
  if v_tel !~ '^[0-9]{10,13}$' then v_tel := null; end if;

  insert into perfis (id, nome, data_nascimento, vinculo, polo_id, cursinho_externo, telefone)
  values (
    new.id,
    coalesce(nullif(trim(m ->> 'nome'), ''), nullif(trim(m ->> 'full_name'), ''),
             nullif(trim(m ->> 'name'), ''), split_part(new.email, '@', 1), 'Estudante'),
    v_nasc,
    v_vinculo,
    case when v_vinculo = 'rede' then v_polo end,
    case when v_vinculo = 'outro_cursinho' then v_externo end,
    v_tel
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create function salvar_meu_telefone(p_telefone text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_tel text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
begin
  if auth.uid() is null then
    raise exception 'Faça login para continuar.';
  end if;
  if v_tel !~ '^[0-9]{10,13}$' then
    raise exception 'Telefone inválido. Use DDD + número.';
  end if;
  update perfis set telefone = v_tel where id = auth.uid();
end;
$$;

revoke all on function salvar_meu_telefone(text) from public;
grant execute on function salvar_meu_telefone(text) to authenticated;
