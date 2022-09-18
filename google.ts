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
	raw?: boolean;
}

class PromiseTimeoutError extends Error {
	override name = "PromiseTimeoutError";
	constructor(public timeout: number) {
		super(`Failed to resolve promise within timeout.`);
	}
}

/**
 * Consume an async iterator into an array.
 *
 * @param iter - The async iterator to consume.
 * @param opts
 * @param opts.wait - Max wait time for first iterator result.
 *
 * @throws {@link PromiseTimeoutError} If first iterator result fails to resolve within wait time.
 */
async function to_array<T>(
	iter: AsyncIterableIterator<T>,
	opts: { wait: number },
): Promise<T[]> {
	let first: IteratorResult<T> | undefined;
	iter.next().then((iresult) => first = iresult);
	await new Promise<void>((res) => setTimeout(res, opts.wait));
	if (!first) throw new PromiseTimeoutError(opts.wait);
	if (first.done) return [];
	let parts = [first.value];
	for await (let line of iter) parts.push(line);
	return parts;
}

function google(cmd: GoogleCommand) {
	return async ({ site, raw }: SearchOptions, ...parts: string[]) => {
		let query = parts.length > 0
			? parts.join(" ")
			: await to_array(buffer.readLines(Deno.stdin), { wait: 10 })
				.then((arr) => arr.join("\n"))
				.catch(
					(e) => {
						if (e instanceof PromiseTimeoutError) {
							throw new cliffy.ValidationError(
								"Missing query. Must provide as an argument or via stdin.",
							);
						}
						throw e;
					},
				);
		if (site) query += " site:" + site;
		let url = new URL("https://google.com/search");
		url.searchParams.set("q", query);
		if (cmd.tbm) {
			url.searchParams.set("tbm", cmd.tbm);
		} else {
			url.pathname = `/${cmd.name}`;
		}

		raw ? console.log(url.href) : await open.open(url.href);
	};
}

let cli = new cliffy.Command()
	.name("google")
	.version("0.2.0")
	.description("Launch Google from the command line.")
	.arguments("[...query:string]")
	.option(
		"-r, --raw",
		"Write URL to stdout instead of opening the default browser.",
	)
	.option(
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
		.arguments("[...query:string]")
		.option(
			"-r, --raw",
			"Write URL to stdout instead of opening the default browser.",
		)
		.option(
			"-s, --site <site:string>",
			"Search one site (e.g., wikipedia.org).",
		)
		.action(google(cmd));
}

interface GoogleDriveCommand {
	name: string;
	/** subdomain if differs from name */
	subdomain?: string;
}

function drive(cmd: GoogleDriveCommand) {
	return async (opts: { new?: boolean }) => {
		let url = new URL(
			opts.new
				? `https://${cmd.name}.new`
				: `https://${cmd.subdomain ?? cmd.name}.google.com`,
		);
		await open.open(url.href);
	};
}

for (
	let cmd of [
		{ name: "cal", subdomain: "calendar" },
		{ name: "docs" },
		{ name: "sheets" },
		{ name: "slides" },
	]
) {
	cli
		.command(cmd.name, `Open ${cmd.subdomain ?? cmd.name}.`)
		.option("-n, --new", "Create a new entity.")
		.action(drive(cmd));
}

await cli.parse(Deno.args);
