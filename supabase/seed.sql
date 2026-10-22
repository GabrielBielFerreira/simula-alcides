-- Dados de referência (vão para produção).

insert into polos (nome, bairro, ordem) values
  ('Compaz Paulo Freire', 'Ibura', 1),
  ('Compaz Governador Eduardo Campos', 'Alto Santa Terezinha', 2),
  ('Compaz Escritor Ariano Suassuna', 'Cordeiro', 3),
  ('Compaz Dom Helder Câmara', 'Coque', 4),
  ('Compaz Miguel Arraes', 'Caxangá', 5), -- o site institucional diz "Madalena": confirmar com a coordenação
  ('Compaz Lêda Alves', 'Pina', 6);

insert into areas (codigo, nome) values
  ('LC', 'Linguagens, Códigos e suas Tecnologias'),
  ('CH', 'Ciências Humanas e suas Tecnologias'),
  ('CN', 'Ciências da Natureza e suas Tecnologias'),
  ('MT', 'Matemática e suas Tecnologias');

insert into disciplinas (area, nome) values
  ('LC', 'Língua Portuguesa'), ('LC', 'Literatura'), ('LC', 'Língua Estrangeira'),
  ('LC', 'Artes'), ('LC', 'Educação Física'), ('LC', 'Tecnologias da Informação'),
  ('CH', 'História'), ('CH', 'Geografia'), ('CH', 'Filosofia'), ('CH', 'Sociologia'),
  ('CN', 'Biologia'), ('CN', 'Física'), ('CN', 'Química'),
  ('MT', 'Matemática');

insert into configuracoes (chave, valor) values
  ('nome_produto', '"Simula Alcides"'),
  ('subtitulo', '"Seu futuro começa com a próxima questão."'),
  ('ia_limite_correcoes_semana', '3'),
  ('ia_teto_mensal_usd', '100');
