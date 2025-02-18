
use std::fmt::Display;
use crate::stable::{Token, TokenKind};

impl Display for Token {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Token::Integer(i) => format!("{i}"),
            Token::Color(_) => todo!(),
            Token::Float(f) => format!("{f}"),
            Token::StringLiteral(s) => {
				// ...does construct not have any way to escape quotes?
				let s = s
					.replace("\n", "$n")
					.replace("\"", "$q")
					.replace("\t", "$t");
				format!("\"{s}\"")
			},
            Token::Identifier(s) => s.to_owned(),
            Token::VariableName(s) => s.to_owned(),
            Token::Token(t) => match t {
                TokenKind::Null => "",
                TokenKind::AnyBinaryOperator => panic!(),
                TokenKind::AnyFunction => panic!(),
                TokenKind::AnyValue => panic!(),
                TokenKind::Integer => panic!(),
                TokenKind::Float => panic!(),
                TokenKind::StringLiteral => panic!(),
                TokenKind::Identifier => panic!(),
                TokenKind::Array => unimplemented!(),
                TokenKind::VariableName => panic!(),
                TokenKind::LeftParen => "(",
                TokenKind::RightParen => ")",
                TokenKind::Comma => ",",
                TokenKind::Dot => ".",
                TokenKind::LeftBrace => "{",
                TokenKind::RightBrace => "}",
                TokenKind::At => "@", // or "at"
                TokenKind::Add => "+",
                TokenKind::Subtract => "-",
                TokenKind::Multiply => "*",
                TokenKind::Divide => "/",
                TokenKind::Mod => "%",
                TokenKind::Power => "^",
                TokenKind::Sin => "sin",
                TokenKind::Cos => "cos",
                TokenKind::Tan => "tan",
                TokenKind::Sqrt => "sqrt",
                TokenKind::FuncStr => "str",
                TokenKind::FuncInt => "int",
                TokenKind::FuncFloat => "float", // or "num"
                TokenKind::Equal => "=",
                TokenKind::Less => "<",
                TokenKind::Greater => ">",
                TokenKind::LessEqual => "<=",
                TokenKind::GreaterEqual => ">=",
                TokenKind::NotEqual => "!=", // or "<>"
                TokenKind::Conditional => "?",
                TokenKind::Colon => ":",
                TokenKind::And => "&", // or "and"
                TokenKind::Or => "|", // or "or"
                TokenKind::Asin => "asin",
                TokenKind::Acos => "acos",
                TokenKind::Atan => "atan",
                TokenKind::Abs => "abs",
                TokenKind::Exp => "exp",
                TokenKind::Ln => "log", // or "ln"
                TokenKind::Log10 => "log10",
                TokenKind::Floor => "floor",
                TokenKind::Ceil => "ceil",
                TokenKind::Round => "round",
                TokenKind::Random => "random",
                TokenKind::Len => "len",
                TokenKind::Whitespace => " ",
                TokenKind::Color => panic!(),
            }.to_string(),
        };
		f.write_str(&s)
    }
}
