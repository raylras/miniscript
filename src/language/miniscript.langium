grammar MiniScript

interface Named {
    name: string
}

interface ClassDeclaration extends Named {
    superClass: @ClassDeclaration
    typeParams: TypeParameter[]
    body: BlockStatement
}

interface FunctionDeclaration extends Named {
    params: ValueParameter[]
    returnTypeRef?: TypeReference
    body: BlockStatement
}

interface VariableDeclaration extends Named {
    typeRef?: TypeReference
    initializer?: Expression
}

interface ValueParameter extends Named {
    typeRef?: TypeReference
    defaultValue?: Expression
}

interface TypeParameter extends Named {}

interface TypeReference {}

entry MiniScript:
    ( classes+=ClassDeclaration 
    | functions+=FunctionDeclaration
    | statements+=Statement
    )*
;

ClassDeclaration returns ClassDeclaration:
    'class' name=ID (':' superClass=[ClassDeclaration:ID])? ('<' typeParams+=TypeParameter (',' typeParams+=TypeParameter)* '>')? 
    body=BlockStatement?
;

TypeParameter returns TypeParameter:
    name=ID
;

FunctionDeclaration returns FunctionDeclaration:
    'fun' name=ID '(' (params+=ValueParameter (',' params+=ValueParameter)*)? ')' ('->' returnTypeRef=TypeReference )?
    body=BlockStatement
;

ValueParameter returns ValueParameter:
    name=ID (':' typeRef=TypeReference)? ('=' defaultValue=Expression)?
;

VariableDeclaration returns VariableDeclaration:
    'let' name=ID (':' typeRef=TypeReference)? ('=' initializer=Expression)?
;

Statement:
    VariableDeclaration | ReturnStatement | BlockStatement | ExpressionStatement
;

BlockStatement:
    '{' statements+= Statement '}'
;

ReturnStatement:
    'return' expr=Expression?
;

ExpressionStatement:
    expr=Expression
;

Expression:
    Assignment
;

Assignment:
    ConditionalExpression ({infer Assignment.left=current} op=('='|'+='|'-='|'~='|'*='|'/='|'%='|'|='|'&='|'^=') right=Assignment)?
;

ConditionalExpression:
    OrOrExpression ({infer ConditionalExpression.condExpr=current} '?' thenExpr=ConditionalExpression ':' elseExpr=ConditionalExpression)?
;

OrOrExpression:
    AndAndExpression ({infer InfixExpression.left=current} op='||' right=AndAndExpression)*
;

AndAndExpression:
    OrExpression ({infer InfixExpression.left=current} op='&&' right=OrExpression)*
;

OrExpression:
    XorExpression ({infer InfixExpression.left=current} op='|' right=XorExpression)*
;

XorExpression:
    AndExpression ({infer InfixExpression.left=current} op='^' right=AndExpression)*
;

AndExpression:
    RelationalExpression ({infer InfixExpression.left=current} op='&' right=RelationalExpression)*
;

RelationalExpression:
    AdditiveExpression ({infer InfixExpression.left=current} op=('=='|'!='|'<'|'<='|'>'|'>=') right=AdditiveExpression)*
;

AdditiveExpression:
    MultiplicativeExpression ({infer InfixExpression.left=current} op=('+'|'-'|'~') right=MultiplicativeExpression)*
;

MultiplicativeExpression:
    PrefixExpression ({infer InfixExpression.left=current} op=('*'|'/'|'%') right=PrefixExpression)*
;

PrefixExpression:
    ({infer PrefixExpression} op=('!'|'-') expr=PrefixExpression) | PostfixExpression
;

PostfixExpression:
    PrimaryExpression (
        ({infer MemberAccess.receiver=current} '.' target=[Named:ID]) |
        ({infer InfixExpression.left=current} op=('..') right=Expression) |
        ({infer TypeCastExpression.expr=current} 'as' typeRef=TypeReference) |
        ({infer IndexingExpression.receiver=current} '[' argument=Expression ']') |
        ({infer CallExpression.receiver=current} '(' (arguments+=Expression (',' arguments+=Expression)* ','?)? ')') |
        ({infer IsExpression.expr=current} 'is' typeRef=NamedType)
    )*
;

PrimaryExpression:
    ParenthesizedExpression | FunctionExpression | ReferenceExpression | LiteralExpression
;

ParenthesizedExpression:
    '(' expr=Expression ')'
;

LiteralExpression:
    StringLiteral | NumberLiteral | BooleanLiteral | ArrayLiteral | NullLiteral
;

FunctionExpression:
    '(' (parameters+=ValueParameter (',' parameters+=ValueParameter)*)? ','? ')' '->' body=Statement
;

ArrayLiteral:
    '[' (values+=Expression (',' values+=Expression)* ','?)? ']'
;

ReferenceExpression:
    ref=[Named:ID]
;

NumberLiteral:
    IntegerLiteral | FloatingLiteral
;

IntegerLiteral:
    value=INTEGER
;

FloatingLiteral:
    value=FLOATING
;

BooleanLiteral:
    value?='true' | 'false'
;

StringLiteral:
    value=STRING
;

NullLiteral:
    value='null'
;

TypeReference returns TypeReference:
    PrimaryType ('[' ({infer ArrayTypeReference.value=current} ']'))*
;

fragment PrimaryType returns TypeReference:
    FunctionType | NamedType
;

FunctionType:
    '(' (params+=TypeReference (',' params+=TypeReference)*)? ','? ')' '->' returnType=TypeReference
;

NamedType:
    ref=[Named:ID] ('<' typeArgs+=TypeReference (',' typeArgs+=TypeReference)* '>')?
;

terminal ID: /[_a-zA-Z][\w_]*/;
terminal FLOATING: /[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?[fFdD]?/;
terminal INTEGER: /(0[xX][0-9a-fA-F]+|[0-9]+)[lL]?/;
terminal STRING: /"(\\.|[^"\\])*"/;

hidden terminal WS: /\s+/;
hidden terminal BLOCK_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal LINE_COMMENT: /\/\/[^\n\r]*/;
