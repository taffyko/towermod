import { api, useGameImageUrl } from "@/api";
import { Button } from "@/components/Button";
import { useCallback, useState } from "react";
import { InspectorObject } from "../Data/Inspector";
import { useTwoWayBinding } from "@/util";

export default function Images() {
	const [imageId, setImageId] = useState(0)
	const href = useGameImageUrl(imageId);

	const { data: savedMetadata } = api.useGetImageMetadataQuery(imageId);
	const [setSavedMetadata] = api.useSetImageMetadataMutation();

	const onChange = useCallback(() => {}, [])
	const [metadata, setMetadata] = useTwoWayBinding(savedMetadata, onChange)

	return <div>
		<div className="hbox gap">
			<Button>Dump images</Button>
			<Button>Browse dumped images</Button>
			<Button>Reload selected image</Button>
			<Button>Reload all images</Button>
			<Button>Set mask</Button>
			<Button>Set image</Button>
		</div>
		<input type="number" value={imageId} onChange={(e) => setImageId(parseInt(e.target.value))} />
		{href ? <img src={href} /> : <div>No image for ID {imageId}</div>}
		<InspectorObject value={metadata} onChange={onChange} />
	</div>
}
