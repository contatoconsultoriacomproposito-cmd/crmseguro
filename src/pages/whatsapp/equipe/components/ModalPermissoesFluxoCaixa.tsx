import ModuloPermissaoPlanejado from "./ModuloPermissaoPlanejado";
import { localizarModulo } from "./estruturaPermissoes";

/** UI reservada: nenhuma permissão é enviada ao backend enquanto não houver homologação. */
export default function ModalPermissoesFluxoCaixa() {
  const modulo = localizarModulo("fluxo_caixa");
  if (!modulo) return null;
  return <ModuloPermissaoPlanejado titulo={modulo.titulo} descricao={modulo.descricao} icon={modulo.icon} />;
}
