import { error, redirect } from "@sveltejs/kit";
import { loadAssetPage } from "$lib/seo";
import type { PageLoad } from "./$types";

export const load: PageLoad = ({ params, fetch }) =>
	loadAssetPage(
		fetch,
		params.id ?? "",
		"sound",
		(s) => error(s, "Audio tidak ditemukan"),
		(to) => redirect(301, to)
	);
