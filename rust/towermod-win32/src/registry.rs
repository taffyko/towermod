use windows::core::PCWSTR;
use windows::Win32::System::Registry::{
	RegCreateKeyExW, RegSetValueExW, HKEY_CURRENT_USER as HKCU, HKEY, REG_OPTION_NON_VOLATILE,
	REG_SZ, KEY_WRITE
};
use anyhow::Result;


pub fn initialize_registry_settings(exe_path: &str) -> Result<()> {
	reg_sz(HKCU, r"Software\Classes\towermod", "", "URL:towermod")?;
	reg_sz(HKCU, r"Software\Classes\towermod", "URL Protocol", "Towermod Protocol")?;
	reg_sz(HKCU, r"Software\Classes\towermod", "FriendlyTypeName", "Towermod Package")?;

	reg_sz(HKCU, r"Software\Classes\towermod\DefaultIcon", "", &format!("{exe_path},0"))?;
	reg_sz(HKCU, r"Software\Classes\towermod\shell\open\command", "", &format!("\"{exe_path}\" \"%1\""))?;

	reg_sz(HKCU, r"Software\Classes\.towermod", "", "towermod")?;
	reg_sz(HKCU, r"Software\Classes\.towermod", "PerceivedType", "document")?;
	reg_sz(HKCU, r"Software\Classes\.towermod\OpenWithProgids", "towermod", "")?;
	Ok(())
}

fn str_to_pwstr(string: &str) -> Vec<u16> {
	let mut wide: Vec<u16> = string.to_owned().encode_utf16().collect();
	wide.push(0u16);
	wide
}

fn reg_sz(base: HKEY, path: &str, key: &str, value: &str) -> Result<()> {
	unsafe {
		let mut hkey_result: HKEY = HKEY(0);
		RegCreateKeyExW(
			base,
			PCWSTR(&str_to_pwstr(path)[0]),
			0,
			None,
			REG_OPTION_NON_VOLATILE,
			KEY_WRITE,
			None,
			&mut hkey_result,
			None,
		)?;

		let value = str_to_pwstr(value);
		let value = value.align_to::<u8>().1;
		RegSetValueExW(
			hkey_result,
			PCWSTR(&str_to_pwstr(key)[0]),
			0,
			REG_SZ,
			Some(value),
		)?;
	}
	Ok(())
}
