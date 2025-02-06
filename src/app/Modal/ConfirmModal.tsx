import Style from "./Modal.module.scss";
import { Button } from "@/components/Button";
import { BaseModal } from "./BaseModal";
import { useMemo } from "react";
import { useModalContext } from "./modalStore";

export function ChoiceModal<TOption extends string>(props: {
	children?: React.ReactNode,
	options: Record<TOption, string>,
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
				{Object.entries(options).map(([key, value]) =>
					<Button key={key} onClick={() => { close(); onChoose?.(key as TOption)}}>{value as string}</Button>
				)}
			</div>
		</div>
	</BaseModal>
}

export function AcknowledgeModal(props: {
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
}) {
	const { children, title } = props
	const cancelText = props.cancelText ?? "Cancel"
	const confirmText = props.confirmText ?? "OK"
	const options = useMemo(() => ({ cancel: cancelText, confirm: confirmText }), [cancelText, confirmText])
	return <ChoiceModal title={title ?? "Confirm"} options={options} onChoose={choice => {
		switch (choice) {
			case 'cancel': props.onCancel?.(); break;
			case 'confirm': props.onConfirm?.(); break;
		}
	}}>
		{children}
	</ChoiceModal>
}
