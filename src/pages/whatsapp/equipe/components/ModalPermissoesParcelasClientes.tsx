import ModuloPermissaoPlanejado from "./ModuloPermissaoPlanejado";
import { localizarModulo } from "./estruturaPermissoes";

/** UI reservada: nenhuma permissão é enviada ao backend enquanto não houver homologação. */
export default function ModalPermissoesParcelasClientes() {
  const modulo = localizarModulo("parcelas_clientes");
  if (!modulo) return null;
  return <ModuloPermissaoPlanejado titulo={modulo.titulo} descricao={modulo.descricao} icon={modulo.icon} />;
}
