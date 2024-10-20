import { rpc } from '@renderer/util';
import { useStore } from '@renderer/hooks';

export default function Mods() {
  const modsList = useStore(s => s.main.modList);
  return <div>
    {modsList.map(mod =>
      <div>{mod.name}</div>
    )}
    <button onClick={() => {
      rpc.loadModList()
    }}>load mods</button>
  </div>
}
