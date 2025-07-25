grammar MiniScript

type NamedElement = ClassDeclaration | FunctionDeclaration | VariableDeclaration | ValueParameter | LambdaParameter | TypeParameter

entry MiniScript:
    ( classes+=ClassDeclaration 
    | functions+=FunctionDeclaration
    | statements+=Statement
    )*
;

ClassDeclaration:
    'class' name=ID (':' superClass=[ClassDeclaration:ID])? ('<' typeParams+=TypeParameter (',' typeParams+=TypeParameter)* '>')? 
    body=BlockStatement?
;

TypeParameter:
    name=ID
;

FunctionDeclaration:
    'fun' name=ID 
    (
        '<' typeParams+=TypeParameter (',' typeParams+=TypeParameter)* '>'
    )?
    (
        '(' (params+=ValueParameter (',' params+=ValueParameter)*)? ')' 
    )
    (
        '->' returnType=Type
    )?
    body=BlockStatement
;

ValueParameter:
    name=ID (':' type=Type)? ('=' defaultValue=Expression)?
;

VariableDeclaration:
    'let' name=ID (':' type=Type)? ('=' initializer=Expression)?
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

Assignment infers Expression:
    ConditionalExpression ({infer Assignment.left=current} op=('='|'+='|'-='|'*='|'/='|'%='|'|='|'&='|'^='|'~=') right=ConditionalExpression)?
;

ConditionalExpression infers Expression:
    LogicalExpression ({infer ConditionalExpression.cond=current} '?' then=LogicalExpression ':' altr=LogicalExpression)*
;

LogicalExpression:
    BitwiseExpression ({infer InfixExpression.left=current} op=('&&'|'||') right=BitwiseExpression)*
;

BitwiseExpression:
    RelationalExpression ({infer InfixExpression.left=current} op=('&'|'|'|'^') right=RelationalExpression)*
;

RelationalExpression:
    AdditiveExpression ({infer InfixExpression.left=current} op=('=='|'!='|'<'|'<='|'>'|'>=') right=AdditiveExpression)*
;

AdditiveExpression:
    MultiplicativeExpression ({infer InfixExpression.left=current} op=('+'|'-'|'%'|'~') right=MultiplicativeExpression)*
;

MultiplicativeExpression:
    PostfixExpression ({infer InfixExpression.left=current} op=('*'|'/'|'%') right=PostfixExpression)*
;

PostfixExpression:
    PrimaryExpression
    (
        // Member call
        (
            {infer MemberCall.previous=current}
            // Member call with function call
            (
                '.' element=[NamedElement:ID] 
                (
                    explicitOperationCall?='('
                        (args+=Expression (',' args+=Expression)* ','?)?
                    ')'
                )?
                // Chained function call
                |
                (
                    explicitOperationCall?='('
                        (args+=Expression (',' args+=Expression)* ','?)?
                    ')'
                )
            )
        )
        // Int Range
        |
        (
            {infer InfixExpression.left=current} op=('..') right=Expression
        )
        // Type cast
        |
        (
            {infer TypeCastExpression.expr=current} 'as' type=Type
        ) 
        // Indexing
        |
        (
            {infer IndexingExpression.receiver=current} '[' index=Expression ']'
        )
        // Instance of
        |
        (
            {infer IsExpression.expr=current} 'is' type=ReferenceType
        )
    )*
;

PrimaryExpression:
    PrefixExpression | ParenthesizedExpression | FunctionExpression | ReferenceExpression | LiteralExpression | FeatureCall
;

FeatureCall:
	{infer MemberCall}
	(element=[NamedElement:ID] | element=[NamedElement:'this'] | element=[NamedElement:'super'])
    // Optional function call after referencing an element
    (explicitOperationCall?='('
	(
	    args+=Expression (',' args+=Expression)*
	)?
	')')?
;

PrefixExpression:
    op=('!'|'+'|'-') expr=Expression
;

ParenthesizedExpression:
    '(' expr=Expression ')'
;

LiteralExpression:
    StringLiteral | NumberLiteral | BooleanLiteral | ArrayLiteral | NullLiteral
;

FunctionExpression:
    '(' (params+=LambdaParameter (',' params+=LambdaParameter)*)? ','? ')' '->' body=Statement
;

LambdaParameter:
    name=ID (':' type=Type)?
;

ArrayLiteral:
    '[' (values+=Expression (',' values+=Expression)* ','?)? ']'
;

ReferenceExpression:
    value=[NamedElement:ID]
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

Type:
    PrimaryType ('[' ({infer ArrayTypeReference.value=current} ']'))*
;

fragment PrimaryType:
    FunctionType | ReferenceType
;

FunctionType:
    '(' (params+=Type (',' params+=Type)*)? ','? ')' '->' returnType=Type
;

ReferenceType:
    value=[NamedElement:ID] ('<' args+=Type (',' args+=Type)* '>')?
;

terminal ID: /[_a-zA-Z][\w_]*/;
terminal FLOATING: /[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?[fFdD]?/;
terminal INTEGER: /(0[xX][0-9a-fA-F]+|[0-9]+)[lL]?/;
terminal STRING: /"(\\.|[^"\\])*"/;

hidden terminal WS: /\s+/;
hidden terminal BLOCK_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal LINE_COMMENT: /\/\/[^\n\r]*/;
