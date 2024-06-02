import * as cliffy from "jsr:@cliffy/command@1.0.0-rc.4";

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

function open(url: string) {
	let cmd = new Deno.Command("open", { args: [url] });
	return cmd.output();
}

function try_read_stdin(readable: ReadableStream<Uint8Array>): Promise<string> {
	// Try reading from stdin but if no input is provided within 10ms, throw an error.
	return new Promise((resolve, reject) => {
		let signal = AbortSignal.timeout(10);
		let on_abort = () => {
			reject(
				new cliffy.ValidationError(
					"Missing query. Must provide as an argument or via stdin.",
				),
			);
		};
		signal.addEventListener("abort", on_abort);
		let chunks: Array<string> = [];
		readable
			.pipeThrough(new TextDecoderStream())
			.pipeTo(
				new WritableStream({
					write(chunk) {
						chunks.push(chunk);
						signal.removeEventListener("abort", on_abort);
					},
					close() {
						resolve(chunks.join("\n"));
					},
				}),
			);
	});
}

function google(cmd: GoogleCommand) {
	return async ({ site, raw }: SearchOptions, ...parts: string[]) => {
		let query = parts.length > 0
			? parts.join(" ")
			: await try_read_stdin(Deno.stdin.readable);
		if (site) query += " site:" + site;
		let url = new URL("https://google.com/search");
		url.searchParams.set("q", query);
		if (cmd.tbm) {
			url.searchParams.set("tbm", cmd.tbm);
		} else {
			url.pathname = `/${cmd.name}`;
		}
		raw ? console.log(url.href) : await open(url.href);
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
		await open(url.href);
	};
}

for (
	let cmd of [
		{ name: "cal", subdomain: "calendar" },
		{ name: "docs" },
		{ name: "sheets" },
		{ name: "slides" },
		{ name: "drive" },
	]
) {
	cli
		.command(cmd.name, `Open ${cmd.subdomain ?? cmd.name}.`)
		.option("-n, --new", "Create a new entity.")
		.action(drive(cmd));
}

await cli.parse(Deno.args);
