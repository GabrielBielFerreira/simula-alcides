-- Dados de DEMONSTRAÇÃO. Rodar só em ambientes de teste.
-- Tudo aqui é marcado com is_demo = true ou "[DEMO]" e fica fora dos painéis e relatórios.

with dados (n, area, dificuldade, enunciado, alternativas, gabarito) as (
  values
    (1, 'MT', 1, '[DEMO] Uma camiseta custava R$ 40,00 e teve desconto de 25%. Qual o novo preço?',
        '{"A":"R$ 25,00","B":"R$ 30,00","C":"R$ 32,00","D":"R$ 35,00","E":"R$ 36,00"}', 'B'),
    (2, 'MT', 2, '[DEMO] Quanto é 15% de 200?',
        '{"A":"15","B":"20","C":"25","D":"30","E":"35"}', 'D'),
    (3, 'LC', 1, '[DEMO] Na frase "Os estudantes chegaram cedo", qual é o sujeito?',
        '{"A":"cedo","B":"chegaram","C":"Os estudantes","D":"Os","E":"Sujeito oculto"}', 'C'),
    (4, 'CH', 1, '[DEMO] Em que ano foi promulgada a Constituição Federal brasileira em vigor?',
        '{"A":"1964","B":"1979","C":"1985","D":"1988","E":"1992"}', 'D'),
    (5, 'CN', 1, '[DEMO] Qual gás as plantas absorvem do ar para fazer fotossíntese?',
        '{"A":"Oxigênio","B":"Gás carbônico","C":"Nitrogênio","D":"Hidrogênio","E":"Hélio"}', 'B')
),
s as (
  insert into simulados (titulo, instrucoes, modalidade, tipo, duracao_min, publicado, is_demo)
  values (
    'Simulado de demonstração',
    'Cinco questões para testar a plataforma. Não vale como resultado real.',
    'rapido', 'livre', 15, true, true
  )
  returning id
),
q as (
  insert into questoes (area, origem, fonte, status, dificuldade)
  select area, 'autoral', 'Demonstração ' || n, 'publicada', dificuldade from dados
  returning id, fonte
),
v as (
  insert into questao_versoes (questao_id, numero, enunciado, alternativas, gabarito, resolucao)
  select q.id, 1, d.enunciado, d.alternativas::jsonb, d.gabarito::alternativa, 'Resolução de demonstração.'
  from q join dados d on q.fonte = 'Demonstração ' || d.n
  returning id, questao_id
)
insert into simulado_questoes (simulado_id, ordem, questao_versao_id)
select s.id, d.n, v.id
from s
cross join v
join q on q.id = v.questao_id
join dados d on q.fonte = 'Demonstração ' || d.n;
