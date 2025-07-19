import type { AstNode } from 'langium'
import type { MiniScriptAstType } from '../generated/ast.js'
import type { Env, Type } from './core.js'
import { AstUtils } from 'langium'
import { defineRules } from '../rule-utils.js'
import { check } from './check.js'
import { boolType, classType, funcType, intType, stringType, typeVar, voidType } from './core.js'
import { unify } from './unify.js'

type SourceMap = MiniScriptAstType
type RuleMap = { [K in keyof SourceMap]?: (node: SourceMap[K], env: Env) => Type | undefined }

const rules = defineRules<RuleMap>({
  MiniScript(node, env) {
    for (const topLevel of AstUtils.streamContents(node)) {
      infer(topLevel, env)
      // if (isVariableDecl(topLevel)) {
      //     let expected = infer(topLevel.typeRef, env) ?? typeVar()
      //     check(topLevel.initializer, expected, env)
      //     env.insert(node, expected)
      // }
    }
    return undefined
  },
  IntegerLiteral() {
    return intType()
  },
  StringLiteral() {
    return stringType()
  },
  ConditionalExpression(node, env) {
    check(node.condExpr, boolType(), env)

    const thenType = infer(node.thenExpr, env)
    const _elseType = infer(node.elseExpr, env)

    return thenType
  },
  InfixExpression(node, env) {
    if (node.op === '+') {
      const lhsType = infer(node.left, env)
      const _rhsType = infer(node.right, env)
      return lhsType
    }
    return undefined
  },

  NamedType(node, env) {
    return infer(node.ref.ref, env)
  },

  ClassDecl(node, env) {
    if (node.name === 'Int') {
      return env.insert(node, intType())
    }
    else {
      return env.insert(node, classType(node))
    }
  },

  FunctionDecl(node, env) {
    const paramTypes = node.params.map(p => infer(p, env) ?? typeVar())
    const retType = infer(node.returnTypeRef, env) ?? typeVar()
    const bodyType = infer(node.body, env) ?? voidType()
    unify(retType, bodyType)
    return funcType(paramTypes, retType)
  },

  ValueParameter(node, env) {
    return infer(node.typeRef, env) ?? typeVar()
  },

  BlockStatement(node, env) {
    const types = node.statements.map(s => infer(s, env))
    return types.pop() ?? voidType()
  },

  ReturnStatement(node, env) {
    return infer(node.expr, env) ?? voidType()
  },

  VariableDecl(node, env) {
    const expected = infer(node.typeRef, env) ?? typeVar()
    check(node.initializer, expected, env)
    return env.insert(node, expected)
  },

  ReferenceExpression(node, env) {
    return infer(node.ref.ref, env) ?? typeVar()
  },
})

export function infer(node: AstNode | undefined, env: Env): Type | undefined {
  return rules(node?.$type)?.(node, env)
}
