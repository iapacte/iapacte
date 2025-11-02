import { ManagedRuntime } from 'effect'

import { FileService } from './files'

const MainLayer = FileService.Live

export const RuntimeClient = ManagedRuntime.make(MainLayer)

export { FileService }
