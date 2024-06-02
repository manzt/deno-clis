# @manzt/googler

[![JSR](https://jsr.io/badges/@manzt/googler)](https://jsr.io/@manzt/googler)

query and open google in the browser from the command line

```bash
deno install --allow-run=open --name=google jsr:@manzt/googler
```

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
