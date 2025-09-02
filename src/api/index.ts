export { dataApi as api } from './dataApi'
import { api as newApi1 } from './newApi'
import { api as newDataApi } from './newDataApi'
export const newApi = { ...newApi1, ...newDataApi }
export default newApi

export { queryClient } from './helpers'
