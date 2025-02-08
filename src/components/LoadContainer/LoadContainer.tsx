import { ErrorMsg } from '@/components/Error';
export function LoadContainer(props: React.ComponentProps<'div'> & {
	info: { error?: any, isLoading?: boolean, isError?: boolean }
	children?: React.ReactNode,
}) {
	const { info: { error, isLoading, isError }, children, ...htmlProps } = props;
	if (isLoading) {
		return <SpinnerBox {...htmlProps} />
	}
	if (isError || (isError === undefined && error !== undefined)) {
		return <ErrorMsg {...htmlProps} error={error} />
	}
	return children
}

function SpinnerBox(props: React.ComponentProps<'div'>) {
	const { ...htmlProps } = props;
	// TODO
	return <div {...htmlProps} style={{ backgroundColor: 'red' }}>

	</div>
}
