import type { Type } from './core.js'
import { IntType, TypeVar } from './core.js'

export function unify(lhs: Type, rhs: Type) {
  if (lhs instanceof TypeVar) {
    if (rhs instanceof IntType) {
      lhs.type = rhs
    }
    else if (rhs instanceof TypeVar) {
      lhs.type = rhs.type
    }
  }
  else if (rhs instanceof TypeVar) {
    if (lhs instanceof IntType) {
      rhs.type = lhs
    }
    else if (lhs instanceof TypeVar) {
      lhs.type = rhs.type
    }
  }
}
