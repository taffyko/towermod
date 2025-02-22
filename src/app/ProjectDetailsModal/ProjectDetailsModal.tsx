import { win32 as path } from "path";
import { useState } from "react";
import { api, useFileUrl } from "@/api";
import { ConfirmModal } from "../Modal";
import { spin } from "@/app/GlobalSpinner";
import { LineEdit } from "@/components/LineEdit";
import FilePathEdit from "@/components/FilePathEdit";
import Style from './ProjectDetailsModal.module.scss';
import ImagePathEdit from "@/components/ImagePathEdit/ImagePathEdit";
import { TextEdit } from "@/components/TextEdit";
import Text from '@/components/Text'
import { Project } from "@towermod";
import { getUniqueName } from "@/util";

export interface ProjectDetailsFormData {
	author: string,
	name: string,
	displayName: string,
	version: string,
	dirPath: string,
	coverPath: string,
	iconPath: string,
	description: string,
}

// TODO: validation


function StatusLabel(props: {
	error?: boolean | React.ReactNode,
	warning?: boolean | React.ReactNode,
	children?: React.ReactNode
}) {
	const { error, warning, children } = props;
	let color = ''
	if (warning) { color = 'var(--color-warn)' }
	if (error) { color = 'var(--color-error)' }
	const errorContent = typeof error !== 'boolean' ? error : undefined
	const warningContent = typeof warning !== 'boolean' ? warning : undefined

	if (!children && !errorContent && !warningContent) {
		return null
	}
	return <div>
		{ children && <div style={{ color }}>{children}</div> }
		{ errorContent && <pre style={{ color: 'var(--color-error)' }}>{errorContent}</pre> }
		{ warningContent && <pre style={{ color: 'var(--color-warn)' }}>{warningContent}</pre> }
	</div>
}


/** Positive if a > b */
function compareVersions(a: string, b: string): number {
	const [a1, a2, a3] = a.split('.').map(Number)
	const [b1, b2, b3] = b.split('.').map(Number)
	if (a1 !== b1) return a1 - b1
	if (a2 !== b2) return a2 - b2
	return a3 - b3
}

const forbiddenCharacters = /[^a-zA-Z0-9-_ ]/g

function stripForbiddenCharacters(s: string) {
	return s.replace(forbiddenCharacters, '')
}
function processModName(name: string) {
	return stripForbiddenCharacters(name).toLowerCase().replace(' ', '-')
}

export function ProjectDetailsModal(props: { project?: Project, newProject?: boolean, confirmText?: string, onConfirm?: (data: ProjectDetailsFormData) => void }) {
	const { project: originalProject } = props;

	const { data: mods } = api.useGetInstalledModsQuery();

	const [author, setAuthor] = useState(originalProject?.author ?? "");
	const [name, setName] = useState(originalProject?.name ?? "");
	const [displayName, setDisplayName] = useState(originalProject?.displayName ?? "");
	const [version, setVersion] = useState(originalProject?.version ?? "0.0.1");
	const [dirPath, setDirPath] = useState(originalProject?.dirPath ?? "");
	const [coverPath, setCoverPath] = useState(originalProject?.dirPath ? path.join(originalProject.dirPath, "cover.png") : "")
	const [iconPath, setIconPath] = useState(originalProject?.dirPath ? path.join(originalProject.dirPath, "icon.png") : "")
	const [description, setDescription] = useState(originalProject?.description ?? "");

	const versionValid = /[0-9]+\.[0-9]+\.[0-9]+/.test(version)
	const valid = !!(dirPath && versionValid && name && displayName)

	let versionWarning: React.ReactNode = null
	if (versionValid && mods) {
		const uniqueName = getUniqueName(author, name);
		for (const mod of mods) {
			if (uniqueName === mod.uniqueName && compareVersions(version, mod.version) <= 0) {
				versionWarning = <div>A mod with ID <code>{uniqueName}.{version}</code> or newer already exists.<br/>Be sure to increment the version number before publishing a new version.</div>
			}
		}
	}

	return <ConfirmModal disabled={!valid} title="Project Details" onConfirm={onConfirm} confirmText={props.confirmText}>
		<div className={Style.form}>
			<StatusLabel error={!author}>Author</StatusLabel>
			<LineEdit placeholder="yourusername" value={author} onChange={e => setAuthor(stripForbiddenCharacters(e.target.value))} />
			<StatusLabel error={!name}>Mod ID</StatusLabel>
			<LineEdit placeholder="your-mod" value={name} onChange={e => setName(processModName(e.target.value))} />
			<StatusLabel error={!displayName}>Name</StatusLabel>
			<LineEdit placeholder="Your Mod" value={displayName} onChange={e => setDisplayName(e.target.value)} />
		{ props.newProject ? <>
			<StatusLabel error={!dirPath}>Save to location</StatusLabel>
			<FilePathEdit folder value={dirPath} onChange={setDirPath} />
		</> : null}
		{ !props.newProject ? <>
				<StatusLabel error={!versionValid} warning={!!versionWarning}>Version</StatusLabel>
				<div className="vbox gap">
					<LineEdit placeholder="0.1.0" value={version} onChange={e => setVersion(e.target.value)} />
					<StatusLabel warning={versionWarning} />
				</div>
				<Text>Description</Text>
				<TextEdit value={description} onChange={e => setDescription(e.target.value)} />
				<Text>Cover</Text>
				<ImagePathEdit width="240" height="160" value={coverPath} onChange={setCoverPath} />
				<Text>Icon</Text>
				<ImagePathEdit width="64" height="64" value={iconPath} onChange={setIconPath} />
		</> : null }
		</div>
	</ConfirmModal>

	function onConfirm() {
		const data = { author, name, displayName, version, dirPath, coverPath, iconPath, description }
		props.onConfirm?.(data);
	}
}
