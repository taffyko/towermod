/**
 * Logic and interactive modals for adding new objects to the outliner.
 * @module
 */
import api from "@/api"
import { ConfirmModal, openModal } from "@/app/Modal"
import { openConfirmModal } from "@/app/Modal/modalStore"
import { toast } from "@/app/Toast"
import { LineEdit } from "@/components/LineEdit"
import { actions, dispatch } from "@/redux"
import { assert, UniqueTowermodObject } from "@/util"
import { useState } from "react"

function AddFamilyModal(props: { onConfirm?: (name: string) => void }) {
	const [name, setName] = useState("")

	const valid = api.validateFamilyName.useQuery(name).data ?? false

	return <ConfirmModal disabled={!valid} title="Add Family" onConfirm={onConfirm} confirmText="Add">
		<LineEdit value={name} onChange={e => setName(e.target.value)} />
	</ConfirmModal>

	async function onConfirm() {
		toast(`Family "${name}" added`, { type: 'success' })
		await api.createFamily(name)
		dispatch(actions.setOutlinerValue({ _type: 'Family', name }))
		props.onConfirm?.(name)
	}
}

// type OnConfirmArg<T> = T extends { onConfirm?: (arg: infer U) => void } ? U : never;
// function openConfirmModal<P>(component: React.ComponentType<P>): OnConfirmArg<P> {
// 	return null as any
// }
// const a = openConfirmModal(AddFamilyModal)

export function getAddChildImplementation(nodeName?: string, obj?: UniqueTowermodObject): (() => Promise<void>) | undefined {
	if (!obj) {
		switch (nodeName) {
			case 'Layouts':
				return // TODO
			case 'Behaviors':
				return // TODO
			case 'Containers':
				return // TODO
			case 'Families':
				return () => openModal(<AddFamilyModal />)
			case 'Object Types':
				return async () => {
					const plugins = await api.getEditorPlugins()
					// TODO: pick plugin type
					const spritePluginId = Object.entries(plugins).find(([, plugin]) => plugin.stringTable.name === 'Sprite')?.[0]
					assert(spritePluginId != null)
					const id = await api.createObjectType(Number(spritePluginId))
					dispatch(actions.setOutlinerValue({ _type: 'ObjectType', id }))
				}
			case 'Traits':
				return // TODO
		}
	}
	switch (obj?._type) {
		case 'ObjectType':
			if (obj.pluginName === 'Sprite') {
				return async () => {
					const id = await api.createAnimation({ objectTypeId: obj.id })
					dispatch(actions.setOutlinerValue({ _type: 'Animation', id }))
				}
			}
			return // TODO
		case 'Layout':
			return // TODO
		case 'LayoutLayer':
			return // TODO
	}
}