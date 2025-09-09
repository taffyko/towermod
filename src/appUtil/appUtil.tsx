import api from '@/api'
import { spin } from "@/app/GlobalSpinner"
import { openModal } from "@/app/Modal"
import { ProjectDetailsFormData, ProjectDetailsModal } from "@/app/ProjectDetailsModal"
import { toast } from "@/app/Toast"
import { dispatch, store } from "@/redux"
import { activateWindow, useMountEffect, useObjectUrl } from "@/util"
import { ApiEndpointQuery, QueryDefinition, defaultSerializeQueryArgs } from "@reduxjs/toolkit/query"
import { useCallback, useRef, useState, useSyncExternalStore } from "react"

export async function saveProject() {
	const saveProject = (dirPath: string) => api.saveProject(dirPath)
	const saveNewProject = (form: ProjectDetailsFormData) => api.saveNewProject(form)
	const project = await api.getProject()

	if (project && project.dirPath) {
		await spin(saveProject(project.dirPath))
		toast("Project saved")
	} else {
		openModal(<ProjectDetailsModal confirmText="Save" newProject onConfirm={async (form) => {
			await spin(saveNewProject(form))
			toast("Project saved")
		}} />)
	}
}


export async function installMods(files: string[]) {
	activateWindow()
	const { dispatch, actions } = await import('@/redux')
	for (const file of files) {
		const modInfo = await spin(api.installMod(file))
		if (modInfo) {
			toast(`Installed mod: "${modInfo.name}" (v${modInfo.version})`)
			dispatch(actions.setCurrentTab('Mods'))
			dispatch(actions.selectMod(modInfo.id))
		}
	}
}

export function useFileUrl(path: string | null | undefined): string | undefined {
	const { data: blob } = api.getFile.useQuery(path)
	const href = useObjectUrl(blob)
	return href ?? undefined
}

