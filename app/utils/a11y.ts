import type { KeyboardEvent } from "react";

/**
 * Para elementos com role="button" que não são <button> nativos:
 * dispara a mesma ação do clique quando o usuário aperta Enter ou Espaço.
 */
export function onKeyActivate(action: () => void) {
  return (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };
}
