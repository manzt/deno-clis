# deno-clis

simple (installable) clis built with [deno](https://deno.land/)

## clis

- [`google`](#google) – query and open google in the browser from the command
  line

## `google`

query and open google in the browser from the command line

```bash
deno install --allow-run https://raw.githubusercontent.com/manzt/deno-clis/main/google.ts
```

**Usage**

```bash
# simple search
google "the meaning of life"

# only a specific site
google --site wikipedia.com "the meaning of life"

# subcommands for images, flights, scholar, etc. (see `google --help` for more)
google images cats
google flights "BOS to MSP"
google scholar "stochasitc processes"

# from stdin
echo "funny cats" | google images

# write to stdout instead of opening browser
google --raw "the meaning of life"
# https://google.com/search?q=the+meaning+of+life

# open google docs
google docs

# create new blank document
google docs --new
```
