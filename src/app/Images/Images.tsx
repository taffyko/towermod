import { api, useGameImageUrl } from "@/api";
import { useState } from "react";

export default function Images() {
	const [imageId, setImageId] = useState(0)
	const href = useGameImageUrl(imageId);

	return <div>
		<input type="number" value={imageId} onChange={(e) => setImageId(parseInt(e.target.value))} />
		{href ? <img src={href} /> : <div>No image for ID {imageId}</div>}
	</div>
}
