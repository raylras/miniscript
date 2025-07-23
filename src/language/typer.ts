import type { AstNode } from 'langium'
import type { CreateParameterDetails, FunctionType, InferOperatorWithMultipleOperands, InferOperatorWithSingleOperand, TypeInitializer } from 'typir'
import type { LangiumTypeSystemDefinition, TypirLangiumServices } from 'typir-langium'
import type { FunctionDeclaration, MiniScriptAstType } from './generated/ast'
import { assertUnreachable, InferenceRuleNotApplicable, NO_PARAMETER_NAME } from 'typir'
import { CallExpression, InfixExpression, isBooleanLiteral, isFunctionDeclaration, isIntegerLiteral, isNamedType, isReferenceExpression, isReturnStatement, isStringLiteral, PrefixExpression } from './generated/ast'

export class MiniScriptTypeSystem implements LangiumTypeSystemDefinition<MiniScriptAstType> {
  onInitialize(typir: TypirLangiumServices<MiniScriptAstType>): void {
    // primitive types
    // typeBool, typeInt and typeString are specific types for MiniScript, ...
    const typeBool = typir.factory.Primitives.create({ primitiveName: 'Bool' })
      .inferenceRule({ filter: isBooleanLiteral })
      .inferenceRule({ filter: isNamedType, matching: node => node.ref.$refText === 'Bool' })
      .finish()

    const typeInt = typir.factory.Primitives.create({ primitiveName: 'Int' })
      .inferenceRule({ filter: isIntegerLiteral })
      .inferenceRule({ filter: isNamedType, matching: node => node.ref.$refText === 'Int' })
      .finish()

    const _typeString = typir.factory.Primitives.create({ primitiveName: 'String' })
      .inferenceRule({ filter: isStringLiteral })
      .inferenceRule({ filter: isNamedType, matching: node => node.ref.$refText === 'String' })
      .finish()

    const typeAny = typir.factory.Top.create({}).finish()

    // extract inference rules, which is possible here thanks to the unified structure of the Langium grammar (but this is not possible in general!)
    const infixInferenceRule: InferOperatorWithMultipleOperands<AstNode, InfixExpression> = {
      languageKey: InfixExpression,
      matching: (node: InfixExpression, name: string) => node.op === name,
      operands: (node: InfixExpression, _name: string) => [node.left, node.right],
      validateArgumentsOfCalls: true,
    }

    const prefixInferenceRule: InferOperatorWithSingleOperand<AstNode, PrefixExpression> = {
      languageKey: PrefixExpression,
      matching: (node: PrefixExpression, name: string) => node.op === name,
      operand: (node: PrefixExpression, _name: string) => node.expr!,
      validateArgumentsOfCalls: true,
    }

    // binary operators: numbers => number
    for (const operator of ['+', '-', '*', '/', '%']) {
      typir.factory.Operators.createBinary({ name: operator, signature: { left: typeInt, right: typeInt, return: typeInt } }).inferenceRule(infixInferenceRule).finish()
    }

    // binary operators: numbers => boolean
    for (const operator of ['<', '<=', '>', '>=']) {
      typir.factory.Operators.createBinary({ name: operator, signature: { left: typeInt, right: typeInt, return: typeBool } }).inferenceRule(infixInferenceRule).finish()
    }

    // binary operators: bools => bool
    for (const operator of ['&&', '||']) {
      typir.factory.Operators.createBinary({ name: operator, signature: { left: typeBool, right: typeBool, return: typeBool } }).inferenceRule(infixInferenceRule).finish()
    }

    // ==, != for all data types (the warning for different types is realized below)
    for (const operator of ['==', '!=']) {
      typir.factory.Operators.createBinary({ name: operator, signature: { left: typeAny, right: typeAny, return: typeBool } })
        .inferenceRule({
          ...infixInferenceRule,
          // show a warning to the user, if something like "3 == false" is compared, since different types already indicate, that the IF condition will be evaluated to false
          validation: (node, _operatorName, _operatorType, accept, typir) => typir.validation.Constraints.ensureNodeIsEquals(node.left, node.right, accept, (actual, expected) => ({
            message: `This comparison will always return '${node.op === '==' ? 'false' : 'true'}' as '${node.left.$cstNode?.text}' and '${node.right.$cstNode?.text}' have the different types '${actual.name}' and '${expected.name}'.`,
            languageNode: node, // inside the BinaryExpression ...
            languageProperty: 'op', // ... mark the '==' or '!=' token, i.e. the 'operator' property
            severity: 'warning',
            // (The use of "node.right" and "node.left" without casting is possible, since the type checks of the given properties for the actual inference rule are reused for the validation.)
          })),
        })
        .finish()
    }

    // = for SuperType = SubType (Note that this implementation of LOX realized assignments as operators!)
    typir.factory.Operators.createBinary({ name: '=', signature: { left: typeAny, right: typeAny, return: typeAny } })
      .inferenceRule({
        ...infixInferenceRule,
        // this validation will be checked for each call of this operator!
        validation: (node, _opName, _opType, accept, typir) => typir.validation.Constraints.ensureNodeIsAssignable(node.right, node.left, accept, (actual, expected) => ({
          message: `The expression '${node.right.$cstNode?.text}' of type '${actual.name}' is not assignable to '${node.left.$cstNode?.text}' with type '${expected.name}'`,
          languageProperty: 'value',
        })),
      })
      .finish()

    // unary operators
    typir.factory.Operators.createUnary({ name: '!', signature: { operand: typeBool, return: typeBool } }).inferenceRule(prefixInferenceRule).finish()
    typir.factory.Operators.createUnary({ name: '-', signature: { operand: typeInt, return: typeInt } }).inferenceRule(prefixInferenceRule).finish()

    // additional inference rules for ...
    typir.Inference.addInferenceRulesForAstNodes({
      // ... member calls
      CallExpression: (languageNode) => {
        if (isReferenceExpression(languageNode.receiver)) {
          const ref = languageNode.receiver.ref.ref
          if (isFunctionDeclaration(ref)) {
            const _type = typir.Inference.inferType(ref)
            return ref
          }
          else {
            return InferenceRuleNotApplicable
          }
        }
        else {
          return InferenceRuleNotApplicable
        }
      },
      // ... variable declarations
      VariableDeclaration: (languageNode) => {
        if (languageNode.typeRef) {
          return languageNode.typeRef // the user declared this variable with a type
        }
        else if (languageNode.initializer) {
          return languageNode.initializer // the user didn't declare a type for this variable => do type inference of the assigned value instead!
        }
        else {
          return InferenceRuleNotApplicable // this case is impossible, there is a validation in the Langium LOX validator for this case
        }
      },
      // ... parameters
      ValueParameter: (languageNode) => {
        if (languageNode.typeRef) {
          return languageNode.typeRef
        }
        else if (languageNode.defaultValue) {
          return languageNode.defaultValue
        }
        else {
          return typeAny
        }
      },
      ReferenceExpression: (languageNode) => {
        return languageNode.ref.ref ?? InferenceRuleNotApplicable
      },
      ReturnStatement: (languageNode) => {
        return languageNode.expr ?? InferenceRuleNotApplicable
      },
      BlockStatement: (languageNode) => {
        return languageNode.statements.find(isReturnStatement) ?? InferenceRuleNotApplicable
      },
    })
  }

