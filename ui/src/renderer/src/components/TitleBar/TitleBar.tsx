import Style from './TitleBar.module.scss';
import { rpc } from '@renderer/util';

const VERSION = "v1.0.6"; // FIXME

export const TitleBar = () => {
  return <div className={Style.titleBarRoot}>
    <div className={Style.titleBarContent}>
      <div className={Style.draggable}>
        <div className={Style.title}>TowerMod {VERSION}</div>
      </div>
      <div className={Style.buttons}>
        <button tabIndex={-1} onClick={() => rpc.winMinimize()}>-</button>
        <button tabIndex={-1} onClick={() => rpc.winMaximize()}>O</button>
        <button tabIndex={-1} onClick={() => rpc.winClose()}>X</button>
      </div>
    </div>
  </div>
}
