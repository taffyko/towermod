import { win32 as path } from "path";
import { useState } from "react";
import { api, useFileUrl } from "@/api";
import { ConfirmModal } from "../Modal";
import { spin } from "@/app/GlobalSpinner";
import { throwOnError } from "@/components/Error";
import { LineEdit } from "@/components/LineEdit";
import FilePathEdit from "@/components/FilePathEdit";
import Style from './ProjectDetailsModal.module.scss';
import ImagePathEdit from "@/components/ImagePathEdit/ImagePathEdit";
import { TextEdit } from "@/components/TextEdit";
import Text from '@/components/Text'
import { Project } from "@towermod";

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

export function ProjectDetailsModal(props: { project?: Project, newProject?: boolean, confirmText?: string, onConfirm?: (data: ProjectDetailsFormData) => void }) {
	const { project: originalProject } = props;

	const [author, setAuthor] = useState(originalProject?.author ?? "");
	const [name, setName] = useState(originalProject?.name ?? "");
	const [displayName, setDisplayName] = useState(originalProject?.displayName ?? "");
	const [version, setVersion] = useState(originalProject?.version ?? "0.0.1");
	const [dirPath, setDirPath] = useState(originalProject?.dirPath ?? "");
	const [coverPath, setCoverPath] = useState(originalProject?.dirPath ? path.join(originalProject.dirPath, "cover.png") : "")
	const [iconPath, setIconPath] = useState(originalProject?.dirPath ? path.join(originalProject.dirPath, "icon.png") : "")
	const [description, setDescription] = useState(originalProject?.description ?? "");

	return <ConfirmModal title="Project Details" onConfirm={onConfirm} confirmText={props.confirmText}>
		<div className={Style.form}>
			<Text>Author</Text>
			<LineEdit placeholder="yourusername" value={author} onChange={e => setAuthor(e.target.value)} />
			<Text>Mod ID</Text>
			<LineEdit placeholder="your-mod" value={name} onChange={e => setName(e.target.value)} />
			<Text>Name</Text>
			<LineEdit placeholder="Your Mod" value={displayName} onChange={e => setDisplayName(e.target.value)} />
		{ props.newProject ? <>
			<Text>Save to location</Text>
			<FilePathEdit folder value={dirPath} onChange={setDirPath} />
		</> : null}
		{ !props.newProject ? <>
				<Text>Version</Text>
				<LineEdit placeholder="0.1.0" value={version} onChange={e => setVersion(e.target.value)} />
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
