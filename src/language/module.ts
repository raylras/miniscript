import type { LangiumSharedCoreServices, Module } from 'langium'
import type { DefaultSharedModuleContext, LangiumServices, LangiumSharedServices, PartialLangiumServices } from 'langium/lsp'
import type { TypirLangiumServices } from 'typir-langium'
import type { MiniScriptAstType } from './generated/ast'
import { inject } from 'langium'
import { createDefaultModule, createDefaultSharedModule } from 'langium/lsp'
import { createTypirLangiumServices, initializeLangiumTypirServices } from 'typir-langium'
import { reflection } from './generated/ast'
import { MiniScriptGeneratedModule, MiniScriptGeneratedSharedModule } from './generated/module'
import { MiniScriptInlayHintProvider } from './lsp/inlay-hint-provider'
import { MiniScriptTypeSystem } from './typer'
import { MiniScriptValidator } from './validator'

/**
 * Declaration of custom services - add your own service classes here.
 */
export interface MiniScriptAddedServices {
  validation: {
    MiniScriptValidator: MiniScriptValidator
  }
  typir: TypirLangiumServices<MiniScriptAstType>
}

/**
 * Union of Langium default services and your custom services - use this as constructor parameter
 * of custom service classes.
 */
export type MiniScriptServices = LangiumServices & MiniScriptAddedServices

/**
 * Dependency injection module that overrides Langium default services and contributes the
 * declared custom services. The Langium defaults can be partially specified to override only
 * selected services, while the custom services must be fully specified.
 */
export function createMiniScriptModule(shared: LangiumSharedCoreServices): Module<MiniScriptServices, PartialLangiumServices & MiniScriptAddedServices> {
  return {
    lsp: {
      InlayHintProvider: services => new MiniScriptInlayHintProvider(services),
    },
    validation: {
      MiniScriptValidator: () => new MiniScriptValidator(),
    },
    // For type checking with Typir, configure the Typir & Typir-Langium services in this way:
    typir: () => createTypirLangiumServices(shared, reflection, new MiniScriptTypeSystem(), { /* customize Typir services here */ }),
  }
}

/**
 * Create the full set of services required by Langium.
 *
 * First inject the shared services by merging two modules:
 *  - Langium default shared services
 *  - Services generated by langium-cli
 *
 * Then inject the language-specific services by merging three modules:
 *  - Langium default language-specific services
 *  - Services generated by langium-cli
 *  - Services specified in this file
 *
 * @param context Optional module context with the LSP connection
 * @returns An object wrapping the shared services and the language-specific services
 */
export function createMiniScriptServices(context: DefaultSharedModuleContext): {
  shared: LangiumSharedServices
  miniscript: MiniScriptServices
} {
  const shared = inject(
    createDefaultSharedModule(context),
    MiniScriptGeneratedSharedModule,
  )

  const miniscript = inject(
    createDefaultModule({ shared }),
    MiniScriptGeneratedModule,
    createMiniScriptModule(shared),
  )
  shared.ServiceRegistry.register(miniscript)
  initializeLangiumTypirServices(miniscript, miniscript.typir) // initialize the Typir type system once
  if (!context.connection) {
    // We don't run inside a language server
    // Therefore, initialize the configuration provider instantly
    shared.workspace.ConfigurationProvider.initialized({})
  }
  return { shared, miniscript }
}
