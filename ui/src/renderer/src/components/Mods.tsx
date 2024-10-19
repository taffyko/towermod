import { rpc } from '@renderer/util';

export default function Mods() {
  return <div>
    Mods
    <button onClick={() => {
      rpc.hello()
    }}>button</button>
  </div>
}
