/**
 * A parte Recharts do <Evolucao> (em shared.tsx). Fica num arquivo próprio, carregado sob
 * demanda com React.lazy: só as telas com gráfico baixam o Recharts (~380KB).
 * Não importe direto; use <Evolucao>.
 */
import { useMemo, type CSSProperties } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
  type LabelProps,
} from "recharts";
import { CURVA_SAIDA } from "@/components/ds";

/** Rótulo "52%" de um ponto, acima ou abaixo dele, com contorno da cor do cartão.
 * Aparece com um fade quando a linha termina de se desenhar (`duracao` da linha). */
function rotuloDoPonto(acima: (indice: number) => boolean, cor: string, duracao: number) {
  return ({ x, y, value, index }: LabelProps) => {
    return (
      <text
        style={{ "--atraso": `${duracao - 100}ms` } as CSSProperties}
        x={Number(x)}
        y={Number(y) + (acima(index ?? 0) ? -12 : 22)}
        textAnchor="middle"
        fill={cor}
        stroke="var(--card)"
        strokeWidth={4}
        paintOrder="stroke"
        fontSize={14}
        fontWeight={600}
        className="anima-aparecer tabular-nums"
      >
        {`${value}%`}
      </text>
    );
  };
}

/** Linha invisível que só desenha rótulos, para eles ficarem por cima das duas séries. */
const linhaSoRotulos = {
  stroke: "none",
  dot: false,
  activeDot: false,
  legendType: "none",
  isAnimationActive: false,
} as const;

export interface PropsGraficoEvolucao {
  valores: number[];
  segunda?: number[];
  rotulos: string[];
  rede: boolean;
  rotulosSegunda: boolean;
  duracao: number;
  /** As linhas só montam (e se desenham) depois que o gráfico entra na tela. */
  emVista: boolean;
  /** Movimento reduzido: as linhas aparecem prontas, sem desenhar. */
  reduzido: boolean;
}

export default function GraficoEvolucao({
  valores,
  segunda,
  rotulos,
  rede,
  rotulosSegunda,
  duracao,
  emVista,
  reduzido,
}: PropsGraficoEvolucao) {
  // Em cada mês, o rótulo da série mais alta fica acima do ponto e o da mais baixa, abaixo,
  // para nenhum número cair em cima da outra linha.
  const principalAcima = (i: number) => segunda?.[i] === undefined || valores[i] >= segunda[i];
  // Dados estáveis: o Recharts só anima de novo quando os valores mudam (do anterior ao novo).
  const chave = `${valores.join()}|${segunda?.join() ?? ""}|${rotulos.join()}`;
  const dados = useMemo(
    () => valores.map((valor, i) => ({ mes: rotulos[i], valor, segunda: segunda?.[i] })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chave],
  );
  const animacao = {
    isAnimationActive: !reduzido,
    animationDuration: duracao,
    // O Recharts aceita cubic-bezier em texto; o tipo dele só lista os nomes prontos.
    animationEasing: CURVA_SAIDA as "ease-out",
  };
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={dados} margin={{ top: 28, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--linha)" />
        <XAxis
          dataKey="mes"
          tickLine={false}
          axisLine={{ stroke: "var(--linha)" }}
          padding={{ left: 24, right: 24 }}
          tick={{ fill: "var(--muted-foreground)", fontSize: 14 }}
        />
        <YAxis
          width={44}
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v) => `${v}%`}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 14 }}
        />
        {emVista && (
          <Line
            dataKey="valor"
            stroke={rede ? "var(--vinho)" : "var(--laranja-acao)"}
            strokeWidth={2.5}
            dot={{ r: 4, strokeWidth: 2, fill: "var(--card)" }}
            {...animacao}
          />
        )}
        {/* A tracejada vem depois, para não sumir embaixo da principal quando as duas se aproximam. */}
        {emVista && segunda && (
          <Line
            dataKey="segunda"
            stroke="var(--marrom)"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={rotulosSegunda ? { r: 3, strokeWidth: 0, fill: "var(--marrom)" } : false}
            {...animacao}
          />
        )}
        {emVista && (
          <Line dataKey="valor" {...linhaSoRotulos}>
            <LabelList
              dataKey="valor"
              content={rotuloDoPonto(principalAcima, "var(--marrom)", duracao)}
            />
          </Line>
        )}
        {emVista && segunda && rotulosSegunda && (
          <Line dataKey="segunda" {...linhaSoRotulos}>
            <LabelList
              dataKey="segunda"
              content={rotuloDoPonto((i) => !principalAcima(i), "var(--muted-foreground)", duracao)}
            />
          </Line>
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
