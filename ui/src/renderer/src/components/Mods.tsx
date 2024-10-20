import { rpc } from '@renderer/util';
import { useStore } from '@renderer/hooks';
import { useEffect, useState } from 'react';
import { ModInfo } from '@towermod';
import Style from './Mods.module.scss'

export function ModDetails(props: { mod: ModInfo }) {
  return <div className={Style.modDetails}>

  </div>

}

export const ModListItem = (props: {
  selected: boolean,
  mod: ModInfo,
} & React.ComponentProps<'div'>) => {
  const { selected, mod, ...htmlProps } = props;
  return <div
    className={`${Style.modListItem} ${selected ? Style.selected : ""}`}
    {...htmlProps}
  >
    {mod.displayName} (by {mod.author})
  </div>
}

export function ModList(props: {
  mods: ModInfo[],
  selectedMod?: ModInfo
  setSelectedMod: (mod: ModInfo | undefined) => void,
}) {
  const { mods, selectedMod, setSelectedMod } = props;
  return <div className={Style.modList}>
    {mods.map((mod) => <ModListItem
        mod={mod}
        selected={mod === selectedMod}
        onClick={() => {
          setSelectedMod(mod)
        }}
    />)}
  </div>
}


export default function Mods() {
  const modsList = useStore(s => s.main?.modList);
  if (!modsList) { return null }

  const [selectedMod, setSelectedMod] = useState<ModInfo>();

  return <div className={Style.mods}>
    <div>
      <button onClick={async () => {
        await rpc.setGamePath("C:\\Program Files (x86)\\Steam\\steamapps\\common\\TowerClimb\\TowerClimb_V1_Steam4.exe")
        await rpc.loadModList()
      }}>
        load mods
      </button>
      <button disabled={!modsList || !selectedMod} onClick={async () => {
        if (selectedMod?.filePath) {
          rpc.playMod(selectedMod.filePath)
        }
      }}>
        play mod
      </button>
    </div>
    <ModList
      mods={modsList}
      selectedMod={selectedMod}
      setSelectedMod={setSelectedMod}
    />
  </div>
}
