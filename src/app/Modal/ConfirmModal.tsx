import Style from "./Modal.module.scss";
import { Button } from "@/components/Button";
import { BaseModal } from "./BaseModal";
import { useMemo } from "react";
import { useModalContext } from "./modalStore";

export function ChoiceModal<TOption extends string>(props: {
	children?: React.ReactNode,
	options: Record<TOption, string | { name: string, disabled?: boolean }>,
	onChoose?: (option: TOption | 'cancel') => void,
	title?: string,
}) {
	const { title, children, options, onChoose } = props;
	const { close } = useModalContext();

	return <BaseModal title={title} onCancel={() => onChoose?.('cancel')}>
		<div className="vbox gap grow">
			{children}
			<div className="grow" />
			<div className={Style.choices}>
				{Object.entries(options).map(([key, value]: any) =>
					typeof value === 'string'
						? <Button key={key} onClick={() => { onChoose?.(key as TOption); close() }}>{value}</Button>
						: <Button disabled={value.disabled} key={key} onClick={() => { onChoose?.(key as TOption); close() }}>{value.name}</Button>
				)}
			</div>
		</div>
	</BaseModal>
}

export function AlertModal(props: {
	children?: React.ReactNode,
	buttonText?: string,
	onClose?: () => void,
	title?: string,
}) {
	const { children, onClose, title } = props;
	const buttonText = props.buttonText ?? "OK";
	const options = useMemo(() => ({ ok: buttonText }), [buttonText])
	return <ChoiceModal title={title} onChoose={onClose} options={options}>
		{children}
	</ChoiceModal>
}

export function ConfirmModal(props: {
	children?: React.ReactNode,
	confirmText?: string
	cancelText?: string
	onConfirm?: () => void,
	onCancel?: () => void,
	title?: string,
	disabled?: boolean,
}) {
	const { children, title, disabled } = props
	const cancelText = props.cancelText ?? "Cancel"
	const confirmText = props.confirmText ?? "OK"
	const options = useMemo(() => ({ cancel: { name: cancelText }, confirm: { disabled, name: confirmText } }), [cancelText, confirmText, disabled])
	return <ChoiceModal title={title ?? "Confirm"} options={options} onChoose={choice => {
		switch (choice) {
			case 'cancel': props.onCancel?.(); break;
			case 'confirm': props.onConfirm?.(); break;
		}
	}}>
		{children}
	</ChoiceModal>
}
