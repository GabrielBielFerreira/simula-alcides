/**
 * Textos e dados de exemplo da conta: política de privacidade (provisória) e
 * valores de demonstração das boas-vindas.
 */

/* ---------- Regras do cadastro ---------- */

/** Tamanho mínimo da senha no cadastro. */
export const SENHA_MINIMA = 8;
/** Ano de nascimento mais antigo aceito sem pedir para conferir. */
export const ANO_NASCIMENTO_MINIMO = 1920;

/** Data usada no link "Ver como estudante de 17 anos (demonstração)". */
export const NASCIMENTO_DEMO_17_ANOS = "2009-03-14";

/* ---------- Política de privacidade ---------- */

export interface ItemLista {
  /** Começo do item em negrito (ex.: o nome do dado). */
  destaque?: string;
  texto: string;
}

export type BlocoTexto =
  { tipo: "paragrafo"; texto: string } | { tipo: "lista"; itens: ItemLista[]; ordenada?: boolean };

export interface SecaoPrivacidade {
  id: string;
  titulo: string;
  blocos: BlocoTexto[];
}

export const privacidade = {
  atualizadaEm: "22 de outubro de 2026",
  resumo: [
    "Usamos seus dados só para organizar seus simulados e acompanhar seu estudo.",
    "Não vendemos seus dados e não existe ranking de estudantes.",
    "Você pode ver, corrigir ou apagar seus dados quando quiser.",
  ],
  secoes: [
    {
      id: "quem-somos",
      titulo: "Quem somos",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "O Simula Alcides é uma plataforma gratuita de simulados do ENEM da Rede de Cursinhos Populares Alcides Nascimento, no Recife, com realização do Sonhos da Periferia. A Rede é a responsável pelos seus dados (na LGPD, a “controladora”).",
        },
        {
          tipo: "paragrafo",
          texto:
            "Esta página explica, sem juridiquês, quais dados usamos, para quê e como você decide sobre eles.",
        },
      ],
    },
    {
      id: "dados",
      titulo: "Quais dados coletamos e por quê",
      blocos: [
        {
          tipo: "lista",
          itens: [
            {
              destaque: "Nome e e-mail:",
              texto: "para criar sua conta, você entrar e a gente falar com você.",
            },
            {
              destaque: "Data de nascimento:",
              texto:
                "para saber se você tem menos de 18 anos e, nesse caso, avisar uma pessoa responsável.",
            },
            {
              destaque: "Polo ou cursinho:",
              texto:
                "para mostrar os simulados oficiais certos e para a coordenação acompanhar a turma.",
            },
            {
              destaque: "Respostas, tempo de prova e redações:",
              texto:
                "para calcular seu resultado, mostrar sua evolução e sugerir o que estudar depois.",
            },
            {
              destaque: "Dados técnicos do aparelho:",
              texto:
                "tipo de navegador e horário de acesso, para a plataforma funcionar bem e com segurança, mesmo com internet fraca.",
            },
          ],
        },
        {
          tipo: "paragrafo",
          texto:
            "Não pedimos CPF, endereço, renda nem foto. Não usamos seus dados para propaganda e não vendemos nada a ninguém.",
        },
      ],
    },
    {
      id: "menores",
      titulo: "Estudantes com menos de 18 anos",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Muita gente começa a se preparar para o ENEM antes dos 18, e é muito bem-vinda aqui. Nesses casos, a LGPD pede um cuidado a mais: no cadastro, pedimos o e-mail de uma pessoa responsável, que recebe uma explicação sobre a plataforma e confirma que está ciente.",
        },
        {
          tipo: "paragrafo",
          texto:
            "Coletamos só o necessário para o estudo. Nada de publicidade, nada de perfil público.",
        },
      ],
    },
    {
      id: "prazo",
      titulo: "Por quanto tempo guardamos",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Guardamos seus dados enquanto sua conta estiver ativa, para você acompanhar sua evolução de um ano para o outro.",
        },
        {
          tipo: "paragrafo",
          texto:
            "Se a conta ficar 2 anos sem acesso, avisamos por e-mail. Sem resposta, apagamos seus dados pessoais. Os números gerais da Rede, sem nomes, podem continuar nos relatórios.",
        },
      ],
    },
    {
      id: "direitos",
      titulo: "Seus direitos pela LGPD",
      blocos: [
        {
          tipo: "paragrafo",
          texto: "A Lei Geral de Proteção de Dados garante que você pode, a qualquer momento:",
        },
        {
          tipo: "lista",
          itens: [
            { texto: "saber quais dados temos sobre você;" },
            { texto: "corrigir dados errados ou desatualizados;" },
            { texto: "pedir uma cópia dos seus dados;" },
            { texto: "retirar o consentimento que você deu;" },
            { texto: "pedir a exclusão dos seus dados;" },
            {
              texto:
                "saber com quem compartilhamos: só com a coordenação do seu polo e com os serviços que mantêm a plataforma no ar.",
            },
          ],
        },
        {
          tipo: "paragrafo",
          texto:
            "Se achar que algo está errado, você também pode reclamar na Autoridade Nacional de Proteção de Dados (ANPD).",
        },
      ],
    },
    {
      id: "excluir",
      titulo: "Como excluir meus dados",
      blocos: [
        {
          tipo: "lista",
          ordenada: true,
          itens: [
            { texto: "Entre na sua conta e abra Meu perfil." },
            { texto: "Toque em “Excluir minha conta e meus dados”." },
            { texto: "Confirme. Em até 15 dias apagamos tudo e avisamos por e-mail." },
          ],
        },
        {
          tipo: "paragrafo",
          texto: "Sem acesso à conta? Peça pelo contato abaixo ou para a coordenação do seu polo.",
        },
      ],
    },
    {
      id: "contato",
      titulo: "Contato",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Encarregado de dados da Rede de Cursinhos Populares Alcides Nascimento: nome e e-mail em definição.",
        },
        {
          tipo: "paragrafo",
          texto:
            "Enquanto isso, fale com a coordenação do seu polo. Toda dúvida sobre seus dados recebe resposta em até 15 dias.",
        },
      ],
    },
  ] satisfies SecaoPrivacidade[],
};

/* ---------- Boas-vindas ---------- */

/** O que a tela "Tudo pronto" sugere como próximo passo (ids de `catalogo`). */
export const proximoPassoBoasVindas = {
  oficialId: "rede-5-dia-1",
  oficialQuando: "sábado, 31 de outubro, das 13h às 18h30",
  livreId: "demo",
};
