import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { LivrosEmpilhados } from "@/components/ds";
import { Button } from "@/components/ui/button";

/**
 * Página 404 (notFoundComponent da rota raiz). Entra com uma cascata curta e oferece os dois
 * caminhos mais prováveis: o início e o login.
 */
export function PaginaNaoEncontrada() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="escalonar-filhos max-w-md text-center">
        <LivrosEmpilhados className="anima-surgir duracao-media mx-auto mb-6 w-24" />
        <p
          aria-hidden
          className="anima-subir duracao-media font-display text-7xl font-black leading-none text-laranja"
        >
          404
        </p>
        <h1 className="anima-subir duracao-media titulo-pagina mt-4">
          <span className="sr-only">Erro 404: </span>Página não encontrada
        </h1>
        <p className="anima-subir duracao-media mt-3 text-muted-foreground">
          O endereço pode ter mudado ou estar incompleto. Vamos voltar para o começo?
        </p>
        <div className="anima-subir duracao-media mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link to="/">
              <ArrowLeft />
              Voltar para o início
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/entrar">Entrar na minha conta</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
