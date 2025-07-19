import type { MiniScriptServices } from '../module.js'
import { DocumentState } from 'langium'
import { Env } from './core.js'
import { infer } from './infer.js'

declare module 'langium' {
  interface LangiumDocument {
    env: Env
  }
}

export class MiniScriptTypeComputer {
  constructor(services: MiniScriptServices) {
    services.shared.workspace.DocumentBuilder.onDocumentPhase(DocumentState.Linked, (doc) => {
      const env = new Env()
      infer(doc.parseResult.value, env)
      doc.env = env
    })
  }
}
