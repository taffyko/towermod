use godot::{obj::{Bounds, WithBaseField}, prelude::*};
use std::ops::{Deref, DerefMut};
use godot::obj::bounds;

#[derive(Clone)]
pub struct Gd2<T: GodotClass> {
	// pub _phantom: std::marker::PhantomData<T>,
	pub instance_id: godot::obj::InstanceId,
	pub gd: Gd<T>,
}
unsafe impl<T: GodotClass> Send for Gd2<T> {}
unsafe impl<T: GodotClass> Sync for Gd2<T> {}
impl<T: GodotClass> Gd2<T> {
	pub fn to_gd(&self) -> Gd<T> {
		Gd::from_instance_id(self.instance_id)
	}
	pub fn from_gd(gd: &Gd<T>) -> Self {
		Gd2 {
			instance_id: gd.instance_id(),
			gd: gd.clone(),
		}
	}
}
impl<T: GodotClass<Declarer = bounds::DeclUser>> Gd2<T> {
	pub fn bind_mut(&mut self) -> GdMut<'_, T> {
		self.gd.bind_mut()
	}
	pub fn bind(&self) -> GdRef<'_, T> {
		self.gd.bind()
	}
}

// type GdDerefTarget<T> = <<T as Bounds>::Declarer as bounds::Declarer>::DerefTarget<T>;
// impl<T: GodotClass> Deref for Gd2<T> {
// 	type Target = GdDerefTarget<T>;
// 	fn deref(&self) -> &Self::Target {
// 		self.gd.deref()
// 	}
// }
// impl<T: GodotClass> DerefMut for Gd2<T> {
// 	fn deref_mut(&mut self) -> &mut Self::Target {
// 		self.gd.deref_mut()
// 	}
// }
impl<T: GodotClass> Deref for Gd2<T> {
	type Target = T;
	fn deref(&self) -> &Self::Target {
		unimplemented!()
	}
}
impl<T: GodotClass> DerefMut for Gd2<T> {
	fn deref_mut(&mut self) -> &mut Self::Target {
		unimplemented!()
	}
}

impl<T: GodotClass> From<&Gd<T>> for Gd2<T> {
	fn from(gd: &Gd<T>) -> Self {
		Self::from_gd(gd)
	}
}
impl<T: GodotClass> From<&Gd2<T>> for Gd<T> {
	fn from(gd2: &Gd2<T>) -> Self {
		gd2.to_gd()
	}
}
impl<T: GodotClass + WithBaseField> From<&T> for Gd2<T> {
	fn from(obj: &T) -> Self {
		From::from(&obj.to_gd())
	}
}
impl<T: GodotClass + WithBaseField> From<&mut T> for Gd2<T> {
	fn from(obj: &mut T) -> Self {
		From::from(&obj.to_gd())
	}
}

impl<T: GodotClass> GodotConvert for Gd2<T> {
	type Via = Gd<T>;
}

impl<T: GodotClass> ToGodot for Gd2<T> {
	fn to_godot(&self) -> Self::Via {
		return self.to_gd()
	}
}
