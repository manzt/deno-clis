import * as buffer from "https://deno.land/std@0.155.0/io/buffer.ts";
import * as cliffy from "https://deno.land/x/cliffy@v0.25.0/command/mod.ts";
import * as open from "https://deno.land/x/open@v0.0.5/index.ts";

interface GoogleCommand {
	name: string;
	// https://stenevang.wordpress.com/2013/02/22/google-advanced-power-search-url-request-parameters/
	tbm?: string; 
	description?: string;
}

interface SearchOptions {
	site?: string;
}

/** Read contents from Reader. If result doesn't resolve within timeout, return empty string. */
async function read_query(reader: Deno.Reader, opts: { timeout: number }) {
	let resolved = false;
	let line_iter = buffer.readLines(reader);
	let promise = line_iter.next().then((result) => {
		resolved = true;
		return result.done ? "" : result.value;
	});
	await new Promise((resolve) => setTimeout(resolve, opts.timeout));
	if (!resolved) return "";
	let query = await promise;
	for await (let line of line_iter) query += line + "\n";
	return query;
}

function google(cmd: GoogleCommand) {
	return async ({ site }: SearchOptions, query?: string) => {
		if (!query) query = await read_query(Deno.stdin, { timeout: 10 });
		if (query === "") {
			throw new cliffy.ValidationError(
				"Must provide query directly or via stdin.",
			);
		}
		if (site) query += " site:" + site;
		let url = new URL("https://google.com/search");
		url.searchParams.set("q", query);
		if (cmd.tbm) {
			url.searchParams.set("tbm", cmd.tbm);
		} else {
			url.pathname = `/${cmd.name}`;
		}
		await open.open(url.href);
	};
}

let cli = new cliffy.Command()
	.name("google")
	.version("0.1.0")
	.description("Launch Google from the command line.")
	.arguments("[query:string]")
	.globalOption(
		"-s, --site <site:string>",
		"Search one site (e.g., wikipedia.org).",
	)
	.action(google({ name: "search" }))
	.global();

for (
	let cmd of [
		{ name: "search", description: "Default search." },
		{ name: "books" },
		{ name: "flights" },
		{ name: "images" },
		{ name: "maps" },
		{ name: "news" },
		{ name: "patents" },
		{ name: "scholar" },
		{ name: "shopping", tbm: "shop" },
		{ name: "videos", tbm: "vid" },
	]
) {
	cli
		.command(cmd.name, cmd.description ?? `Search ${cmd.name}.`)
		.arguments("[query:string]")
		.action(google(cmd));
}

await cli.parse(Deno.args);
