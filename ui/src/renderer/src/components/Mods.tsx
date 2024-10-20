import { rpc } from '@renderer/util';
import { useStore } from '@renderer/hooks';
import { useEffect, useState } from 'react';

export default function Mods() {
  const modsList = useStore(s => s.main.modList);

  const [selectedMod, setSelectedMod] = useState<string>("");

  useEffect(() => {
    if (modsList.length && !selectedMod) {
      setSelectedMod(modsList[0].name)
    }
  }, [selectedMod, setSelectedMod, modsList])

  return <div>
    <select value={selectedMod} onChange={e => setSelectedMod(e.target.value)}>
      {modsList.map(mod =>
        <option value={mod.name}>{mod.displayName} (by {mod.author})</option>
      )}
    </select>
    <button onClick={async () => {
      await rpc.setGamePath("C:\\Program Files (x86)\\Steam\\steamapps\\common\\TowerClimb\\TowerClimb_V1_Steam4.exe")
      await rpc.loadModList()
    }}>load mods</button>
    <button disabled={!modsList || !selectedMod} onClick={async () => {
      const mod = modsList.find(mod => mod.name == selectedMod);
      if (mod?.filePath) {
        rpc.playMod(mod.filePath)
      }
    }}>play mod</button>
  </div>
}
