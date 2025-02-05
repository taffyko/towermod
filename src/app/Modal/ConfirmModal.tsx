import { Button } from "@/components/Button";
import { BaseModal } from "./BaseModal";
import { useMemo } from "react";

export function ChoiceModal<TOption extends string>(props: {
	children?: React.ReactNode,
	options: Record<TOption, string>,
	onChoose?: (option: TOption | 'cancel') => void,
}) {
	const { children, options, onChoose } = props;

	return <BaseModal onCancel={() => onChoose?.('cancel')}>
		{children}
		<div className="hbox">
			{Object.entries(options).map(([key, value]) =>
				<Button key={key} onClick={() => onChoose?.(key as TOption)}>{value as string}</Button>
			)}
		</div>
	</BaseModal>
}

export function AcknowledgeModal(props: {
	children?: React.ReactNode,
	buttonText?: string,
	onClose?: () => void,
}) {
	const { children, onClose } = props;
	const buttonText = props.buttonText ?? "OK";
	const options = useMemo(() => ({ ok: buttonText }), [buttonText])
	return <ChoiceModal onChoose={onClose} options={options}>
		{children}
	</ChoiceModal>
}

export function ConfirmModal(props: {
	children?: React.ReactNode,
	confirmText?: string
	cancelText?: string
	onConfirm?: () => void,
	onCancel?: () => void,
}) {
	const { children } = props
	const cancelText = props.cancelText ?? "Cancel"
	const confirmText = props.confirmText ?? "OK"
	const options = useMemo(() => ({ cancel: cancelText, confirm: confirmText }), [cancelText, confirmText])
	return <ChoiceModal options={options} onChoose={choice => {
		switch (choice) {
			case 'cancel': props.onCancel?.(); break;
			case 'confirm': props.onConfirm?.(); break;
		}
	}}>
		{children}
	</ChoiceModal>
}
