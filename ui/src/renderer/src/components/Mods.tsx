export default function Mods() {
  return <div>
    Mods
    <button onClick={() => {
      window.rpc.hello()
    }}>button</button>
  </div>
}
