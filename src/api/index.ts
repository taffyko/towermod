export { dataApi as api } from './dataApi'
import * as newApi1 from './newApi'
import * as newDataApi from './newDataApi'
export const newApi = { ...newApi1, ...newDataApi } as const
export default newApi

export { queryClient } from './helpers'
