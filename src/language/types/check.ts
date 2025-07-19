import type { AstNode } from 'langium'
import type { MiniScriptAstType } from '../generated/ast.js'
import type { Env, Type } from './core.js'
import { defineRules } from '../rule-utils.js'
import { boolType, BoolType, FuncType, IntType, typeVar } from './core.js'
import { infer } from './infer.js'
import { unify } from './unify.js'

type SourceMap = MiniScriptAstType
type RuleMap = { [K in keyof SourceMap]?: (node: SourceMap[K], expected: Type, env: Env) => void }

const rules = defineRules<RuleMap>({
  BooleanLiteral(node, expected) {
    if (expected ! instanceof BoolType) {
      console.error('Expected a boolean type, but got: ', expected)
    }
  },

  VariableDecl(node, expected, env) {
    const initType = infer(node.initializer, env) ?? typeVar()
    unify(expected, initType)
  },

  ConditionalExpression(node, expected, env) {
    check(node.condExpr, boolType(), env)
    check(node.thenExpr, expected, env)
    check(node.elseExpr, expected, env)
  },

  IntegerLiteral(node, expected) {
    if (expected ! instanceof IntType) {
      console.error('Expected a int type, but got: ', expected)
    }
  },

  FunctionDecl(node, expected, env) {
    const _paramTypes = node.params.map(p => infer(p, env) ?? typeVar())
    const retType = infer(node.returnTypeRef, env) ?? typeVar()
    check(node.body, retType, env)
  },

  CallExpression(node, expected, env) {
    const funType = infer(node.receiver, env)
    if (funType instanceof FuncType) {
      const argTypes = node.arguments.map(a => infer(a, env) ?? typeVar())
      for (let i = 0; i < funType.paramTypes.length; i++) {
        unify(argTypes[i], funType.paramTypes[i])
        check(node.arguments[i], funType.paramTypes[i], env)
      }

      unify(expected, funType.retType)
    }
    else {
      console.error('Expected a function type, but got:', expected)
    }
  },
})

export function check(node: AstNode, expected: Type, env: Env) {
  rules(node?.$type)?.(node, expected, env)
}
