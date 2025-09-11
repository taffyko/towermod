import { createContext } from "react"
import { OutlinerHandle } from "./Outliner"

export const OutlinerContext = createContext<OutlinerHandle | null>(null)