import type { AstNode, LangiumDocument } from 'langium'
import type { InlayHintAcceptor } from 'langium/lsp'
import type { TypirLangiumServices } from 'typir-langium'
import type { CancellationToken, InlayHint, InlayHintParams } from 'vscode-languageclient'
import type { MiniScriptAstType } from '../generated/ast.js'
import type { MiniScriptServices } from '../module.js'
import { GrammarUtils } from 'langium'
import { AbstractInlayHintProvider } from 'langium/lsp'
import { isType } from 'typir'
import { defineRules } from '../util.js'

type SourceMap = MiniScriptAstType
type RuleMap = { [K in keyof SourceMap]?: (node: SourceMap[K], acceptor: InlayHintAcceptor, typir: TypirLangiumServices<MiniScriptAstType>) => void }

export class MiniScriptInlayHintProvider extends AbstractInlayHintProvider {
  private readonly typir: TypirLangiumServices<MiniScriptAstType>

  constructor(services: MiniScriptServices) {
    super()
    this.typir = services.typir
  }

  override getInlayHints(document: LangiumDocument, params: InlayHintParams, cancelToken?: CancellationToken): Promise<InlayHint[] | undefined> {
    return super.getInlayHints(document, params, cancelToken)
  }

  override computeInlayHint(node: AstNode, acceptor: InlayHintAcceptor): void {
    this.rules(node.$type)?.call(this, node, acceptor, this.typir)
  }

  rules = defineRules<RuleMap>({
    VariableDeclaration(node, acceptor, typir) {
      if (node.type)
        return

      const nameCst = GrammarUtils.findNodeForProperty(node.$cstNode, 'name')
      if (!nameCst)
        return

      const type = typir.Inference.inferType(node)
      if (!isType(type))
        return

      acceptor({
        position: {
          line: nameCst.range.end.line,
          character: nameCst.range.end.character,
        },
        label: `: ${type.getUserRepresentation()}`,
        paddingLeft: true,
      })
    },

    ValueParameter(node, acceptor, typir) {
      if (node.type)
        return

      const nameCst = GrammarUtils.findNodeForProperty(node.$cstNode, 'name')
      if (!nameCst)
        return

      const type = typir.Inference.inferType(node)
      if (!isType(type))
        return

      acceptor({
        position: {
          line: nameCst.range.end.line,
          character: nameCst.range.end.character,
        },
        label: `: ${type.getUserRepresentation()}`,
        paddingLeft: true,
      })
    },
  })
}
