-- Simula Alcides: equipe da coordenação.
--
-- Um administrador dá e tira acesso ao painel pelo próprio site: administrador (vê a Rede
-- inteira) ou coordenação do Compaz (vê só o polo do cadastro). Cada troca fica na auditoria.

-- Quem tem acesso ao painel hoje.
create function equipe_coordenacao()
returns table (id uuid, nome text, email text, papel papel_tipo, polo_nome text)
language sql stable security definer set search_path = public as $$
  select e.id, e.nome, u.email::text, e.papel, po.nome
    from perfis e
    left join auth.users u on u.id = e.id
    left join polos po on po.id = e.polo_id
   where meu_papel() = 'admin'
     and e.papel <> 'estudante'
   order by e.papel desc, e.nome
$$;

-- Busca qualquer conta pelo nome ou e-mail (só para administradores).
create function buscar_pessoas(p_termo text)
returns table (id uuid, nome text, email text, papel papel_tipo, polo_id uuid, polo_nome text)
language sql stable security definer set search_path = public as $$
  select e.id, e.nome, u.email::text, e.papel, e.polo_id, po.nome
    from perfis e
    left join auth.users u on u.id = e.id
    left join polos po on po.id = e.polo_id
   where meu_papel() = 'admin'
     and char_length(btrim(coalesce(p_termo, ''))) >= 2
     and (e.nome ilike '%' || btrim(p_termo) || '%' or u.email ilike '%' || btrim(p_termo) || '%')
   order by e.nome
   limit 20
$$;

-- Troca o papel de uma pessoa. Ninguém tira o próprio acesso (evita a Rede ficar sem admin).
create function definir_papel(p_pessoa uuid, p_papel papel_tipo) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_polo uuid;
begin
  if meu_papel() is distinct from 'admin' then
    raise exception 'Só administradores podem mudar o acesso.';
  end if;
  if p_papel not in ('estudante', 'coord_polo', 'admin') then
    raise exception 'Papel não permitido.';
  end if;
  if p_pessoa = auth.uid() and p_papel <> 'admin' then
    raise exception 'Você não pode tirar o seu próprio acesso.';
  end if;
  select polo_id into v_polo from perfis where id = p_pessoa;
  if not found then
    raise exception 'Pessoa não encontrada.';
  end if;
  if p_papel = 'coord_polo' and v_polo is null then
    raise exception 'Essa pessoa não tem Compaz no cadastro.';
  end if;

  update perfis set papel = p_papel where id = p_pessoa;
  insert into auditoria (ator_id, acao, alvo_tipo, alvo_id)
  values (auth.uid(), 'definir_papel:' || p_papel, 'perfil', p_pessoa::text);
end;
$$;

revoke all on function equipe_coordenacao() from public, anon;
revoke all on function buscar_pessoas(text) from public, anon;
revoke all on function definir_papel(uuid, papel_tipo) from public, anon;
grant execute on function equipe_coordenacao() to authenticated;
grant execute on function buscar_pessoas(text) to authenticated;
grant execute on function definir_papel(uuid, papel_tipo) to authenticated;
