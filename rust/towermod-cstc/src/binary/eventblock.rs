use super::super::stable::*;
use num_traits::{FromPrimitive};
use anyhow::Result;
use super::block::{BlockReader, BlockWriter};

pub fn deserialize_eventblock(buffer: &[u8]) -> Result<EventBlock> {
	let mut reader = BlockReader::new(buffer);
	let (sheet_names, layout_sheets) = reader.read_eventblock();
	Ok(EventBlock { sheet_names, layout_sheets })
}

pub fn serialize_eventblock(data: &EventBlock) -> Result<Vec<u8>> {
	let mut writer = BlockWriter::new();
	writer.write_eventblock(data);
	Ok(writer.buffer)
}


impl PartialEq for Event {
    fn eq(&self, other: &Self) -> bool {
        self.line_number == other.line_number && self.sheet_id == other.sheet_id && self.conditions == other.conditions && self.actions == other.actions && self.events == other.events
    }
}
impl PartialEq for EventCondition {
    fn eq(&self, other: &Self) -> bool {
        self.object_id == other.object_id && self.cond_id == other.cond_id && self.negated == other.negated && self.movement_id == other.movement_id && self.params == other.params
    }
}
impl PartialEq for EventAction {
    fn eq(&self, other: &Self) -> bool {
        self.object_id == other.object_id && self.action_id == other.action_id && self.movement_id == other.movement_id && self.params == other.params
    }
}
impl PartialEq for Token {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (Self::Integer(l0), Self::Integer(r0)) => l0 == r0,
            (Self::Color(l0), Self::Color(r0)) => l0 == r0,
            (Self::Float(l0), Self::Float(r0)) => l0 == r0,
            (Self::StringLiteral(l0), Self::StringLiteral(r0)) => l0 == r0,
            (Self::Identifier(l0), Self::Identifier(r0)) => l0 == r0,
            (Self::VariableName(l0), Self::VariableName(r0)) => l0 == r0,
            (Self::Token(l0), Self::Token(r0)) => l0 == r0,
            _ => false,
        }
    }
}
impl PartialEq for TokenKind {
    fn eq(&self, other: &Self) -> bool {
        core::mem::discriminant(self) == core::mem::discriminant(other)
    }
}
impl PartialEq for EventGroup {
    fn eq(&self, other: &Self) -> bool {
        self.active == other.active && self.name == other.name && self.events == other.events
    }
}
impl PartialEq for SomeEvent {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (Self::Event(l0), Self::Event(r0)) => l0 == r0,
            (Self::EventGroup(l0), Self::EventGroup(r0)) => l0 == r0,
            (Self::EventInclude(l0), Self::EventInclude(r0)) => l0 == r0,
            _ => false,
        }
    }
}

impl BlockReader<'_> {
	fn read_eventblock(&mut self) -> (Vec<String>, Vec<Vec<SomeEvent>>) {
		let event_sheet_count = self.read_u32();
		let mut sheet_names: Vec<String> = Vec::with_capacity(event_sheet_count as usize);
		for _ in 0..event_sheet_count {
			sheet_names.push(self.read_string());
		}

		let layout_count = self.read_i32();
		let mut layout_sheets = Vec::with_capacity(layout_count as usize);
		for _ in 0..layout_count {
			layout_sheets.push(self.read_layout_events());
		}

		(sheet_names, layout_sheets)
	}

	fn read_layout_events(&mut self) -> Vec<SomeEvent> {
		let mut events: Vec<SomeEvent> = Vec::new();

		assert_eq!(self.read_u8(), CAP_BEGINEVENTLIST);
		while self.check_u8() != CAP_ENDEVENTLIST {
			let event = self.read_any_event();
			events.push(event);
		}
		assert_eq!(self.read_u8(), CAP_ENDEVENTLIST);
		events
	}

	fn read_any_event(&mut self) -> SomeEvent {
		match self.check_u8() {
			CAP_BEGINEVENT => SomeEvent::Event(self.read_event()),
			CAP_BEGINGROUP => SomeEvent::EventGroup(self.read_event_group()),
			_ => panic!(),
		}
	}

	fn read_event(&mut self) -> Event {
		assert_eq!(self.read_u8(), CAP_BEGINEVENT);
		let line_number = self.read_i32();
		let sheet_id = self.read_i32();
		assert_eq!(self.read_u8(), CAP_BEGINCONDITIONS);
		let mut conditions: Vec<EventCondition> = Vec::new();
		while self.check_u8() != CAP_ENDCONDITIONS {
			conditions.push(self.read_condition());
		}
		assert_eq!(self.read_u8(), CAP_ENDCONDITIONS);
		assert_eq!(self.read_u8(), CAP_BEGINACTIONS);
		let mut actions: Vec<EventAction> = Vec::new();
		while self.check_u8() != CAP_ENDACTIONS {
			actions.push(self.read_action());
		}
		assert_eq!(self.read_u8(), CAP_ENDACTIONS);
		// Sub-events
		let mut events = Vec::new();
		while self.check_u8() != CAP_ENDEVENT {
			events.push(self.read_any_event());
		}
		assert_eq!(self.read_u8(), CAP_ENDEVENT);
		Event { line_number, sheet_id, conditions, actions, events }
	}

	fn read_condition(&mut self) -> EventCondition {
		assert_eq!(self.read_u8(), CAP_BEGINCONDITION);
		let object_id = self.read_i32();
		let cond_id = self.read_i32();
		let negated = self.read_u8() == 1;
		let movement_id = self.read_i32();
		let param_count = self.read_u32();
		let mut params: Vec<Vec<Token>> = Vec::with_capacity(param_count as usize);
		for _ in 0..param_count {
			params.push(self.read_parameter());
		}
		assert_eq!(self.read_u8(), CAP_ENDCONDITION);
		EventCondition { object_id, cond_id, movement_id, negated, params }
	}

	fn read_action(&mut self) -> EventAction {
		assert_eq!(self.read_u8(), CAP_BEGINACTION);
		let object_id = self.read_i32();
		let action_id = self.read_i32();
		let movement_id = self.read_i32();

		let param_count = self.read_u32();
		let mut params: Vec<Vec<Token>> = Vec::with_capacity(param_count as usize);
		for _ in 0..param_count {
			params.push(self.read_parameter());
		}
		assert_eq!(self.read_u8(), CAP_ENDACTION);
		EventAction { object_id, action_id, movement_id, params }
	}

	fn read_parameter(&mut self) -> Vec<Token> {
		let token_count = self.read_i32();
		let mut tokens: Vec<Token> = Vec::with_capacity(token_count as usize);
		for _ in 0..token_count {
			let token_id = TokenKind::from_i32(self.read_i32()).unwrap();
			tokens.push(match token_id {
				// Construct serializes Color with the same token ID of Integer
				TokenKind::Integer => Token::Integer(self.read_i64()),
				TokenKind::Float => Token::Float(self.read_f64()),
				TokenKind::StringLiteral =>  Token::StringLiteral(self.read_string()),
				TokenKind::Identifier =>  Token::Identifier(self.read_string()),
				TokenKind::VariableName =>  Token::VariableName(self.read_string()),
				_ => Token::Token(token_id),
			});
		}
		tokens
	}

	fn read_event_group(&mut self) -> EventGroup {
		assert_eq!(self.read_u8(), CAP_BEGINGROUP);
		let active = self.read_u8() == 1;
		let name = self.read_string();
		// Sub-events
		let mut events = Vec::new();
		while self.check_u8() != CAP_ENDGROUP {
			events.push(self.read_any_event());
		}
		assert_eq!(self.read_u8(), CAP_ENDGROUP);
		EventGroup { active, name, events }
	}
}

