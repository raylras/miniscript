import type { AstNode } from 'langium'
import type { ClassDecl } from '../generated/ast.js'

export interface Type { }

export class TypeVar implements Type {
  // for debug purpose
  private randid = Math.random().toString(16).substring(2, 10).padEnd(8, '0')

  constructor(public type?: Type) { }
  toString() { return this.type?.toString() ?? `Tvar@${this.randid}` }
}
export function typeVar() {
  return new TypeVar()
}

export class IntType implements Type {
  toString() {
    return 'Int'
  }
}
export function intType() {
  return new IntType()
}

export class StringType implements Type {
  toString() {
    return 'String'
  }
}
export function stringType() {
  return new StringType()
}

export class BoolType implements Type {
  toString() {
    return 'Bool'
  }
}
export function boolType() {
  return new BoolType()
}

export class ClassType implements Type {
  constructor(public decl: ClassDecl) { }
  toString() {
    return this.decl.name
  }
}
export function classType(decl: ClassDecl) {
  return new ClassType(decl)
}

export class FuncType implements Type {
  constructor(public paramTypes: Type[], public retType: Type) { }
  toString() { return `(${this.paramTypes.join(',')}) -> ${this.retType}` }
}
export function funcType(params: Type[], retType: Type) {
  return new FuncType(params, retType)
}

export class AnyType implements Type {
  toString() {
    return 'Any'
  }
}
export function anyType() {
  return new AnyType()
}

export class VoidType implements Type {
  toString() {
    return 'Void'
  }
}
export function voidType() {
  return new VoidType()
}

export class ErrorType implements Type {
  constructor(public msg?: string) { }
}
export function errorType(msg: string) {
  return new ErrorType(msg)
}

export class UnknownType implements Type { }
export function unknownType() {
  return new UnknownType()
}

export class Env {
  private bindings: Map<AstNode, Type> = new Map()
  insert(node: AstNode, type: Type): Type {
    this.bindings.set(node, type)
    return type
  }

  get(node: AstNode): Type | undefined {
    return this.bindings.get(node)
  }
}
