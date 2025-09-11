import { setQueryNamesOnModule } from './helpers'
import * as towermodApi from './api'
import * as dataApi from './dataApi'
export const api = { ...towermodApi, ...dataApi } as const
export default api
export { queryClient } from './helpers'

setQueryNamesOnModule(api)