impl BlockWriter {
	fn write_eventblock(&mut self, data: &EventBlock) {
		self.write_u32(data.sheet_names.len() as u32);
		for name in &data.sheet_names {
			self.write_string(name);
		}
		self.write_i32(data.layout_sheets.len() as i32);
		for layout_sheet in &data.layout_sheets {
			self.write_event_sheet(layout_sheet);
		}
	}

	fn write_event_sheet(&mut self, event_sheet: &Vec<SomeEvent>) {
		self.write_u8(CAP_BEGINEVENTLIST);
		for event in event_sheet {
			self.write_any_event(event);
		}
		self.write_u8(CAP_ENDEVENTLIST);
	}

	fn write_any_event(&mut self, event: &SomeEvent) {
		match event {
			SomeEvent::Event(event) => self.write_event(event),
			SomeEvent::EventGroup(group) => self.write_event_group(group),
			_ => panic!(),
		}
	}

	fn write_event(&mut self, event: &Event) {
		self.write_u8(CAP_BEGINEVENT);
		self.write_i32(event.line_number);
		self.write_i32(event.sheet_id);
		self.write_u8(CAP_BEGINCONDITIONS);
		for cond in &event.conditions {
			self.write_condition(cond);
		}
		self.write_u8(CAP_ENDCONDITIONS);
		self.write_u8(CAP_BEGINACTIONS);
		for action in &event.actions {
			self.write_action(action);
		}
		self.write_u8(CAP_ENDACTIONS);
		for event in &event.events {
			self.write_any_event(event);
		}
		self.write_u8(CAP_ENDEVENT);
	}

	fn write_condition(&mut self, cond: &EventCondition) {
		self.write_u8(CAP_BEGINCONDITION);
		self.write_i32(cond.object_id);
		self.write_i32(cond.cond_id);
		self.write_u8(cond.negated as u8);
		self.write_i32(cond.movement_id);
		self.write_u32(cond.params.len() as u32);
		for param in &cond.params {
			self.write_parameter(param);
		}
		self.write_u8(CAP_ENDCONDITION);
	}

	fn write_action(&mut self, action: &EventAction) {
		self.write_u8(CAP_BEGINACTION);
		self.write_i32(action.object_id);
		self.write_i32(action.action_id);
		self.write_i32(action.movement_id);
		self.write_u32(action.params.len() as u32);
		for param in &action.params {
			self.write_parameter(param);
		}
		self.write_u8(CAP_ENDACTION);
	}

	fn write_parameter(&mut self, tokens: &Vec<Token>) {
		self.write_i32(tokens.len() as i32);
		for token in tokens {
			self.write_i32(TokenKind::from(token) as i32);
			match token {
				Token::Integer(v) => self.write_i64(*v),
				Token::Color(v) => self.write_i64(*v),
				Token::Float(v) => self.write_f64(*v),
				Token::StringLiteral(v)
				| Token::Identifier(v)
				| Token::VariableName(v) => self.write_string(v),
				Token::Token(_) => {},
			}
		}
	}

	fn write_event_group(&mut self, group: &EventGroup) {
		self.write_u8(CAP_BEGINGROUP);
		self.write_u8(group.active as u8);
		self.write_string(&group.name);
		for event in &group.events {
			self.write_any_event(&event);
		}
		self.write_u8(CAP_ENDGROUP);
	}
}
