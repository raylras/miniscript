import type { AstNode, LangiumDocument } from 'langium'
import type { InlayHintAcceptor } from 'langium/lsp'
import type { CancellationToken, InlayHint, InlayHintParams } from 'vscode-languageclient'
import type { MiniScriptAstType } from '../generated/ast.js'
import { AstUtils, GrammarUtils } from 'langium'
import { AbstractInlayHintProvider } from 'langium/lsp'
import { defineRules } from '../rule-utils.js'

type SourceMap = MiniScriptAstType
type RuleMap = { [K in keyof SourceMap]?: (node: SourceMap[K], acceptor: InlayHintAcceptor) => void }

export class MiniScriptInlayHintProvider extends AbstractInlayHintProvider {
  override getInlayHints(document: LangiumDocument, params: InlayHintParams, cancelToken?: CancellationToken): Promise<InlayHint[] | undefined> {
    return super.getInlayHints(document, params, cancelToken)
  }

  override computeInlayHint(node: AstNode, acceptor: InlayHintAcceptor): void {
    this.rules(node.$type)?.call(this, node, acceptor)
  }

  rules = defineRules<RuleMap>({
    VariableDecl(node, acceptor) {
      if (node.typeRef)
        return
      const doc = AstUtils.getDocument(node)
      const type = doc.env.get(node)
      if (!type)
        return

      const nameNode = GrammarUtils.findNodeForProperty(node.$cstNode, 'name')
      if (!nameNode)
        return
      acceptor({
        position: {
          line: nameNode?.range.end.line,
          character: nameNode?.range.end.character,
        },
        label: `: ${type.toString()}`,
        paddingLeft: true,
      })
    },
  })
}
