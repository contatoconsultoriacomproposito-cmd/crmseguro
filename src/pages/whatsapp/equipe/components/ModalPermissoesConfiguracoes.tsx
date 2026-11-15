import ModuloPermissaoPlanejado from "./ModuloPermissaoPlanejado";
import { localizarModulo } from "./estruturaPermissoes";

/** UI reservada: nenhuma permissão é enviada ao backend enquanto não houver homologação. */
export default function ModalPermissoesConfiguracoes() {
  const modulo = localizarModulo("configuracoes");
  if (!modulo) return null;
  return <ModuloPermissaoPlanejado titulo={modulo.titulo} descricao={modulo.descricao} icon={modulo.icon} />;
}
