# Publish Snippets

## alpha tag version

add alpha tag version

```bash
npm version prerelease --preid=alpha
```

publish

```bash
npm publish --tag=alpha
# or use pnpm
pnpm publish --tag alpha
```

### facade -> v-id-mutable syncop:

```bash
# add alpha tag version
pnpm --filter @ad-destra/destra --filter @ad-destra/v-id-mutable -r exec npm version prerelease --preid=alpha
# publish
pnpm publish -r --tag alpha --filter @ad-destra/destra --filter @ad-destra/v-id-mutable
```


### user side add

```bash
pnpm add @ad-destra/destra@alpha
```

update: use `pnpm update`, but the safest way is 're-install':
```bash
pnpm add @ad-destra/destra@alpha
```

## patch tag version

```bash
npm version patch
```

publish

```bash
pnpm publish
```