  onNewAstNode(languageNode: AstNode, typir: TypirLangiumServices<MiniScriptAstType>): void {
    // define types which are declared by the users of LOX => investigate the current AST

    // function types: they have to be updated after each change of the Langium document, since they are derived from FunctionDeclarations!
    if (isFunctionDeclaration(languageNode)) {
      this.createFunctionDetails(languageNode, typir) // this logic is reused for methods of classes, since the LOX grammar defines them very similar
    }
  }

  protected createFunctionDetails(node: FunctionDeclaration, typir: TypirLangiumServices<MiniScriptAstType>): TypeInitializer<FunctionType, AstNode> {
    const config = typir.factory.Functions
      .create({
        functionName: node.name,
        outputParameter: { name: NO_PARAMETER_NAME, type: node.returnTypeRef ?? node.body },
        inputParameters: node.params.map(p => ({ name: p.name, type: p.typeRef ?? p.defaultValue ?? p } satisfies CreateParameterDetails<AstNode>)),
        associatedLanguageNode: node,
      })
    // inference rule for function declaration:
      .inferenceRuleForDeclaration({
        languageKey: node.$type,
        matching: (languageNode: FunctionDeclaration) => languageNode === node, // only the current function/method declaration matches!
      })
    /**
     * inference rule for funtion/method calls:
     * - inferring of overloaded functions works only, if the actual arguments have the expected types!
     * - (inferring calls to non-overloaded functions works independently from the types of the given parameters)
     * - additionally, validations for the assigned values to the expected parameter( type)s are derived
     */
    if (isFunctionDeclaration(node)) {
      config.inferenceRuleForCalls({
        languageKey: CallExpression,
        matching: (languageNode: CallExpression) => isReferenceExpression(languageNode.receiver),
        inputArguments: (languageNode: CallExpression) => languageNode.arguments,
        validateArgumentsOfFunctionCalls: true,
      })
    }
    else {
      assertUnreachable(node)
    }
    return config.finish()
  }
}
