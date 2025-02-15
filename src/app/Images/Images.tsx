import { api, useGameImageUrl } from "@/api";
import { Button } from "@/components/Button";
import { useState } from "react";

export default function Images() {
	const [imageId, setImageId] = useState(0)
	const href = useGameImageUrl(imageId);

	return <div>
		<div className="hbox">
			<Button>Dump images</Button>
			<Button>Browse dumped images</Button>
			<Button>Reload selected image</Button>
			<Button>Reload all images</Button>
			<Button>Set mask</Button>
			<Button>Set image</Button>
		</div>
		<input type="number" value={imageId} onChange={(e) => setImageId(parseInt(e.target.value))} />
		{href ? <img src={href} /> : <div>No image for ID {imageId}</div>}
	</div>
}
